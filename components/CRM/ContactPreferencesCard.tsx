'use client';

import { useCallback, useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface CommunicationPrefs {
  email_opt_in?: boolean;
  preferred_channel?: 'email' | 'phone' | 'linkedin' | 'text';
  do_not_contact?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'never';
}

interface ContactPreferencesCardProps {
  contactId: string;
}

function PreferencesCardContent({
  prefs,
  saving,
  error,
  disabled,
  updatePrefs,
}: {
  prefs: CommunicationPrefs;
  saving: boolean;
  error: string | null;
  disabled: boolean;
  updatePrefs: (u: Partial<CommunicationPrefs>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Communication Preferences
          {saving && <span className="text-xs font-normal text-muted-foreground">Saving...</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between">
          <Label htmlFor="email-opt-in">Email Opt-in</Label>
          <Switch
            id="email-opt-in"
            checked={prefs.email_opt_in ?? false}
            onCheckedChange={(checked) => updatePrefs({ email_opt_in: checked })}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="do-not-contact">Do Not Contact</Label>
          <Switch
            id="do-not-contact"
            checked={prefs.do_not_contact ?? false}
            onCheckedChange={(checked) => updatePrefs({ do_not_contact: checked })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferred-channel">Preferred Channel</Label>
          <Select
            value={prefs.preferred_channel ?? 'email'}
            onValueChange={(value) =>
              updatePrefs({ preferred_channel: value as CommunicationPrefs['preferred_channel'] })
            }
            disabled={disabled}
          >
            <SelectTrigger id="preferred-channel">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="frequency">Contact Frequency</Label>
          <Select
            value={prefs.frequency ?? 'weekly'}
            onValueChange={(value) =>
              updatePrefs({ frequency: value as CommunicationPrefs['frequency'] })
            }
            disabled={disabled}
          >
            <SelectTrigger id="frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export function ContactPreferencesCard({ contactId }: ContactPreferencesCardProps) {
  const [prefs, setPrefs] = useState<CommunicationPrefs>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await fetch(`/api/crm/contacts/${contactId}/preferences`);
        if (!res.ok) throw new Error('Failed to load preferences');
        const data = await res.json();
        setPrefs(data.communication_prefs ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
  }, [contactId]);

  const updatePrefs = useCallback(
    async (update: Partial<CommunicationPrefs>) => {
      setSaving(true);
      setError(null);
      const newPrefs = { ...prefs, ...update };
      setPrefs(newPrefs);
      try {
        const res = await fetch(`/api/crm/contacts/${contactId}/preferences`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        });
        if (!res.ok) throw new Error('Failed to save preferences');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
        setPrefs(prefs);
      } finally {
        setSaving(false);
      }
    },
    [contactId, prefs],
  );

  if (loading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communication Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );

  return (
    <PreferencesCardContent
      prefs={prefs}
      saving={saving}
      error={error}
      disabled={!!prefs.do_not_contact}
      updatePrefs={updatePrefs}
    />
  );
}
