'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

function formatEntityType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function FilterLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground mb-1 block">
      {children}
    </label>
  );
}

export interface AuditFilterBarProps {
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

export function AuditFilterBar({
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
            <FilterLabel htmlFor="entity-type-filter">Entity Type</FilterLabel>
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
            <FilterLabel htmlFor="action-filter">Action</FilterLabel>
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
            <FilterLabel htmlFor="user-search">User ID</FilterLabel>
            <Input
              id="user-search"
              placeholder="Filter by user ID..."
              value={userSearch}
              onChange={(e) => onUserSearch(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <FilterLabel htmlFor="date-from">From Date</FilterLabel>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFrom(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <FilterLabel htmlFor="date-to">To Date</FilterLabel>
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
