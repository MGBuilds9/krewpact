'use client';

import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Target, Mail } from 'lucide-react';

const settingsItems = [
  {
    title: 'Lead Scoring Rules',
    description:
      'Configure rules to automatically score leads based on attributes like source, value, and engagement.',
    icon: Target,
    href: '/crm/settings/scoring',
  },
  {
    title: 'Email Templates',
    description: 'Create and manage branded email templates for outreach sequences and campaigns.',
    icon: Mail,
    href: '/crm/settings/templates',
  },
];

export default function CRMSettingsPage() {
  const { push: orgPush } = useOrgRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CRM Settings</h2>
          <p className="text-muted-foreground">
            Configure scoring rules, templates, and automation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsItems.map((item) => (
          <Card
            key={item.href}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => orgPush(item.href)}
          >
            <CardContent className="p-6 flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-2.5 flex-shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
