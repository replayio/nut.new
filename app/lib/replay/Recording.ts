// Manage state around recording Preview behavior for generating a Replay recording.

import { assert, stringToBase64, uint8ArrayToBase64 } from './ReplayProtocolClient';
import type {
  IndexedDBAccess,
  LocalStorageAccess,
  NetworkResource,
  SimulationData,
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
  assert(iframe.contentWindow);

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
  return sendIframeRequest(iframe, { request: 'mouse-data', payload: position });
}

// Add handlers to the current iframe's window.
function addRecordingMessageHandler() {
  const resources: NetworkResource[] = [];
  const interactions: UserInteraction[] = [];
  const indexedDBAccesses: IndexedDBAccess[] = [];
  const localStorageAccesses: LocalStorageAccess[] = [];

  const startTime = Date.now();

  interface RequestInfo {
    url: string;
    requestBody: string;
  }

  function addTextResource(info: RequestInfo, text: string, responseHeaders: Record<string, string>) {
    const url = new URL(info.url, window.location.href).href;
    resources.push({
      url,
      requestBodyBase64: stringToBase64(info.requestBody),
      responseBodyBase64: stringToBase64(text),
      responseStatus: 200,
      responseHeaders,
    });
  }

  async function getSimulationData(): Promise<SimulationData> {
    const data: SimulationData = [];

    data.push({
      kind: 'locationHref',
      href: window.location.href,
    });
    data.push({
      kind: 'documentURL',
      url: window.location.href,
    });
    for (const resource of resources) {
      data.push({
        kind: 'resource',
        resource,
      });
    }
    for (const interaction of interactions) {
      data.push({
        kind: 'interaction',
        interaction,
      });
    }
    for (const indexedDBAccess of indexedDBAccesses) {
      data.push({
        kind: 'indexedDB',
        access: indexedDBAccess,
      });
    }
    for (const localStorageAccess of localStorageAccesses) {
      data.push({
        kind: 'localStorage',
        access: localStorageAccess,
      });
    }

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
  }

  window.addEventListener('message', async (event) => {
    if (event.data?.source !== '@@replay-nut') {
      return;
    }

    const response = await handleRequest(event.data.request);
    window.parent.postMessage({ id: event.data.id, response, source: '@@replay-nut' }, '*');
  });

  // Evaluated function to find the selector and associated data.
  function getMouseEventData(event: MouseEvent) {
    assert(event.target);

    const target = event.target as Element;
    const selector = computeSelector(target);
    const rect = target.getBoundingClientRect();

    return {
      selector,
      width: rect.width,
      height: rect.height,
      x: event.clientX - rect.x,
      y: event.clientY - rect.y,
    };
  }

  function getKeyboardEventData(event: KeyboardEvent) {
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
        path.unshift(`#${current.id}`);
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
          selector += `:nth-child(${index})`;
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
        interactions.push({
          kind: 'click',
          time: Date.now() - startTime,
          ...getMouseEventData(event),
        });
      }
    },
    { capture: true, passive: true },
  );

  window.addEventListener(
    'dblclick',
    (event) => {
      if (event.target) {
        interactions.push({
          kind: 'dblclick',
          time: Date.now() - startTime,
          ...getMouseEventData(event),
        });
      }
    },
    { capture: true, passive: true },
  );

  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key) {
        interactions.push({
          kind: 'keydown',
          time: Date.now() - startTime,
          ...getKeyboardEventData(event),
        });
      }
    },
    { capture: true, passive: true },
  );

  function onInterceptedOperation(name: string) {
    console.log(`InterceptedOperation ${name}`);
  }

  function interceptProperty(obj: object, prop: string, interceptor: (basevalue: any) => any) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    assert(descriptor?.get, 'Property must have a getter');

    let interceptValue: any;
    Object.defineProperty(obj, prop, {
      ...descriptor,
      get() {
        onInterceptedOperation(`Getter:${prop}`);
        if (!interceptValue) {
          const baseValue = (descriptor?.get as any).call(obj);
          interceptValue = interceptor(baseValue);
        }
        return interceptValue;
      },
    });
  }

  const IDBFactoryMethods = {
    _name: 'IDBFactory',
    open: (v: any) => createFunctionProxy(v, 'open'),
  };

  const IDBOpenDBRequestMethods = {
    _name: 'IDBOpenDBRequest',
    result: createProxy,
  };

  const IDBDatabaseMethods = {
    _name: 'IDBDatabase',
    transaction: (v: any) => createFunctionProxy(v, 'transaction'),
  };

  const IDBTransactionMethods = {
    _name: 'IDBTransaction',
    objectStore: (v: any) => createFunctionProxy(v, 'objectStore'),
  };

  function pushIndexedDBAccess(request: IDBRequest, kind: IndexedDBAccess['kind'], key: any, item: any) {
    indexedDBAccesses.push({
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

  const IDBObjectStoreMethods = {
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

  const IDBRequestMethods = {
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
    localStorageAccesses.push({ kind, key, value });
  }

  const StorageMethods = {
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

  const ResponseMethods = {
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
      methods = IDBFactoryMethods;
    } else if (obj instanceof IDBOpenDBRequest) {
      methods = IDBOpenDBRequestMethods;
    } else if (obj instanceof IDBDatabase) {
      methods = IDBDatabaseMethods;
    } else if (obj instanceof IDBTransaction) {
      methods = IDBTransactionMethods;
    } else if (obj instanceof IDBObjectStore) {
      methods = IDBObjectStoreMethods;
    } else if (obj instanceof IDBRequest) {
      methods = IDBRequestMethods;
    } else if (obj instanceof Storage) {
      methods = StorageMethods;
    } else if (obj instanceof Response) {
      methods = ResponseMethods;
    }
    assert(methods, 'Unknown object for createProxy');
    const name = methods._name;

    return new Proxy(obj, {
      get(target, prop) {
        onInterceptedOperation(`ProxyGetter:${name}.${String(prop)}`);
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
        onInterceptedOperation(`ProxySetter:${name}.${String(prop)}`);
        target[prop] = value;
        return true;
      },
    });
  }

  function createFunctionProxy(fn: any, name: string, handler?: (v: any, ...args: any[]) => any) {
    return (...args: any[]) => {
      onInterceptedOperation(`FunctionCall:${name}`);
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
      resources.push({
        url,
        requestBodyBase64: stringToBase64(requestBody),
        error: String(error),
      });
      throw error;
    }
  };
}

export const recordingMessageHandlerScript = `
      ${assert}
      ${stringToBase64}
      ${uint8ArrayToBase64}
      (${addRecordingMessageHandler})()
`;
