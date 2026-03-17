'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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

interface FormState {
  step: 'review' | 'compose' | 'confirm' | 'sent';
  templates: EmailTemplate[];
  selectedTemplateId: string;
  subject: string;
  body: string;
  result: { sent: number; failed: number; total: number } | null;
  _openKey: boolean;
}

type SetForm = React.Dispatch<React.SetStateAction<FormState>>;

function ReviewStep({
  count,
  onNext,
  onClose,
}: {
  count: number;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Bulk Email</DialogTitle>
        <DialogDescription>Send an email to the selected leads.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Recipients:</span>
          <Badge variant="secondary" data-testid="lead-count">
            {count} lead{count !== 1 ? 's' : ''} selected
          </Badge>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onNext}>Next: Compose</Button>
      </DialogFooter>
    </>
  );
}

function ComposeStep({
  templates,
  selectedTemplateId,
  subject,
  body,
  setForm,
  canSend,
}: {
  templates: EmailTemplate[];
  selectedTemplateId: string;
  subject: string;
  body: string;
  setForm: SetForm;
  canSend: boolean;
}) {
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setForm((prev) => ({
      ...prev,
      selectedTemplateId: templateId,
      ...(template ? { subject: template.subject, body: template.html } : {}),
    }));
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Compose Email</DialogTitle>
        <DialogDescription>Choose a template or write a custom email.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="template-select">Template (optional)</Label>
          <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
            <SelectTrigger id="template-select">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
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
        <Button
          variant="outline"
          onClick={() => setForm((p) => ({ ...p, step: 'review' as const }))}
        >
          Back
        </Button>
        <Button
          onClick={() => setForm((p) => ({ ...p, step: 'confirm' as const }))}
          disabled={!canSend}
        >
          Next: Review & Send
        </Button>
      </DialogFooter>
    </>
  );
}

function ConfirmStep({
  count,
  subject,
  body,
  isPending,
  onBack,
  onSend,
}: {
  count: number;
  subject: string;
  body: string;
  isPending: boolean;
  onBack: () => void;
  onSend: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirm & Send</DialogTitle>
        <DialogDescription>Review your email before sending.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">To:</span>
            <Badge variant="secondary">
              {count} lead{count !== 1 ? 's' : ''}
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
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onSend} disabled={isPending}>
          {isPending ? 'Sending...' : 'Send Email'}
        </Button>
      </DialogFooter>
    </>
  );
}

function SentStep({
  result,
  onClose,
}: {
  result: { sent: number; failed: number; total: number };
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Email Sent</DialogTitle>
        <DialogDescription>Your bulk email has been processed.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Total:</span>
            <span className="text-sm" data-testid="result-total">
              {result.total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Sent:</span>
            <Badge variant="default" data-testid="result-sent">
              {result.sent}
            </Badge>
          </div>
          {result.failed > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Failed:</span>
              <Badge variant="destructive" data-testid="result-failed">
                {result.failed}
              </Badge>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}

export function BulkEmailDialog({
  open,
  onOpenChange,
  selectedLeadIds,
  onSendComplete,
}: BulkEmailDialogProps) {
  const [form, setForm] = useState<FormState>({
    step: 'review',
    templates: [],
    selectedTemplateId: '',
    subject: '',
    body: '',
    result: null,
    _openKey: false,
  });
  const bulkEmail = useBulkEmail();

  if (open && !form._openKey) {
    setForm({
      step: 'review',
      templates: [],
      selectedTemplateId: '',
      subject: '',
      body: '',
      result: null,
      _openKey: true,
    });
    fetch('/api/crm/email-templates')
      .then((res) => res.json())
      .then((data) => setForm((prev) => ({ ...prev, templates: data.data ?? data ?? [] })))
      .catch(() => setForm((prev) => ({ ...prev, templates: [] })));
  }
  if (!open && form._openKey) setForm((prev) => ({ ...prev, _openKey: false }));

  const { step, templates, selectedTemplateId, subject, body, result } = form;
  const canSend = subject.trim().length > 0 && body.trim().length > 0;

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
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === 'review' && (
          <ReviewStep
            count={selectedLeadIds.length}
            onNext={() => setForm((p) => ({ ...p, step: 'compose' as const }))}
            onClose={() => onOpenChange(false)}
          />
        )}
        {step === 'compose' && (
          <ComposeStep
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            subject={subject}
            body={body}
            setForm={setForm}
            canSend={canSend}
          />
        )}
        {step === 'confirm' && (
          <ConfirmStep
            count={selectedLeadIds.length}
            subject={subject}
            body={body}
            isPending={bulkEmail.isPending}
            onBack={() => setForm((p) => ({ ...p, step: 'compose' as const }))}
            onSend={handleSend}
          />
        )}
        {step === 'sent' && result && (
          <SentStep result={result} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
