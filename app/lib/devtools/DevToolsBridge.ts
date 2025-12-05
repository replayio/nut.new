/**
 * DevTools Bridge for cross-origin iframe communication with react-devtools-inline
 *
 * This module creates a custom "wall" that enables react-devtools-inline to communicate
 * with a React application running in a cross-origin iframe via postMessage.
 */

// Message types for DevTools communication
export const DEVTOOLS_MESSAGE_SOURCE = '@@react-devtools';

export interface DevToolsMessage {
  source: typeof DEVTOOLS_MESSAGE_SOURCE;
  event: string;
  payload: unknown;
}

export interface DevToolsWall {
  listen: (listener: (message: { event: string; payload: unknown }) => void) => void;
  send: (event: string, payload?: unknown) => void;
}

/**
 * Creates a wall for the DevTools frontend (runs in main window)
 * This wall sends messages to the iframe and listens for responses
 */
export function createFrontendWall(contentWindow: Window): DevToolsWall {
  const listeners: Array<(message: { event: string; payload: unknown }) => void> = [];

  // Listen for messages from iframe
  const handleMessage = (event: MessageEvent) => {
    if (event.source !== contentWindow) {
      return;
    }

    const data = event.data;
    if (data?.source !== DEVTOOLS_MESSAGE_SOURCE) {
      return;
    }

    listeners.forEach((listener) => {
      listener({ event: data.event, payload: data.payload });
    });
  };

  window.addEventListener('message', handleMessage);

  return {
    listen(listener) {
      listeners.push(listener);
    },
    send(event, payload) {
      try {
        contentWindow.postMessage(
          {
            source: DEVTOOLS_MESSAGE_SOURCE,
            event,
            payload,
          },
          '*',
        );
      } catch (error) {
        console.warn('[DevToolsBridge] Failed to send message to iframe:', error);
      }
    },
  };
}

/**
 * Creates a wall for the DevTools backend (runs in iframe)
 * This is exported for use in the iframe application
 */
export function createBackendWall(windowObject: Window = window): DevToolsWall {
  const listeners: Array<(message: { event: string; payload: unknown }) => void> = [];

  // Listen for messages from parent window
  const handleMessage = (event: MessageEvent) => {
    const data = event.data;
    if (data?.source !== DEVTOOLS_MESSAGE_SOURCE) {
      return;
    }

    listeners.forEach((listener) => {
      listener({ event: data.event, payload: data.payload });
    });
  };

  windowObject.addEventListener('message', handleMessage);

  return {
    listen(listener) {
      listeners.push(listener);
    },
    send(event, payload) {
      try {
        // Send to parent window
        if (windowObject.parent && windowObject.parent !== windowObject) {
          windowObject.parent.postMessage(
            {
              source: DEVTOOLS_MESSAGE_SOURCE,
              event,
              payload,
            },
            '*',
          );
        }
      } catch (error) {
        console.warn('[DevToolsBridge] Failed to send message to parent:', error);
      }
    },
  };
}

/**
 * Cleanup function to remove event listeners
 */
export function cleanupWall(wall: DevToolsWall, windowObject: Window = window): void {
  // The wall holds references to listeners internally
  // This is a placeholder for more sophisticated cleanup if needed
}
