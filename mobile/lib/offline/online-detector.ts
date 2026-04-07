/**
 * Online/offline detector for React Native (mobile).
 *
 * Uses AppState + fetch heartbeat instead of navigator.onLine
 * (which doesn't exist in React Native).
 *
 * Same API surface as lib/offline/online-detector.ts (web).
 */

import { AppState, AppStateStatus } from 'react-native';
import { API_BASE_URL } from '@/constants/config';

/** Heartbeat interval: 30 seconds */
const HEARTBEAT_INTERVAL_MS = 30_000;

/** Heartbeat request timeout: 5 seconds */
const HEARTBEAT_TIMEOUT_MS = 5_000;

type OnlineChangeCallback = (isOnline: boolean) => void;

let currentOnlineState = true;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
const subscribers = new Set<OnlineChangeCallback>();

function notifySubscribers(): void {
  for (const cb of subscribers) {
    cb(currentOnlineState);
  }
}

function setOnlineState(isOnline: boolean): void {
  if (currentOnlineState === isOnline) return;
  currentOnlineState = isOnline;
  notifySubscribers();
}

/**
 * Perform a heartbeat check by pinging the health endpoint.
 */
export async function heartbeatCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

function handleAppStateChange(nextState: AppStateStatus): void {
  if (nextState === 'active') {
    // App came to foreground — check connectivity immediately
    void forceCheck();
  }
}

/**
 * Start monitoring online/offline status.
 * Listens for app state changes and runs periodic heartbeats.
 */
export function startMonitoring(): void {
  // Check connectivity on app foreground
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  // Initial check
  void heartbeatCheck().then((reachable) => {
    setOnlineState(reachable);
  });

  // Periodic heartbeat
  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(async () => {
      const reachable = await heartbeatCheck();
      setOnlineState(reachable);
    }, HEARTBEAT_INTERVAL_MS);
  }
}

/**
 * Stop monitoring. Removes listeners and clears heartbeat.
 */
export function stopMonitoring(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * Subscribe to online/offline state changes.
 * Returns an unsubscribe function.
 */
export function subscribe(cb: OnlineChangeCallback): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/** Get the current online state */
export function getOnlineState(): boolean {
  return currentOnlineState;
}

/**
 * Force a heartbeat check right now.
 */
export async function forceCheck(): Promise<boolean> {
  const reachable = await heartbeatCheck();
  setOnlineState(reachable);
  return reachable;
}
