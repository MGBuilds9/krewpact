'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Building2 } from 'lucide-react';
import { useDivisions } from '@/hooks/useOrg';
import { DivisionSetupForm } from '@/components/Org/DivisionSetupForm';
import { NotificationPreferenceForm } from '@/components/Notifications/NotificationPreferenceForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OrganizationSettingsPage() {
  const { data, isLoading } = useDivisions();
  const [open, setOpen] = useState(false);

  const divisions = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-sm text-muted-foreground">Manage divisions and notification preferences.</p>
      </div>

      <Tabs defaultValue="divisions">
        <TabsList>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="divisions" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Division
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Division</DialogTitle>
                </DialogHeader>
                <DivisionSetupForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {divisions.map((d) => (
                <Card key={d.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4" />
                        {d.division_name}
                      </CardTitle>
                      <Badge variant="secondary">{d.division_code}</Badge>
                    </div>
                  </CardHeader>
                  {d.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{d.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationPreferenceForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
