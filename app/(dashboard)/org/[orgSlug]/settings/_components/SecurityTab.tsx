'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SECURITY_ITEMS = [
  { label: 'Two-Factor Authentication', desc: 'Add an extra layer of security to your account' },
  { label: 'Password', desc: 'Change your account password' },
  { label: 'Active Sessions', desc: 'Manage your active login sessions' },
];

export function SecurityTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {SECURITY_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Badge variant="outline">Managed by Clerk</Badge>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-4">
          Security settings including password and two-factor authentication are managed through
          Clerk. Visit your Clerk dashboard to make changes.
        </p>
      </CardContent>
    </Card>
  );
}
