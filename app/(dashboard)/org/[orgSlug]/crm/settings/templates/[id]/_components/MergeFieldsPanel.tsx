'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MERGE_FIELDS = [
  'first_name',
  'last_name',
  'company_name',
  'email',
  'phone',
  'project_name',
  'project_type',
  'city',
  'province',
  'sender_name',
  'sender_title',
  'logo_url',
  'cta_url',
  'unsubscribe_url',
];

export function MergeFieldsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Merge Fields</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">Click to copy. Use in subject or body.</p>
        <div className="flex flex-wrap gap-1.5">
          {MERGE_FIELDS.map((field) => (
            <button
              key={field}
              type="button"
              className="rounded border px-2 py-0.5 text-xs font-mono hover:bg-muted transition-colors"
              onClick={() => navigator.clipboard.writeText(`{{${field}}}`)}
            >
              {`{{${field}}}`}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
