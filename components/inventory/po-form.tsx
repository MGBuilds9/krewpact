'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { requireConcreteDivision, useDivision } from '@/contexts/DivisionContext';
import { type InventoryItem, useInventoryItems } from '@/hooks/useInventory';
import { useInventoryLocations } from '@/hooks/useInventoryLocations';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { usePortalAccounts } from '@/hooks/usePortals';
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';

import type { PoLineInput } from './po-line-editor';
import { PoLineEditor } from './po-line-editor';

interface PoFormState {
  supplierId: string;
  locationId: string;
  expectedDate: string;
  notes: string;
  lines: PoLineInput[];
}

interface PoFormFieldsProps extends PoFormState {
  divisionId: string;
  divisionsLoading: boolean;
  userDivisions: { id: string; name: string }[];
  hasMultipleDivisions: boolean;
  activeDivisionName?: string;
  setActiveDivision: (id: string) => void;
  suppliers: {
    id: string;
    company_name?: string | null;
    contact_name?: string | null;
    email: string;
  }[];
  locations: { id: string; name: string }[] | undefined;
  items: InventoryItem[] | undefined;
  setSupplierId: (v: string) => void;
  setLocationId: (v: string) => void;
  setExpectedDate: (v: string) => void;
  setNotes: (v: string) => void;
  setLines: (v: PoLineInput[]) => void;
  isPending: boolean;
  onCancel: () => void;
}

// eslint-disable-next-line max-lines-per-function
function PoFormFields({
  divisionId,
  divisionsLoading,
  userDivisions,
  hasMultipleDivisions,
  activeDivisionName,
  setActiveDivision,
  suppliers,
  locations,
  items,
  supplierId,
  setSupplierId,
  locationId,
  setLocationId,
  expectedDate,
  setExpectedDate,
  notes,
  setNotes,
  lines,
  setLines,
  isPending,
  onCancel,
}: PoFormFieldsProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="division">Division</Label>
            {divisionsLoading ? (
              <Skeleton className="h-10 w-full rounded-md" />
            ) : userDivisions.length === 0 ? (
              <Alert variant="destructive">
                <AlertDescription>
                  You are not assigned to any division. Contact your administrator.
                </AlertDescription>
              </Alert>
            ) : hasMultipleDivisions ? (
              <Select value={divisionId} onValueChange={setActiveDivision}>
                <SelectTrigger id="division">
                  <SelectValue placeholder="Select a division" />
                </SelectTrigger>
                <SelectContent>
                  {userDivisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id="division" value={activeDivisionName ?? ''} disabled className="bg-muted" />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.company_name ?? s.contact_name ?? s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Delivery Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select location (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {(locations ?? []).map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expected-date">Expected Delivery Date</Label>
            <Input
              id="expected-date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <PoLineEditor lines={lines} items={items ?? []} onChange={setLines} />
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            divisionsLoading ||
            userDivisions.length === 0 ||
            !supplierId ||
            lines.length === 0 ||
            isPending
          }
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Purchase Order
        </Button>
      </div>
    </>
  );
}

export function PoForm() {
  const { push: orgPush } = useOrgRouter();
  const {
    activeDivision,
    isLoading: divisionsLoading,
    userDivisions,
    hasMultipleDivisions,
    setActiveDivision,
  } = useDivision();
  // PO creation must be scoped to a concrete division. When the user is in
  // "All Divisions" view, fall back to their primary division so the form
  // dropdown has something to display and the mutation has a valid UUID.
  const divisionId = requireConcreteDivision(activeDivision, userDivisions) ?? '';
  const createPo = useCreatePurchaseOrder();
  const { data: suppliersResp } = usePortalAccounts({ actor_type: 'trade_partner' });
  const suppliers = suppliersResp?.data ?? [];
  const { data: locations } = useInventoryLocations({ divisionId, isActive: true });
  const { data: items } = useInventoryItems({ divisionId, isActive: true });
  const [supplierId, setSupplierId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<PoLineInput[]>([]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!divisionId || !supplierId || lines.length === 0) return;
      const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
      createPo.mutate(
        {
          supplier_id: supplierId,
          division_id: divisionId,
          delivery_location_id: locationId || undefined,
          expected_delivery_date: expectedDate || undefined,
          notes: notes || undefined,
          subtotal,
          total_amount: subtotal,
          tax_amount: 0,
          lines: lines.map((l) => ({
            item_id: l.item_id,
            qty_ordered: l.qty,
            unit_cost: l.unit_price,
            total_cost: l.qty * l.unit_price,
            uom: l.uom,
          })),
        } as Parameters<typeof createPo.mutate>[0],
        { onSuccess: () => orgPush('/inventory/purchase-orders') },
      );
    },
    [divisionId, supplierId, locationId, expectedDate, notes, lines, createPo, orgPush],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PoFormFields
        divisionId={divisionId}
        divisionsLoading={divisionsLoading}
        userDivisions={userDivisions}
        hasMultipleDivisions={hasMultipleDivisions}
        activeDivisionName={activeDivision?.name}
        setActiveDivision={setActiveDivision}
        suppliers={suppliers}
        locations={locations}
        items={items}
        supplierId={supplierId}
        setSupplierId={setSupplierId}
        locationId={locationId}
        setLocationId={setLocationId}
        expectedDate={expectedDate}
        setExpectedDate={setExpectedDate}
        notes={notes}
        setNotes={setNotes}
        lines={lines}
        setLines={setLines}
        isPending={createPo.isPending}
        onCancel={() => orgPush('/inventory/purchase-orders')}
      />
    </form>
  );
}
