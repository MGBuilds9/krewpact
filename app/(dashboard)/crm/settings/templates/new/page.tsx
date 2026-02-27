'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BRANDED_TEMPLATES } from '@/lib/email/branded-templates';

const CATEGORIES = [
  { value: 'outreach', label: 'Outreach' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'event', label: 'Event' },
  { value: 'referral', label: 'Referral' },
];

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('outreach');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [saving, setSaving] = useState(false);

  function loadBrandedTemplate(id: string) {
    const template = BRANDED_TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    setName(template.name);
    setCategory(template.category);
    setSubject(template.subject);
    setBodyHtml(template.body_html);
    setBodyText(template.body_text);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/crm/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          subject,
          body_html: bodyHtml,
          body_text: bodyText || null,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        router.push(`/crm/settings/templates/${json.data?.id ?? ''}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Create Email Template</h1>
        <p className="text-muted-foreground">
          Start from scratch or load a branded template.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Load Branded Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {BRANDED_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => loadBrandedTemplate(t.id)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                {t.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
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
              <div>
                <label className="text-sm font-medium" htmlFor="tpl-category">
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
                <label className="text-sm font-medium" htmlFor="tpl-subject">
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
              <div className="col-span-2">
                <label className="text-sm font-medium" htmlFor="tpl-html">
                  Body HTML
                </label>
                <textarea
                  id="tpl-html"
                  rows={12}
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm font-mono"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium" htmlFor="tpl-text">
                  Body Text (plain text version)
                </label>
                <textarea
                  id="tpl-text"
                  rows={6}
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm font-mono"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
