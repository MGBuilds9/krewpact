'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetchList } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface LedgerEntry {
  id: string;
  item_id: string;
  item_name: string | null;
  txn_type: string;
  qty: number;
  unit_cost: number | null;
  location_id: string | null;
  location_name: string | null;
  project_id: string | null;
  project_name: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
}

interface UseTransactionLedgerOptions {
  divisionId?: string;
  txnType?: string;
  search?: string;
  itemId?: string;
  limit?: number;
  offset?: number;
}

export function useTransactionLedger(options?: UseTransactionLedgerOptions) {
  const { divisionId, txnType, search, itemId, limit, offset } = options ?? {};

  return useQuery({
    queryKey: queryKeys.transactionLedger.list({
      divisionId,
      txnType,
      search,
      itemId,
      limit,
      offset,
    }),
    queryFn: () =>
      apiFetchList<LedgerEntry>('/api/inventory/ledger', {
        params: {
          division_id: divisionId,
          txn_type: txnType,
          search,
          item_id: itemId,
          limit,
          offset,
        },
      }),
    staleTime: 15_000,
  });
}
