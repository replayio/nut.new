/**
 * DevTools Context for sharing DevTools inspector instance across components
 */

import { createContext, useContext, type ReactNode } from 'react';

interface DevToolsHighlightMethods {
  highlightElement: (elementID: number) => void;
  clearHighlight: () => void;
  isReady: boolean;
  useDevToolsMode: boolean;
}

const DevToolsContext = createContext<DevToolsHighlightMethods | null>(null);

export function useDevToolsContext() {
  return useContext(DevToolsContext);
}

export const DevToolsProvider = DevToolsContext.Provider;

export type { DevToolsHighlightMethods };
