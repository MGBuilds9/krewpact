import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { composeProposalData } from '@/lib/crm/proposal-generator';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };
type SupabaseClient = Awaited<ReturnType<typeof createUserClientSafe>>['client'];

const COMPANY_INFO = {
  name: process.env.COMPANY_NAME ?? 'MDM Group Inc.',
  address: process.env.COMPANY_ADDRESS ?? '2233 Argentia Road, Suite 302, Mississauga, ON L5N 2X7',
  phone: process.env.COMPANY_PHONE ?? '(905) 542-2950',
  email: process.env.COMPANY_EMAIL ?? 'info@mdmgroupinc.ca',
};

async function fetchProposalData(supabase: SupabaseClient, id: string) {
  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .select(
      'id, opportunity_name, estimated_revenue, target_close_date, stage, account_id, contact_id',
    )
    .eq('id', id)
    .single();

  if (oppError) {
    const status = oppError.code === 'PGRST116' ? 404 : 500;
    return { error: NextResponse.json({ error: oppError.message }, { status }) };
  }

  const opp = opportunity as Record<string, unknown>;

  const [accountResult, contactResult, estimatesResult] = await Promise.all([
    opp.account_id
      ? supabase
          .from('accounts')
          .select('id, account_name, billing_address')
          .eq('id', opp.account_id as string)
          .single()
      : Promise.resolve({ data: null }),
    opp.contact_id
      ? supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, title')
          .eq('id', opp.contact_id as string)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('estimates')
      .select('id, estimate_number, total_amount, status')
      .eq('opportunity_id', id)
      .order('created_at', { ascending: false }),
  ]);

  return {
    opp,
    account: accountResult.data,
    contact: contactResult.data,
    estimates: estimatesResult.data,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const result = await fetchProposalData(supabase, id);
  if ('error' in result) return result.error;

  const { opp, account, contact, estimates } = result;

  const proposalData = composeProposalData({
    opportunity: {
      id: opp.id as string,
      opportunity_name: opp.opportunity_name as string,
      estimated_revenue: opp.estimated_revenue as number | null,
      target_close_date: opp.target_close_date as string | null,
      stage: opp.stage as string,
    },
    account: account as {
      id: string;
      account_name: string;
      billing_address: Record<string, string> | null;
    } | null,
    contact: contact as {
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      title: string | null;
    } | null,
    estimates: (estimates ?? []) as {
      id: string;
      estimate_number: string;
      total_amount: number;
      status: string;
    }[],
    companyInfo: COMPANY_INFO,
  });

  return NextResponse.json(proposalData);
}
