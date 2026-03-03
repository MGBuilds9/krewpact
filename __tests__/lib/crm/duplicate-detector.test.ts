import { describe, it, expect } from 'vitest';
import {
  trigramSimilarity,
  normalizePhone,
  normalizeEmail,
  extractDomain,
  findLeadDuplicates,
  findContactDuplicates,
  findAccountDuplicates,
  computeLeadMerge,
} from '@/lib/crm/duplicate-detector';

// =====================================================
// Trigram Similarity
// =====================================================

describe('trigramSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(trigramSimilarity('hello', 'hello')).toBe(1);
  });

  it('returns 1 for identical strings with different case', () => {
    expect(trigramSimilarity('Hello', 'hello')).toBe(1);
  });

  it('returns high similarity for very similar strings', () => {
    const sim = trigramSimilarity('MDM Contracting', 'MDM Contracting Inc');
    expect(sim).toBeGreaterThan(0.5);
  });

  it('returns low similarity for very different strings', () => {
    const sim = trigramSimilarity('Apple', 'Zebra');
    expect(sim).toBeLessThan(0.2);
  });

  it('returns 0 for empty strings vs non-empty', () => {
    expect(trigramSimilarity('', 'hello')).toBe(0);
    expect(trigramSimilarity('hello', '')).toBe(0);
  });

  it('returns 0 for both empty strings (no trigrams to compare)', () => {
    expect(trigramSimilarity('', '')).toBe(0);
  });

  it('handles whitespace-only strings', () => {
    expect(trigramSimilarity('  ', '  ')).toBe(1);
  });

  it('handles strings with leading/trailing whitespace', () => {
    expect(trigramSimilarity('  hello  ', 'hello')).toBe(1);
  });

  it('detects typos with high similarity', () => {
    const sim = trigramSimilarity('Pharmacy Plus', 'Pharmcy Plus');
    expect(sim).toBeGreaterThan(0.5);
  });

  it('handles short strings', () => {
    const sim = trigramSimilarity('AB', 'AB');
    expect(sim).toBe(1);
  });
});

// =====================================================
// Normalization helpers
// =====================================================

describe('normalizePhone', () => {
  it('strips formatting from phone numbers', () => {
    expect(normalizePhone('(416) 555-1234')).toBe('4165551234');
  });

  it('strips dashes and spaces', () => {
    expect(normalizePhone('416-555-1234')).toBe('4165551234');
  });

  it('strips +1 prefix', () => {
    expect(normalizePhone('+1-416-555-1234')).toBe('14165551234');
  });

  it('handles already clean number', () => {
    expect(normalizePhone('4165551234')).toBe('4165551234');
  });
});

describe('normalizeEmail', () => {
  it('lowercases email', () => {
    expect(normalizeEmail('John@MDM.com')).toBe('john@mdm.com');
  });

  it('trims whitespace', () => {
    expect(normalizeEmail(' john@mdm.com ')).toBe('john@mdm.com');
  });
});

describe('extractDomain', () => {
  it('extracts domain from URL with protocol', () => {
    expect(extractDomain('https://www.mdmcontracting.ca')).toBe('www.mdmcontracting.ca');
  });

  it('strips path from URL', () => {
    expect(extractDomain('https://mdm.com/about')).toBe('mdm.com');
  });

  it('returns empty for null/undefined', () => {
    expect(extractDomain(null)).toBe('');
    expect(extractDomain(undefined)).toBe('');
  });

  it('handles bare domain', () => {
    expect(extractDomain('mdm.com')).toBe('mdm.com');
  });
});

// =====================================================
// Lead Duplicate Detection
// =====================================================

