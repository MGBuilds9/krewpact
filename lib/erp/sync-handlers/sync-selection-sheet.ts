/**
 * Sync handler: KrewPact selection_sheets → ERPNext MDM Selection Sheet
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { nextMockId } from '../mock-types';
import {
  type SelectionChoiceInput,
  type SelectionSheetInput,
  toErpSelectionSheet,
} from '../selection-sheet-mapper';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

function mapSelectionChoices(rawChoices: unknown): SelectionChoiceInput[] {
  const arr = Array.isArray(rawChoices) ? rawChoices : rawChoices ? [rawChoices] : [];
  return arr.map((choice: Record<string, unknown>) => ({
    option_name: (choice.option_name as string) || '',
    supplier_name: choice.supplier_name as string | null,
    unit_cost: (choice.unit_cost as number) || 0,
    quantity: (choice.quantity as number) || 0,
    total_cost: (choice.total_cost as number) || 0,
    is_selected: Boolean(choice.is_selected),
  }));
}

async function createErpSelectionSheet(
  sheetId: string,
  sheetData: Record<string, unknown>,
  choices: SelectionChoiceInput[],
): Promise<string> {
  if (isMockMode()) {
    return nextMockId('SS');
  }

  const { ErpClient } = await import('../client');
  const client = new ErpClient();
  const sheetInput: SelectionSheetInput = {
    id: sheetId,
    project_id: sheetData.project_id as string,
    project_name: sheetData.project_name as string | null,
    title: sheetData.title as string,
    category: sheetData.category as string | null,
    status: sheetData.status as string,
    allowance_amount: sheetData.allowance_amount as number | null,
    currency_code: sheetData.currency_code as string | null,
  };
  const mapped = toErpSelectionSheet(sheetInput, choices);
  const result = await client.create<{ name: string }>('MDM Selection Sheet', mapped);
  return result.name;
}

export async function syncSelectionSheet(
  selectionSheetId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:selection-sheet');
  const job = await createSyncJob(supabase, 'selection_sheet', selectionSheetId, jobContext);

  try {
    const { data: sheet, error: sheetError } = await supabase
      .from('selection_sheets')
      .select('*, selection_choices(*)')
      .eq('id', selectionSheetId)
      .single();

    if (sheetError || !sheet) {
      return failJob(
        supabase,
        job,
        'selection_sheet',
        selectionSheetId,
        `Selection sheet not found: ${sheetError?.message || 'null'}`,
      );
    }

    const sheetData = sheet as Record<string, unknown>;
    const choices = mapSelectionChoices(sheetData.selection_choices);
    const erpDocname = await createErpSelectionSheet(selectionSheetId, sheetData, choices);

    await upsertSyncMap(
      supabase,
      'selection_sheet',
      selectionSheetId,
      'MDM Selection Sheet',
      erpDocname,
    );
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'selection_sheet',
      entity_id: selectionSheetId,
      erp_docname: erpDocname,
      choice_count: choices.length,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'selection_sheet',
      entity_id: selectionSheetId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'selection_sheet', selectionSheetId, message);
  }
}
