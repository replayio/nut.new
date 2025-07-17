// Manage state around recording Preview behavior for generating a Replay recording.
//
// When updating this file the backend's injected script should be updated to match,
// see injectedScript.ts.
//
// Note that to make this easier we don't use backticks ` in this file.

import { createInjectableFunction } from './injectable';
import { assert, stringToBase64, uint8ArrayToBase64 } from '~/utils/nut';
import type {
  IndexedDBAccess,
  LocalStorageAccess,
  NetworkResource,
  SimulationData,
  SimulationPacket,
  UserInteraction,
} from './SimulationData';

type Compute<T> = { [K in keyof T]: T[K] } & unknown;

type RequestMap = {
  'recording-data': {
    payload: unknown;
    response: ArrayBufferLike;
  };
  'mouse-data': {
    payload: { x: number; y: number };
    response: MouseData;
  };
};

type Request = {
  [K in keyof RequestMap]: Compute<
    { request: K } & (undefined extends RequestMap[K]['payload']
      ? { payload?: RequestMap[K]['payload'] }
      : { payload: RequestMap[K]['payload'] })
  >;
}[keyof RequestMap];

let lastRequestId = 0;

function sendIframeRequest<K extends keyof RequestMap>(
  iframe: HTMLIFrameElement,
  request: Extract<Request, { request: K }>,
) {
  if (!iframe.contentWindow) {
    return undefined;
  }

  const target = iframe.contentWindow;
  const requestId = ++lastRequestId;
  target.postMessage({ id: requestId, request, source: '@@replay-nut' }, '*');

  return new Promise<RequestMap[K]['response']>((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data?.source !== '@@replay-nut' || event.source !== target || event.data?.id !== requestId) {
        return;
      }

      window.removeEventListener('message', handler);
      resolve(event.data.response);
    };
    window.addEventListener('message', handler);
  });
}

export async function getIFrameSimulationData(iframe: HTMLIFrameElement): Promise<SimulationData> {
  const buffer = await sendIframeRequest(iframe, { request: 'recording-data' });

  if (!buffer) {
    return [];
  }

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(new Uint8Array(buffer));

  return JSON.parse(jsonString) as SimulationData;
}

