'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebhookEvents, useAuditLogs } from '@/hooks/useSystem';
import { WebhookReplayForm } from '@/components/System/WebhookReplayForm';
import { AuditLogQueryForm, type AuditLogQuery } from '@/components/System/AuditLogQueryForm';

function WebhookStatus({ status }: { status: string }) {
  const colors: Record<string, string> = {
    processed: 'default',
    failed: 'destructive',
    queued: 'secondary',
    dead_letter: 'destructive',
  };
  return (
    <Badge
      variant={(colors[status] ?? 'outline') as 'default' | 'destructive' | 'secondary' | 'outline'}
      className="capitalize"
    >
      {status.replace('_', ' ')}
    </Badge>
  );
}

export default function SystemAdminPage() {
  const [auditQuery, setAuditQuery] = useState<AuditLogQuery>({});
  const { data: webhookData, isLoading: webhookLoading } = useWebhookEvents({ limit: 25 });
  const { data: auditData, isLoading: auditLoading } = useAuditLogs({ ...auditQuery, limit: 50 });

  const webhooks = webhookData?.data ?? [];
  const auditLogs = auditData?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">System Admin</h1>
        <p className="text-sm text-muted-foreground">Webhook events and audit logs.</p>
      </div>

      <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="mt-4 space-y-3">
          {webhookLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            webhooks.map((wh) => (
              <Card key={wh.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="flex-1">
                    <p className="font-mono text-sm">{wh.event_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {wh.source} · {new Date(wh.created_at).toLocaleString('en-CA')} ·{' '}
                      {wh.attempts} attempt(s)
                    </p>
                    {wh.last_error && (
                      <p className="mt-1 text-xs text-destructive">{wh.last_error}</p>
                    )}
                  </div>
                  <WebhookStatus status={wh.status} />
                  {(wh.status === 'failed' || wh.status === 'dead_letter') && (
                    <WebhookReplayForm webhookId={wh.id} />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <AuditLogQueryForm onQuery={setAuditQuery} />
            </CardContent>
          </Card>

          {auditLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="font-mono text-sm">
                        {log.entity_type}/{log.entity_id.slice(0, 8)}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('en-CA')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
