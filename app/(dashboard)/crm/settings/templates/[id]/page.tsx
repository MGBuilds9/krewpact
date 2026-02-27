'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmailAnalyticsCard } from '@/components/CRM/EmailAnalyticsCard';

const CATEGORIES = [
  { value: 'outreach', label: 'Outreach' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'event', label: 'Event' },
  { value: 'referral', label: 'Referral' },
];

const MERGE_FIELDS = [
  'first_name', 'last_name', 'company_name', 'email', 'phone',
  'project_name', 'project_type', 'city', 'province',
  'sender_name', 'sender_title', 'logo_url', 'cta_url',
  'unsubscribe_url',
];

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: template, isLoading } = useQuery({
    queryKey: ['email-template', id],
    queryFn: async () => {
      const res = await fetch(`/api/crm/email-templates/${id}`);
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading template...</div>;
  }

  if (!template) {
    return <div className="p-6">Template not found.</div>;
  }

  return <TemplateForm key={template.id} template={template} id={id!} />;
}

function TemplateForm({ template, id }: { template: Record<string, string>; id: string }) {
  const router = useRouter();
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
      router.push('/crm/settings/templates');
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
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm('Delete this template?')) {
                deleteMutation.mutate();
              }
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
            <p className="text-sm text-muted-foreground mb-3">
              Subject: {subject}
            </p>
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
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Card>
              <CardContent className="pt-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm font-medium" htmlFor="tpl-name">
                      Template Name
                    </label>
                    <input
                      id="tpl-name"
                      type="text"
                      className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className="text-sm font-medium"
                        htmlFor="tpl-category"
                      >
                        Category
                      </label>
                      <select
                        id="tpl-category"
                        className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className="text-sm font-medium"
                        htmlFor="tpl-subject"
                      >
                        Subject Line
                      </label>
                      <input
                        id="tpl-subject"
                        type="text"
                        className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium" htmlFor="tpl-html">
                      Body HTML
                    </label>
                    <textarea
                      id="tpl-html"
                      rows={16}
                      className="w-full mt-1 rounded-md border px-3 py-2 text-sm font-mono"
                      value={bodyHtml}
                      onChange={(e) => setBodyHtml(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium" htmlFor="tpl-text">
                      Body Text
                    </label>
                    <textarea
                      id="tpl-text"
                      rows={6}
                      className="w-full mt-1 rounded-md border px-3 py-2 text-sm font-mono"
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Merge Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Click to copy. Use in subject or body.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MERGE_FIELDS.map((field) => (
                    <button
                      key={field}
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs font-mono hover:bg-muted transition-colors"
                      onClick={() =>
                        navigator.clipboard.writeText(`{{${field}}}`)
                      }
                    >
                      {`{{${field}}}`}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
