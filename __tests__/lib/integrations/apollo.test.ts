import { describe, it, expect } from 'vitest';
import { mapApolloToLead, mapApolloToContact, type ApolloPerson } from '@/lib/integrations/apollo';

const mockPerson: ApolloPerson = {
  id: 'apollo-123',
  first_name: 'John',
  last_name: 'Smith',
  name: 'John Smith',
  email: 'john@example.com',
  title: 'CEO',
  seniority: 'c_suite',
  departments: ['operations', 'construction'],
  headline: 'CEO at Smith Construction',
  organization: {
    id: 'org-456',
    name: 'Smith Construction',
    website_url: 'https://smithconstruction.ca/',
    industry: 'construction',
    estimated_num_employees: 50,
    annual_revenue: 5000000,
    founded_year: 2010,
    city: 'Toronto',
    state: 'Ontario',
    country: 'Canada',
    linkedin_url: 'https://linkedin.com/company/smith-construction',
    technologies: ['Procore', 'QuickBooks'],
    keywords: ['general contractor', 'commercial construction'],
  },
  linkedin_url: 'https://linkedin.com/in/johnsmith',
  phone_numbers: [{ raw_number: '+14165551234', type: 'work' }],
};

describe('mapApolloToLead', () => {
  it('maps organization name to company_name', () => {
    const lead = mapApolloToLead(mockPerson);
    expect(lead.company_name).toBe('Smith Construction');
  });

  it('sets source_channel to apollo and status to new', () => {
    const lead = mapApolloToLead(mockPerson);
    expect(lead.source_channel).toBe('apollo');
    expect(lead.status).toBe('new');
  });

  it('strips protocol and trailing slash from website_url to produce domain', () => {
    const lead = mapApolloToLead(mockPerson);
    expect(lead.domain).toBe('smithconstruction.ca');
  });

  it('maps city and province from organization', () => {
    const lead = mapApolloToLead(mockPerson);
    expect(lead.city).toBe('Toronto');
    expect(lead.province).toBe('Ontario');
  });

  it('stores apollo person id as source_detail', () => {
    const lead = mapApolloToLead(mockPerson);
    expect(lead.source_detail).toBe('apollo-123');
  });

  it('falls back to full name when organization is missing', () => {
    const person: ApolloPerson = { ...mockPerson, organization: undefined };
    const lead = mapApolloToLead(person);
    expect(lead.company_name).toBe('John Smith');
  });

  it('sets domain to null when organization is missing', () => {
    const person: ApolloPerson = { ...mockPerson, organization: undefined };
    const lead = mapApolloToLead(person);
    expect(lead.domain).toBeNull();
  });

  it('sets domain to null when website_url is null', () => {
    const person: ApolloPerson = {
      ...mockPerson,
      organization: { ...mockPerson.organization!, website_url: null },
    };
    const lead = mapApolloToLead(person);
    expect(lead.domain).toBeNull();
  });

  it('includes enrichment_data.apollo_search with org fields', () => {
    const lead = mapApolloToLead(mockPerson);
    expect(lead.enrichment_data).toBeDefined();
    expect(lead.enrichment_data.apollo_search).toBeDefined();
    const aps = lead.enrichment_data.apollo_search;
    expect(aps.employees).toBe(50);
    expect(aps.annual_revenue).toBe(5000000);
    expect(aps.founded_year).toBe(2010);
    expect(aps.technologies).toEqual(['Procore', 'QuickBooks']);
    expect(aps.org_keywords).toEqual(['general contractor', 'commercial construction']);
    expect(aps.org_linkedin).toBe('https://linkedin.com/company/smith-construction');
  });

  it('includes seniority and departments in enrichment_data.apollo_search', () => {
    const lead = mapApolloToLead(mockPerson);
    const aps = lead.enrichment_data.apollo_search;
    expect(aps.seniority).toBe('c_suite');
    expect(aps.departments).toEqual(['operations', 'construction']);
  });

  it('includes enriched_at timestamp in apollo_search', () => {
    const lead = mapApolloToLead(mockPerson);
    expect(lead.enrichment_data.apollo_search.enriched_at).toBeTruthy();
    expect(new Date(lead.enrichment_data.apollo_search.enriched_at).getTime()).not.toBeNaN();
  });

  it('sets enrichment org fields to null when organization is missing', () => {
    const person: ApolloPerson = { ...mockPerson, organization: undefined };
    const lead = mapApolloToLead(person);
    const aps = lead.enrichment_data.apollo_search;
    expect(aps.employees).toBeNull();
    expect(aps.annual_revenue).toBeNull();
    expect(aps.founded_year).toBeNull();
    expect(aps.technologies).toBeNull();
    expect(aps.org_linkedin).toBeNull();
  });

  it('sets seniority to null when person has no seniority', () => {
    const person: ApolloPerson = { ...mockPerson, seniority: null };
    const lead = mapApolloToLead(person);
    expect(lead.enrichment_data.apollo_search.seniority).toBeNull();
  });
});

describe('mapApolloToContact', () => {
  it('maps core contact fields', () => {
    const contact = mapApolloToContact(mockPerson, 'lead-uuid');
    expect(contact.lead_id).toBe('lead-uuid');
    expect(contact.full_name).toBe('John Smith');
    expect(contact.email).toBe('john@example.com');
    expect(contact.phone).toBe('+14165551234');
  });

  it('marks contact as primary and decision maker', () => {
    const contact = mapApolloToContact(mockPerson, 'lead-uuid');
    expect(contact.is_primary).toBe(true);
    expect(contact.is_decision_maker).toBe(true);
  });

  it('maps linkedin_url', () => {
    const contact = mapApolloToContact(mockPerson, 'lead-uuid');
    expect(contact.linkedin_url).toBe('https://linkedin.com/in/johnsmith');
  });

  it('maps seniority', () => {
    const contact = mapApolloToContact(mockPerson, 'lead-uuid');
    expect(contact.seniority).toBe('c_suite');
  });

  it('maps departments as comma-separated string', () => {
    const contact = mapApolloToContact(mockPerson, 'lead-uuid');
    expect(contact.departments).toBe('operations, construction');
  });

  it('sets seniority to null when person has no seniority', () => {
    const person: ApolloPerson = { ...mockPerson, seniority: null };
    const contact = mapApolloToContact(person, 'lead-uuid');
    expect(contact.seniority).toBeNull();
  });

  it('sets departments to null when person has no departments', () => {
    const person: ApolloPerson = { ...mockPerson, departments: null };
    const contact = mapApolloToContact(person, 'lead-uuid');
    expect(contact.departments).toBeNull();
  });

  it('sets phone to null when phone_numbers is missing', () => {
    const person: ApolloPerson = { ...mockPerson, phone_numbers: undefined };
    const contact = mapApolloToContact(person, 'lead-uuid');
    expect(contact.phone).toBeNull();
  });

  it('sets phone to null when phone_numbers array is empty', () => {
    const person: ApolloPerson = { ...mockPerson, phone_numbers: [] };
    const contact = mapApolloToContact(person, 'lead-uuid');
    expect(contact.phone).toBeNull();
  });

  it('handles phone_numbers entries with optional type field', () => {
    const person: ApolloPerson = {
      ...mockPerson,
      phone_numbers: [{ raw_number: '+14165559999' }],
    };
    const contact = mapApolloToContact(person, 'lead-uuid');
    expect(contact.phone).toBe('+14165559999');
  });
});
