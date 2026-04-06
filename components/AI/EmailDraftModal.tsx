'use client';

import { Copy, Loader2, RefreshCw, Send } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EmailDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'lead' | 'opportunity' | 'account';
  entityId: string;
  draftType?: 'follow_up' | 'introduction' | 'proposal' | 'custom';
}

function DraftFormFields({
  to,
  subject,
  body,
  error,
  onToChange,
  onSubjectChange,
  onBodyChange,
}: {
  to: string;
  subject: string;
  body: string;
  error: string | null;
  onToChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="draft-to">To</Label>
        <Input
          id="draft-to"
          type="email"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          placeholder="recipient@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="draft-subject">Subject</Label>
        <Input
          id="draft-subject"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="draft-body">Body</Label>
        <Textarea
          id="draft-body"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          rows={8}
          className="resize-y"
        />
      </div>
    </div>
  );
}

function DraftFooter({
  loading,
  copied,
  canSend,
  onGenerate,
  onCopy,
  onSend,
}: {
  loading: boolean;
  copied: boolean;
  canSend: boolean;
  onGenerate: () => void;
  onCopy: () => void;
  onSend: () => void;
}) {
  return (
    <DialogFooter className="flex-col gap-2 sm:flex-row">
      <Button type="button" variant="outline" size="sm" onClick={onGenerate} disabled={loading}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        Regenerate
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCopy}>
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      <Button type="button" size="sm" onClick={onSend} disabled={loading || !canSend}>
        {loading ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="mr-1.5 h-3.5 w-3.5" />
        )}
        Send
      </Button>
    </DialogFooter>
  );
}

async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  entityType: string;
  entityId: string;
}): Promise<boolean> {
  const res = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: [{ address: params.to }],
      subject: params.subject,
      body: params.body,
      bodyType: 'text',
      ...(params.entityType === 'lead' ? { leadId: params.entityId } : {}),
      ...(params.entityType === 'account' ? { accountId: params.entityId } : {}),
    }),
  });
  return res.ok;
}

// eslint-disable-next-line max-lines-per-function
function useEmailDraft(
  entityType: string,
  entityId: string,
  draftType: string,
  onClose: () => void,
) {
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!to || !subject || !body) return;
    setLoading(true);
    try {
      const ok = await sendEmail({ to, subject, body, entityType, entityId });
      if (ok) {
        onClose();
      } else {
        setError('Failed to send email');
      }
    } catch {
      setError('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSubject('');
    setBody('');
    setTo('');
    setError(null);
  };
  return {
    to,
    subject,
    body,
    loading,
    error,
    copied,
    setTo,
    setSubject,
    setBody,
    generateDraft,
    handleCopy,
    handleSend,
    reset,
  };
}

export function EmailDraftModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  draftType = 'follow_up',
}: EmailDraftModalProps) {
  const {
    to,
    subject,
    body,
    loading,
    error,
    copied,
    setTo,
    setSubject,
    setBody,
    generateDraft,
    handleCopy,
    handleSend,
    reset,
  } = useEmailDraft(entityType, entityId, draftType, () => onOpenChange(false));

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !subject && !body && !loading) generateDraft();
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Email Draft</DialogTitle>
          <DialogDescription className="sr-only">Compose and send email draft</DialogDescription>
        </DialogHeader>
        {loading && !subject ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Generating draft...</span>
          </div>
        ) : (
          <DraftFormFields
            to={to}
            subject={subject}
            body={body}
            error={error}
            onToChange={setTo}
            onSubjectChange={setSubject}
            onBodyChange={setBody}
          />
        )}
        <DraftFooter
          loading={loading}
          copied={copied}
          canSend={!!(to && subject && body)}
          onGenerate={generateDraft}
          onCopy={handleCopy}
          onSend={handleSend}
        />
      </DialogContent>
    </Dialog>
  );
}
