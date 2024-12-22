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

  window.addEventListener("message", (event) => {
    if (event.data?.source == "recording-data-response") {
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(event.data.buffer);
      const data = JSON.parse(jsonString);

      console.log("ParentReceivedResponse", data);
    }
  });

  const data: RerecordData = {
    locationHref: iframe.src,
    documentUrl: iframe.src,
    resources: [],
    interactions: [],
  };

  console.log("RerecordData", data);
}

function addRecordingMessageHandler() {
  window.addEventListener("message", (event) => {
    if (event.data == "recording-data-request") {
      const data = { data: 42 };

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
