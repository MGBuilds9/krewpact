'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, User, Bell, Shield, Save, Sparkles } from 'lucide-react';
import { useUserRBAC } from '@/hooks/useRBAC';

interface NotificationPrefs {
  emailDigest: 'daily' | 'weekly' | 'never';
  crmUpdates: boolean;
  projectUpdates: boolean;
  taskAssignments: boolean;
  systemAlerts: boolean;
  dealWonLost: boolean;
  leadAssignment: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailDigest: 'daily',
  crmUpdates: true,
  projectUpdates: true,
  taskAssignments: true,
  systemAlerts: true,
  dealWonLost: true,
  leadAssignment: true,
};

export default function SettingsPage() {
  const { user } = useUser();
  const { roles } = useUserRBAC();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [aiPrefs, setAiPrefs] = useState({
    insight_min_confidence: 0.7,
    digest_enabled: true,
    ai_suggestions_enabled: true,
  });
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    fetch('/api/ai/preferences')
      .then(res => res.ok ? res.json() : null)
      .then((data: { preferences?: typeof aiPrefs } | null) => {
        if (data?.preferences) setAiPrefs(data.preferences);
      })
      .catch(() => {});
  }, []);

  function handleSaveAiPrefs() {
    fetch('/api/ai/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPrefs),
    }).then(() => {
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 2000);
    }).catch(() => {});
  }

  function handleSaveNotifications() {
    // In production, this would save to API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <title>Settings — KrewPact</title>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.imageUrl} />
                    <AvatarFallback className="text-lg">
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user?.emailAddresses?.[0]?.emailAddress}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {roles.map((role) => (
                        <Badge key={role.role_name} variant="secondary" className="text-xs">
                          {role.role_name.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="settings-first-name">First Name</Label>
                    <Input
                      id="settings-first-name"
                      aria-label="First Name"
                      value={user?.firstName || ''}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="settings-last-name">Last Name</Label>
                    <Input
                      id="settings-last-name"
                      aria-label="Last Name"
                      value={user?.lastName || ''}
                      disabled
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="settings-email">Email</Label>
                    <Input
                      id="settings-email"
                      aria-label="Email"
                      value={user?.emailAddresses?.[0]?.emailAddress || ''}
                      disabled
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Profile information is managed through Clerk. Contact your administrator to make
                  changes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Digest</CardTitle>
                <CardDescription>
                  How often would you like to receive a summary email?
                </CardDescription>
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
                {[
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
                ].map((item) => (
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
              <Button onClick={handleSaveNotifications}>
                <Save className="h-4 w-4 mr-2" />
                {saved ? 'Saved!' : 'Save Preferences'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="text-sm font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Badge variant="outline">Managed by Clerk</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="text-sm font-medium">Password</p>
                    <p className="text-xs text-muted-foreground">Change your account password</p>
                  </div>
                  <Badge variant="outline">Managed by Clerk</Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Active Sessions</p>
                    <p className="text-xs text-muted-foreground">
                      Manage your active login sessions
                    </p>
                  </div>
                  <Badge variant="outline">Managed by Clerk</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Security settings including password and two-factor authentication are managed
                  through Clerk. Visit your Clerk dashboard to make changes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ai" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Preferences</CardTitle>
                <CardDescription>Configure how AI features behave for your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Insight Confidence Threshold</Label>
                  <p className="text-sm text-muted-foreground">Only show AI insights with confidence above this value (0-100%).</p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(aiPrefs.insight_min_confidence * 100)}
                      onChange={(e) => setAiPrefs(prev => ({ ...prev, insight_min_confidence: Number(e.target.value) / 100 }))}
                      className="w-24"
                      aria-label="Confidence threshold percentage"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Daily Digest Email</Label>
                    <p className="text-sm text-muted-foreground">Receive a morning briefing email with key metrics and tasks.</p>
                  </div>
                  <Switch
                    checked={aiPrefs.digest_enabled}
                    onCheckedChange={(checked) => setAiPrefs(prev => ({ ...prev, digest_enabled: checked }))}
                    aria-label="Toggle daily digest"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Suggestions</Label>
                    <p className="text-sm text-muted-foreground">Show AI-powered suggestions on form fields.</p>
                  </div>
                  <Switch
                    checked={aiPrefs.ai_suggestions_enabled}
                    onCheckedChange={(checked) => setAiPrefs(prev => ({ ...prev, ai_suggestions_enabled: checked }))}
                    aria-label="Toggle AI suggestions"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveAiPrefs}>
                    <Save className="h-4 w-4 mr-2" />
                    {aiSaved ? 'Saved!' : 'Save AI Preferences'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
