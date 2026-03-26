'use client';

import { useCallback, useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { useUsers } from '@/hooks/useUsers';

import { AuditFilterBar } from './_components/AuditFilterBar';
import { AuditTable } from './_components/AuditTable';

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface AuditLogResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AuditLogPage() {
  const { data: users } = useUsers();
  const userNameMap = new Map((users ?? []).map((u) => [u.id, [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email]));
  const resolveUser = (userId: string) => userNameMap.get(userId) ?? userId.slice(0, 8);

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAuditLog = useCallback(async () => {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (entityType) params.set('entity_type', entityType);
    if (action) params.set('action', action);
    if (userSearch) params.set('user_id', userSearch);
    if (dateFrom) params.set('date_from', new Date(dateFrom).toISOString());
    if (dateTo) params.set('date_to', new Date(dateTo).toISOString());
    try {
      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `HTTP ${res.status}`); }
      const data: AuditLogResponse = await res.json();
      setEntries(data.data); setTotal(data.total);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally { setLoading(false); }
  }, [page, pageSize, entityType, action, userSearch, dateFrom, dateTo]);

  useEffect(() => { fetchAuditLog(); }, [fetchAuditLog]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resetTo1 = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  return (
    <>
      <title>Audit Log — KrewPact</title>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-1">Track all changes across the platform. Filter by entity, action, user, or date range.</p>
        </div>
        {error && <Card className="border-destructive"><CardContent className="pt-6"><p className="text-destructive text-sm">{error}</p></CardContent></Card>}
        <AuditFilterBar
          entityType={entityType} action={action} userSearch={userSearch} dateFrom={dateFrom} dateTo={dateTo} total={total}
          onEntityType={resetTo1(setEntityType)} onAction={resetTo1(setAction)} onUserSearch={resetTo1(setUserSearch)}
          onDateFrom={resetTo1(setDateFrom)} onDateTo={resetTo1(setDateTo)}
          onReset={() => { setEntityType(''); setAction(''); setUserSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}
        />
        <AuditTable
          loading={loading} entries={entries} page={page} totalPages={totalPages} pageSize={pageSize}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          resolveUser={resolveUser}
        />
      </div>
    </>
  );
}
