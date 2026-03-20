'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventoryLocations } from '@/hooks/useInventoryLocations';

interface LocationSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  divisionId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function LocationSelect({
  value,
  onValueChange,
  divisionId,
  placeholder = 'Select location',
  disabled,
}: LocationSelectProps) {
  const { data: locations, isLoading } = useInventoryLocations({ divisionId });

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {locations?.map((loc) => (
          <SelectItem key={loc.id} value={loc.id}>
            {loc.name} ({loc.location_type})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
