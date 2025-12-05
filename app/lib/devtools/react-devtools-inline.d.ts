/**
 * Type declarations for react-devtools-inline
 *
 * These types are based on the react-devtools-inline API.
 * Note: react-devtools-inline doesn't ship with official TypeScript types.
 */

declare module 'react-devtools-inline/frontend' {
  import type { ComponentType } from 'react';

  export interface Wall {
    listen: (listener: (message: { event: string; payload: unknown }) => void) => void;
    send: (event: string, payload?: unknown) => void;
  }

  export interface FrontendBridge {
    send: (event: string, payload?: unknown) => void;
    addListener: (event: string, callback: (data: unknown) => void) => void;
    removeListener: (event: string, callback: (data: unknown) => void) => void;
    shutdown: () => void;
  }

  export interface Element {
    id: number;
    displayName: string | null;
    type: number;
    depth: number;
    key: string | null;
    ownerID: number;
    parentID: number;
    weight: number;
  }

  export interface Store {
    addListener: (event: string, callback: () => void) => void;
    removeListener: (event: string, callback: () => void) => void;
    getElementByID: (id: number) => Element | null;
    getRootIDForElement: (id: number) => number | null;
    roots: ReadonlyArray<number>;
  }

  export interface DevToolsProps {
    bridge: FrontendBridge;
    store: Store;
    browserTheme?: 'light' | 'dark';
    enabledInspectedElementContextMenu?: boolean;
    hookNamesModuleLoaderFunction?: () => Promise<unknown>;
    showTabBar?: boolean;
    warnIfLegacyBackendDetected?: boolean;
    warnIfUnsupportedVersionDetected?: boolean;
    viewAttributeSourceFunction?: (id: number, path: Array<string | number>) => void;
    viewElementSourceFunction?: (id: number) => void;
  }

  export function initialize(contentWindow: Window, options?: { bridge?: FrontendBridge; store?: Store }): ComponentType<DevToolsProps>;

  export function createBridge(contentWindow: Window, wall?: Wall): FrontendBridge;

  export function createStore(bridge: FrontendBridge, config?: { supportsReloadAndProfile?: boolean }): Store;
}

declare module 'react-devtools-inline/backend' {
  export interface Wall {
    listen: (listener: (message: { event: string; payload: unknown }) => void) => void;
    send: (event: string, payload?: unknown) => void;
  }

  export interface BackendBridge {
    send: (event: string, payload?: unknown) => void;
    addListener: (event: string, callback: (data: unknown) => void) => void;
    removeListener: (event: string, callback: (data: unknown) => void) => void;
    shutdown: () => void;
  }

  export interface ActivateOptions {
    bridge?: BackendBridge;
  }

  export function initialize(windowOrGlobal: Window | typeof globalThis): void;

  export function activate(windowOrGlobal: Window | typeof globalThis, options?: ActivateOptions): void;

  export function createBridge(windowOrGlobal: Window | typeof globalThis, wall?: Wall): BackendBridge;
}

declare module 'react-devtools-inline/hookNames' {
  export function parseHookNames(
    hooksTree: unknown,
    locationKeyToHookSourceAndMetadata: Map<string, unknown>
  ): Promise<Map<string, string>>;
}
