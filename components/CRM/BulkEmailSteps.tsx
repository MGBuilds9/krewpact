'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
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

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
}

export interface FormState {
  step: 'review' | 'compose' | 'confirm' | 'sent';
  templates: EmailTemplate[];
  selectedTemplateId: string;
  subject: string;
  body: string;
  result: { sent: number; failed: number; total: number } | null;
  _openKey: boolean;
}

export type SetForm = React.Dispatch<React.SetStateAction<FormState>>;

export function ReviewStep({ count, onNext, onClose }: { count: number; onNext: () => void; onClose: () => void; }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Bulk Email</DialogTitle>
        <DialogDescription>Send an email to the selected leads.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Recipients:</span>
          <Badge variant="secondary" data-testid="lead-count">{count} lead{count !== 1 ? 's' : ''} selected</Badge>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onNext}>Next: Compose</Button>
      </DialogFooter>
    </>
  );
}

export interface ComposeStepProps {
  templates: EmailTemplate[];
  selectedTemplateId: string;
  subject: string;
  body: string;
  setForm: SetForm;
  canSend: boolean;
}

export function ComposeStep({ templates, selectedTemplateId, subject, body, setForm, canSend }: ComposeStepProps) {
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setForm((prev) => ({ ...prev, selectedTemplateId: templateId, ...(template ? { subject: template.subject, body: template.html } : {}) }));
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
            <SelectTrigger id="template-select"><SelectValue placeholder="Select a template" /></SelectTrigger>
            <SelectContent>{templates.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-subject">Subject</Label>
          <Input id="email-subject" value={subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Email subject" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-body">Body</Label>
          <Textarea id="email-body" value={body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} placeholder="Compose your email..." rows={6} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setForm((p) => ({ ...p, step: 'review' as const }))}>Back</Button>
        <Button onClick={() => setForm((p) => ({ ...p, step: 'confirm' as const }))} disabled={!canSend}>Next: Review & Send</Button>
      </DialogFooter>
    </>
  );
}

export function ConfirmStep({ count, subject, body, isPending, onBack, onSend }: { count: number; subject: string; body: string; isPending: boolean; onBack: () => void; onSend: () => void; }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirm & Send</DialogTitle>
        <DialogDescription>Review your email before sending.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center gap-2"><span className="text-sm font-medium">To:</span><Badge variant="secondary">{count} lead{count !== 1 ? 's' : ''}</Badge></div>
          <div><span className="text-sm font-medium">Subject:</span>{' '}<span className="text-sm">{subject}</span></div>
          <div><span className="text-sm font-medium">Body:</span><p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{body}</p></div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onSend} disabled={isPending}>{isPending ? 'Sending...' : 'Send Email'}</Button>
      </DialogFooter>
    </>
  );
}

export function SentStep({ result, onClose }: { result: { sent: number; failed: number; total: number }; onClose: () => void; }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Email Sent</DialogTitle>
        <DialogDescription>Your bulk email has been processed.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center gap-2"><span className="text-sm font-medium">Total:</span><span className="text-sm" data-testid="result-total">{result.total}</span></div>
          <div className="flex items-center gap-2"><span className="text-sm font-medium">Sent:</span><Badge variant="default" data-testid="result-sent">{result.sent}</Badge></div>
          {result.failed > 0 && (
            <div className="flex items-center gap-2"><span className="text-sm font-medium">Failed:</span><Badge variant="destructive" data-testid="result-failed">{result.failed}</Badge></div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}