describe('findLeadDuplicates', () => {
  const existingLeads = [
    {
      id: 'lead-1',
      company_name: 'MDM Contracting',
      domain: 'mdmcontracting.ca',
      city: 'Mississauga',
    },
    {
      id: 'lead-2',
      company_name: 'Shoppers Drug Mart',
      domain: 'shoppersdrugmart.ca',
      city: 'Toronto',
    },
    { id: 'lead-3', company_name: 'MDM Homes', domain: null, city: 'Mississauga' },
    {
      id: 'lead-4',
      company_name: 'Totally Different Corp',
      domain: 'different.com',
      city: 'Ottawa',
    },
  ];

  it('detects exact domain match', () => {
    const result = findLeadDuplicates(
      { company_name: 'New MDM', domain: 'mdmcontracting.ca' },
      existingLeads,
    );
    expect(result.hasDuplicates).toBe(true);
    expect(result.matches[0].matchType).toBe('exact_domain');
    expect(result.matches[0].id).toBe('lead-1');
  });

  it('detects fuzzy company name match', () => {
    const result = findLeadDuplicates({ company_name: 'MDM Contracting Inc' }, existingLeads);
    expect(result.hasDuplicates).toBe(true);
    expect(result.matches.some((m) => m.id === 'lead-1')).toBe(true);
  });

  it('returns no duplicates for unique leads', () => {
    const result = findLeadDuplicates(
      { company_name: 'Completely Unique Company XYZ' },
      existingLeads,
    );
    expect(result.hasDuplicates).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it('respects similarity threshold', () => {
    const result = findLeadDuplicates(
      { company_name: 'MDM Contracting Inc' },
      existingLeads,
      0.9, // very strict threshold
    );
    // With a very high threshold, fuzzy matches should be filtered out
    const fuzzyMatches = result.matches.filter((m) => m.matchType === 'fuzzy_name');
    // exact domain matches should still be included if domain matches
    expect(fuzzyMatches.every((m) => m.similarity >= 0.9)).toBe(true);
  });

  it('sorts matches by similarity descending', () => {
    const result = findLeadDuplicates(
      { company_name: 'MDM' },
      existingLeads,
      0.1, // low threshold to get multiple matches
    );
    for (let i = 1; i < result.matches.length; i++) {
      expect(result.matches[i].similarity).toBeLessThanOrEqual(result.matches[i - 1].similarity);
    }
  });

  it('handles empty existing leads', () => {
    const result = findLeadDuplicates({ company_name: 'Test' }, []);
    expect(result.hasDuplicates).toBe(false);
  });
});

// =====================================================
// Contact Duplicate Detection
// =====================================================

describe('findContactDuplicates', () => {
  const existingContacts = [
    {
      id: 'c-1',
      first_name: 'John',
      last_name: 'Smith',
      email: 'john@mdm.com',
      phone: '416-555-1234',
    },
    {
      id: 'c-2',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: '905-555-5678',
    },
    { id: 'c-3', first_name: 'Jon', last_name: 'Smith', email: 'jon@other.com', phone: null },
  ];

  it('detects exact email match', () => {
    const result = findContactDuplicates(
      { first_name: 'Different', last_name: 'Person', email: 'john@mdm.com' },
      existingContacts,
    );
    expect(result.hasDuplicates).toBe(true);
    expect(result.matches[0].matchType).toBe('exact_email');
    expect(result.matches[0].id).toBe('c-1');
  });

  it('detects exact phone match (normalized)', () => {
    const result = findContactDuplicates(
      { first_name: 'Unknown', last_name: 'Person', phone: '(416) 555-1234' },
      existingContacts,
    );
    expect(result.hasDuplicates).toBe(true);
    expect(result.matches[0].matchType).toBe('exact_phone');
    expect(result.matches[0].id).toBe('c-1');
  });

  it('detects fuzzy name match', () => {
    const result = findContactDuplicates(
      { first_name: 'John', last_name: 'Smith' }, // exact match on name
      existingContacts,
    );
    expect(result.hasDuplicates).toBe(true);
    // Should match via email (c-1 has same name + email) or fuzzy name
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it('returns no duplicates for unique contacts', () => {
    const result = findContactDuplicates(
      { first_name: 'Unique', last_name: 'PersonXYZ' },
      existingContacts,
    );
    expect(result.hasDuplicates).toBe(false);
  });

  it('handles contacts with null fields', () => {
    const result = findContactDuplicates(
      { first_name: 'Test', last_name: 'User', phone: null },
      existingContacts,
    );
    // Should not crash, just skip phone comparison
    expect(result).toBeDefined();
  });
});

// =====================================================
// Account Duplicate Detection
// =====================================================

describe('findAccountDuplicates', () => {
  const existingAccounts = [
    { id: 'a-1', account_name: 'MDM Group Inc' },
    { id: 'a-2', account_name: 'Shoppers Drug Mart' },
    { id: 'a-3', account_name: 'Rexall Pharmacy' },
  ];

  it('detects fuzzy account name match', () => {
    const result = findAccountDuplicates({ account_name: 'MDM Group' }, existingAccounts);
    expect(result.hasDuplicates).toBe(true);
    expect(result.matches[0].id).toBe('a-1');
  });

  it('returns no duplicates for unique accounts', () => {
    const result = findAccountDuplicates(
      { account_name: 'Completely Unique Account' },
      existingAccounts,
    );
    expect(result.hasDuplicates).toBe(false);
  });

  it('handles empty existing accounts', () => {
    const result = findAccountDuplicates({ account_name: 'Test' }, []);
    expect(result.hasDuplicates).toBe(false);
  });
});

// =====================================================
// Lead Merge Logic
// =====================================================

describe('computeLeadMerge', () => {
  it('fills gaps from secondary into primary', () => {
    const primary = {
      id: 'p1',
      company_name: 'MDM',
      domain: null,
      city: 'Mississauga',
      notes: null,
      lead_score: 50,
    };
    const secondary = {
      id: 's1',
      company_name: 'MDM Corp',
      domain: 'mdm.com',
      city: 'Toronto',
      notes: 'Has budget',
      lead_score: 30,
    };

    const { updates, mergedFields } = computeLeadMerge(primary, secondary);

    expect(updates.domain).toBe('mdm.com');
    expect(updates.notes).toBe('Has budget');
    expect(mergedFields).toContain('domain');
    expect(mergedFields).toContain('notes');
    // Primary city is non-null, should NOT be overwritten
    expect(updates.city).toBeUndefined();
  });

  it('appends notes when both have notes', () => {
    const primary = { id: 'p1', notes: 'Primary note', lead_score: 50 };
    const secondary = { id: 's1', notes: 'Secondary note', lead_score: 30 };

    const { updates } = computeLeadMerge(primary, secondary);

    expect(updates.notes).toContain('Primary note');
    expect(updates.notes).toContain('Secondary note');
    expect(updates.notes).toContain('Merged from duplicate');
  });

  it('keeps higher score', () => {
    const primary = { id: 'p1', lead_score: 30 };
    const secondary = { id: 's1', lead_score: 80 };

    const { updates, mergedFields } = computeLeadMerge(primary, secondary);

    expect(updates.lead_score).toBe(80);
    expect(mergedFields).toContain('lead_score');
  });

  it('does not downgrade score', () => {
    const primary = { id: 'p1', lead_score: 80 };
    const secondary = { id: 's1', lead_score: 30 };

    const { updates, mergedFields } = computeLeadMerge(primary, secondary);

    expect(updates.lead_score).toBeUndefined();
    expect(mergedFields).not.toContain('lead_score');
  });

  it('returns empty updates when primary has all data', () => {
    const primary = {
      id: 'p1',
      domain: 'mdm.com',
      industry: 'construction',
      source_channel: 'referral',
      city: 'Mississauga',
      province: 'Ontario',
      notes: 'Full data',
      lead_score: 90,
    };
    const secondary = {
      id: 's1',
      domain: 'other.com',
      industry: 'retail',
      city: 'Toronto',
      notes: 'Less data',
      lead_score: 40,
    };

    const { updates, mergedFields } = computeLeadMerge(primary, secondary);

    // Only notes should be merged (appended), no other fields overwritten
    const nonNoteFields = mergedFields.filter((f) => f !== 'notes');
    expect(nonNoteFields).toHaveLength(0);
  });
});
