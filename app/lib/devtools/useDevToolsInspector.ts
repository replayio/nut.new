/**
 * useDevToolsInspector hook
 *
 * This hook manages the react-devtools-inline frontend for element inspection
 * and selection in the preview iframe.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createBridge as createFrontendBridge,
  createStore,
  type FrontendBridge,
  type Store,
} from 'react-devtools-inline/frontend';
import { createFrontendWall, DEVTOOLS_MESSAGE_SOURCE } from './DevToolsBridge';

export interface InspectedElement {
  id: number;
  displayName: string | null;
  type: 'function' | 'class' | 'host' | 'other';
  key: string | null;
  props: Record<string, unknown>;
  state: unknown;
  hooks: unknown[] | null;
  source: {
    fileName: string | null;
    lineNumber: number | null;
    columnNumber: number | null;
  } | null;
}

export interface ElementTreeNode {
  id: number;
  displayName: string | null;
  type: number;
  depth: number;
  key: string | null;
  ownerID: number;
  parentID: number;
}

interface DevToolsState {
  isReady: boolean;
  isInspecting: boolean;
  selectedElementID: number | null;
  inspectedElement: InspectedElement | null;
  elementTree: ElementTreeNode[];
}

interface UseDevToolsInspectorOptions {
  onElementSelected?: (element: InspectedElement | null, tree: ElementTreeNode[]) => void;
  onInspectingChange?: (isInspecting: boolean) => void;
  onReady?: () => void;
}

export function useDevToolsInspector(
  contentWindow: Window | null,
  options: UseDevToolsInspectorOptions = {},
) {
  const { onElementSelected, onInspectingChange, onReady } = options;

  const [state, setState] = useState<DevToolsState>({
    isReady: false,
    isInspecting: false,
    selectedElementID: null,
    inspectedElement: null,
    elementTree: [],
  });

  const bridgeRef = useRef<FrontendBridge | null>(null);
  const storeRef = useRef<Store | null>(null);
  const wallRef = useRef<ReturnType<typeof createFrontendWall> | null>(null);

  // Initialize DevTools when contentWindow is available
  useEffect(() => {
    if (!contentWindow) {
      return;
    }

    // Create custom wall for postMessage communication
    const wall = createFrontendWall(contentWindow);
    wallRef.current = wall;

    // Create bridge and store with custom wall
    const bridge = createFrontendBridge(contentWindow, wall);
    bridgeRef.current = bridge;

    const store = createStore(bridge);
    storeRef.current = store;

    // Listen for store updates
    const handleRootsChange = () => {
      // The store has been updated with new React roots
      if (!state.isReady) {
        setState((prev) => ({ ...prev, isReady: true }));
        onReady?.();
      }
    };

    store.addListener('roots', handleRootsChange);

    // Listen for bridge events
    bridge.addListener('inspectedElement', (data: unknown) => {
      const element = data as InspectedElement | null;
      setState((prev) => ({ ...prev, inspectedElement: element }));

      if (element) {
        // Build tree from element path
        const tree = buildElementTree(store, element.id);
        onElementSelected?.(element, tree);
      }
    });

    bridge.addListener('stopInspectingNative', () => {
      setState((prev) => ({ ...prev, isInspecting: false }));
      onInspectingChange?.(false);
    });

    // Send activation message to let backend know frontend is ready
    contentWindow.postMessage(
      {
        source: DEVTOOLS_MESSAGE_SOURCE,
        type: 'activate-devtools',
      },
      '*',
    );

    return () => {
      store.removeListener('roots', handleRootsChange);
      bridge.shutdown();
      bridgeRef.current = null;
      storeRef.current = null;
      wallRef.current = null;
      setState({
        isReady: false,
        isInspecting: false,
        selectedElementID: null,
        inspectedElement: null,
        elementTree: [],
      });
    };
  }, [contentWindow, onElementSelected, onInspectingChange, onReady, state.isReady]);

  // Start inspecting (element picker mode)
  const startInspecting = useCallback(() => {
    const bridge = bridgeRef.current;
    if (!bridge) {
      return;
    }

    bridge.send('startInspectingNative');
    setState((prev) => ({ ...prev, isInspecting: true }));
    onInspectingChange?.(true);
  }, [onInspectingChange]);

  // Stop inspecting
  const stopInspecting = useCallback(() => {
    const bridge = bridgeRef.current;
    if (!bridge) {
      return;
    }

    bridge.send('stopInspectingNative');
    setState((prev) => ({ ...prev, isInspecting: false }));
    onInspectingChange?.(false);
  }, [onInspectingChange]);

  // Toggle inspection mode
  const toggleInspecting = useCallback(() => {
    if (state.isInspecting) {
      stopInspecting();
    } else {
      startInspecting();
    }
  }, [state.isInspecting, startInspecting, stopInspecting]);

  // Select a specific element by ID
  const selectElement = useCallback((elementID: number) => {
    const bridge = bridgeRef.current;
    if (!bridge) {
      return;
    }

    bridge.send('selectElement', elementID);
    setState((prev) => ({ ...prev, selectedElementID: elementID }));
  }, []);

  // Highlight an element in the iframe
  const highlightElement = useCallback((elementID: number) => {
    const bridge = bridgeRef.current;
    if (!bridge) {
      return;
    }

    bridge.send('highlightElementInDOM', elementID);
  }, []);

  // Clear element highlight
  const clearHighlight = useCallback(() => {
    const bridge = bridgeRef.current;
    if (!bridge) {
      return;
    }

    bridge.send('clearHighlightedElementInDOM');
  }, []);

  // Inspect element and get full details
  const inspectElement = useCallback((elementID: number) => {
    const bridge = bridgeRef.current;
    if (!bridge) {
      return;
    }

    bridge.send('inspectElement', {
      id: elementID,
      rendererID: 1, // Usually the first renderer
    });
  }, []);

  return {
    ...state,
    bridge: bridgeRef.current,
    store: storeRef.current,
    startInspecting,
    stopInspecting,
    toggleInspecting,
    selectElement,
    highlightElement,
    clearHighlight,
    inspectElement,
  };
}

/**
 * Build element tree path from store to a specific element
 */
function buildElementTree(store: Store, targetElementID: number): ElementTreeNode[] {
  const tree: ElementTreeNode[] = [];

  try {
    // Walk up the tree from the target element to the root
    let currentID: number | null = targetElementID;
    const visited = new Set<number>();

    while (currentID !== null && !visited.has(currentID)) {
      visited.add(currentID);

      const element = store.getElementByID(currentID);
      if (!element) {
        break;
      }

      tree.unshift({
        id: element.id,
        displayName: element.displayName,
        type: element.type,
        depth: element.depth,
        key: element.key,
        ownerID: element.ownerID,
        parentID: element.parentID,
      });

      currentID = element.parentID;
    }
  } catch (error) {
    console.warn('[DevToolsInspector] Error building element tree:', error);
  }

  return tree;
}

export default useDevToolsInspector;
