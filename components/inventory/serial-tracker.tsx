'use client';

import { ArrowDownToLine, ArrowUpFromLine, Search } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { SerialItem } from '@/hooks/useSerials';
import { useSerials } from '@/hooks/useSerials';

import { CheckoutDialog } from './serial-checkout-dialog';
import { ReturnDialog } from './serial-return-dialog';

const statusStyle: Record<string, string> = {
  available: 'bg-green-500/15 text-green-400 border-green-500/30',
  checked_out: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  in_transit: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  maintenance: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  quarantine: 'bg-red-500/15 text-red-400 border-red-500/30',
  retired: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  lost: 'bg-red-500/15 text-red-400 border-red-500/30',
};

interface SerialTrackerProps {
  itemId?: string;
  locationId?: string;
  status?: string;
}

export function SerialTracker({ itemId, locationId, status }: SerialTrackerProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [checkoutSerial, setCheckoutSerial] = useState<SerialItem | null>(null);
  const [returnSerial, setReturnSerial] = useState<SerialItem | null>(null);

  const { data: serials, isLoading } = useSerials({
    itemId,
    locationId,
    status,
    search: debouncedSearch || undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  const items = serials ?? [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search serials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No serial items found.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial #</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Checked Out To</TableHead>
                <TableHead>Warranty Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((serial) => (
                <SerialRow
                  key={serial.id}
                  serial={serial}
                  onCheckout={() => setCheckoutSerial(serial)}
                  onReturn={() => setReturnSerial(serial)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <CheckoutDialog serial={checkoutSerial} onClose={() => setCheckoutSerial(null)} />
      <ReturnDialog serial={returnSerial} onClose={() => setReturnSerial(null)} />
    </div>
  );
}

interface SerialRowProps {
  serial: SerialItem;
  onCheckout: () => void;
  onReturn: () => void;
}

function SerialRow({ serial, onCheckout, onReturn }: SerialRowProps) {
  const canCheckout = serial.status === 'available';
  const canReturn = serial.status === 'checked_out';

  return (
    <TableRow>
      <TableCell className="font-medium">{serial.serial_number}</TableCell>
      <TableCell>{serial.item_name || serial.item_sku}</TableCell>
      <TableCell>
        <Badge variant="outline" className={statusStyle[serial.status] ?? statusStyle.retired}>
          {serial.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </Badge>
      </TableCell>
      <TableCell>{serial.location_name ?? '-'}</TableCell>
      <TableCell>{serial.checked_out_to ?? '-'}</TableCell>
      <TableCell>
        {serial.warranty_expiry
          ? new Date(serial.warranty_expiry).toLocaleDateString('en-CA')
          : '-'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {canCheckout && (
            <Button variant="outline" size="sm" onClick={onCheckout}>
              <ArrowUpFromLine className="h-3.5 w-3.5 mr-1" /> Checkout
            </Button>
          )}
          {canReturn && (
            <Button variant="outline" size="sm" onClick={onReturn}>
              <ArrowDownToLine className="h-3.5 w-3.5 mr-1" /> Return
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
