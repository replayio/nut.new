// Interface for sending messages to the handler in the preview iframe.

type Compute<T> = { [K in keyof T]: T[K] } & unknown;

export interface DetectedError {
  time: string;
  message: string;
  details?: string;
  data: unknown;
}

export type MessageHandlerRequestMap = {
  'recording-data': {
    payload: unknown;
    response: ArrayBufferLike;
  };
  'mouse-data': {
    payload: { x: number; y: number };
    response: unknown;
  };
  'get-detected-errors': {
    payload: unknown;
    response: DetectedError[];
  };
};

export type MessageHandlerRequest = {
  [K in keyof MessageHandlerRequestMap]: Compute<
    { request: K } & (undefined extends MessageHandlerRequestMap[K]['payload']
      ? { payload?: MessageHandlerRequestMap[K]['payload'] }
      : { payload: MessageHandlerRequestMap[K]['payload'] })
  >;
}[keyof MessageHandlerRequestMap];
