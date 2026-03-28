'use client';

import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

let mediaQueryList: MediaQueryList | null = null;
let currentIsMobile = false;
const listeners = new Set<() => void>();

function ensureMediaQueryList() {
  if (typeof window === 'undefined' || mediaQueryList) {
    return;
  }

  mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);
  currentIsMobile = mediaQueryList.matches;

  const handleChange = () => {
    currentIsMobile = mediaQueryList?.matches ?? false;
    for (const listener of listeners) {
      listener();
    }
  };

  mediaQueryList.addEventListener('change', handleChange);
}

function subscribe(listener: () => void) {
  ensureMediaQueryList();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  ensureMediaQueryList();
  return currentIsMobile;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
