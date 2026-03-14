import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getKrewpactRoles } from '@/lib/api/org';

const EXECUTIVE_ROLES = ['platform_admin', 'executive'];

interface Alert {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  count?: number;
  created_at: string;
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const today = now.toISOString().split('T')[0];
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [stalledDealsResult, knowledgeQueueResult, saasRenewalsResult, staleProjectsResult] =
    await Promise.all([
      supabase
        .from('opportunities')
        .select('id, name, stage, updated_at')
        .not('stage', 'in', '("closed_won","closed_lost")')
        .lt('updated_at', fourteenDaysAgo),
      supabase
        .from('knowledge_staging')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review'),
      supabase
        .from('executive_subscriptions')
        .select('id, name, renewal_date')
        .eq('is_active', true)
        .lte('renewal_date', sevenDaysFromNow)
        .gte('renewal_date', today),
      supabase
        .from('projects')
        .select('id, name, status, updated_at')
        .eq('status', 'active')
        .lt('updated_at', fourteenDaysAgo),
    ]);

  const alerts: Alert[] = [];
  const createdAt = now.toISOString();

  if (stalledDealsResult.error) {
    logger.error('Failed to fetch stalled deals', { message: stalledDealsResult.error.message });
  } else if (stalledDealsResult.data && stalledDealsResult.data.length > 0) {
    const count = stalledDealsResult.data.length;
    alerts.push({
      type: 'stalled_deal',
      severity: 'medium',
      title: `${count} Stalled Deal${count > 1 ? 's' : ''}`,
      description: `${count} opportunit${count > 1 ? 'ies have' : 'y has'} not been updated in over 14 days.`,
      count,
      created_at: createdAt,
    });
  }

  if (knowledgeQueueResult.error) {
    logger.error('Failed to fetch knowledge queue count', {
      message: knowledgeQueueResult.error.message,
    });
  } else if ((knowledgeQueueResult.count ?? 0) > 5) {
    const count = knowledgeQueueResult.count as number;
    alerts.push({
      type: 'knowledge_queue',
      severity: 'low',
      title: 'Knowledge Review Queue',
      description: `${count} documents are pending review in the knowledge staging queue.`,
      count,
      created_at: createdAt,
    });
  }

  if (saasRenewalsResult.error) {
    logger.error('Failed to fetch SaaS renewals', { message: saasRenewalsResult.error.message });
  } else if (saasRenewalsResult.data && saasRenewalsResult.data.length > 0) {
    const count = saasRenewalsResult.data.length;
    alerts.push({
      type: 'saas_renewal',
      severity: 'low',
      title: `${count} SaaS Renewal${count > 1 ? 's' : ''} Due Soon`,
      description: `${count} subscription${count > 1 ? 's' : ''} renew${count === 1 ? 's' : ''} within the next 7 days.`,
      count,
      created_at: createdAt,
    });
  }

  if (staleProjectsResult.error) {
    logger.error('Failed to fetch stale projects', { message: staleProjectsResult.error.message });
  } else if (staleProjectsResult.data && staleProjectsResult.data.length > 0) {
    const count = staleProjectsResult.data.length;
    alerts.push({
      type: 'stale_project',
      severity: 'medium',
      title: `${count} Stale Project${count > 1 ? 's' : ''}`,
      description: `${count} active project${count > 1 ? 's have' : ' has'} not been updated in over 14 days.`,
      count,
      created_at: createdAt,
    });
  }

  alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return NextResponse.json({ alerts });
}
