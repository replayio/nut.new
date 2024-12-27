// Manage state around recording Preview behavior for generating a Replay recording.

import { assert, sendCommandDedicatedClient, stringToBase64, uint8ArrayToBase64 } from "./ReplayProtocolClient";

interface RerecordResource {
  url: string;
  requestBodyBase64: string;
  responseBodyBase64: string;
  responseStatus: number;
  responseHeaders: Record<string, string>;
}

enum RerecordInteractionKind {
  Click = "click",
  DblClick = "dblclick",
  KeyDown = "keydown",
}

export interface RerecordInteraction {
  kind: RerecordInteractionKind;

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

interface RerecordData {
  // Contents of window.location.href.
  locationHref: string;

  // URL of the main document.
  documentUrl: string;

  // All resources accessed.
  resources: RerecordResource[];

  // All user interactions made.
  interactions: RerecordInteraction[];

  // All indexedDB accesses made.
  indexedDBAccesses?: IndexedDBAccess[];

  // All localStorage accesses made.
  localStorageAccesses?: LocalStorageAccess[];
}

// This is in place to workaround some insane behavior where messages are being
// sent by iframes running older versions of the recording data logic, even after
// quitting and restarting the entire browser. Maybe related to webcontainers?
const RecordingDataVersion = 2;

export async function saveReplayRecording(iframe: HTMLIFrameElement) {
  assert(iframe.contentWindow);
  iframe.contentWindow.postMessage({ source: "recording-data-request" }, "*");

  const data = await new Promise((resolve) => {
    window.addEventListener("message", (event) => {
      if (event.data?.source == "recording-data-response" &&
          event.data?.version == RecordingDataVersion) {
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(event.data.buffer);
        const data = JSON.parse(jsonString) as RerecordData;
        resolve(data);
      }
    });
  });

  console.log("RerecordData", JSON.stringify(data));

  const rerecordRval = await sendCommandDedicatedClient({
    method: "Recording.globalExperimentalCommand",
    params: {
      name: "rerecordGenerate",
      params: {
        rerecordData: data,
        // FIXME the backend should not require an API key for this command.
        // For now we use an API key used in Replay's devtools (which is public
        // but probably shouldn't be).
        apiKey: "rwk_b6mnJ00rI4pzlwkYmggmmmV1TVQXA0AUktRHoo4vGl9",
        // FIXME the backend currently requires this but shouldn't.
        recordingId: "dummy-recording-id",
      },
    },
  });

  console.log("RerecordRval", rerecordRval);

  const recordingId = (rerecordRval as any).rval.rerecordedRecordingId as string;
  console.log("CreatedRecording", recordingId);
  return recordingId;
}

export async function getMouseData(iframe: HTMLIFrameElement, position: { x: number; y: number }) {
  assert(iframe.contentWindow);
  iframe.contentWindow.postMessage({ source: "mouse-data-request", position }, "*");

  const mouseData = await new Promise((resolve) => {
    window.addEventListener("message", (event) => {
      if (event.data?.source == "mouse-data-response") {
        resolve(event.data.mouseData);
      }
    });
  });

  return mouseData;
}

function addRecordingMessageHandler() {
  const resources: Map<string, RerecordResource> = new Map();
  const interactions: RerecordInteraction[] = [];
  const indexedDBAccesses: IndexedDBAccess[] = [];
  const localStorageAccesses: LocalStorageAccess[] = [];

  // Promises which will resolve when all resources have been added.
  const promises: Promise<void>[] = [];

  // Set of URLs which are currently being fetched.
  const pendingFetches = new Set<string>();

  const startTime = Date.now();

  function getScriptImports(text: string) {
    // TODO: This should use a real parser.
    const imports: string[] = [];
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      let match = line.match(/^import.*?['"]([^'")]+)/);
      if (match) {
        imports.push(match[1]);
      }
      match = line.match(/^export.*?from ['"]([^'")]+)/);
      if (match) {
        imports.push(match[1]);
      }
      if (line == "import {" || line == "export {") {
        for (let i = index + 1; i < lines.length; i++) {
          const match = lines[i].match(/} from ['"]([^'")]+)/);
          if (match) {
            imports.push(match[1]);
            break;
          }
        }
      }
    });
    return imports;
  }

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

  async function fetchAndAddResource(path: string) {
    pendingFetches.add(path);
    const response = await baseFetch(path);
    pendingFetches.delete(path);

    const text = await response.text();
    const responseHeaders = Object.fromEntries(response.headers.entries());

    const url = (new URL(path, window.location.href)).href;
    if (resources.has(url)) {
      return;
    }

    resources.set(url, {
      url,
      requestBodyBase64: "",
      responseBodyBase64: stringToBase64(text),
      responseStatus: response.status,
      responseHeaders,
    });

    const contentType = responseHeaders["content-type"];

    // MIME types that can contain JS.
    const JavaScriptMimeTypes = ["application/javascript", "text/javascript", "text/html"];

    if (JavaScriptMimeTypes.includes(contentType)) {
      const imports = getScriptImports(text);
      for (const path of imports) {
        promises.push(fetchAndAddResource(path));
      }
    }

    if (contentType == "text/html") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const scripts = doc.querySelectorAll("script");
      for (const script of scripts) {
        promises.push(fetchAndAddResource(script.src));
      }
    }
  }

  async function getRerecordData(): Promise<RerecordData> {
    // For now we only deal with cases where there is a single HTML page whose
    // contents are expected to be filled in by the client code. We do this to
    // avoid difficulties in exactly emulating the webcontainer's behavior when
    // generating the recording.
    let htmlContents = "<html><body>";

    // Vite needs this to be set for the react plugin to work.
    htmlContents += "<script>window.__vite_plugin_react_preamble_installed__ = true;</script>";

    // Find all script elements and add them to the document.
    const scriptElements = document.getElementsByTagName('script');
    [...scriptElements].forEach((script, index) => {
      let src = script.src;
      if (src) {
        promises.push(fetchAndAddResource(src));
      } else {
        assert(script.textContent, "Script element has no src and no text content");
        const path = `script-${index}.js`;
        addTextResource(path, script.textContent);
      }
      const { origin } = new URL(window.location.href);
      if (src.startsWith(origin)) {
        src = src.slice(origin.length);
      }
      htmlContents += `<script src="${src}" type="${script.type}"></script>`;
    });

    // Find all inline styles and add them to the document.
    const cssElements = document.getElementsByTagName('style');
    for (const style of cssElements) {
      htmlContents += `<style>${style.textContent}</style>`;
    }

    // Find all stylesheet links and add them to the document.
    const linkElements = document.getElementsByTagName('link');
    for (const link of linkElements) {
      if (link.rel === 'stylesheet' && link.href) {
        promises.push(fetchAndAddResource(link.href));
        htmlContents += `<link rel="stylesheet" href="${link.href}">`;
      }
    }

    // React needs a root element to mount into.
    htmlContents += "<div id='root'></div>";

    htmlContents += "</body></html>";

    addTextResource(window.location.href, htmlContents);

    const interval = setInterval(() => {
      console.log("PendingFetches", pendingFetches.size, pendingFetches);
    }, 1000);

    while (true) {
      const length = promises.length;
      await Promise.all(promises);
      if (promises.length == length) {
        break;
      }
    }

    clearInterval(interval);

    const data: RerecordData = {
      locationHref: window.location.href,
      documentUrl: window.location.href,
      resources: Array.from(resources.values()),
      interactions,
      indexedDBAccesses,
      localStorageAccesses,
    };

    return data;
  }

  window.addEventListener("message", async (event) => {
    switch (event.data?.source) {
      case "recording-data-request": {
        const data = await getRerecordData();

        const encoder = new TextEncoder();
        const serializedData = encoder.encode(JSON.stringify(data));
        const buffer = serializedData.buffer;

        window.parent.postMessage({ source: "recording-data-response", buffer, version: RecordingDataVersion }, "*", [buffer]);
        break;
      }
      case "mouse-data-request": {
        const { x, y } = event.data.position;
        const element = document.elementFromPoint(x, y);
        assert(element);

        const selector = computeSelector(element);
        const rect = element.getBoundingClientRect();
        const mouseData = {
          selector,
          width: rect.width,
          height: rect.height,
          x: x - rect.x,
          y: y - rect.y,
        };
        window.parent.postMessage({ source: "mouse-data-response", mouseData }, "*");
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
        kind: RerecordInteractionKind.Click,
        time: Date.now() - startTime,
        ...getMouseEventData(event)
      });
    }
  }, { capture: true, passive: true });

  window.addEventListener("dblclick", (event) => {
    if (event.target) {
      interactions.push({
        kind: RerecordInteractionKind.DblClick,
        time: Date.now() - startTime,
        ...getMouseEventData(event)
      });
    }
  }, { capture: true, passive: true });

  window.addEventListener("keydown", (event) => {
    if (event.key) {
      interactions.push({
        kind: RerecordInteractionKind.KeyDown,
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

export function injectRecordingMessageHandler(content: string) {
  const headTag = content.indexOf("<head>");
  assert(headTag != -1, "No <head> tag found");

  const headEnd = headTag + 6;

  const text = `
    <script>
      ${assert}
      ${stringToBase64}
      ${uint8ArrayToBase64}
      const RecordingDataVersion = ${RecordingDataVersion};
      (${addRecordingMessageHandler})()
    </script>
  `;

  return content.slice(0, headEnd) + text + content.slice(headEnd);
}
