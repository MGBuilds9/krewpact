'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useReplayWebhook } from '@/hooks/useSystem';

interface WebhookReplayFormProps {
  webhookId: string;
  onSuccess?: () => void;
}

export function WebhookReplayForm({ webhookId, onSuccess }: WebhookReplayFormProps) {
  const replay = useReplayWebhook();

  async function handleReplay() {
    try {
      await replay.mutateAsync(webhookId);
      toast.success('Webhook queued for replay');
      onSuccess?.();
    } catch {
      toast.error('Failed to replay webhook');
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleReplay} disabled={replay.isPending}>
      {replay.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-4 w-4" />
      )}
      Replay
    </Button>
  );
}
