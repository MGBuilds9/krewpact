/**
 * Background sync using expo-background-fetch + expo-task-manager.
 *
 * iOS caveat: Background fetch timing is NOT guaranteed. iOS decides
 * when to invoke based on app usage patterns. We register the task
 * but also trigger sync on app foreground for reliability.
 *
 * Android: More reliable, runs approximately at the requested interval.
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { processQueue } from './sync-engine';
import { getOnlineState } from './online-detector';
import { countByStatus } from './store';

const BACKGROUND_SYNC_TASK = 'KREWPACT_BACKGROUND_SYNC';

/**
 * Define the background sync task.
 * Must be called at module scope (outside of components).
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    if (!getOnlineState()) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const counts = await countByStatus();
    if (counts.pending === 0 && counts.failed === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const results = await processQueue();
    const hasNew = results.some((r) => r.success);

    return hasNew
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background sync task.
 * Call once during app initialization.
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      // User has disabled background refresh — sync only on foreground
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {
    // Background fetch not available — sync only on foreground
  }
}

/**
 * Unregister background sync (for cleanup).
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Check if background sync is registered and available.
 */
export async function isBackgroundSyncAvailable(): Promise<{
  registered: boolean;
  status: BackgroundFetch.BackgroundFetchStatus | null;
}> {
  const status = await BackgroundFetch.getStatusAsync();
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

  return { registered, status };
}
