'use client';

import { useState } from 'react';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/date';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'event', label: 'Event' },
  { value: 'referral', label: 'Referral' },
];

const CATEGORY_COLORS: Record<string, string> = {
  outreach: 'bg-blue-100 text-blue-700',
  follow_up: 'bg-amber-100 text-amber-700',
  nurture: 'bg-green-100 text-green-700',
  event: 'bg-purple-100 text-purple-700',
  referral: 'bg-pink-100 text-pink-700',
};

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  is_active: boolean;
  updated_at: string;
}

export default function TemplatesPage() {
  const { push: orgPush } = useOrgRouter();
  const [category, setCategory] = useState('');

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['email-templates', category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      const res = await fetch(`/api/crm/email-templates?${params}`);
      const json = await res.json();
      return json.data ?? [];
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">
            Branded email templates for outreach sequences and campaigns.
          </p>
        </div>
        <Button onClick={() => orgPush('/crm/settings/templates/new')}>Create Template</Button>
      </div>

      <div className="flex gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              category === cat.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-24 rounded bg-muted mb-3" />
                <div className="h-5 w-full rounded bg-muted mb-2" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No templates found. Create your first email template to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => orgPush(`/crm/settings/templates/${template.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className={CATEGORY_COLORS[template.category] ?? ''}>
                    {template.category.replace('_', ' ')}
                  </Badge>
                  {!template.is_active && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Draft
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-1">{template.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{template.subject}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Updated {formatDate(template.updated_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
