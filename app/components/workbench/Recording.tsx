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

interface RerecordInteraction {
  kind: "click";

  // Elapsed time when the interaction occurred.
  time: number;

  // Selector of the element clicked.
  selector: string;

  // Dimensions of the element clicked.
  width: number;
  height: number;

  // Position within the element which was clicked.
  x: number;
  y: number;
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
      interactions: [],
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
}

export function injectRecordingMessageHandler(content: string) {
  const headTag = content.indexOf("<head>");
  assert(headTag != -1, "No <head> tag found");

  const headEnd = headTag + 6;

  const text = `<script>(${addRecordingMessageHandler})()</script>`;
  return content.slice(0, headEnd) + text + content.slice(headEnd);
}
