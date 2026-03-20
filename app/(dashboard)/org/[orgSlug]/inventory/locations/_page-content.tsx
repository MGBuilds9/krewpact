'use client';

import { MapPin, Search } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDivision } from '@/contexts/DivisionContext';
import { useInventoryLocations } from '@/hooks/useInventoryLocations';

const TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'Warehouse', value: 'warehouse' },
  { label: 'Job Site', value: 'job_site' },
  { label: 'Vehicle', value: 'vehicle' },
  { label: 'Yard', value: 'yard' },
  { label: 'Virtual', value: 'virtual' },
];

const TYPE_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  warehouse: 'default',
  job_site: 'secondary',
  vehicle: 'outline',
  yard: 'secondary',
  virtual: 'outline',
};

function LocationSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => `loc-skel-${i}`).map((key) => (
        <Card key={key}>
          <CardContent className="pt-6">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LocationsPageContent() {
  const { activeDivision } = useDivision();
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: locations, isLoading } = useInventoryLocations({
    divisionId: activeDivision?.id,
    locationType: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const filtered = locations?.filter(
    (loc) => !search || loc.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Locations</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LocationSkeleton />}

      {!isLoading && !filtered?.length && (
        <p className="text-center text-muted-foreground py-12">No locations found</p>
      )}

      {!isLoading && filtered && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((loc) => (
            <Card key={loc.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {loc.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Badge variant={TYPE_COLORS[loc.location_type] ?? 'outline'}>
                  {loc.location_type.replace('_', ' ')}
                </Badge>
                <Badge variant={loc.is_active ? 'default' : 'secondary'}>
                  {loc.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
