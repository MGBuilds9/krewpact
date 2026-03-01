import { describe, it, expect } from 'vitest';
import { mapApolloToLead, mapApolloToContact, type ApolloPerson } from '@/lib/integrations/apollo';

const mockPerson: ApolloPerson = {
  id: 'apollo-123',
  first_name: 'John',
  last_name: 'Smith',
  name: 'John Smith',
  email: 'john@example.com',
  title: 'CEO',
  organization: {
    id: 'org-456',
    name: 'Smith Construction',
    website_url: 'https://smithconstruction.ca/',
    industry: 'construction',
    estimated_num_employees: 50,
    city: 'Toronto',
    state: 'Ontario',
  },
  linkedin_url: 'https://linkedin.com/in/johnsmith',
  phone_numbers: [{ raw_number: '+14165551234' }],
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
});
