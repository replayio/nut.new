import type { RefObject } from 'react';

let gCurrentIFrameRef: RefObject<HTMLIFrameElement> | undefined;

export function setCurrentIFrameRef(ref: RefObject<HTMLIFrameElement> | undefined) {
  gCurrentIFrameRef = ref;
}

export function getCurrentIFrame() {
  return gCurrentIFrameRef?.current ?? undefined;
}
