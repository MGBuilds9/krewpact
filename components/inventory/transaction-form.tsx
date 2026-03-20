'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

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

const TRANSACTION_TYPES = [
  { value: 'issue', label: 'Issue to Project' },
  { value: 'return', label: 'Return from Project' },
  { value: 'transfer', label: 'Transfer Between Locations' },
  { value: 'adjust', label: 'Adjustment' },
] as const;

interface TransactionFormProps {
  onSubmit: (data: TransactionFormData) => void;
  isPending?: boolean;
  onCancel: () => void;
}

export interface TransactionFormData {
  type: string;
  item_id: string;
  qty: number;
  location_id: string;
  to_location_id?: string;
  project_id?: string;
  notes?: string;
}

export function TransactionForm({ onSubmit, isPending, onCancel }: TransactionFormProps) {
  const { activeDivision } = useDivision();
  const divisionId = activeDivision?.id ?? '';
  const { data: items } = useInventoryItems({ divisionId, isActive: true });
  const { data: locations } = useInventoryLocations({ divisionId, isActive: true });

  const [type, setType] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState(1);
  const [locationId, setLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [notes, setNotes] = useState('');

  const isTransfer = type === 'transfer';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !itemId || !locationId || qty <= 0) return;
    onSubmit({
      type,
      item_id: itemId,
      qty,
      location_id: locationId,
      to_location_id: isTransfer ? toLocationId || undefined : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Manual Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {(items ?? []).map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.sku} — {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>{isTransfer ? 'From Location' : 'Location'}</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
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
          {isTransfer && (
            <div className="space-y-2">
              <Label>To Location</Label>
              <Select value={toLocationId} onValueChange={setToLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {(locations ?? [])
                    .filter((l) => l.id !== locationId)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!type || !itemId || !locationId || isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Transaction
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
