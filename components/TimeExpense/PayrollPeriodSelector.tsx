'use client';

import { CalendarRange } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generatePayPeriods, type PayrollPeriod } from '@/hooks/usePayroll';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PayrollPeriodSelectorProps {
  value: PayrollPeriod | null;
  onChange: (period: PayrollPeriod) => void;
  periodCount?: number;
  disabled?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PayrollPeriodSelector({
  value,
  onChange,
  periodCount = 12,
  disabled = false,
}: PayrollPeriodSelectorProps) {
  const periods = generatePayPeriods(periodCount);

  function handleSelect(label: string) {
    const period = periods.find((p) => p.label === label);
    if (period) onChange(period);
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Select
        value={value?.label ?? ''}
        onValueChange={handleSelect}
        disabled={disabled}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select pay period…" />
        </SelectTrigger>
        <SelectContent>
          {periods.map((period) => (
            <SelectItem key={period.label} value={period.label}>
              {period.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() =>
            onChange({ start: value.start, end: value.end, label: value.label })
          }
          disabled={disabled}
        >
          Current
        </Button>
      )}
    </div>
  );
}
