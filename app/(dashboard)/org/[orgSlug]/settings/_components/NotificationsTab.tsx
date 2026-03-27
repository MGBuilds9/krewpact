'use client';

import { Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export interface NotificationPrefs {
  emailDigest: 'daily' | 'weekly' | 'never';
  crmUpdates: boolean;
  projectUpdates: boolean;
  taskAssignments: boolean;
  systemAlerts: boolean;
  dealWonLost: boolean;
  leadAssignment: boolean;
}

const NOTIF_ITEMS = [
  {
    key: 'crmUpdates' as const,
    label: 'CRM Updates',
    desc: 'Lead status changes, new contacts, opportunity updates',
  },
  {
    key: 'projectUpdates' as const,
    label: 'Project Updates',
    desc: 'Project milestones, status changes, budget alerts',
  },
  {
    key: 'taskAssignments' as const,
    label: 'Task Assignments',
    desc: 'When tasks are assigned to you or your team',
  },
  {
    key: 'dealWonLost' as const,
    label: 'Deal Won/Lost',
    desc: 'When opportunities are marked as won or lost',
  },
  {
    key: 'leadAssignment' as const,
    label: 'Lead Assignment',
    desc: 'When leads are assigned or re-assigned to you',
  },
  {
    key: 'systemAlerts' as const,
    label: 'System Alerts',
    desc: 'Integration errors, sync failures, security alerts',
  },
];

interface NotificationsTabProps {
  prefs: NotificationPrefs;
  setPrefs: (p: NotificationPrefs) => void;
  saved: boolean;
  onSave: () => void | Promise<void>;
}

export function NotificationsTab({ prefs, setPrefs, saved, onSave }: NotificationsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Digest</CardTitle>
          <CardDescription>How often would you like to receive a summary email?</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={prefs.emailDigest}
            onValueChange={(val) =>
              setPrefs({ ...prefs, emailDigest: val as NotificationPrefs['emailDigest'] })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>Choose which notifications you want to receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIF_ITEMS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={prefs[item.key]}
                onCheckedChange={(checked) => setPrefs({ ...prefs, [item.key]: checked })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={onSave}>
          <Save className="h-4 w-4 mr-2" />
          {saved ? 'Saved!' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
