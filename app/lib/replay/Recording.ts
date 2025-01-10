// Manage state around recording Preview behavior for generating a Replay recording.

import { assert, stringToBase64, uint8ArrayToBase64 } from "./ReplayProtocolClient";

export interface SimulationResource {
  url: string;
  requestBodyBase64: string;
  responseBodyBase64: string;
  responseStatus: number;
  responseHeaders: Record<string, string>;
}

enum SimulationInteractionKind {
  Click = "click",
  DblClick = "dblclick",
  KeyDown = "keydown",
}

export interface SimulationInteraction {
  kind: SimulationInteractionKind;

  // Elapsed time when the interaction occurred.
  time: number;

  // Selector of the element associated with the interaction.
  selector: string;

  // For mouse interactions, dimensions and position within the
  // element where the event occurred.
  width?: number;
  height?: number;
  x?: number;
  y?: number;

  // For keydown interactions, the key pressed.
  key?: string;
}

interface IndexedDBAccess {
  kind: "get" | "put" | "add";
  key?: any;
  item?: any;
  storeName: string;
  databaseName: string;
  databaseVersion: number;
}

interface LocalStorageAccess {
  kind: "get" | "set";
  key: string;
  value?: string;
}

export interface SimulationData {
  // Contents of window.location.href.
  locationHref: string;

  // URL of the main document.
  documentUrl: string;

  // All resources accessed.
  resources: SimulationResource[];

  // All user interactions made.
  interactions: SimulationInteraction[];

  // All indexedDB accesses made.
  indexedDBAccesses?: IndexedDBAccess[];

  // All localStorage accesses made.
  localStorageAccesses?: LocalStorageAccess[];
}

// Our message event listener can trigger on messages from iframes we don't expect.
// This is a unique ID for the last time we injected the recording message handler
// logic into an iframe. We will ignore messages from other injected handlers.
let gLastMessageHandlerId = "";

export async function getIFrameSimulationData(iframe: HTMLIFrameElement): Promise<SimulationData> {
  assert(iframe.contentWindow);
  iframe.contentWindow.postMessage({ source: "recording-data-request" }, "*");

  const data = await new Promise((resolve) => {
    window.addEventListener("message", (event) => {
      if (event.data?.source == "recording-data-response" &&
          event.data?.messageHandlerId == gLastMessageHandlerId) {
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(event.data.buffer);
        const data = JSON.parse(jsonString) as SimulationData;
        resolve(data);
      }
    });
  });

  console.log("SimulationData", JSON.stringify(data));
  return data as SimulationData;
}

