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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSendEmail } from '@/hooks/useCRM';
import { Loader2 } from 'lucide-react';

export interface EmailComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientEmail?: string;
  recipientName?: string;
  entityType?: 'lead' | 'contact' | 'account';
  entityId?: string;
  leadId?: string;
  contactId?: string;
  accountId?: string;
}

export function EmailComposeDialog({
  open,
  onOpenChange,
  recipientEmail,
  recipientName,
  leadId,
  contactId,
  accountId,
}: EmailComposeDialogProps) {
  const [to, setTo] = useState(recipientEmail ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const sendEmail = useSendEmail();

  const handleSubmit = async () => {
    if (!to || !subject || !body) return;

    try {
      await sendEmail.mutateAsync({
        to: [{ address: to, name: recipientName }],
        subject,
        body,
        bodyType: 'text',
        leadId,
        contactId,
        accountId,
      });
      setSubject('');
      setBody('');
      onOpenChange(false);
    } catch {
      // Error handled by React Query
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            Send an email from the CRM. Activity will be auto-logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-body">Body</Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!to || !subject || !body || sendEmail.isPending}
          >
            {sendEmail.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {sendEmail.isPending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
