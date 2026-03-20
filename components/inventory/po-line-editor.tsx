'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InventoryItem } from '@/hooks/useInventory';

import { fmtCAD } from './currency-format';

export interface PoLineInput {
  key: string;
  item_id: string;
  item_name: string;
  qty: number;
  unit_price: number;
  uom: string;
}

interface PoLineEditorProps {
  lines: PoLineInput[];
  items: InventoryItem[];
  onChange: (lines: PoLineInput[]) => void;
}

export function PoLineEditor({ lines, items, onChange }: PoLineEditorProps) {
  const addLine = useCallback(() => {
    onChange([
      ...lines,
      { key: crypto.randomUUID(), item_id: '', item_name: '', qty: 1, unit_price: 0, uom: 'EA' },
    ]);
  }, [lines, onChange]);

  const removeLine = useCallback(
    (key: string) => {
      onChange(lines.filter((l) => l.key !== key));
    },
    [lines, onChange],
  );

  const updateLine = useCallback(
    (key: string, field: keyof PoLineInput, value: string | number) => {
      onChange(lines.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
    },
    [lines, onChange],
  );

  const handleItemSelect = useCallback(
    (key: string, itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      onChange(
        lines.map((l) =>
          l.key === key
            ? {
                ...l,
                item_id: itemId,
                item_name: item.name,
                uom: item.uom,
                unit_price: item.unit_cost ?? 0,
              }
            : l,
        ),
      );
    },
    [lines, items, onChange],
  );

  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unit_price, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_80px_100px_90px_40px] gap-2 text-sm font-medium text-muted-foreground">
        <span>Item</span>
        <span>Qty</span>
        <span>Unit Price</span>
        <span>Total</span>
        <span />
      </div>
      {lines.map((line) => (
        <div
          key={line.key}
          className="grid grid-cols-[1fr_80px_100px_90px_40px] gap-2 items-center"
        >
          <Select value={line.item_id} onValueChange={(v) => handleItemSelect(line.key, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select item" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.sku} — {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={line.qty}
            onChange={(e) => updateLine(line.key, 'qty', Number(e.target.value))}
          />
          <Input
            type="number"
            min={0}
            step={0.01}
            value={line.unit_price}
            onChange={(e) => updateLine(line.key, 'unit_price', Number(e.target.value))}
          />
          <span className="text-sm text-right">{fmtCAD(line.qty * line.unit_price)}</span>
          <Button variant="ghost" size="icon" onClick={() => removeLine(line.key)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" onClick={addLine}>
          <Plus className="h-4 w-4 mr-1" />
          Add Line
        </Button>
        <span className="text-sm font-medium">Subtotal: {fmtCAD(subtotal)}</span>
      </div>
    </div>
  );
}