export interface MouseData {
  selector: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export async function getMouseData(iframe: HTMLIFrameElement, position: { x: number; y: number }): Promise<MouseData> {
  assert(iframe.contentWindow);
  iframe.contentWindow.postMessage({ source: "mouse-data-request", position }, "*");

  const mouseData = await new Promise((resolve) => {
    window.addEventListener("message", (event) => {
      if (event.data?.source == "mouse-data-response" &&
          event.data?.messageHandlerId == gLastMessageHandlerId) {
        resolve(event.data.mouseData);
      }
    });
  });

  return mouseData as MouseData;
}

// Add handlers to the current iframe's window.
function addRecordingMessageHandler(messageHandlerId: string) {
  const resources: Map<string, SimulationResource> = new Map();
  const interactions: SimulationInteraction[] = [];
  const indexedDBAccesses: IndexedDBAccess[] = [];
  const localStorageAccesses: LocalStorageAccess[] = [];

  const startTime = Date.now();

  function addTextResource(path: string, text: string) {
    const url = (new URL(path, window.location.href)).href;
    if (resources.has(url)) {
      return;
    }
    resources.set(url, {
      url,
      requestBodyBase64: "",
      responseBodyBase64: stringToBase64(text),
      responseStatus: 200,
      responseHeaders: {},
    });
  }

  async function getSimulationData(): Promise<SimulationData> {
    return {
      locationHref: window.location.href,
      documentUrl: window.location.href,
      resources: Array.from(resources.values()),
      interactions,
      indexedDBAccesses,
      localStorageAccesses,
    };
  }

  window.addEventListener("message", async (event) => {
    switch (event.data?.source) {
      case "recording-data-request": {
        const data = await getSimulationData();

        const encoder = new TextEncoder();
        const serializedData = encoder.encode(JSON.stringify(data));
        const buffer = serializedData.buffer;

        window.parent.postMessage({ source: "recording-data-response", buffer, messageHandlerId }, "*", [buffer]);
        break;
      }
      case "mouse-data-request": {
        const { x, y } = event.data.position;
        const element = document.elementFromPoint(x, y);
        assert(element);

        const selector = computeSelector(element);
        const rect = element.getBoundingClientRect();
        const mouseData: MouseData = {
          selector,
          width: rect.width,
          height: rect.height,
          x: x - rect.x,
          y: y - rect.y,
        };
        window.parent.postMessage({ source: "mouse-data-response", mouseData, messageHandlerId }, "*");
        break;
      }
    }
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
        if (siblings.filter(el => el.tagName === current!.tagName).length > 1) {
          selector += `:nth-child(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(" > ");
  }

  window.addEventListener("click", (event) => {
    if (event.target) {
      interactions.push({
        kind: SimulationInteractionKind.Click,
        time: Date.now() - startTime,
        ...getMouseEventData(event)
      });
    }
  }, { capture: true, passive: true });

  window.addEventListener("dblclick", (event) => {
    if (event.target) {
      interactions.push({
        kind: SimulationInteractionKind.DblClick,
        time: Date.now() - startTime,
        ...getMouseEventData(event)
      });
    }
  }, { capture: true, passive: true });

  window.addEventListener("keydown", (event) => {
    if (event.key) {
      interactions.push({
        kind: SimulationInteractionKind.KeyDown,
        time: Date.now() - startTime,
        ...getKeyboardEventData(event)
      });
    }
  }, { capture: true, passive: true });

  function onInterceptedOperation(name: string) {
    console.log(`InterceptedOperation ${name}`);
  }

  function interceptProperty(
    obj: object,
    prop: string,
    interceptor: (basevalue: any) => any
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    assert(descriptor?.get, "Property must have a getter");

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
    _name: "IDBFactory",
    open: (v: any) => createFunctionProxy(v, "open"),
  };

  const IDBOpenDBRequestMethods = {
    _name: "IDBOpenDBRequest",
    result: createProxy,
  };

  const IDBDatabaseMethods = {
    _name: "IDBDatabase",
    transaction: (v: any) => createFunctionProxy(v, "transaction"),
  };

  const IDBTransactionMethods = {
    _name: "IDBTransaction",
    objectStore: (v: any) => createFunctionProxy(v, "objectStore"),
  };

  function pushIndexedDBAccess(
    request: IDBRequest,
    kind: IndexedDBAccess["kind"],
    key: any,
    item: any
  ) {
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
    _name: "IDBObjectStore",
    get: (v: any) =>
      createFunctionProxy(v, "get", (request, key) => {
        // Wait to add the request until the value is known.
        getRequestKeys.set(request, key);
        return createProxy(request);
      }),
    put: (v: any) =>
      createFunctionProxy(v, "put", (request, item, key) => {
        pushIndexedDBAccess(request, "put", key, item);
        return createProxy(request);
      }),
    add: (v: any) =>
      createFunctionProxy(v, "add", (request, item, key) => {
        pushIndexedDBAccess(request, "add", key, item);
        return createProxy(request);
      }),
  };

  const IDBRequestMethods = {
    _name: "IDBRequest",
    result: (value: any, target: any) => {
      const key = getRequestKeys.get(target);
      if (key) {
        pushIndexedDBAccess(target, "get", key, value);
      }
      return value;
    },
  };

  function pushLocalStorageAccess(
    kind: LocalStorageAccess["kind"],
    key: string,
    value?: string
  ) {
    localStorageAccesses.push({ kind, key, value });
  }

  const StorageMethods = {
    _name: "Storage",
    getItem: (v: any) =>
      createFunctionProxy(v, "getItem", (value: string, key: string) => {
        pushLocalStorageAccess("get", key, value);
        return value;
      }),
    setItem: (v: any) =>
      createFunctionProxy(v, "setItem", (_rv: undefined, key: string) => {
        pushLocalStorageAccess("set", key);
      }),
  };

  // Map Response to the triggering URL before redirects.
  const responseToURL = new WeakMap<Response, string>();

  const ResponseMethods = {
    _name: "Response",
    json: (v: any, response: Response) =>
      createFunctionProxy(v, "json", async (promise: Promise<any>) => {
        const json = await promise;
        const url = responseToURL.get(response);
        if (url) {
          addTextResource(url, JSON.stringify(json));
        }
        return json;
      }),
    text: (v: any, response: Response) =>
      createFunctionProxy(v, "text", async (promise: Promise<any>) => {
        const text = await promise;
        const url = responseToURL.get(response);
        if (url) {
          addTextResource(url, text);
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
    assert(methods, "Unknown object for createProxy");
    const name = methods._name;

    return new Proxy(obj, {
      get(target, prop) {
        onInterceptedOperation(`ProxyGetter:${name}.${String(prop)}`);
        let value = target[prop];
        if (typeof value === "function") {
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

  function createFunctionProxy(
    fn: any,
    name: string,
    handler?: (v: any, ...args: any[]) => any
  ) {
    return (...args: any[]) => {
      onInterceptedOperation(`FunctionCall:${name}`);
      const v = fn(...args);
      return handler ? handler(v, ...args) : createProxy(v);
    };
  }

  interceptProperty(window, "indexedDB", createProxy);
  interceptProperty(window, "localStorage", createProxy);

  const baseFetch = window.fetch;
  window.fetch = async (info, options) => {
    const rv = await baseFetch(info, options);
    const url = info instanceof Request ? info.url : info.toString();
    responseToURL.set(rv, url);
    return createProxy(rv);
  };
}

const RecordingMessageHandlerScriptPrefix = `
    <script>
      ${assert}
      ${stringToBase64}
      ${uint8ArrayToBase64}
      (${addRecordingMessageHandler})
`;

export function injectRecordingMessageHandler(content: string) {
  const headTag = content.indexOf("<head>");
  assert(headTag != -1, "No <head> tag found");

  const headEnd = headTag + 6;

  gLastMessageHandlerId = Math.random().toString(36).substring(2, 15);

  const text = `${RecordingMessageHandlerScriptPrefix}("${gLastMessageHandlerId}")</script>`;

  return content.slice(0, headEnd) + text + content.slice(headEnd);
}

export function removeRecordingMessageHandler(content: string) {
  const index = content.indexOf(RecordingMessageHandlerScriptPrefix);
  if (index == -1) {
    return content;
  }
  const prefix = content.substring(0, index);

  const suffixStart = index + RecordingMessageHandlerScriptPrefix.length;

  const closeScriptTag = "</script>";
  const closeScriptIndex = content.indexOf(closeScriptTag, suffixStart);
  assert(closeScriptIndex != -1, "No </script> tag found");
  const suffix = content.substring(closeScriptIndex + closeScriptTag.length);

  return prefix + suffix;
}
