'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-client';
import { type BrandingConfig, brandingSchema } from '@/lib/validators/branding';

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded border p-0.5"
        />
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-32 font-mono text-sm"
        />
      </div>
    </div>
  );
}

export default function BrandingPageContent() {
  const params = useParams();
  const slug = params.orgSlug as string;
  const qc = useQueryClient();
  const qk = ['org-branding', slug];

  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: () => apiFetch<{ branding: BrandingConfig }>(`/api/org/${slug}/branding`),
    enabled: !!slug,
  });

  const form = useForm<BrandingConfig>({ resolver: zodResolver(brandingSchema) });
  const { register, handleSubmit, reset, setValue, watch } = form;

  useEffect(() => {
    if (data?.branding) reset(data.branding);
  }, [data, reset]);

  const save = useMutation({
    mutationFn: (body: BrandingConfig) =>
      apiFetch(`/api/org/${slug}/branding`, { method: 'PATCH', body }),
    onSuccess: () => {
      toast.success('Branding saved');
      void qc.invalidateQueries({ queryKey: qk });
    },
    onError: () => toast.error('Failed to save branding'),
  });

  const logoUrl = watch('logo_url');

  if (isLoading) {
    return <div className="space-y-6 p-6 animate-pulse"><div className="h-8 w-48 bg-muted rounded" /></div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <PageHeader title="Branding" description="Customize your organization's visual identity." />
      <Card>
        <CardHeader>
          <CardTitle>Identity &amp; Colors</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5">
            <div className="space-y-1">
              <Label htmlFor="company_name">Company Name</Label>
              <Input id="company_name" {...register('company_name')} placeholder="Acme Corp" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="company_description">Company Description</Label>
              <Input id="company_description" {...register('company_description')} placeholder="A brief description of your company" />
              <p className="text-xs text-muted-foreground">Used in AI-generated content and email templates.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="support_email">Support Email</Label>
              <Input id="support_email" type="email" {...register('support_email')} placeholder="support@example.com" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="support_url">Support URL</Label>
              <Input id="support_url" type="url" {...register('support_url')} placeholder="https://support.example.com" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input id="logo_url" {...register('logo_url')} placeholder="https://..." />
              {logoUrl && (
                <Image src={logoUrl} alt="Logo preview" width={160} height={48} className="mt-2 rounded border object-contain" unoptimized />
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="favicon_url">Favicon URL</Label>
              <Input id="favicon_url" {...register('favicon_url')} placeholder="https://..." />
            </div>

            <div className="space-y-1">
              <Label htmlFor="erp_company">ERP Company Name</Label>
              <Input id="erp_company" {...register('erp_company')} placeholder="Acme Corp" />
              <p className="text-xs text-muted-foreground">Must match the ERPNext Company doctype name exactly.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="footer_text">Footer Text</Label>
              <Input id="footer_text" {...register('footer_text')} placeholder="© 2026 Acme Corp. All rights reserved." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ColorField
                id="primary_color"
                label="Primary Color"
                value={watch('primary_color')}
                onChange={(v) => setValue('primary_color', v)}
              />
              <ColorField
                id="accent_color"
                label="Accent Color"
                value={watch('accent_color')}
                onChange={(v) => setValue('accent_color', v)}
              />
            </div>

            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save Branding'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="p-6 bg-background">
              <div className="flex items-center gap-3 mb-2">
                {logoUrl && (
                  <Image src={logoUrl} alt="Logo" width={48} height={48} className="rounded object-contain" unoptimized />
                )}
                <span
                  className="text-xl font-semibold"
                  style={{ color: watch('primary_color') ?? undefined }}
                >
                  {watch('company_name') || 'Company Name'}
                </span>
              </div>
              {watch('company_description') && (
                <p className="text-sm text-muted-foreground mb-4">{watch('company_description')}</p>
              )}
            </div>
            <div
              className="h-1"
              style={{
                background: `linear-gradient(to right, ${watch('primary_color') ?? '#000'}, ${watch('accent_color') ?? '#000'})`,
              }}
            />
            <div className="px-6 py-3 bg-muted text-center">
              <p className="text-xs text-muted-foreground">
                {watch('footer_text') || '© 2026 Your Company'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
