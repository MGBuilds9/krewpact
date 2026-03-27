'use client';

import { Plus } from 'lucide-react';
import dynamic from 'next/dynamic';

import { LineItemEditor } from '@/components/Estimates/LineItemEditor';
import { TotalsPanel } from '@/components/Estimates/TotalsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEstimate, useEstimateLines, useEstimateVersions } from '@/hooks/useEstimates';
import { useEstimateAllowances, useEstimateAlternates } from '@/hooks/useEstimating';

const VersionHistory = dynamic(
  () => import('@/components/Estimates/VersionHistory').then((m) => m.VersionHistory),
  { loading: () => <Skeleton className="h-32 w-full rounded-xl" /> },
);

type Estimate = NonNullable<ReturnType<typeof useEstimate>['data']>;
type Lines = NonNullable<ReturnType<typeof useEstimateLines>['data']>;
type Allowances = NonNullable<ReturnType<typeof useEstimateAllowances>['data']>;
type Alternates = NonNullable<ReturnType<typeof useEstimateAlternates>['data']>;

function fmtCAD(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
}

interface AllowancesSectionProps {
  allowances: Allowances;
  isEditable: boolean;
  onAdd: () => void;
}
function AllowancesSection({ allowances, isEditable, onAdd }: AllowancesSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Allowances</CardTitle>
        {isEditable && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Allowance
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {allowances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No allowances added.</p>
        ) : (
          <div className="space-y-2">
            {allowances.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-sm border rounded-lg p-3"
              >
                <span className="font-medium">{a.allowance_name}</span>
                <span className="text-muted-foreground">{fmtCAD(a.allowance_amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AlternatesSectionProps {
  alternates: Alternates;
  isEditable: boolean;
  onAdd: () => void;
}
function AlternatesSection({ alternates, isEditable, onAdd }: AlternatesSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Alternates</CardTitle>
        {isEditable && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Alternate
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {alternates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alternates added.</p>
        ) : (
          <div className="space-y-2">
            {alternates.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-sm border rounded-lg p-3"
              >
                <span className="font-medium">{a.title}</span>
                <div className="flex items-center gap-3">
                  <Badge variant={a.selected ? 'default' : 'outline'}>
                    {a.selected ? 'Selected' : 'Not selected'}
                  </Badge>
                  <span className="text-muted-foreground">{fmtCAD(a.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface EstimateCardsSectionProps {
  estimate: Estimate;
  safeLines: Lines;
  allowances: Allowances;
  alternates: Alternates;
  isEditable: boolean;
  versions: NonNullable<ReturnType<typeof useEstimateVersions>['data']> | undefined;
  onAddLine: () => void;
  onUpdateLine: (lineId: string, field: string, value: unknown) => void;
  onDeleteLine: (lineId: string) => void;
  onAddAllowance: () => void;
  onAddAlternate: () => void;
}

export function EstimateCardsSection({
  estimate,
  safeLines,
  allowances,
  alternates,
  isEditable,
  versions,
  onAddLine,
  onUpdateLine,
  onDeleteLine,
  onAddAllowance,
  onAddAlternate,
}: EstimateCardsSectionProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemEditor
            lines={safeLines}
            onAddLine={onAddLine}
            onUpdateLine={onUpdateLine}
            onDeleteLine={onDeleteLine}
            isReadOnly={!isEditable}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <TotalsPanel
            subtotal={estimate.subtotal_amount}
            taxAmount={estimate.tax_amount}
            total={estimate.total_amount}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <VersionHistory versions={versions || []} />
        </CardContent>
      </Card>
      <AllowancesSection allowances={allowances} isEditable={isEditable} onAdd={onAddAllowance} />
      <AlternatesSection alternates={alternates} isEditable={isEditable} onAdd={onAddAlternate} />
    </>
  );
}
