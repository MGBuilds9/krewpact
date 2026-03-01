import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { leadUpdateSchema } from '@/lib/validators/crm';
import { NextRequest, NextResponse } from 'next/server';
import { scoreLead } from '@/lib/crm/scoring-engine';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { UNAUTHORIZED, INVALID_JSON, validationError, notFound, dbError, errorResponse } from '@/lib/api/errors';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const { id } = await context.params;
  const supabase = await createUserClient();
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();

  if (error) {
    return errorResponse(error.code === 'PGRST116' ? notFound('Lead') : dbError(error.message));
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(INVALID_JSON);
  }

  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('leads')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return errorResponse(error.code === 'PGRST116' ? notFound('Lead') : dbError(error.message));
  }

  // Auto-score on update (non-blocking)
  try {
    let rulesQuery = supabase
      .from('scoring_rules')
      .select('*')
      .eq('is_active', true);

    if (data.division_id) {
      rulesQuery = rulesQuery.or(`division_id.eq.${data.division_id},division_id.is.null`);
    }

    const { data: rules } = await rulesQuery;
    if (rules && rules.length > 0) {
      const previousScore = data.lead_score ?? 0;
      const result = scoreLead(data as Record<string, unknown>, rules as ScoringRule[]);
      await supabase
        .from('leads')
        .update({ lead_score: result.total_score })
        .eq('id', id);

      await supabase.from('lead_score_history').insert({
        lead_id: id,
        score: result.total_score,
        previous_score: previousScore,
        rule_results: result.rule_results as unknown as Record<string, unknown>,
      });

      data.lead_score = result.total_score;
    }
  } catch (e) {
    // Scoring failure should not block lead update
    console.error('Auto-score on update failed:', e);
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const { id } = await context.params;
  const supabase = await createUserClient();
  const { error } = await supabase.from('leads').delete().eq('id', id);

  if (error) return errorResponse(dbError(error.message));

  return NextResponse.json({ success: true });
}
