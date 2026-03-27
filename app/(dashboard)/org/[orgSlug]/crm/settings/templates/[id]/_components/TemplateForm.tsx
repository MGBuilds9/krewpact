'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { EmailAnalyticsCard } from '@/components/CRM/EmailAnalyticsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import { MergeFieldsPanel } from './MergeFieldsPanel';
import { TemplateEditForm } from './TemplateEditForm';

interface TemplateFormProps {
  template: Record<string, string>;
  id: string;
}

export function TemplateForm({ template, id }: TemplateFormProps) {
  const { push: orgPush } = useOrgRouter();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [name, setName] = useState(template.name ?? '');
  const [category, setCategory] = useState(template.category ?? 'outreach');
  const [subject, setSubject] = useState(template.subject ?? '');
  const [bodyHtml, setBodyHtml] = useState(template.body_html ?? '');
  const [bodyText, setBodyText] = useState(template.body_text ?? '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/crm/email-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          subject,
          body_html: bodyHtml,
          body_text: bodyText || null,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-template', id] });
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/crm/email-templates/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      orgPush('/crm/settings/templates');
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Template</h1>
          <p className="text-muted-foreground">{template.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm('Delete this template?')) deleteMutation.mutate();
            }}
          >
            Delete
          </Button>
        </div>
      </div>
      <EmailAnalyticsCard templateId={id} />
      {showPreview ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Subject: {subject}</p>
            <iframe
              srcDoc={bodyHtml}
              title="Email Preview"
              className="w-full border rounded-md"
              style={{ height: '600px' }}
              sandbox=""
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2">
            <Card>
              <CardContent className="pt-6">
                <TemplateEditForm
                  name={name}
                  setName={setName}
                  category={category}
                  setCategory={setCategory}
                  subject={subject}
                  setSubject={setSubject}
                  bodyHtml={bodyHtml}
                  setBodyHtml={setBodyHtml}
                  bodyText={bodyText}
                  setBodyText={setBodyText}
                  isPending={updateMutation.isPending}
                  onSubmit={() => updateMutation.mutate()}
                />
              </CardContent>
            </Card>
          </div>
          <div>
            <MergeFieldsPanel />
          </div>
        </div>
      )}
    </div>
  );
}
