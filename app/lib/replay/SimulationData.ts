// Data structures for simulation.

export const SimulationDataVersion = "0.1";

// Simulation data specifying the server URL to connect to for static resources.
interface SimulationPacketServerURL {
  kind: "serverURL";
  url: string;
}

// Simulation data specifying the contents of the repository to set up a dev server
// for static resources.
interface SimulationPacketRepositoryContents {
  kind: "repositoryContents";
  contents: string; // base64 encoded zip of the repository.
}

// Simulation data specifying the contents of window.location.href.
interface SimulationPacketLocationHref {
  kind: "locationHref";
  href: string;
}

// Simulation data specifying the URL of the main document.
interface SimulationPacketDocumentURL {
  kind: "documentURL";
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
  kind: "resource";
  resource: NetworkResource;
}

export type UserInteractionKind = "click" | "dblclick" | "keydown";

export interface UserInteraction {
  kind: UserInteractionKind;

  // Elapsed time when the interaction occurred.
  time: number;

  // Selector of the element associated with the interaction.
  selector: string;

  // For mouse interactions, dimensions and position within the
  // element where the event occurred.
  width?: number;
  height?: number;
  x?: number;
  y?: number;

  // For keydown interactions, the key pressed.
  key?: string;
}

interface SimulationPacketInteraction {
  kind: "interaction";
  interaction: UserInteraction;
}

export interface WebSocketCreate {
  kind: "create";
  socketId: number;
  url: string;
}

interface WebSocketClose {
  kind: "close";
  socketId: number;
  code: number;
  reason: string;
}

export interface WebSocketSend {
  kind: "send";
  socketId: number;
  binary: boolean;
  text?: string;
  encodedLength: number;
}

interface WebSocketConnected {
  kind: "connected";
  socketId: number;
  subprotocol: string;
  extensions: string;
}

export interface WebSocketNewMessage {
  kind: "newMessage";
  socketId: number;
  binary: boolean;
  text?: string;
  encodedLength: number;
}

interface WebSocketOnError {
  kind: "onError";
  socketId: number;
}

interface WebSocketOnClose {
  kind: "onClose";
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
  kind: "websocket";
  event: WebSocketEvent;
}

export interface IndexedDBAccess {
  kind: "get" | "put" | "add";
  key?: any;
  item?: any;
  storeName: string;
  databaseName: string;
  databaseVersion: number;
}

interface SimulationPacketIndexedDB {
  kind: "indexedDB";
  access: IndexedDBAccess;
}

export interface LocalStorageAccess {
  kind: "get" | "set";
  key: string;
  value?: string;
}

interface SimulationPacketLocalStorage {
  kind: "localStorage";
  access: LocalStorageAccess;
}

export type SimulationPacket =
  | SimulationPacketServerURL
  | SimulationPacketRepositoryContents
  | SimulationPacketLocationHref
  | SimulationPacketDocumentURL
  | SimulationPacketResource
  | SimulationPacketInteraction
  | SimulationPacketWebSocket
  | SimulationPacketIndexedDB
  | SimulationPacketLocalStorage;

export type SimulationData = SimulationPacket[];
