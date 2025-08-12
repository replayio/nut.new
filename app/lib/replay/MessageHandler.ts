// Methods for communicating with the message handler in the Preview iframe.

import { type MessageHandlerRequest, type MessageHandlerRequestMap } from './MessageHandlerInterface';
import { assert } from '~/utils/nut';

let lastRequestId = 0;

function sendIframeRequest<K extends keyof MessageHandlerRequestMap>(
  iframe: HTMLIFrameElement,
  request: Extract<MessageHandlerRequest, { request: K }>,
) {
  if (!iframe.contentWindow) {
    return undefined;
  }

  const target = iframe.contentWindow;
  const requestId = ++lastRequestId;
  target.postMessage({ id: requestId, request, source: '@@replay-nut' }, '*');

  return new Promise<MessageHandlerRequestMap[K]['response']>((resolve) => {
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

// User session data generated for analysis by the backend.
export type SessionData = unknown;

export async function getIFrameSessionData(iframe: HTMLIFrameElement): Promise<SessionData> {
  const buffer = await sendIframeRequest(iframe, { request: 'recording-data' });

  if (!buffer) {
    return undefined;
  }

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(new Uint8Array(buffer));

  return JSON.parse(jsonString) as SessionData;
}

// Information about a mouse position in the iframe.
export type MouseData = unknown;

export async function getMouseData(iframe: HTMLIFrameElement, position: { x: number; y: number }): Promise<MouseData> {
  const mouseData = await sendIframeRequest(iframe, { request: 'mouse-data', payload: position });
  assert(mouseData, 'Expected to have mouse data');

  return mouseData;
}
