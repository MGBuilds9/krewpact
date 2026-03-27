'use client';

import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { value: 'outreach', label: 'Outreach' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'event', label: 'Event' },
  { value: 'referral', label: 'Referral' },
];

interface TemplateEditFormProps {
  name: string;
  setName: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  bodyHtml: string;
  setBodyHtml: (v: string) => void;
  bodyText: string;
  setBodyText: (v: string) => void;
  isPending: boolean;
  onSubmit: () => void;
}

export function TemplateEditForm({
  name,
  setName,
  category,
  setCategory,
  subject,
  setSubject,
  bodyHtml,
  setBodyHtml,
  bodyText,
  setBodyText,
  isPending,
  onSubmit,
}: TemplateEditFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
