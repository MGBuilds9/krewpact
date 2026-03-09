import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const supabase = await createUserClient();

  // AR summary from invoice_snapshots
  const { data: invoices, error: invErr } = await supabase
    .from('invoice_snapshots')
    .select('id, total_amount, amount_paid, status');

  // PO summary from po_snapshots
  const { data: pos, error: poErr } = await supabase
    .from('po_snapshots')
    .select('id, total_amount');

  // Job cost summary from job_cost_snapshots
  const { data: jobCosts, error: jcErr } = await supabase.from('job_cost_snapshots').select('id');

  if (invErr || poErr || jcErr) {
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 });
  }

  // Calculate AR outstanding (total_amount - amount_paid for unpaid invoices)
  const arTotal = (invoices || []).reduce((sum, inv) => {
    const total = typeof inv.total_amount === 'number' ? inv.total_amount : 0;
    const paid = typeof inv.amount_paid === 'number' ? inv.amount_paid : 0;
    return sum + (total - paid);
  }, 0);

  const arCount = (invoices || []).length;

  const poTotal = (pos || []).reduce((sum, po) => {
    return sum + (typeof po.total_amount === 'number' ? po.total_amount : 0);
  }, 0);

  const poCount = (pos || []).length;

  const jobCostCount = (jobCosts || []).length;

  return NextResponse.json({
    accounts_receivable: { total_outstanding: arTotal, invoice_count: arCount },
    purchase_orders: { total_value: poTotal, po_count: poCount },
    job_costs: { snapshot_count: jobCostCount },
  });
}
