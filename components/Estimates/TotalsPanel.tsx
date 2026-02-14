'use client';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

interface TotalsPanelProps {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function TotalsPanel({ subtotal, taxAmount, total }: TotalsPanelProps) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">HST 13%</span>
        <span className="font-medium">{formatCurrency(taxAmount)}</span>
      </div>
      <div className="border-t pt-2 flex justify-between">
        <span className="font-semibold">Total</span>
        <span className="font-bold text-base">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
