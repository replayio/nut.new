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

export function stringToBase64(inputString: string) {
  if (typeof inputString !== 'string') {
    throw new TypeError('Input must be a string.');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(inputString);

  return uint8ArrayToBase64(data);
}
