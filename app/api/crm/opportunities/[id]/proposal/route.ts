import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { composeProposalData } from '@/lib/crm/proposal-generator';
import { env } from '@/lib/env';
import { createUserClientSafe } from '@/lib/supabase/server';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

const COMPANY_INFO = {
  name: env.COMPANY_NAME ?? 'Your Company',
  address: env.COMPANY_ADDRESS ?? 'Configure COMPANY_ADDRESS in env',
  phone: env.COMPANY_PHONE ?? 'Configure COMPANY_PHONE in env',
  email: env.COMPANY_EMAIL ?? 'Configure COMPANY_EMAIL in env',
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
    return { oppError };
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

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const result = await fetchProposalData(supabase, id);
  if ('oppError' in result) {
    const oppError = result.oppError!;
    if (oppError.code === 'PGRST116') throw notFound('Opportunity');
    throw dbError(oppError.message);
  }

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
});
