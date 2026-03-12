'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Copy, Send } from 'lucide-react';

interface EmailDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'lead' | 'opportunity' | 'account';
  entityId: string;
  draftType?: 'follow_up' | 'introduction' | 'proposal' | 'custom';
}

export function EmailDraftModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  draftType = 'follow_up',
}: EmailDraftModalProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateDraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          draft_type: draftType,
        }),
      });
      if (!res.ok) {
        setError('Failed to generate draft');
        return;
      }
      const data = await res.json();
      setSubject(data.subject ?? '');
      setBody(data.body ?? '');
      if (data.to?.[0]) setTo(data.to[0]);
    } catch {
      setError('Failed to generate draft');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, draftType]);

  // Generate on first open
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !subject && !body && !loading) {
      generateDraft();
    }
    if (!isOpen) {
      setSubject('');
      setBody('');
      setTo('');
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!to || !subject || !body) return;
    setLoading(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [{ address: to }],
          subject,
          body,
          bodyType: 'text',
          ...(entityType === 'lead' ? { leadId: entityId } : {}),
          ...(entityType === 'account' ? { accountId: entityId } : {}),
        }),
      });
      if (res.ok) {
        onOpenChange(false);
      } else {
        setError('Failed to send email');
      }
    } catch {
      setError('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Email Draft</DialogTitle>
        </DialogHeader>

        {loading && !subject ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Generating draft...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="draft-to">To</Label>
              <Input
                id="draft-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="draft-subject">Subject</Label>
              <Input
                id="draft-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="draft-body">Body</Label>
              <Textarea
                id="draft-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="resize-y"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateDraft}
            disabled={loading}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Regenerate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={loading || !to || !subject || !body}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
