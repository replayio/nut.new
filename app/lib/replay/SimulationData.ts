// Data structures for simulation.

export const simulationDataVersion = '0.1';

// Simulation data specifying the server URL to connect to for static resources.
interface SimulationPacketServerURL {
  kind: 'serverURL';
  url: string;
}

/*
 * Simulation data specifying the contents of the repository to set up a dev server
 * for static resources.
 */
interface SimulationPacketRepositoryContents {
  kind: 'repositoryContents';
  contents: string; // base64 encoded zip of the repository.
}

// Simulation data specifying the viewport size
interface SimulationPacketViewport {
  kind: 'viewport';
  size: ViewportSize;
}

// Simulation data specifying the contents of window.location.href.
interface SimulationPacketLocationHref {
  kind: 'locationHref';
  href: string;
}

// Simulation data specifying the URL of the main document.
interface SimulationPacketDocumentURL {
  kind: 'documentURL';
  url: string;
}

export interface NetworkResource {
  url: string;
  error?: string;
  requestBodyBase64?: string;
  responseBodyBase64?: string;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
}

interface SimulationPacketResource {
  kind: 'resource';
  resource: NetworkResource;
}

export type UserInteractionKind = 'click' | 'pointermove' | 'keydown' | 'scroll';

export interface UserInteraction {
  kind: UserInteractionKind;

  // Elapsed time when the interaction occurred.
  time: number;

  // Selector of the element associated with the interaction, if any.
  selector?: string;

  /*
   * For mouse interactions, dimensions and position within the
   * element where the event occurred.
   */
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  button?: number;
  clickCount?: number;

  // For keydown interactions, the key pressed.
  key?: string;

  // For scroll interactions, the scroll position of the window and the targeted element.
  windowScrollX?: number;
  windowScrollY?: number;
  targetScrollX?: number;
  targetScrollY?: number;
}

interface SimulationPacketInteraction {
  kind: 'interaction';
  interaction: UserInteraction;
}

export interface WebSocketCreate {
  kind: 'create';
  socketId: number;
  url: string;
}

interface WebSocketClose {
  kind: 'close';
  socketId: number;
  code: number;
  reason: string;
}

export interface WebSocketSend {
  kind: 'send';
  socketId: number;
  binary: boolean;
  text?: string;
  encodedLength: number;
}

interface WebSocketConnected {
  kind: 'connected';
  socketId: number;
  subprotocol: string;
  extensions: string;
}

export interface WebSocketNewMessage {
  kind: 'newMessage';
  socketId: number;
  binary: boolean;
  text?: string;
  encodedLength: number;
}

interface WebSocketOnError {
  kind: 'onError';
  socketId: number;
}

interface WebSocketOnClose {
  kind: 'onClose';
  socketId: number;
}

export type WebSocketEvent =
  | WebSocketCreate
  | WebSocketClose
  | WebSocketSend
  | WebSocketConnected
  | WebSocketNewMessage
  | WebSocketOnError
  | WebSocketOnClose;

interface SimulationPacketWebSocket {
  kind: 'websocket';
  event: WebSocketEvent;
}

export interface IndexedDBAccess {
  kind: 'get' | 'put' | 'add';
  key?: any;
  item?: any;
  storeName: string;
  databaseName: string;
  databaseVersion: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

interface SimulationPacketIndexedDB {
  kind: 'indexedDB';
  access: IndexedDBAccess;
}

export interface LocalStorageAccess {
  kind: 'get' | 'set';
  key: string;
  value?: string;
}

interface SimulationPacketLocalStorage {
  kind: 'localStorage';
  access: LocalStorageAccess;
}

type SimulationPacketBase =
  | SimulationPacketServerURL
  | SimulationPacketRepositoryContents
  | SimulationPacketViewport
  | SimulationPacketLocationHref
  | SimulationPacketDocumentURL
  | SimulationPacketResource
  | SimulationPacketInteraction
  | SimulationPacketWebSocket
  | SimulationPacketIndexedDB
  | SimulationPacketLocalStorage;

export type SimulationPacket = SimulationPacketBase & { time?: string };
export type SimulationData = SimulationPacket[];
