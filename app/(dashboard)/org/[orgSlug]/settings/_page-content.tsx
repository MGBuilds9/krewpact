'use client';

import { useUser } from '@clerk/nextjs';
import { Bell, Settings, Shield, Sparkles, User } from 'lucide-react';
import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserRBAC } from '@/hooks/useRBAC';
import { type AiPreferences, useAiPreferences, useUpdateAiPreferences } from '@/hooks/useSystem';

import { AiTab, AiTabLoading } from './_components/AiTab';
import { type NotificationPrefs, NotificationsTab } from './_components/NotificationsTab';
import { ProfileTab } from './_components/ProfileTab';
import { SecurityTab } from './_components/SecurityTab';

const DEFAULT_PREFS: NotificationPrefs = {
  emailDigest: 'daily',
  crmUpdates: true,
  projectUpdates: true,
  taskAssignments: true,
  systemAlerts: true,
  dealWonLost: true,
  leadAssignment: true,
};

const DEFAULT_AI_PREFS: AiPreferences = {
  insight_min_confidence: 0.7,
  digest_enabled: true,
  ai_suggestions_enabled: true,
};

// eslint-disable-next-line max-lines-per-function
export default function SettingsPage() {
  const { user } = useUser();
  const { roles } = useUserRBAC();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  const { data: fetchedAiPrefs, isLoading: aiLoading } = useAiPreferences();
  const updateAiPrefs = useUpdateAiPreferences();

  const aiPrefs = fetchedAiPrefs ?? DEFAULT_AI_PREFS;
  const [localAiPrefs, setLocalAiPrefs] = useState<AiPreferences | null>(null);
  const effectiveAiPrefs = localAiPrefs ?? aiPrefs;

  function handleSaveAiPrefs() {
    updateAiPrefs.mutate(effectiveAiPrefs, {
      onSuccess: () => {
        setAiSaved(true);
        setTimeout(() => setAiSaved(false), 2000);
      },
    });
  }

  async function handleSaveNotifications() {
    try {
      const res = await fetch('/api/org/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Silently reset — toast system available if needed later
      setSaved(false);
    }
  }

  return (
    <>
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
            <ProfileTab user={user} roles={roles} />
          </TabsContent>
          <TabsContent value="notifications" className="mt-6 space-y-6">
            <NotificationsTab
              prefs={prefs}
              setPrefs={setPrefs}
              saved={saved}
              onSave={handleSaveNotifications}
            />
          </TabsContent>
          <TabsContent value="security" className="mt-6">
            <SecurityTab />
          </TabsContent>
          <TabsContent value="ai" className="mt-6 space-y-6">
            {aiLoading ? (
              <AiTabLoading />
            ) : (
              <AiTab
                aiPrefs={effectiveAiPrefs}
                setAiPrefs={setLocalAiPrefs}
                aiSaved={aiSaved}
                onSave={handleSaveAiPrefs}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
