// Manage state around recording Preview behavior for generating a Replay recording.

export function assert(condition: any, message: string = "Assertion failed!"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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

interface RerecordData {
  // Contents of window.location.href.
  locationHref: string;

  // URL of the main document.
  documentUrl: string;

  // All resources accessed.
  resources: RerecordResource[];

  // All user interactions made.
  interactions: RerecordInteraction[];
}

export async function saveReplayRecording(iframe: HTMLIFrameElement) {
  assert(iframe.contentWindow);
  iframe.contentWindow.postMessage("recording-data-request", "*");

  const data = await new Promise((resolve) => {
    window.addEventListener("message", (event) => {
      if (event.data?.source == "recording-data-response") {
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(event.data.buffer);
        const data = JSON.parse(jsonString) as RerecordData;
        resolve(data);
      }
    });
  });

  console.log("RerecordData", JSON.stringify(data));
}

function addRecordingMessageHandler() {
  const resources: Map<string, RerecordResource> = new Map();
  const interactions: RerecordInteraction[] = [];
  const startTime = Date.now();

  function stringToBase64(inputString: string) {
    if (typeof inputString !== "string") {
        throw new TypeError("Input must be a string.");
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString);
    let str = "";
    for (const byte of data) {
      str += String.fromCharCode(byte);
    }
    return btoa(str);
  }

  function getScriptImports(text: string) {
    // TODO: This should use a real parser.
    const imports: string[] = [];
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      const match = line.match(/^import.*?['"]([^'")]+)/);
      if (match) {
        imports.push(match[1]);
      }
      if (line == "import {") {
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

  async function addResource(path: string) {
    const response = await fetch(path);
    const text = await response.text();
    const responseHeaders = Object.fromEntries(response.headers.entries());

    const url = (new URL(path, window.location.href)).href;

    if (!resources.has(url)) {
      resources.set(url, {
        url,
        requestBodyBase64: "",
        responseBodyBase64: stringToBase64(text),
        responseStatus: response.status,
        responseHeaders,
      });
    }

    if (responseHeaders["content-type"] == "application/javascript") {
      const imports = getScriptImports(text);
      for (const path of imports) {
        await addResource(path);
      }
    }
  }

  async function addDocumentResource() {
    const headHTML = document.head.innerHTML;
    const bodyHTML = document.body.innerHTML;
    const documentBody = `<html><head>${headHTML}</head><body>${bodyHTML}</body></html>`;

    const url = window.location.href;
    resources.set(url, {
      url,
      requestBodyBase64: "",
      responseBodyBase64: stringToBase64(documentBody),
      responseStatus: 200,
      responseHeaders: { "content-type": "text/html" },
    });
  }

  async function getRerecordData(): Promise<RerecordData> {
    const promises: Promise<void>[] = [];

    promises.push(addDocumentResource());

    // Find all script elements and add their sources to resources
    const scriptElements = document.getElementsByTagName('script');
    for (const script of scriptElements) {
      if (script.src) {
        promises.push(addResource(script.src));
      }
    }

    // Find all stylesheet links and add them to resources
    const linkElements = document.getElementsByTagName('link');
    for (const link of linkElements) {
      if (link.rel === 'stylesheet' && link.href) {
        promises.push(addResource(link.href));
      }
    }

    await Promise.all(promises);

    const data: RerecordData = {
      locationHref: window.location.href,
      documentUrl: window.location.href,
      resources: Array.from(resources.values()),
      interactions,
    };

    return data;
  }

  window.addEventListener("message", async (event) => {
    if (event.data == "recording-data-request") {
      const data = await getRerecordData();

      const encoder = new TextEncoder();
      const serializedData = encoder.encode(JSON.stringify(data));
      const buffer = serializedData.buffer;      

      window.parent.postMessage({ source: "recording-data-response", buffer }, "*", [buffer]);
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
  });

  window.addEventListener("dblclick", (event) => {
    if (event.target) {
      interactions.push({
        kind: RerecordInteractionKind.DblClick,
        time: Date.now() - startTime,
        ...getMouseEventData(event)
      });
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key) {
      interactions.push({
        kind: RerecordInteractionKind.KeyDown,
        time: Date.now() - startTime,
        ...getKeyboardEventData(event)
      });
    }
  });
}

export function injectRecordingMessageHandler(content: string) {
  const headTag = content.indexOf("<head>");
  assert(headTag != -1, "No <head> tag found");

  const headEnd = headTag + 6;

  const text = `<script>${assert} (${addRecordingMessageHandler})()</script>`;
  return content.slice(0, headEnd) + text + content.slice(headEnd);
}
