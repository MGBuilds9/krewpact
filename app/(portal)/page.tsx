import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PortalDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Client Portal</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your project dashboard. Here you can view project documents, approve change orders, and track your financial summaries.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription>Projects you are currently assigned to.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Future list of projects fetched from API */}
            <p className="text-sm text-muted-foreground">Loading your projects...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>Unread communications.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No new messages.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Action required on your part.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You are all caught up.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