export interface MouseData {
  selector: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export async function getMouseData(iframe: HTMLIFrameElement, position: { x: number; y: number }): Promise<MouseData> {
  const mouseData = await sendIframeRequest(iframe, { request: 'mouse-data', payload: position });
  assert(mouseData, 'Expected to have mouse data');

  return mouseData;
}

// Add handlers to the current iframe's window.
const addRecordingMessageHandler = createInjectableFunction(
  {
    assert,
    stringToBase64,
    uint8ArrayToBase64,
  },
  (deps) => {
    const assert: typeof deps.assert = deps.assert;
    const { stringToBase64 } = deps;

    const simulationData: SimulationData = [];
    let numSimulationPacketsSent = 0;

    function pushSimulationData(packet: SimulationPacket) {
      packet.time = new Date().toISOString();
      simulationData.push(packet);
    }

    const startTime = Date.now();

    pushSimulationData({
      kind: 'viewport',
      size: { width: window.innerWidth, height: window.innerHeight },
    });
    pushSimulationData({
      kind: 'locationHref',
      href: window.location.href,
    });
    pushSimulationData({
      kind: 'documentURL',
      url: window.location.href,
    });

    interface RequestInfo {
      url: string;
      requestBody: string;
    }

    function clamp(value: number, min: number, max: number) {
      return Math.min(Math.max(value, min), max);
    }

    function addNetworkResource(resource: NetworkResource) {
      pushSimulationData({
        kind: 'resource',
        resource,
      });
    }

    function addTextResource(info: RequestInfo, text: string, responseHeaders: Record<string, string>) {
      const url = new URL(info.url, window.location.href).href;
      addNetworkResource({
        url,
        requestBodyBase64: stringToBase64(info.requestBody),
        responseBodyBase64: stringToBase64(text),
        responseStatus: 200,
        responseHeaders,
      });
    }

    function addInteraction(interaction: UserInteraction) {
      pushSimulationData({
        kind: 'interaction',
        interaction,
      });
    }

    function addIndexedDBAccess(access: IndexedDBAccess) {
      pushSimulationData({
        kind: 'indexedDB',
        access,
      });
    }

    function addLocalStorageAccess(access: LocalStorageAccess) {
      pushSimulationData({
        kind: 'localStorage',
        access,
      });
    }

    async function getSimulationData(): Promise<SimulationData> {
      //console.log("GetSimulationData", simulationData.length, numSimulationPacketsSent);
      const data = simulationData.slice(numSimulationPacketsSent);
      numSimulationPacketsSent = simulationData.length;

      return data;
    }

    async function handleRequest<T extends Request>({
      request,
      payload,
    }: Request): Promise<RequestMap[T['request']]['response']> {
      switch (request) {
        case 'recording-data': {
          const data = await getSimulationData();

          const encoder = new TextEncoder();
          const serializedData = encoder.encode(JSON.stringify(data));
          const buffer = serializedData.buffer;

          return buffer;
        }
        case 'mouse-data': {
          const { x, y } = payload;
          const element = document.elementFromPoint(x, y);
          assert(element);

          const selector = computeSelector(element);
          const rect = element.getBoundingClientRect();

          return {
            selector,
            width: rect.width,
            height: rect.height,
            x: x - rect.x,
            y: y - rect.y,
          };
        }
      }
      throw new Error('Unknown request type: ' + request);
    }

    window.addEventListener('message', async (event) => {
      if (event.data?.source !== '@@replay-nut') {
        return;
      }

      const response = await handleRequest(event.data.request);
      window.parent.postMessage({ id: event.data.id, response, source: '@@replay-nut' }, '*');
    });

    // Evaluated function to find the selector and associated data.
    function getMouseEventTargetData(event: MouseEvent) {
      assert(event.target);

      const target = event.target as Element;
      const selector = computeSelector(target);
      const rect = target.getBoundingClientRect();

      return {
        selector,
        width: rect.width,
        height: rect.height,

        /*
         * at times event.clientX and event.clientY can be slighly off in relation to the element's position
         * it's possible that this position might lie outside the element's bounds
         * the difference likely comes from a subpixel rounding or hit target calculation in the browser
         * it's possible that we should account for event.width and event.height here but clamping the values to the bounds of the element should be good enough
         */
        x: clamp(event.clientX - rect.x, 0, rect.width),
        y: clamp(event.clientY - rect.y, 0, rect.height),
      };
    }

    function getKeyboardEventTargetData(event: KeyboardEvent) {
      assert(event.target);

      const target = event.target as Element;
      const selector = computeSelector(target);

      return {
        selector,
        key: event.key,
      };
    }

    function computeSelector(target: Element): string {
      // Build a unique selector by walking up the DOM tree
      const path: string[] = [];
      let current: Element | null = target;

      while (current) {
        // If element has an ID, use it as it's the most specific
        if (current.id) {
          path.unshift('#' + current.id);
          break;
        }

        // Get the element's tag name
        let selector = current.tagName.toLowerCase();

        // Add nth-child if there are siblings
        const parent = current.parentElement;

        if (parent) {
          const siblings = Array.from(parent.children);
          const index = siblings.indexOf(current) + 1;

          if (siblings.filter((el) => el.tagName === current!.tagName).length > 1) {
            selector += ':nth-child(' + index + ')';
          }
        }

        path.unshift(selector);
        current = current.parentElement;
      }

      return path.join(' > ');
    }

    window.addEventListener(
      'click',
      (event) => {
        if (event.target) {
          addInteraction({
            kind: 'click',
            time: Date.now() - startTime,
            ...getMouseEventTargetData(event),
            ...(event.button && { button: event.button }),
            clickCount: event.detail,
          });
        }
      },
      { capture: true, passive: true },
    );

    window.addEventListener(
      'pointermove',
      (event) => {
        if (event.target) {
          addInteraction({
            kind: 'pointermove',
            time: Date.now() - startTime,
            ...getMouseEventTargetData(event),
          });
        }
      },
      { capture: true, passive: true },
    );

    window.addEventListener(
      'keydown',
      (event) => {
        if (event.key) {
          addInteraction({
            kind: 'keydown',
            time: Date.now() - startTime,
            ...getKeyboardEventTargetData(event),
          });
        }
      },
      { capture: true, passive: true },
    );

    window.addEventListener(
      'scroll',
      (event) => {
        const target = event.target == window.document ? undefined : (event.target as Element);
        const selector = target ? computeSelector(target) : undefined;

        addInteraction({
          kind: 'scroll',
          time: Date.now() - startTime,
          selector,
          windowScrollX: window.scrollX,
          windowScrollY: window.scrollY,
          targetScrollX: target?.scrollLeft,
          targetScrollY: target?.scrollTop,
        });
      },
      { capture: true, passive: true },
    );

    function onInterceptedOperation(_name: string) {
      //console.log("InterceptedOperation " + name);
    }

    function interceptProperty(obj: object, prop: string, interceptor: (basevalue: any) => any) {
      const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      assert(descriptor?.get, 'Property must have a getter');

      let interceptValue: any;
      Object.defineProperty(obj, prop, {
        ...descriptor,
        get() {
          onInterceptedOperation('Getter:' + prop);

          if (!interceptValue) {
            const baseValue = (descriptor?.get as any).call(obj);
            interceptValue = interceptor(baseValue);
          }

          return interceptValue;
        },
      });
    }

    const idbFactoryMethods = {
      _name: 'IDBFactory',
      open: (v: any) => createFunctionProxy(v, 'open'),
    };

    const idbOpenDBRequestMethods = {
      _name: 'IDBOpenDBRequest',
      result: createProxy,
    };

    const idbDatabaseMethods = {
      _name: 'IDBDatabase',
      transaction: (v: any) => createFunctionProxy(v, 'transaction'),
    };

    const idbTransactionMethods = {
      _name: 'IDBTransaction',
      objectStore: (v: any) => createFunctionProxy(v, 'objectStore'),
    };

    function pushIndexedDBAccess(request: IDBRequest, kind: IndexedDBAccess['kind'], key: any, item: any) {
      addIndexedDBAccess({
        kind,
        key,
        item,
        storeName: (request.source as any).name,
        databaseName: (request.transaction as any).db.name,
        databaseVersion: (request.transaction as any).db.version,
      });
    }

    // Map "get" requests to their keys.
    const getRequestKeys: Map<IDBRequest, any> = new Map();

    const idbObjectStoreMethods = {
      _name: 'IDBObjectStore',
      get: (v: any) =>
        createFunctionProxy(v, 'get', (request, key) => {
          // Wait to add the request until the value is known.
          getRequestKeys.set(request, key);
          return createProxy(request);
        }),
      put: (v: any) =>
        createFunctionProxy(v, 'put', (request, item, key) => {
          pushIndexedDBAccess(request, 'put', key, item);
          return createProxy(request);
        }),
      add: (v: any) =>
        createFunctionProxy(v, 'add', (request, item, key) => {
          pushIndexedDBAccess(request, 'add', key, item);
          return createProxy(request);
        }),
    };

    const idbRequestMethods = {
      _name: 'IDBRequest',
      result: (value: any, target: any) => {
        const key = getRequestKeys.get(target);

        if (key) {
          pushIndexedDBAccess(target, 'get', key, value);
        }

        return value;
      },
    };

    function pushLocalStorageAccess(kind: LocalStorageAccess['kind'], key: string, value?: string) {
      addLocalStorageAccess({ kind, key, value });
    }

    const storageMethods = {
      _name: 'Storage',
      getItem: (v: any) =>
        createFunctionProxy(v, 'getItem', (value: string, key: string) => {
          pushLocalStorageAccess('get', key, value);
          return value;
        }),
      setItem: (v: any) =>
        createFunctionProxy(v, 'setItem', (_rv: undefined, key: string) => {
          pushLocalStorageAccess('set', key);
        }),
    };

    // Map Response to the info associated with the original request (before redirects).
    const responseToRequestInfo = new WeakMap<Response, RequestInfo>();

    function convertHeaders(headers: Headers) {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });

      return result;
    }

