'use client';

import { useState } from 'react';
import { useSLASettings, useUpdateSLASettings } from '@/hooks/useCRM';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';

interface SLAFormState {
  leadStages: Array<{ stage: string; maxHours: number }>;
  oppStages: Array<{ stage: string; maxHours: number }>;
  _syncKey: string;
}

function useSyncedSLAState(slaSettings: { lead_stages: Array<{ stage: string; maxHours: number }>; opportunity_stages: Array<{ stage: string; maxHours: number }> } | undefined) {
  const dataKey = JSON.stringify(slaSettings);
  const [state, setState] = useState<SLAFormState>({ leadStages: [], oppStages: [], _syncKey: '' });

  if (slaSettings && state._syncKey !== dataKey) {
    setState({ leadStages: slaSettings.lead_stages, oppStages: slaSettings.opportunity_stages, _syncKey: dataKey });
  }

  return [state, setState] as const;
}

export default function SLAConfigForm() {
  const { data: slaSettings, isLoading } = useSLASettings();
  const updateSLA = useUpdateSLASettings();

  const [state, setState] = useSyncedSLAState(slaSettings);
  const { leadStages, oppStages } = state;

  function handleLeadHoursChange(index: number, value: string) {
    const hours = parseInt(value, 10);
    if (isNaN(hours) || hours < 1) return;
    setState((prev) => ({
      ...prev,
      leadStages: prev.leadStages.map((s, i) => (i === index ? { ...s, maxHours: hours } : s)),
    }));
  }

  function handleOppHoursChange(index: number, value: string) {
    const hours = parseInt(value, 10);
    if (isNaN(hours) || hours < 1) return;
    setState((prev) => ({
      ...prev,
      oppStages: prev.oppStages.map((s, i) => (i === index ? { ...s, maxHours: hours } : s)),
    }));
  }

  function handleSave() {
    updateSLA.mutate({
      lead_stages: leadStages,
      opportunity_stages: oppStages,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Lead Stages */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Lead Stage SLAs</h3>
        <p className="text-sm text-muted-foreground">
          Maximum hours allowed in each lead stage before flagging as overdue.
        </p>
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left text-sm font-medium">Stage</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Max Hours</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Approx. Days</th>
              </tr>
            </thead>
            <tbody>
              {leadStages.map((s, i) => (
                <tr key={s.stage} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <Label className="capitalize">{s.stage.replace(/_/g, ' ')}</Label>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      min={1}
                      value={s.maxHours}
                      onChange={(e) => handleLeadHoursChange(i, e.target.value)}
                      className="w-24"
                    />
                  </td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {(s.maxHours / 24).toFixed(1)} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunity Stages */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Opportunity Stage SLAs</h3>
        <p className="text-sm text-muted-foreground">
          Maximum hours allowed in each opportunity stage before flagging as overdue.
        </p>
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left text-sm font-medium">Stage</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Max Hours</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Approx. Days</th>
              </tr>
            </thead>
            <tbody>
              {oppStages.map((s, i) => (
                <tr key={s.stage} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <Label className="capitalize">{s.stage.replace(/_/g, ' ')}</Label>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      min={1}
                      value={s.maxHours}
                      onChange={(e) => handleOppHoursChange(i, e.target.value)}
                      className="w-24"
                    />
                  </td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {(s.maxHours / 24).toFixed(1)} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSLA.isPending}>
          {updateSLA.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save SLA Settings
        </Button>
      </div>

      {updateSLA.isSuccess && (
        <p className="text-sm text-green-600">SLA settings saved successfully.</p>
      )}
      {updateSLA.isError && (
        <p className="text-sm text-destructive">Failed to save SLA settings. Please try again.</p>
      )}
    </div>
  );
}
