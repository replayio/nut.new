import { pingTelemetry } from '~/lib/hooks/pingTelemetry';
import { createScopedLogger } from '~/utils/logger';
import { createInjectableFunction } from './injectable';

const replayWsServer = 'wss://dispatch.replay.io';

export function assert(condition: any, message: string = 'Assertion failed!'): asserts condition {
  if (!condition) {
    // eslint-disable-next-line no-debugger
    debugger;
    throw new Error(message);
  }
}

export function generateRandomId() {
  return Math.random().toString(16).substring(2, 10);
}

export function defer<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: any) => void } {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

export function waitForTime(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function uint8ArrayToBase64(data: Uint8Array) {
  let str = '';

  for (const byte of data) {
    str += String.fromCharCode(byte);
  }

  return btoa(str);
}

export const stringToBase64 = createInjectableFunction({ uint8ArrayToBase64 }, (deps, inputString: string) => {
  const { uint8ArrayToBase64 } = deps;

  if (typeof inputString !== 'string') {
    throw new TypeError('Input must be a string.');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(inputString);

  return uint8ArrayToBase64(data);
});

class ProtocolError extends Error {
  protocolCode;
  protocolMessage;
  protocolData;

  constructor(error: any) {
    super(`protocol error ${error.code}: ${error.message}`);

    this.protocolCode = error.code;
    this.protocolMessage = error.message;
    this.protocolData = error.data ?? {};
  }

  toString() {
    return `Protocol error ${this.protocolCode}: ${this.protocolMessage}`;
  }
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

type EventListener = (params: any) => void;

const logger = createScopedLogger('ReplayProtocolClient');

let gNextClientId = 1;

export class ProtocolClient {
  clientId = gNextClientId++;
  openDeferred = createDeferred<void>();
  eventListeners = new Map<string, Set<EventListener>>();
  nextMessageId = 1;
  pendingCommands = new Map<number, { method: string; deferred: Deferred<any>; errorHandled: boolean }>();
  socket: WebSocket;

  constructor() {
    this.trace(`Creating for ${replayWsServer}`);

    this.socket = new WebSocket(replayWsServer);

    this.socket.addEventListener('close', this.onSocketClose);
    this.socket.addEventListener('error', this.onSocketError);
    this.socket.addEventListener('open', this.onSocketOpen);
    this.socket.addEventListener('message', this.onSocketMessage);

    this.listenForMessage('Recording.sessionError', (error: any) => {
      this.trace(`Session error: ${error}`);
    });
  }

  trace(msg: string, tags: Record<string, any> = {}) {
    logger.trace(`ReplayClient:${this.clientId}`, msg, JSON.stringify(tags));
  }

  initialize() {
    return this.openDeferred.promise;
  }

  close() {
    this.trace(`Closing`);
    this.socket.close();

    for (const info of this.pendingCommands.values()) {
      info.deferred.reject(new Error('Client destroyed'));
    }
    this.pendingCommands.clear();
  }

  listenForMessage(method: string, callback: (params: any) => void) {
    let listeners = this.eventListeners.get(method);

    if (listeners == null) {
      listeners = new Set([callback]);

      this.eventListeners.set(method, listeners);
    } else {
      listeners.add(callback);
    }

    return () => {
      listeners.delete(callback);
    };
  }

  sendCommand(args: { method: string; params: any; sessionId?: string; errorHandled?: boolean }) {
    const id = this.nextMessageId++;

    const { method, params, sessionId, errorHandled = false } = args;
    this.trace('Sending command', { id, method, params, sessionId });

    const command = {
      id,
      method,
      params,
      sessionId,
    };

    this.socket.send(JSON.stringify(command));

    const deferred = createDeferred();
    this.pendingCommands.set(id, { method, deferred, errorHandled });

    return deferred.promise;
  }

  onSocketClose = () => {
    this.trace('Socket closed');
  };

  onSocketError = (error: any) => {
    this.trace(`Socket error ${error}`);
  };

  onSocketMessage = (event: MessageEvent) => {
    const { error, id, method, params, result } = JSON.parse(String(event.data));

    if (id) {
      const info = this.pendingCommands.get(id);
      assert(info, `Received message with unknown id: ${id}`);

      this.pendingCommands.delete(id);

      if (result) {
        info.deferred.resolve(result);
      } else if (error) {
        if (info.errorHandled) {
          console.log('ProtocolErrorHandled', info.method, id, error);
        } else {
          pingTelemetry('ProtocolError', { method: info.method, error });
          console.error('ProtocolError', info.method, id, error);
        }
        info.deferred.reject(new ProtocolError(error));
      } else {
        info.deferred.reject(new Error('Channel error'));
      }
    } else if (this.eventListeners.has(method)) {
      const callbacks = this.eventListeners.get(method);

      if (callbacks) {
        callbacks.forEach((callback) => callback(params));
      }
    } else {
      this.trace('Received message without a handler', { method, params });
    }
  };

  onSocketOpen = async () => {
    this.trace('Socket opened');
    this.openDeferred.resolve();
  };
}

// Send a single command with a one-use protocol client.
export async function sendCommandDedicatedClient(args: { method: string; params: any }) {
  const client = new ProtocolClient();
  await client.initialize();

  try {
    const rval = await client.sendCommand(args);
    client.close();

    return rval;
  } finally {
    client.close();
  }
}
