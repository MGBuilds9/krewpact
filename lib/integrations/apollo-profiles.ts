import type { ApolloSearchParams } from './apollo';

export interface ApolloSearchProfile {
  id: string;
  name: string;
  division: string;
  vertical: string;
  searchParams: ApolloSearchParams;
  isActive: boolean;
}

export const MDM_SEARCH_PROFILES: ApolloSearchProfile[] = [
  {
    id: 'pharmacy-owners-gta',
    name: 'Pharmacy Owners (GTA)',
    division: 'contracting',
    vertical: 'pharmacy',
    searchParams: {
      person_titles: ['Owner', 'Pharmacist', 'Director of Operations'],
      organization_industry_tag_ids: ['pharmaceutical', 'healthcare'],
      organization_locations: ['Greater Toronto Area, Ontario, Canada'],
      organization_num_employees_ranges: ['1,50'],
    },
    isActive: true,
  },
  {
    id: 'franchise-operators-on',
    name: 'Franchise Operators (Ontario)',
    division: 'contracting',
    vertical: 'restaurant',
    searchParams: {
      person_titles: ['Owner', 'Franchisee', 'Operations Manager'],
      organization_industry_tag_ids: ['restaurants', 'food_and_beverages'],
      organization_locations: ['Ontario, Canada'],
      organization_num_employees_ranges: ['11,50', '51,200'],
    },
    isActive: true,
  },
  {
    id: 'dental-clinic-owners-gta',
    name: 'Dental Clinic Owners (GTA)',
    division: 'contracting',
    vertical: 'dental',
    searchParams: {
      person_titles: ['Owner', 'Practice Manager', 'Principal Dentist'],
      organization_industry_tag_ids: ['health_wellness_and_fitness', 'hospital_health_care'],
      organization_locations: ['Greater Toronto Area, Ontario, Canada'],
      organization_num_employees_ranges: ['1,50'],
    },
    isActive: true,
  },
  {
    id: 'property-managers-gta',
    name: 'Commercial Property Managers (GTA)',
    division: 'contracting',
    vertical: 'property_mgmt',
    searchParams: {
      person_titles: ['Property Manager', 'Facilities Director', 'VP Operations'],
      organization_industry_tag_ids: ['commercial_real_estate', 'real_estate'],
      organization_locations: ['Greater Toronto Area, Ontario, Canada'],
      organization_num_employees_ranges: ['11,50', '51,200', '201,500'],
    },
    isActive: true,
  },
  {
    id: 'telecom-network-on',
    name: 'Telecom Network Construction (Ontario)',
    division: 'telecom',
    vertical: 'telecom',
    searchParams: {
      person_titles: ['Network Construction Manager', 'Infrastructure Manager', 'Site Acquisition'],
      organization_industry_tag_ids: ['telecommunications'],
      organization_locations: ['Ontario, Canada'],
      organization_num_employees_ranges: ['201,500', '501,1000', '1001,5000'],
    },
    isActive: true,
  },
  {
    id: 'loblaw-sdm-construction',
    name: 'Loblaw / Shoppers Drug Mart (Construction)',
    division: 'contracting',
    vertical: 'pharmacy',
    searchParams: {
      person_titles: ['Construction Manager', 'Project Manager', 'Director of Construction'],
      organization_locations: ['Ontario, Canada'],
      organization_num_employees_ranges: ['1001,5000', '5001,10000'],
    },
    isActive: true,
  },
];

export function getProfileById(id: string): ApolloSearchProfile | undefined {
  return MDM_SEARCH_PROFILES.find((p) => p.id === id);
}

export function getActiveProfiles(): ApolloSearchProfile[] {
  return MDM_SEARCH_PROFILES.filter((p) => p.isActive);
}

export function getProfilesByDivision(division: string): ApolloSearchProfile[] {
  return MDM_SEARCH_PROFILES.filter((p) => p.isActive && p.division === division);
}
