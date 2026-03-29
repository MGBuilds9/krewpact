/**
 * Online/offline detector with heartbeat verification.
 *
 * navigator.onLine is unreliable (returns true on captive portals,
 * false positive on some mobile networks). We supplement it with
 * periodic heartbeat pings to the health endpoint.
 *
 * This module is framework-agnostic — React hooks wrap it.
 */

/** Default heartbeat interval: 30 seconds */
const HEARTBEAT_INTERVAL_MS = 30_000;

/** Heartbeat request timeout: 5 seconds */
const HEARTBEAT_TIMEOUT_MS = 5_000;

/** Health endpoint to ping */
const HEALTH_ENDPOINT = '/api/health';

type OnlineChangeCallback = (isOnline: boolean) => void;

let currentOnlineState = true;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<OnlineChangeCallback>();

/** Notify all subscribers of a state change */
function notifySubscribers(): void {
  for (const cb of subscribers) {
    cb(currentOnlineState);
  }
}

/**
 * Update online state and notify if changed.
 * Only fires callbacks when the state actually transitions.
 */
function setOnlineState(isOnline: boolean): void {
  if (currentOnlineState === isOnline) return;
  currentOnlineState = isOnline;
  notifySubscribers();
}

/**
 * Perform a heartbeat check by pinging the health endpoint.
 * Returns true if the server is reachable.
 */
export async function heartbeatCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      HEARTBEAT_TIMEOUT_MS,
    );

    const response = await fetch(HEALTH_ENDPOINT, {
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

/**
 * Handle browser online/offline events.
 * These fire immediately but may be inaccurate — heartbeat confirms.
 */
function handleOnlineEvent(): void {
  // Optimistically set online, heartbeat will correct if wrong
  setOnlineState(true);
}

function handleOfflineEvent(): void {
  setOnlineState(false);
}

/**
 * Start monitoring online/offline status.
 * Attaches browser event listeners and starts heartbeat polling.
 */
export function startMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Set initial state from browser
  currentOnlineState = navigator.onLine;

  // Browser events for immediate feedback
  window.addEventListener('online', handleOnlineEvent);
  window.addEventListener('offline', handleOfflineEvent);

  // Heartbeat for accuracy
  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(async () => {
      const reachable = await heartbeatCheck();
      setOnlineState(reachable);
    }, HEARTBEAT_INTERVAL_MS);
  }
}

/**
 * Stop monitoring. Removes event listeners and clears heartbeat.
 */
export function stopMonitoring(): void {
  if (typeof window === 'undefined') return;

  window.removeEventListener('online', handleOnlineEvent);
  window.removeEventListener('offline', handleOfflineEvent);

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
 * Force a heartbeat check right now (useful after regaining focus).
 */
export async function forceCheck(): Promise<boolean> {
  const reachable = await heartbeatCheck();
  setOnlineState(reachable);
  return reachable;
}
