'use client';

import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface FeatureFlagQuery {
  feature_name?: string;
  division_id?: string;
  is_enabled?: boolean;
}

interface FeatureFlagFormProps {
  onQuery: (params: FeatureFlagQuery) => void;
}

export function FeatureFlagForm({ onQuery }: FeatureFlagFormProps) {
  const form = useForm<{ feature_name: string; division_id: string; is_enabled: boolean }>({
    defaultValues: { feature_name: '', division_id: '', is_enabled: true },
  });

  function onSubmit(values: { feature_name: string; division_id: string; is_enabled: boolean }) {
    onQuery({
      feature_name: values.feature_name || undefined,
      division_id: values.division_id || undefined,
      is_enabled: values.is_enabled,
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Feature Name</label>
        <Input placeholder="feature key" {...form.register('feature_name')} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Division</label>
        <Input placeholder="Division UUID" {...form.register('division_id')} />
      </div>
      <div className="flex items-center gap-2 pb-1">
        <Switch
          // eslint-disable-next-line react-hooks/incompatible-library
          checked={form.watch('is_enabled')}
          onCheckedChange={(v) => form.setValue('is_enabled', v)}
        />
        <label className="text-sm">Enabled only</label>
      </div>
      <Button type="submit">
        <Search className="mr-2 h-4 w-4" />
        Filter
      </Button>
    </form>
  );
}
