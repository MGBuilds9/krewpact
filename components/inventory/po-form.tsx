'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';

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
import { Textarea } from '@/components/ui/textarea';
import { useDivision } from '@/contexts/DivisionContext';
import { useInventoryItems } from '@/hooks/useInventory';
import { useInventoryLocations } from '@/hooks/useInventoryLocations';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { usePortalAccounts } from '@/hooks/usePortals';
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';

import type { PoLineInput } from './po-line-editor';
import { PoLineEditor } from './po-line-editor';

export function PoForm() {
  const { push: orgPush } = useOrgRouter();
  const { activeDivision } = useDivision();
  const divisionId = activeDivision?.id ?? '';
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
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="division">Division</Label>
            <Input
              id="division"
              value={activeDivision?.name ?? 'None'}
              disabled
              className="bg-muted"
            />
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
        <Button
          type="button"
          variant="outline"
          onClick={() => orgPush('/inventory/purchase-orders')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!supplierId || lines.length === 0 || createPo.isPending}>
          {createPo.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Purchase Order
        </Button>
      </div>
    </form>
  );
}
