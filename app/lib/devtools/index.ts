/**
 * React DevTools Inline integration for iframe element inspection
 *
 * This module provides both frontend (main window) and backend (iframe) integration
 * for react-devtools-inline.
 *
 * Frontend (main window) usage:
 * ```
 * import { useDevToolsInspector } from '~/lib/devtools';
 *
 * const { startInspecting, isReady } = useDevToolsInspector(iframeContentWindow, {
 *   onElementSelected: (element, tree) => { ... }
 * });
 * ```
 *
 * Backend (iframe) usage - must be imported before React:
 * ```
 * import { setupDevToolsBackend } from '~/lib/devtools/backend';
 * setupDevToolsBackend();
 * // Now import React...
 * ```
 */

export { createFrontendWall, createBackendWall, DEVTOOLS_MESSAGE_SOURCE } from './DevToolsBridge';
export type { DevToolsWall, DevToolsMessage } from './DevToolsBridge';

export { useDevToolsInspector } from './useDevToolsInspector';
export type { InspectedElement, ElementTreeNode } from './useDevToolsInspector';

export { DevToolsProvider, useDevToolsContext } from './DevToolsContext';
export type { DevToolsHighlightMethods } from './DevToolsContext';

// Backend exports (for use in iframe only - do not import in main window)
// Import directly from './backend' to avoid bundling issues:
// import { setupDevToolsBackend } from '~/lib/devtools/backend';
