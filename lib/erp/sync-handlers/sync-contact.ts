/**
 * Sync handler: KrewPact Contact → ERPNext Contact
 */

import { createUserClient } from '@/lib/supabase/server';

import { mapContactToErp } from '../contact-mapper';
import { mockContactResponse } from '../mock-responses';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  failJob,
  logEvent,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

export async function syncContact(contactId: string, _userId: string): Promise<SyncResult> {
  const supabase = await createUserClient();
  const job = await createSyncJob(supabase, 'contact', contactId);

  try {
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return failJob(
        supabase,
        job.id,
        'contact',
        contactId,
        `Contact not found: ${contactError?.message || 'null'}`,
      );
    }

    const c = contact as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockContactResponse({
        id: contactId,
        first_name: c.first_name as string,
        last_name: c.last_name as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      // Resolve the ERPNext Customer docname for the linked account
      let erpCustomerName: string | null = null;
      if (c.account_id) {
        const { data: syncMapRow } = await supabase
          .from('erp_sync_map')
          .select('erp_docname')
          .eq('entity_type', 'account')
          .eq('local_id', c.account_id as string)
          .maybeSingle();
        erpCustomerName = (syncMapRow?.erp_docname as string) || null;
      }

      const mapped = mapContactToErp({
        id: contactId,
        first_name: c.first_name as string,
        last_name: c.last_name as string,
        email: c.email as string | null,
        phone: c.phone as string | null,
        role_title: c.role_title as string | null,
        // Pass the resolved ERPNext Customer docname (not the KrewPact UUID).
        // ERPNext link validation requires the docname.
        account_id: erpCustomerName,
      });
      const result = await client.create<{ name: string }>('Contact', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'contact', contactId, 'Contact', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'contact',
      entity_id: contactId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job.id, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'contact',
      entity_id: contactId,
      erp_docname: erpDocname,
      attempt_count: 1,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job.id, 'contact', contactId, message);
  }
}
