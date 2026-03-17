'use client';

import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

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

const ENTITY_TYPES = [
  'project',
  'lead',
  'contact',
  'account',
  'opportunity',
  'estimate',
  'invoice',
  'task',
  'milestone',
  'document',
  'user',
];
const ACTIONS = ['create', 'update', 'delete'];
const PAGE_SIZES = [25, 50, 100];
const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' });
}

function formatEntityType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {['f-1', 'f-2', 'f-3', 'f-4'].map((id) => (
          <Skeleton key={id} className="h-10 w-full sm:w-40" />
        ))}
      </div>
      <div className="space-y-2">
        {['r-1', 'r-2', 'r-3', 'r-4', 'r-5', 'r-6', 'r-7', 'r-8'].map((id) => (
          <Skeleton key={id} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

interface AuditFilterBarProps {
  entityType: string;
  action: string;
  userSearch: string;
  dateFrom: string;
  dateTo: string;
  total: number;
  onEntityType: (v: string) => void;
  onAction: (v: string) => void;
  onUserSearch: (v: string) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  onReset: () => void;
}
function AuditFilterBar({
  entityType,
  action,
  userSearch,
  dateFrom,
  dateTo,
  total,
  onEntityType,
  onAction,
  onUserSearch,
  onDateFrom,
  onDateTo,
  onReset,
}: AuditFilterBarProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label
              htmlFor="entity-type-filter"
              className="text-xs font-medium text-muted-foreground mb-1 block"
            >
              Entity Type
            </label>
            <select
              id="entity-type-filter"
              value={entityType}
              onChange={(e) => onEntityType(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">All Types</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatEntityType(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="action-filter"
              className="text-xs font-medium text-muted-foreground mb-1 block"
            >
              Action
            </label>
            <select
              id="action-filter"
              value={action}
              onChange={(e) => onAction(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">All Actions</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="user-search"
              className="text-xs font-medium text-muted-foreground mb-1 block"
            >
              User ID
            </label>
            <Input
              id="user-search"
              placeholder="Filter by user ID..."
              value={userSearch}
              onChange={(e) => onUserSearch(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label
              htmlFor="date-from"
              className="text-xs font-medium text-muted-foreground mb-1 block"
            >
              From Date
            </label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFrom(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label
              htmlFor="date-to"
              className="text-xs font-medium text-muted-foreground mb-1 block"
            >
              To Date
            </label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => onDateTo(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={onReset}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Reset filters
          </button>
          <span className="text-xs text-muted-foreground">
            {total} {total === 1 ? 'entry' : 'entries'} found
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface AuditTableProps {
  loading: boolean;
  entries: AuditEntry[];
  page: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  onPrev: () => void;
  onNext: () => void;
}
function AuditTable({
  loading,
  entries,
  page,
  totalPages,
  pageSize,
  onPageSizeChange,
  onPrev,
  onNext,
}: AuditTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              Showing page {page} of {totalPages}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-xs text-muted-foreground">
              Per page:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSkeleton />
        ) : entries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">No audit entries found</p>
            <p className="text-muted-foreground text-xs mt-1">
              Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Entity Type</th>
                  <th className="pb-2 font-medium">Entity Name</th>
                  <th className="pb-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2 whitespace-nowrap text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="py-2 font-mono text-xs">{entry.user_id}</td>
                    <td className="py-2">
                      <Badge variant={ACTION_VARIANTS[entry.action] || 'outline'}>
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="py-2">{formatEntityType(entry.entity_type)}</td>
                    <td className="py-2">{entry.entity_name || '—'}</td>
                    <td className="py-2 max-w-[200px] truncate text-xs text-muted-foreground">
                      {entry.details ? JSON.stringify(entry.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && entries.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={onPrev}
              disabled={page <= 1}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={onNext}
              disabled={page >= totalPages}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AuditLogPage() {
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
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (entityType) params.set('entity_type', entityType);
    if (action) params.set('action', action);
    if (userSearch) params.set('user_id', userSearch);
    if (dateFrom) params.set('date_from', new Date(dateFrom).toISOString());
    if (dateTo) params.set('date_to', new Date(dateTo).toISOString());
    try {
      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: AuditLogResponse = await res.json();
      setEntries(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entityType, action, userSearch, dateFrom, dateTo]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleFilterReset() {
    setEntityType('');
    setAction('');
    setUserSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }
  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }
  function handleEntityType(v: string) {
    setEntityType(v);
    setPage(1);
  }
  function handleAction(v: string) {
    setAction(v);
    setPage(1);
  }
  function handleUserSearch(v: string) {
    setUserSearch(v);
    setPage(1);
  }
  function handleDateFrom(v: string) {
    setDateFrom(v);
    setPage(1);
  }
  function handleDateTo(v: string) {
    setDateTo(v);
    setPage(1);
  }

  return (
    <>
      <title>Audit Log — KrewPact</title>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track all changes across the platform. Filter by entity, action, user, or date range.
          </p>
        </div>
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}
        <AuditFilterBar
          entityType={entityType}
          action={action}
          userSearch={userSearch}
          dateFrom={dateFrom}
          dateTo={dateTo}
          total={total}
          onEntityType={handleEntityType}
          onAction={handleAction}
          onUserSearch={handleUserSearch}
          onDateFrom={handleDateFrom}
          onDateTo={handleDateTo}
          onReset={handleFilterReset}
        />
        <AuditTable
          loading={loading}
          entries={entries}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>
    </>
  );
}
