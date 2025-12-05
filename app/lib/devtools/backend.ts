/**
 * DevTools Backend Setup for iframe
 *
 * This module should be loaded in the iframe BEFORE React is loaded.
 * It sets up the react-devtools-inline backend and establishes communication
 * with the parent window's frontend.
 *
 * Usage in iframe:
 * ```
 * // This MUST be imported/executed before React!
 * import { setupDevToolsBackend } from 'path/to/devtools/backend';
 * setupDevToolsBackend();
 *
 * // Now you can import React
 * import React from 'react';
 * import ReactDOM from 'react-dom/client';
 * ```
 */

import {
  activate as activateBackend,
  createBridge as createBackendBridge,
  initialize as initializeBackend,
} from 'react-devtools-inline/backend';
import { createBackendWall, DEVTOOLS_MESSAGE_SOURCE } from './DevToolsBridge';

let isInitialized = false;
let isActivated = false;

/**
 * Initialize the DevTools backend in the iframe.
 * This MUST be called before React is loaded.
 */
export function initializeDevToolsBackend(windowObject: Window = window): void {
  if (isInitialized) {
    console.warn('[DevToolsBackend] Already initialized');
    return;
  }

  // Initialize the global hook before React loads
  initializeBackend(windowObject);
  isInitialized = true;

  // Listen for activation message from parent window
  const handleMessage = (event: MessageEvent) => {
    const data = event.data;

    // Handle activation message from frontend
    if (data?.source === DEVTOOLS_MESSAGE_SOURCE && data?.type === 'activate-devtools') {
      if (!isActivated) {
        activateDevToolsBackend(windowObject);
      }
    }
  };

  windowObject.addEventListener('message', handleMessage);

  // Notify parent that backend is ready to be activated
  if (windowObject.parent && windowObject.parent !== windowObject) {
    windowObject.parent.postMessage(
      {
        source: DEVTOOLS_MESSAGE_SOURCE,
        type: 'devtools-backend-ready',
      },
      '*',
    );
  }
}

/**
 * Activate the DevTools backend after the frontend is ready.
 * This should be called after receiving activation message from parent.
 */
export function activateDevToolsBackend(windowObject: Window = window): void {
  if (!isInitialized) {
    console.warn('[DevToolsBackend] Must initialize before activating');
    return;
  }

  if (isActivated) {
    console.warn('[DevToolsBackend] Already activated');
    return;
  }

  // Create custom wall for communication with parent window
  const wall = createBackendWall(windowObject);

  // Create bridge with custom wall
  const bridge = createBackendBridge(windowObject, wall);

  // Activate the backend with the bridge
  activateBackend(windowObject, { bridge });
  isActivated = true;
}

/**
 * Combined setup function - initializes and waits for activation.
 * Call this before importing React.
 */
export function setupDevToolsBackend(windowObject: Window = window): void {
  initializeDevToolsBackend(windowObject);
}

/**
 * Check if DevTools backend is initialized
 */
export function isDevToolsInitialized(): boolean {
  return isInitialized;
}

/**
 * Check if DevTools backend is activated
 */
export function isDevToolsActivated(): boolean {
  return isActivated;
}

export default setupDevToolsBackend;
