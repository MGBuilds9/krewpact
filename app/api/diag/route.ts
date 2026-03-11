import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to capture the exact error causing 500s.
 * Tests each layer independently with detailed error reporting.
 * TEMPORARY — remove after debugging.
 */
export async function GET(req: NextRequest) {
  const results: Record<string, unknown> = { timestamp: new Date().toISOString() };

  // Step 1: Auth
  try {
    const { userId } = await auth();
    results.auth = { ok: true, userId: userId ?? null };
  } catch (err: unknown) {
    results.auth = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Step 2: Rate limit
  try {
    const userId = (results.auth as Record<string, unknown>)?.userId as string | null;
    if (userId) {
      const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
      results.rateLimit = { ok: true, success: rl.success };
    } else {
      results.rateLimit = { ok: true, skipped: 'no userId' };
    }
  } catch (err: unknown) {
    results.rateLimit = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Step 3: createUserClientSafe
  try {
    const { client, error: authError } = await createUserClientSafe();
    if (authError) {
      results.userClient = { ok: false, error: 'authError returned (401)' };
    } else {
      results.userClient = { ok: true, clientType: typeof client };

      // Step 4: Test the exact notification query
      try {
        const { data, error, count } = await client
          .from('notifications')
          .select(
            'id, user_id, portal_account_id, channel, title, message, state, read_at, send_at, sent_at, created_at, updated_at',
            { count: 'exact' },
          )
          .order('created_at', { ascending: false })
          .range(0, 24);

        results.notificationsQuery = {
          ok: !error,
          dataLength: data?.length ?? null,
          count,
          error: error?.message ?? null,
          errorCode: error?.code ?? null,
        };
      } catch (err: unknown) {
        results.notificationsQuery = {
          ok: false,
          threw: true,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : undefined,
        };
      }

      // Step 5: Test paginatedResponse
      try {
        const testResponse = paginatedResponse([], 0, 25, 0);
        results.paginatedResponse = { ok: true, result: testResponse };
      } catch (err: unknown) {
        results.paginatedResponse = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // Step 6: Test leads query
      try {
        const { data, error, count } = await client
          .from('leads')
          .select(
            'id, company_name, status, lead_score, source_channel, assigned_to, division_id, created_at',
            { count: 'exact' },
          )
          .order('created_at', { ascending: false })
          .range(0, 4);

        results.leadsQuery = {
          ok: !error,
          dataLength: data?.length ?? null,
          count,
          error: error?.message ?? null,
        };
      } catch (err: unknown) {
        results.leadsQuery = {
          ok: false,
          threw: true,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // Step 7: Test ensure_clerk_user RPC (what /api/user/current does)
      try {
        const { data, error } = await client.rpc('ensure_clerk_user', {
          p_clerk_id: 'diag-test-do-not-create',
          p_email: 'diag@test.invalid',
          p_first_name: 'Diag',
          p_last_name: 'Test',
          p_avatar_url: null,
        });

        results.ensureClerkUser = {
          ok: !error,
          dataType: typeof data,
          isArray: Array.isArray(data),
          dataLength: Array.isArray(data) ? data.length : null,
          error: error?.message ?? null,
          errorCode: error?.code ?? null,
        };
      } catch (err: unknown) {
        results.ensureClerkUser = {
          ok: false,
          threw: true,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  } catch (err: unknown) {
    results.userClient = {
      ok: false,
      threw: true,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : undefined,
    };
  }

  // Step 8: Service client sanity check
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from('notifications')
      .select('id', { count: 'exact', head: true });

    results.serviceClient = {
      ok: !error,
      count: data,
      error: error?.message ?? null,
    };
  } catch (err: unknown) {
    results.serviceClient = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Step 9: NextResponse.json serialization test
  try {
    const testPayload = { items: [], total: 0, limit: 25, offset: 0, hasMore: false };
    const resp = NextResponse.json(testPayload);
    results.jsonSerialization = { ok: true, status: resp.status };
  } catch (err: unknown) {
    results.jsonSerialization = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return NextResponse.json(results);
}
