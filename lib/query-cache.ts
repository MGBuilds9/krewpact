import type { QueryClient, QueryKey } from '@tanstack/react-query';

import type { PaginatedResponse } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export const divisionScopedQueryKeys = [
  queryKeys.dashboard.all,
  queryKeys.leads.all,
  queryKeys.accounts.all,
  queryKeys.contacts.all,
  queryKeys.opportunities.all,
  queryKeys.estimates.all,
  queryKeys.projects.all,
  queryKeys.tasks.all,
  queryKeys.notifications.all,
  queryKeys.executive.all,
  queryKeys.icps.all,
  queryKeys.inventoryItems.all,
  queryKeys.inventoryStock.all,
  queryKeys.inventoryLocations.all,
  queryKeys.purchaseOrders.all,
  queryKeys.fleetVehicles.all,
  queryKeys.serials.all,
  queryKeys.transactionLedger.all,
  queryKeys.expenses.all,
  queryKeys.takeoff.all,
] as const satisfies readonly QueryKey[];

export async function invalidateQueryFamilies(queryClient: QueryClient, keys: readonly QueryKey[]) {
  try {
    await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  } catch {
    // Best-effort invalidation. Individual cache misses or transient fetch errors should not
    // break the caller's control flow.
  }
}

export function updateArrayQueryData<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (current: T[]) => T[],
) {
  queryClient.setQueryData<T[]>(queryKey, (current) =>
    updater(Array.isArray(current) ? current : []),
  );
}

export function updatePaginatedQueryData<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (current: PaginatedResponse<T> | undefined) => PaginatedResponse<T> | undefined,
) {
  queryClient.setQueryData<PaginatedResponse<T> | undefined>(queryKey, (current) =>
    updater(current),
  );
}

export function updateArrayQueryFamily<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (current: T[]) => T[],
) {
  for (const [matchedKey] of queryClient.getQueriesData<T[]>({ queryKey })) {
    updateArrayQueryData<T>(queryClient, matchedKey, updater);
  }
}

export function prependById<T extends { id: string }>(current: T[], nextItem: T) {
  return [nextItem, ...current.filter((item) => item.id !== nextItem.id)];
}

export function replaceById<T extends { id: string }>(current: T[], nextItem: T) {
  return current.map((item) => (item.id === nextItem.id ? nextItem : item));
}

export function removeById<T extends { id: string }>(current: T[], itemId: string) {
  return current.filter((item) => item.id !== itemId);
}
