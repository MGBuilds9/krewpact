import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, NetworkFirst, Serwist, StaleWhileRevalidate } from 'serwist';

// Service Worker type augmentations (webworker lib not in main tsconfig)
interface SyncEvent extends Event {
  tag: string;
  waitUntil(promise: Promise<unknown>): void;
}

interface SWMessageEvent extends Event {
  data: Record<string, unknown> | undefined;
}

interface SWClient {
  postMessage(message: unknown): void;
}

interface SWClients {
  matchAll(options?: { type?: string }): Promise<SWClient[]>;
}

interface SWSync {
  register(tag: string): Promise<void>;
}

interface SWRegistration {
  sync?: SWSync;
}

interface SWGlobalScope extends SerwistGlobalConfig {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  clients: SWClients;
  registration: SWRegistration;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface WorkerGlobalScope extends SWGlobalScope {}
}

declare const self: WorkerGlobalScope & typeof globalThis;

/** Background sync tag for offline queue processing */
const OFFLINE_SYNC_TAG = 'krewpact-offline-sync';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API routes: network-first with 5s timeout, fall back to cache
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
      }),
    },
    // Static assets: cache-first (fonts, images, etc.)
    {
      matcher: ({ request }) => request.destination === 'font' || request.destination === 'image',
      handler: new CacheFirst({
        cacheName: 'static-assets',
      }),
    },
    // JS/CSS: stale-while-revalidate
    {
      matcher: ({ request }) => request.destination === 'script' || request.destination === 'style',
      handler: new StaleWhileRevalidate({
        cacheName: 'app-shell',
      }),
    },
    // Everything else: default cache strategies
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

// ============================================================
// Background Sync for offline queue
// ============================================================

self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === OFFLINE_SYNC_TAG) {
    syncEvent.waitUntil(processOfflineQueue());
  }
});

/**
 * Process the offline queue from the service worker context.
 * Posts a message to all clients to trigger sync via the main thread.
 * If no windows are open, re-registers the sync tag so it fires when
 * a window opens next.
 */
async function processOfflineQueue(): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window' });

  if (clients.length > 0) {
    // Preferred: delegate to main thread (has auth context)
    for (const client of clients) {
      client.postMessage({ type: 'OFFLINE_SYNC_TRIGGER', tag: OFFLINE_SYNC_TAG });
    }
  } else {
    // No windows open — re-register sync tag so it fires when a window opens.
    try {
      if (self.registration.sync) {
        await self.registration.sync.register(OFFLINE_SYNC_TAG);
      }
    } catch {
      // sync.register can fail if already registered — that's fine
    }
  }
}

/**
 * Listen for sync registration requests from the main thread.
 */
self.addEventListener('message', (event: Event) => {
  const msgEvent = event as SWMessageEvent;
  if (msgEvent.data?.type === 'REGISTER_SYNC') {
    if (self.registration.sync) {
      void self.registration.sync.register(OFFLINE_SYNC_TAG);
    }
  }
});

serwist.addEventListeners();
