'use client';

import { useState } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useBulkEmail } from '@/hooks/useCRM';

import { ComposeStep, ConfirmStep, type FormState, ReviewStep, SentStep } from './BulkEmailSteps';

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

  const resetForm = {
    step: 'review' as const,
    templates: [],
    selectedTemplateId: '',
    subject: '',
    body: '',
    result: null,
  };
  if (open && !form._openKey) {
    setForm({ ...resetForm, _openKey: true });
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
