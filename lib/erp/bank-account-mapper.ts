/**
 * Maps KrewPact bank account data to/from ERPNext Bank Account doctype format.
 * Pure function — no side effects or database calls.
 */

export interface BankAccountMapInput {
  id: string;
  account_name: string;
  bank: string;
  account_type: string | null;
  account_subtype: string | null;
  company: string;
  iban: string | null;
  branch_code: string | null;
  is_default: boolean;
  is_company_account: boolean;
}

/**
 * Map a KrewPact bank account to an ERPNext Bank Account document.
 */
export function mapBankAccountToErp(
  ba: BankAccountMapInput,
): Record<string, unknown> {
  return {
    account_name: ba.account_name,
    bank: ba.bank,
    account_type: ba.account_type || '',
    account_subtype: ba.account_subtype || '',
    company: ba.company,
    iban: ba.iban || '',
    branch_code: ba.branch_code || '',
    is_default: ba.is_default ? 1 : 0,
    is_company_account: ba.is_company_account ? 1 : 0,
    krewpact_id: ba.id,
  };
}

/**
 * Map an ERPNext Bank Account document to a KrewPact record.
 */
export function fromErpBankAccount(
  erpBankAccount: Record<string, unknown>,
): Record<string, unknown> {
  return {
    erp_bank_account_name: erpBankAccount.name || '',
    erp_doctype: 'Bank Account',
    account_name: erpBankAccount.account_name || '',
    bank: erpBankAccount.bank || '',
    account_type: erpBankAccount.account_type || '',
    account_subtype: erpBankAccount.account_subtype || '',
    company: erpBankAccount.company || '',
    iban: erpBankAccount.iban || '',
    branch_code: erpBankAccount.branch_code || '',
    is_default: erpBankAccount.is_default === 1,
    is_company_account: erpBankAccount.is_company_account === 1,
    synced_at: new Date().toISOString(),
  };
}
