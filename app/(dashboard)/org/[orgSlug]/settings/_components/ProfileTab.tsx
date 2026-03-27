'use client';

import { useUser } from '@clerk/nextjs';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatStatus } from '@/lib/format-status';

interface ProfileTabProps {
  user: ReturnType<typeof useUser>['user'];
  roles: { role_name: string; is_primary?: boolean }[];
}

export function ProfileTab({ user, roles }: ProfileTabProps) {
  const firstName = user ? user.firstName || '' : '';
  const lastName = user ? user.lastName || '' : '';
  const imageUrl = user ? user.imageUrl : undefined;
  const email = user ? (user.emailAddresses[0] ? user.emailAddresses[0].emailAddress : '') : '';
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={imageUrl} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">
              {firstName} {lastName}
            </p>
            <p className="text-sm text-muted-foreground">{email}</p>
            <div className="flex gap-1 mt-1">
              {roles.map((role) => (
                <Badge key={role.role_name} variant="secondary" className="text-xs">
                  {formatStatus(role.role_name)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="settings-first-name">First Name</Label>
            <Input id="settings-first-name" aria-label="First Name" value={firstName} disabled />
          </div>
          <div>
            <Label htmlFor="settings-last-name">Last Name</Label>
            <Input id="settings-last-name" aria-label="Last Name" value={lastName} disabled />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" aria-label="Email" value={email} disabled />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Profile information is managed through Clerk. Contact your administrator to make changes.
        </p>
      </CardContent>
    </Card>
  );
}
