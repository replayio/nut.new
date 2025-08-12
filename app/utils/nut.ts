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

export function navigateApp(appId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/app/${appId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/app/${appId}`;
  url.search = '';
  window.history.replaceState({}, '', url);
}
