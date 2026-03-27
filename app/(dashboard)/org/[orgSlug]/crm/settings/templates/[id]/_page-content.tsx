'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { TemplateForm } from './_components/TemplateForm';

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

  if (isLoading) return <div className="p-6">Loading template...</div>;
  if (!template) return <div className="p-6">Template not found.</div>;
  return <TemplateForm key={template.id} template={template} id={id!} />;
}
