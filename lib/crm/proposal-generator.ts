/**
 * Proposal data composer — pure function that assembles proposal data
 * from opportunity, account, contact, and estimate records.
 */

export interface ProposalInput {
  opportunity: {
    id: string;
    opportunity_name: string;
    estimated_revenue: number | null;
    target_close_date: string | null;
    stage: string;
  };
  account: {
    id: string;
    account_name: string;
    billing_address: Record<string, string> | null;
  } | null;
  contact: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    role_title: string | null;
  } | null;
  estimates: {
    id: string;
    estimate_number: string;
    total_amount: number;
    status: string;
  }[];
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export interface ProposalData {
  title: string;
  date: string;
  reference: string;
  client: {
    company: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    contactTitle: string | null;
    address: string | null;
  };
  provider: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  scope: {
    description: string;
    estimatedValue: number | null;
    targetDate: string | null;
  };
  estimates: {
    number: string;
    amount: number;
    status: string;
  }[];
  totalValue: number;
}

function formatAddress(addr: Record<string, string> | null): string | null {
  if (!addr) return null;
  const parts = [
    addr.street,
    addr.city,
    addr.province || addr.state,
    addr.postal_code || addr.zip,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function composeProposalData(input: ProposalInput): ProposalData {
  const { opportunity, account, contact, estimates, companyInfo } = input;

  const contactName = contact ? `${contact.first_name} ${contact.last_name}` : null;

  const estimateItems = estimates.map((e) => ({
    number: e.estimate_number,
    amount: e.total_amount,
    status: e.status,
  }));

  // Total value: sum of estimate amounts if any, otherwise fall back to opportunity estimated_revenue
  const estimateTotal = estimates.reduce((sum, e) => sum + e.total_amount, 0);
  const totalValue = estimates.length > 0 ? estimateTotal : (opportunity.estimated_revenue ?? 0);

  return {
    title: `Proposal: ${opportunity.opportunity_name}`,
    date: new Date().toISOString().split('T')[0],
    reference: `PROP-${opportunity.id.slice(0, 8).toUpperCase()}`,
    client: {
      company: account?.account_name ?? 'Unknown Company',
      contactName,
      contactEmail: contact?.email ?? null,
      contactPhone: contact?.phone ?? null,
      contactTitle: contact?.role_title ?? null,
      address: formatAddress(account?.billing_address ?? null),
    },
    provider: {
      name: companyInfo.name,
      address: companyInfo.address,
      phone: companyInfo.phone,
      email: companyInfo.email,
    },
    scope: {
      description: opportunity.opportunity_name,
      estimatedValue: opportunity.estimated_revenue,
      targetDate: opportunity.target_close_date,
    },
    estimates: estimateItems,
    totalValue,
  };
}
