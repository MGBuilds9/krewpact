'use client';

import { Plus, Trash2 } from 'lucide-react';

import { AiSuggestion } from '@/components/AI/AiSuggestion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EstimateLine } from '@/hooks/useEstimates';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

interface LineItemEditorProps {
  lines: EstimateLine[];
  onAddLine: () => void;
  onUpdateLine: (lineId: string, field: string, value: string | number | boolean) => void;
  onDeleteLine: (lineId: string) => void;
  isReadOnly?: boolean;
}

interface LineRowProps {
  line: EstimateLine;
  isReadOnly: boolean;
  onUpdateLine: (lineId: string, field: string, value: string | number | boolean) => void;
  onDeleteLine: (lineId: string) => void;
}

// eslint-disable-next-line max-lines-per-function
function LineRow({ line, isReadOnly, onUpdateLine, onDeleteLine }: LineRowProps) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-2">
        <div className="flex items-center gap-2">
          {isReadOnly ? (
            <span>{line.description}</span>
          ) : (
            <Input
              defaultValue={line.description}
              onBlur={(e) => onUpdateLine(line.id, 'description', e.target.value)}
              className="h-8 text-sm"
              aria-label="Description"
            />
          )}
          {line.is_optional && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              Optional
            </Badge>
          )}
        </div>
      </td>
      <td className="py-2 px-1">
        {isReadOnly ? (
          <span className="block text-right">{line.quantity}</span>
        ) : (
          <Input
            type="number"
            defaultValue={line.quantity}
            onBlur={(e) => onUpdateLine(line.id, 'quantity', Number(e.target.value))}
            className="h-8 text-sm text-right"
            aria-label="Quantity"
          />
        )}
      </td>
      <td className="py-2 px-1">
        {isReadOnly ? (
          <span className="block text-right">{formatCurrency(line.unit_cost)}</span>
        ) : (
          <>
            <Input
              type="number"
              defaultValue={line.unit_cost}
              onBlur={(e) => onUpdateLine(line.id, 'unit_cost', Number(e.target.value))}
              className="h-8 text-sm text-right"
              aria-label="Unit cost"
            />
            {line.description && (
              <AiSuggestion
                field="unit_cost"
                context={{ description: line.description }}
                onApply={(val) => onUpdateLine(line.id, 'unit_cost', Number(val))}
              />
            )}
          </>
        )}
      </td>
      <td className="py-2 px-1">
        {isReadOnly ? (
          <span className="block text-right">{line.markup_pct}%</span>
        ) : (
          <>
            <Input
              type="number"
              defaultValue={line.markup_pct}
              onBlur={(e) => onUpdateLine(line.id, 'markup_pct', Number(e.target.value))}
              className="h-8 text-sm text-right"
              aria-label="Markup percentage"
            />
            <AiSuggestion
              field="markup_pct"
              context={{ item_type: line.line_type ?? 'material' }}
              onApply={(val) => onUpdateLine(line.id, 'markup_pct', Number(val))}
            />
          </>
        )}
      </td>
      <td className="py-2 pl-1 text-right font-medium">{formatCurrency(line.line_total)}</td>
      {!isReadOnly && (
        <td className="py-2 pl-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDeleteLine(line.id)}
            aria-label="Delete line"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </td>
      )}
    </tr>
  );
}

export function LineItemEditor({
  lines,
  onAddLine,
  onUpdateLine,
  onDeleteLine,
  isReadOnly = false,
}: LineItemEditorProps) {
  const sorted = [...lines].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 font-medium w-20 text-right">Qty</th>
            <th className="pb-2 font-medium w-24 text-right">Unit Cost</th>
            <th className="pb-2 font-medium w-20 text-right">Markup %</th>
            <th className="pb-2 font-medium w-28 text-right">Total</th>
            {!isReadOnly && <th className="pb-2 w-10" />}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={isReadOnly ? 5 : 6} className="py-8 text-center text-muted-foreground">
                No line items yet. Add your first line to get started.
              </td>
            </tr>
          ) : (
            sorted.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                isReadOnly={isReadOnly}
                onUpdateLine={onUpdateLine}
                onDeleteLine={onDeleteLine}
              />
            ))
          )}
        </tbody>
      </table>
      {!isReadOnly && (
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={onAddLine}>
            <Plus className="h-4 w-4 mr-1" />
            Add Line
          </Button>
        </div>
      )}
    </div>
  );
}