    const responseMethods = {
      _name: 'Response',
      json: (v: any, response: Response) =>
        createFunctionProxy(v, 'json', async (promise: Promise<any>) => {
          const json = await promise;
          const requestInfo = responseToRequestInfo.get(response);

          if (requestInfo) {
            addTextResource(requestInfo, JSON.stringify(json), convertHeaders(response.headers));
          }

          return json;
        }),
      text: (v: any, response: Response) =>
        createFunctionProxy(v, 'text', async (promise: Promise<any>) => {
          const text = await promise;
          const requestInfo = responseToRequestInfo.get(response);

          if (requestInfo) {
            addTextResource(requestInfo, text, convertHeaders(response.headers));
          }

          return text;
        }),
    };

    function createProxy(obj: any) {
      let methods;

      if (obj instanceof IDBFactory) {
        methods = idbFactoryMethods;
      } else if (obj instanceof IDBOpenDBRequest) {
        methods = idbOpenDBRequestMethods;
      } else if (obj instanceof IDBDatabase) {
        methods = idbDatabaseMethods;
      } else if (obj instanceof IDBTransaction) {
        methods = idbTransactionMethods;
      } else if (obj instanceof IDBObjectStore) {
        methods = idbObjectStoreMethods;
      } else if (obj instanceof IDBRequest) {
        methods = idbRequestMethods;
      } else if (obj instanceof Storage) {
        methods = storageMethods;
      } else if (obj instanceof Response) {
        methods = responseMethods;
      }

      assert(methods, 'Unknown object for createProxy');

      const name = methods._name;

      return new Proxy(obj, {
        get(target, prop) {
          onInterceptedOperation('ProxyGetter:' + name + '.' + String(prop));

          let value = target[prop];

          if (typeof value === 'function') {
            value = value.bind(target);
          }

          if (methods[prop]) {
            value = methods[prop](value, target);
          }

          return value;
        },

        set(target, prop, value) {
          onInterceptedOperation('ProxySetter:' + name + '.' + String(prop));
          target[prop] = value;

          return true;
        },
      });
    }

    function createFunctionProxy(fn: any, name: string, handler?: (v: any, ...args: any[]) => any) {
      return (...args: any[]) => {
        onInterceptedOperation('FunctionCall:' + name);

        const v = fn(...args);

        return handler ? handler(v, ...args) : createProxy(v);
      };
    }

    interceptProperty(window, 'indexedDB', createProxy);
    interceptProperty(window, 'localStorage', createProxy);

    const baseFetch = window.fetch;

    window.fetch = async (info, options) => {
      const url = info instanceof Request ? info.url : info.toString();
      const requestBody = typeof options?.body == 'string' ? options.body : '';
      const requestInfo: RequestInfo = { url, requestBody };

      try {
        const rv = await baseFetch(info, options);
        responseToRequestInfo.set(rv, requestInfo);

        return createProxy(rv);
      } catch (error) {
        addNetworkResource({
          url,
          requestBodyBase64: stringToBase64(requestBody),
          error: String(error),
        });
        throw error;
      }
    };
  },
);

export const recordingMessageHandlerScript = addRecordingMessageHandler.asCallString();
