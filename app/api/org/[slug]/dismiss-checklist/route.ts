import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createServiceClient } from '@/lib/supabase/server';

export const POST = withApiRoute({}, async ({ params, orgId }) => {
  if (!orgId) return NextResponse.json({ error: 'Organization context required' }, { status: 500 });

  const { slug } = params;
  const supabase = await createServiceClient();

  // Verify the org matches the authenticated user's org
  const { data: org } = await supabase
    .from('organizations')
    .select('id, metadata')
    .eq('slug', slug)
    .eq('id', orgId)
    .single();

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  const metadata = (org.metadata as Record<string, unknown>) ?? {};
  const { error } = await supabase
    .from('organizations')
    .update({ metadata: { ...metadata, setup_checklist_dismissed: true } })
    .eq('id', orgId);

  if (error) return NextResponse.json({ error: 'Failed to dismiss checklist' }, { status: 500 });

  return NextResponse.json({ ok: true });
});
