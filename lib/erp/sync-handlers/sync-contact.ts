/**
 * Sync handler: KrewPact Contact → ERPNext Contact
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapContactToErp } from '../contact-mapper';
import { mockContactResponse } from '../mock-responses';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  deleteSyncMap,
  failJob,
  logEvent,
  lookupErpDocname,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

const ENTITY = 'contact';
const DOCTYPE = 'Contact';

// eslint-disable-next-line max-lines-per-function
export async function syncContact(
  contactId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:contact');
  const job = await createSyncJob(supabase, ENTITY, contactId, jobContext);
  const existingDocname = await lookupErpDocname(supabase, ENTITY, contactId);

  try {
    if (jobContext?.operation === 'delete') {
      if (existingDocname && !isMockMode()) {
        const { ErpClient } = await import('../client');
        await new ErpClient().delete(DOCTYPE, existingDocname);
      }
      if (existingDocname) {
        await deleteSyncMap(supabase, ENTITY, contactId);
      }
      await logEvent(supabase, job.id, 'sync_deleted', {
        entity_type: ENTITY,
        entity_id: contactId,
        erp_docname: existingDocname,
      });
      await updateJobStatus(supabase, job, 'succeeded');
      return {
        id: job.id,
        status: 'succeeded',
        entity_type: ENTITY,
        entity_id: contactId,
        erp_docname: existingDocname,
        attempt_count: job.attempt_count,
      };
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return failJob(
        supabase,
        job,
        ENTITY,
        contactId,
        `Contact not found: ${contactError?.message || 'null'}`,
      );
    }

    const c = contact as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      if (existingDocname) {
        erpDocname = existingDocname;
      } else {
        const mockResp = mockContactResponse({
          id: contactId,
          first_name: c.first_name as string,
          last_name: c.last_name as string,
        });
        erpDocname = mockResp.name;
      }
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      let erpCustomerName: string | null = null;
      if (c.account_id) {
        erpCustomerName = await lookupErpDocname(supabase, 'account', c.account_id as string);
      }

      const mapped = mapContactToErp({
        id: contactId,
        first_name: c.first_name as string,
        last_name: c.last_name as string,
        email: c.email as string | null,
        phone: c.phone as string | null,
        role_title: c.role_title as string | null,
        // ERPNext link validation requires the Customer docname, not the KrewPact UUID.
        account_id: erpCustomerName,
      });

      if (existingDocname) {
        await client.update<{ name: string }>(DOCTYPE, existingDocname, mapped);
        erpDocname = existingDocname;
      } else {
        const result = await client.create<{ name: string }>(DOCTYPE, mapped);
        erpDocname = result.name;
      }
    }

    await upsertSyncMap(supabase, ENTITY, contactId, DOCTYPE, erpDocname);
    await logEvent(supabase, job.id, existingDocname ? 'sync_updated' : 'sync_completed', {
      entity_type: ENTITY,
      entity_id: contactId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: ENTITY,
      entity_id: contactId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, ENTITY, contactId, message);
  }
}
