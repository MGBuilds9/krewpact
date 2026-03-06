'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBulkEmail } from '@/hooks/useCRM';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
}

interface BulkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeadIds: string[];
  onSendComplete: () => void;
}

export function BulkEmailDialog({
  open,
  onOpenChange,
  selectedLeadIds,
  onSendComplete,
}: BulkEmailDialogProps) {
  interface FormState {
    step: 'review' | 'compose' | 'confirm' | 'sent';
    templates: EmailTemplate[];
    selectedTemplateId: string;
    subject: string;
    body: string;
    result: { sent: number; failed: number; total: number } | null;
    _openKey: boolean;
  }

  const [form, setForm] = useState<FormState>({
    step: 'review', templates: [], selectedTemplateId: '', subject: '', body: '', result: null, _openKey: false,
  });

  const bulkEmail = useBulkEmail();

  // Reset state and fetch templates when dialog opens
  if (open && !form._openKey) {
    setForm({ step: 'review', templates: [], selectedTemplateId: '', subject: '', body: '', result: null, _openKey: true });
    fetch('/api/crm/email-templates')
      .then((res) => res.json())
      .then((data) => {
        setForm((prev) => ({ ...prev, templates: data.data ?? data ?? [] }));
      })
      .catch(() => {
        setForm((prev) => ({ ...prev, templates: [] }));
      });
  }
  if (!open && form._openKey) {
    setForm((prev) => ({ ...prev, _openKey: false }));
  }

  const { step, templates, selectedTemplateId, subject, body, result } = form;

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setForm((prev) => ({
      ...prev,
      selectedTemplateId: templateId,
      ...(template ? { subject: template.subject, body: template.html } : {}),
    }));
  };

  const handleSend = async () => {
    try {
      const res = await bulkEmail.mutateAsync({
        lead_ids: selectedLeadIds,
        subject,
        html: body,
        ...(selectedTemplateId ? { template_id: selectedTemplateId } : {}),
      });
      setForm((prev) => ({ ...prev, result: res, step: 'sent' as const }));
      onSendComplete();
    } catch {
      // Error handled by mutation state
    }
  };

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === 'review' && (
          <>
            <DialogHeader>
              <DialogTitle>Bulk Email</DialogTitle>
              <DialogDescription>
                Send an email to the selected leads.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Recipients:</span>
                <Badge variant="secondary" data-testid="lead-count">
                  {selectedLeadIds.length} lead{selectedLeadIds.length !== 1 ? 's' : ''} selected
                </Badge>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setForm((p) => ({ ...p, step: 'compose' as const }))}>
                Next: Compose
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'compose' && (
          <>
            <DialogHeader>
              <DialogTitle>Compose Email</DialogTitle>
              <DialogDescription>
                Choose a template or write a custom email.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-select">Template (optional)</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger id="template-select">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="Email subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-body">Body</Label>
                <Textarea
                  id="email-body"
                  value={body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                  placeholder="Compose your email..."
                  rows={6}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setForm((p) => ({ ...p, step: 'review' as const }))}>
                Back
              </Button>
              <Button onClick={() => setForm((p) => ({ ...p, step: 'confirm' as const }))} disabled={!canSend}>
                Next: Review & Send
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm & Send</DialogTitle>
              <DialogDescription>
                Review your email before sending.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">To:</span>
                  <Badge variant="secondary">
                    {selectedLeadIds.length} lead{selectedLeadIds.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Subject:</span>{' '}
                  <span className="text-sm">{subject}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Body:</span>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{body}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setForm((p) => ({ ...p, step: 'compose' as const }))}>
                Back
              </Button>
              <Button onClick={handleSend} disabled={bulkEmail.isPending}>
                {bulkEmail.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'sent' && result && (
          <>
            <DialogHeader>
              <DialogTitle>Email Sent</DialogTitle>
              <DialogDescription>
                Your bulk email has been processed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Total:</span>
                  <span className="text-sm" data-testid="result-total">{result.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Sent:</span>
                  <Badge variant="default" data-testid="result-sent">{result.sent}</Badge>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Failed:</span>
                    <Badge variant="destructive" data-testid="result-failed">{result.failed}</Badge>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
