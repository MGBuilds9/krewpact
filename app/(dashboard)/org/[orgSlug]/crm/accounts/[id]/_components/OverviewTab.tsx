'use client';

import { Globe, Mail, Phone, Tag } from 'lucide-react';

import { AccountForm } from '@/components/CRM/AccountForm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { useAccount } from '@/hooks/useCRM';

type AccountData = NonNullable<ReturnType<typeof useAccount>['data']>;

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface OverviewTabProps {
  account: AccountData;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  contactCount: number;
  oppCount: number;
}

// eslint-disable-next-line max-lines-per-function
export function OverviewTab({
  account,
  isEditing,
  setIsEditing,
  contactCount,
  oppCount,
}: OverviewTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Account' : 'Account Information'}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <AccountForm
            account={account}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Account Type</dt>
              <dd className="text-sm capitalize">{account.account_type || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Industry</dt>
              <dd className="text-sm">{account.industry || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
              <dd className="text-sm">
                {account.phone ? (
                  <a
                    href={`tel:${account.phone}`}
                    className="hover:underline flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    {account.phone}
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="text-sm">
                {account.email ? (
                  <a
                    href={`mailto:${account.email}`}
                    className="hover:underline flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    {account.email}
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Website</dt>
              <dd className="text-sm">
                {account.website ? (
                  <a
                    href={account.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1 text-primary"
                  >
                    <Globe className="h-3 w-3" />
                    {account.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Source</dt>
              <dd className="text-sm capitalize">{account.source || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Total Projects</dt>
              <dd className="text-sm">{account.total_projects ?? 0}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Lifetime Revenue</dt>
              <dd className="text-sm font-medium">{formatCurrency(account.lifetime_revenue)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">First Project</dt>
              <dd className="text-sm">{formatDate(account.first_project_date)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Last Project</dt>
              <dd className="text-sm">{formatDate(account.last_project_date)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Repeat Client</dt>
              <dd className="text-sm">
                {account.is_repeat_client ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                    Yes
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="text-sm">{formatDate(account.created_at)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Contacts</dt>
              <dd className="text-sm">{contactCount}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Opportunities</dt>
              <dd className="text-sm">{oppCount}</dd>
            </div>
            {account.tags && account.tags.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Tags
                </dt>
                <dd className="flex flex-wrap gap-1">
                  {account.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
            {account.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
                <dd className="text-sm whitespace-pre-wrap">{account.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
