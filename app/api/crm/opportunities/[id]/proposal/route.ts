import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { composeProposalData } from '@/lib/crm/proposal-generator';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const supabase = await createUserClient();

  // Fetch opportunity
  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .select(
      'id, opportunity_name, estimated_revenue, target_close_date, stage, account_id, contact_id',
    )
    .eq('id', id)
    .single();

  if (oppError) {
    const status = oppError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: oppError.message }, { status });
  }

  const oppData = opportunity as Record<string, unknown>;

  // Fetch linked account
  let account = null;
  if (oppData.account_id) {
    const { data } = await supabase
      .from('accounts')
      .select('id, account_name, billing_address')
      .eq('id', oppData.account_id as string)
      .single();
    account = data as {
      id: string;
      account_name: string;
      billing_address: Record<string, string> | null;
    } | null;
  }

  // Fetch linked contact
  let contact = null;
  if (oppData.contact_id) {
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, role_title')
      .eq('id', oppData.contact_id as string)
      .single();
    contact = data as {
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      role_title: string | null;
    } | null;
  }

  // Fetch linked estimates
  const { data: estimates } = await supabase
    .from('estimates')
    .select('id, estimate_number, total_amount, status')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });

  // Company info from env vars with defaults
  const companyInfo = {
    name: process.env.COMPANY_NAME ?? 'MDM Group Inc.',
    address:
      process.env.COMPANY_ADDRESS ?? '2233 Argentia Road, Suite 302, Mississauga, ON L5N 2X7',
    phone: process.env.COMPANY_PHONE ?? '(905) 542-2950',
    email: process.env.COMPANY_EMAIL ?? 'info@mdmgroupinc.ca',
  };

  const proposalData = composeProposalData({
    opportunity: {
      id: oppData.id as string,
      opportunity_name: oppData.opportunity_name as string,
      estimated_revenue: oppData.estimated_revenue as number | null,
      target_close_date: oppData.target_close_date as string | null,
      stage: oppData.stage as string,
    },
    account,
    contact,
    estimates: (estimates ?? []) as {
      id: string;
      estimate_number: string;
      total_amount: number;
      status: string;
    }[],
    companyInfo,
  });

  return NextResponse.json(proposalData);
}
