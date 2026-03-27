'use client';

import { ArrowDown, ArrowUp, Save } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { EnrichmentConfig } from '@/hooks/useCRM';
import { useEnrichmentConfig, useUpdateEnrichmentConfig } from '@/hooks/useCRM';

const SOURCE_LABELS: Record<string, string> = {
  apollo: 'Apollo',
  clearbit: 'Clearbit',
  linkedin: 'LinkedIn',
  google: 'Google',
};

interface SourceRowProps {
  source: EnrichmentConfig['sources'][number];
  index: number;
  total: number;
  onMove: (index: number, dir: 'up' | 'down') => void;
  onToggle: (name: string) => void;
}

function SourceRow({ source, index, total, onMove, onToggle }: SourceRowProps) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground w-5 text-center">
          {source.order}
        </span>
        <span className="text-sm font-medium">{SOURCE_LABELS[source.name] ?? source.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMove(index, 'up')}
          disabled={index === 0}
          aria-label={`Move ${source.name} up`}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMove(index, 'down')}
          disabled={index === total - 1}
          aria-label={`Move ${source.name} down`}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Switch
          checked={source.enabled}
          onCheckedChange={() => onToggle(source.name)}
          aria-label={`Toggle ${source.name}`}
        />
      </div>
    </div>
  );
}

interface EnrichmentFormState {
  localSources: EnrichmentConfig['sources'];
  dirty: boolean;
  _syncKey: string;
}

export function EnrichmentConfigPanel() {
  const { data: config, isLoading } = useEnrichmentConfig();
  const updateConfig = useUpdateEnrichmentConfig();
  const [state, setState] = useState<EnrichmentFormState>({
    localSources: [],
    dirty: false,
    _syncKey: '',
  });

  const configJson = JSON.stringify(config?.sources);
  if (config?.sources && state._syncKey !== configJson) {
    setState({
      localSources: [...config.sources].sort((a, b) => a.order - b.order),
      dirty: false,
      _syncKey: configJson,
    });
  }

  const { localSources, dirty } = state;

  function handleToggle(name: string) {
    setState((prev) => ({
      ...prev,
      localSources: prev.localSources.map((s) =>
        s.name === name ? { ...s, enabled: !s.enabled } : s,
      ),
      dirty: true,
    }));
  }

  function handleMove(index: number, dir: 'up' | 'down') {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= localSources.length) return;
    setState((prev) => {
      const next = [...prev.localSources];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, localSources: next.map((s, i) => ({ ...s, order: i + 1 })), dirty: true };
    });
  }

  function handleSave() {
    updateConfig.mutate({ sources: localSources });
    setState((prev) => ({ ...prev, dirty: false }));
  }

  if (isLoading)
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-40 bg-muted/50 rounded animate-pulse" />
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enrichment Sources</CardTitle>
        <CardDescription>
          Configure which data sources are used for lead enrichment and their priority order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {localSources.map((source, index) => (
          <SourceRow
            key={source.name}
            source={source}
            index={index}
            total={localSources.length}
            onMove={handleMove}
            onToggle={handleToggle}
          />
        ))}
        <Button
          onClick={handleSave}
          disabled={!dirty || updateConfig.isPending}
          className="w-full gap-2 mt-4"
        >
          <Save className="h-4 w-4" />
          {updateConfig.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
}
