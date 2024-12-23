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

  async function addResource(url: string) {
    const response = await fetch(url);
    const text = await response.text();
    const responseHeaders = Object.fromEntries(response.headers.entries());

    if (!resources.has(url)) {
      resources.set(url, {
        url,
        requestBodyBase64: "",
        responseBodyBase64: stringToBase64(text),
        responseStatus: response.status,
        responseHeaders,
      });
    }

    if (responseHeaders["content-type"] == "text/html") {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const scriptElements = doc.getElementsByTagName('script');
        for (const script of scriptElements) {
          if (script.src) {
            await addResource(script.src);
          }
        }
      } catch (e) {
        console.error("AddResourceError", e);
      }
    }
  }

  async function getRerecordData(): Promise<RerecordData> {
    const promises: Promise<void>[] = [];
    promises.push(addResource(window.location.href));

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
  const bodyTag = content.indexOf("<body>");
  assert(bodyTag != -1, "No <body> tag found");

  const bodyStart = bodyTag + 6;

  const text = `<script>(${addRecordingMessageHandler})()</script>`;
  return content.slice(0, bodyStart) + text + content.slice(bodyStart);
}
