'use client';

import { CheckCircle, Loader2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

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
import { useInventoryLocations } from '@/hooks/useInventoryLocations';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useConfirmGoodsReceipt, useCreateGoodsReceipt } from '@/hooks/usePurchaseOrders';

interface ReceiveLineState {
  po_line_id: string;
  item_id: string;
  item_name: string;
  item_sku: string;
  qty_ordered: number;
  qty_received_prior: number;
  qty_receiving: number;
  serial_number: string;
  lot_number: string;
  spot_id: string;
}

interface ReceiveFormProps {
  po: PurchaseOrder;
  onSuccess: () => void;
}

interface ReceiveFormContentProps {
  locations: { id: string; name: string }[] | undefined;
  locationId: string;
  setLocationId: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  lines: ReceiveLineState[];
  hasReceivable: boolean;
  hasQtyToReceive: boolean;
  isBusy: boolean;
  updateLine: (idx: number, field: keyof ReceiveLineState, value: string | number) => void;
}

function ReceiveFormContent({
  locations,
  locationId,
  setLocationId,
  notes,
  setNotes,
  lines,
  hasReceivable,
  hasQtyToReceive,
  isBusy,
  updateLine,
}: ReceiveFormContentProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Receiving Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recv-location">Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger id="recv-location">
                <SelectValue placeholder="Select receiving location" />
              </SelectTrigger>
              <SelectContent>
                {(locations ?? []).map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recv-notes">Notes</Label>
            <Textarea
              id="recv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Items to Receive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasReceivable ? (
            <p className="text-muted-foreground">All items have been fully received.</p>
          ) : (
            lines.map((line, idx) => {
              const remaining = line.qty_ordered - line.qty_received_prior;
              if (remaining <= 0) return null;
              return (
                <ReceiveLineRow
                  key={line.po_line_id}
                  line={line}
                  remaining={remaining}
                  onUpdate={(field, value) => updateLine(idx, field, value)}
                />
              );
            })
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={!locationId || !hasQtyToReceive || isBusy}>
          {isBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Confirm Receipt
        </Button>
      </div>
    </>
  );
}

// eslint-disable-next-line max-lines-per-function
export function ReceiveForm({ po, onSuccess }: ReceiveFormProps) {
  const createGr = useCreateGoodsReceipt();
  const confirmGr = useConfirmGoodsReceipt();
  const { data: locations } = useInventoryLocations({ isActive: true });
  const [locationId, setLocationId] = useState(po.delivery_location_id ?? '');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const initialLines = useMemo<ReceiveLineState[]>(
    () =>
      po.lines.map((l) => ({
        po_line_id: l.id,
        item_id: l.item_id,
        item_name: l.item_name,
        item_sku: l.item_sku,
        qty_ordered: l.qty_ordered,
        qty_received_prior: l.qty_received,
        qty_receiving: 0,
        serial_number: '',
        lot_number: '',
        spot_id: '',
      })),
    [po.lines],
  );
  const [lines, setLines] = useState<ReceiveLineState[]>(initialLines);
  const updateLine = useCallback(
    (idx: number, field: keyof ReceiveLineState, value: string | number) => {
      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
    },
    [],
  );
  const hasReceivable = lines.some((l) => l.qty_ordered - l.qty_received_prior > 0);
  const hasQtyToReceive = lines.some((l) => l.qty_receiving > 0);
  const isBusy = createGr.isPending || confirmGr.isPending;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!locationId || !hasQtyToReceive) return;
      const receivingLines = lines
        .filter((l) => l.qty_receiving > 0)
        .map((l) => ({
          po_line_id: l.po_line_id,
          item_id: l.item_id,
          qty_received: l.qty_receiving,
          spot_id: l.spot_id || null,
          notes: null,
        }));
      const gr = await createGr.mutateAsync({
        po_id: po.id,
        location_id: locationId,
        notes: notes || undefined,
        lines: receivingLines,
      });
      await confirmGr.mutateAsync({ id: gr.id, poId: po.id });
      setConfirmed(true);
      onSuccess();
    },
    [locationId, hasQtyToReceive, lines, createGr, confirmGr, po.id, notes, onSuccess],
  );

  if (confirmed) {
    return (
      <div className="text-center py-12 space-y-3">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
        <h3 className="text-lg font-semibold">Materials Received</h3>
        <p className="text-muted-foreground">Goods receipt confirmed and stock updated.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ReceiveFormContent
        locations={locations}
        locationId={locationId}
        setLocationId={setLocationId}
        notes={notes}
        setNotes={setNotes}
        lines={lines}
        hasReceivable={hasReceivable}
        hasQtyToReceive={hasQtyToReceive}
        isBusy={isBusy}
        updateLine={updateLine}
      />
    </form>
  );
}

interface ReceiveLineRowProps {
  line: ReceiveLineState;
  remaining: number;
  onUpdate: (field: keyof ReceiveLineState, value: string | number) => void;
}

function ReceiveLineRow({ line, remaining, onUpdate }: ReceiveLineRowProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">{line.item_name}</p>
          <p className="text-sm text-muted-foreground">{line.item_sku}</p>
        </div>
        <span className="text-sm text-muted-foreground">
          {line.qty_received_prior} / {line.qty_ordered} received
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Qty to Receive (max {remaining})</Label>
          <Input
            type="number"
            min={0}
            max={remaining}
            value={line.qty_receiving}
            onChange={(e) => onUpdate('qty_receiving', Math.min(Number(e.target.value), remaining))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Serial Number</Label>
          <Input
            value={line.serial_number}
            onChange={(e) => onUpdate('serial_number', e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Lot Number</Label>
          <Input
            value={line.lot_number}
            onChange={(e) => onUpdate('lot_number', e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
    </div>
  );
}
