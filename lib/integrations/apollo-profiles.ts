import type { ApolloSearchParams } from './apollo';

export interface ApolloSearchProfile {
  id: string;
  name: string;
  divisionCode: string;
  vertical: string;
  searchParams: ApolloSearchParams;
  intentTopics?: string[];
  creditBudgetPerWeek: number;
  priority: number; // 1=high, 2=medium, 3=low
  batchSize: number;
  isActive: boolean;
}

/**
 * 12 research-backed search profiles covering all active MDM divisions.
 *
 * Design principles:
 * - Broad filters (2-3 core) rather than over-filtered
 * - Company filters separated from people filters
 * - Employee count as primary size filter (most complete in Apollo)
 * - 60% effort on 51-200 employee sweet spot
 * - Total weekly credit budget: 175 (leaves 17/week headroom on 10K/year)
 */
export const MDM_SEARCH_PROFILES: ApolloSearchProfile[] = [
  // ── MDM Contracting (5 profiles) ──────────────────────────────────────────

  {
    id: 'contracting-commercial-developers-gta',
    name: 'Commercial Developers (GTA)',
    divisionCode: 'contracting',
    vertical: 'commercial_development',
    searchParams: {
      person_titles: ['VP Development', 'Director of Construction', 'Owner', 'President', 'VP Operations'],
      person_seniorities: ['owner', 'founder', 'c_suite', 'vp', 'director'],
      organization_industry_tag_ids: ['real_estate', 'commercial_real_estate', 'construction'],
      organization_locations: ['Greater Toronto Area, Ontario, Canada'],
      organization_num_employees_ranges: ['51,200', '201,500'],
    },
    intentTopics: ['Commercial Construction', 'Building Renovation'],
    creditBudgetPerWeek: 25,
    priority: 1,
    batchSize: 50,
    isActive: true,
  },
  {
    id: 'contracting-facilities-directors-gta',
    name: 'Facilities Directors (GTA)',
    divisionCode: 'contracting',
    vertical: 'facilities',
    searchParams: {
      person_titles: ['Facilities Director', 'Facilities Manager', 'VP Facilities', 'Director of Operations'],
      person_seniorities: ['director', 'vp', 'manager'],
      organization_locations: ['Greater Toronto Area, Ontario, Canada'],
      organization_num_employees_ranges: ['201,500', '501,1000', '1001,5000'],
    },
    creditBudgetPerWeek: 20,
    priority: 1,
    batchSize: 50,
    isActive: true,
  },
  {
    id: 'contracting-pharmacy-healthcare-on',
    name: 'Pharmacy & Healthcare (Ontario)',
    divisionCode: 'contracting',
    vertical: 'pharmacy',
    searchParams: {
      person_titles: ['Owner', 'Pharmacist', 'Director of Operations', 'Practice Manager', 'Principal Dentist'],
      person_seniorities: ['owner', 'founder', 'c_suite', 'director'],
      organization_industry_tag_ids: ['pharmaceutical', 'healthcare', 'health_wellness_and_fitness', 'hospital_health_care'],
      organization_locations: ['Ontario, Canada'],
      organization_num_employees_ranges: ['1,50', '51,200'],
    },
    intentTopics: ['Healthcare Construction', 'Pharmacy Renovation'],
    creditBudgetPerWeek: 20,
    priority: 1,
    batchSize: 50,
    isActive: true,
  },
  {
    id: 'contracting-franchise-qsr-on',
    name: 'Franchise / QSR Operators (Ontario)',
    divisionCode: 'contracting',
    vertical: 'restaurant',
    searchParams: {
      person_titles: ['Owner', 'Franchisee', 'Operations Manager', 'Regional Manager', 'VP Construction'],
      person_seniorities: ['owner', 'founder', 'c_suite', 'vp', 'director', 'manager'],
      organization_industry_tag_ids: ['restaurants', 'food_and_beverages', 'hospitality'],
      organization_locations: ['Ontario, Canada'],
      organization_num_employees_ranges: ['11,50', '51,200'],
    },
    creditBudgetPerWeek: 15,
    priority: 2,
    batchSize: 50,
    isActive: true,
  },
  {
    id: 'contracting-banking-retail-gta',
    name: 'Banking & Retail Facilities (GTA)',
    divisionCode: 'contracting',
    vertical: 'banking_retail',
    searchParams: {
      person_titles: ['Facilities Manager', 'Construction Manager', 'Director of Real Estate', 'VP Facilities'],
      person_seniorities: ['director', 'vp', 'manager'],
      organization_industry_tag_ids: ['banking', 'financial_services', 'retail'],
      organization_locations: ['Greater Toronto Area, Ontario, Canada'],
      organization_num_employees_ranges: ['201,500', '501,1000', '1001,5000'],
    },
    creditBudgetPerWeek: 15,
    priority: 2,
    batchSize: 50,
    isActive: true,
  },

  // ── MDM Homes (2 profiles) ────────────────────────────────────────────────

  {
    id: 'homes-residential-developers-on',
    name: 'Residential Developers (Ontario)',
    divisionCode: 'homes',
    vertical: 'residential_development',
    searchParams: {
      person_titles: ['Owner', 'President', 'VP Development', 'Director of Construction', 'Custom Home Builder'],
      person_seniorities: ['owner', 'founder', 'c_suite', 'vp', 'director'],
      organization_industry_tag_ids: ['real_estate', 'construction', 'building_materials'],
      organization_locations: ['Ontario, Canada'],
      organization_num_employees_ranges: ['11,50', '51,200'],
      q_keywords: ['residential', 'custom homes', 'home builder'],
    },
    creditBudgetPerWeek: 15,
    priority: 2,
    batchSize: 50,
    isActive: true,
  },
  {
    id: 'homes-condo-developers-gta',
    name: 'Condo / Multi-Residential Developers (GTA)',
    divisionCode: 'homes',
    vertical: 'condo_development',
    searchParams: {
      person_titles: ['VP Development', 'Director of Construction', 'President', 'CEO', 'Managing Director'],
      person_seniorities: ['owner', 'founder', 'c_suite', 'vp', 'director'],
      organization_industry_tag_ids: ['real_estate', 'commercial_real_estate'],
      organization_locations: ['Greater Toronto Area, Ontario, Canada'],
      organization_num_employees_ranges: ['51,200', '201,500'],
      q_keywords: ['condo', 'multi-residential', 'condominium'],
    },
    creditBudgetPerWeek: 15,
    priority: 2,
    batchSize: 50,
    isActive: true,
  },

  // ── MDM Telecom (2 profiles) ──────────────────────────────────────────────

  {
    id: 'telecom-carriers-on',
    name: 'Telecom Carriers (Ontario)',
    divisionCode: 'telecom',
    vertical: 'telecom_carriers',
    searchParams: {
      person_titles: ['Network Construction Manager', 'VP Network Infrastructure', 'Director of Engineering', 'Site Acquisition Manager'],
      person_seniorities: ['director', 'vp', 'manager'],
      organization_industry_tag_ids: ['telecommunications', 'wireless'],
      organization_locations: ['Ontario, Canada'],
      organization_num_employees_ranges: ['201,500', '501,1000', '1001,5000', '5001,10000'],
    },
    intentTopics: ['Telecom Infrastructure', '5G Deployment'],
    creditBudgetPerWeek: 10,
    priority: 2,
    batchSize: 50,
    isActive: true,
  },
  {
    id: 'telecom-infrastructure-on',
    name: 'Telecom Infrastructure Managers (Ontario)',
    divisionCode: 'telecom',
    vertical: 'telecom_infrastructure',
    searchParams: {
      person_titles: ['Infrastructure Manager', 'Construction Manager', 'Project Manager', 'Operations Manager'],
      person_seniorities: ['manager', 'director'],
      organization_industry_tag_ids: ['telecommunications'],
      organization_locations: ['Ontario, Canada'],
      organization_num_employees_ranges: ['51,200', '201,500', '501,1000'],
      q_keywords: ['tower', 'fiber', 'network construction'],
    },
    creditBudgetPerWeek: 10,
    priority: 3,
    batchSize: 50,
    isActive: true,
  },

  // ── MDM Wood (1 profile) ──────────────────────────────────────────────────

  {
    id: 'wood-millwork-custom-gta',
    name: 'Custom Millwork & Cabinet Buyers (GTA)',
    divisionCode: 'wood',
    vertical: 'millwork',
    searchParams: {
      person_titles: ['Owner', 'Interior Designer', 'Architect', 'VP Operations', 'Project Manager'],
      person_seniorities: ['owner', 'founder', 'c_suite', 'director', 'manager'],
      organization_industry_tag_ids: ['architecture_planning', 'interior_design', 'furniture'],
      organization_locations: ['Greater Toronto Area, Ontario, Canada'],
      organization_num_employees_ranges: ['1,50', '51,200'],
      q_keywords: ['custom cabinet', 'millwork', 'woodwork'],
    },
    creditBudgetPerWeek: 10,
    priority: 3,
    batchSize: 50,
    isActive: true,
  },

  // ── MDM Management (1 profile) ────────────────────────────────────────────

  {
    id: 'management-property-managers-gta',
    name: 'Property Management Companies (GTA)',
    divisionCode: 'management',
    vertical: 'property_mgmt',
    searchParams: {
      person_titles: ['Property Manager', 'VP Operations', 'Director of Operations', 'Facilities Director', 'Owner'],
      person_seniorities: ['owner', 'founder', 'c_suite', 'vp', 'director', 'manager'],
      organization_industry_tag_ids: ['commercial_real_estate', 'real_estate'],
      organization_locations: ['Greater Toronto Area, Ontario, Canada'],
      organization_num_employees_ranges: ['51,200', '201,500'],
    },
    creditBudgetPerWeek: 10,
    priority: 3,
    batchSize: 50,
    isActive: true,
  },

  // ── Cross-Division Signal-Based (1 profile) ──────────────────────────────

  {
    id: 'signal-job-changes-construction',
    name: 'Job Changes — Construction/RE/Telecom VPs & Directors',
    divisionCode: 'contracting',
    vertical: 'job_changes',
    searchParams: {
      person_titles: ['VP Construction', 'VP Operations', 'VP Development', 'Director of Construction', 'Director of Facilities'],
      person_seniorities: ['vp', 'director', 'c_suite'],
      organization_industry_tag_ids: ['construction', 'real_estate', 'commercial_real_estate', 'telecommunications'],
      organization_locations: ['Ontario, Canada'],
      organization_num_employees_ranges: ['51,200', '201,500', '501,1000'],
    },
    creditBudgetPerWeek: 10,
    priority: 1,
    batchSize: 50,
    isActive: true,
  },
];

export function getProfileById(id: string): ApolloSearchProfile | undefined {
  return MDM_SEARCH_PROFILES.find((p) => p.id === id);
}

export function getActiveProfiles(): ApolloSearchProfile[] {
  return MDM_SEARCH_PROFILES.filter((p) => p.isActive);
}

export function getProfilesByDivision(divisionCode: string): ApolloSearchProfile[] {
  return MDM_SEARCH_PROFILES.filter((p) => p.isActive && p.divisionCode === divisionCode);
}

/**
 * Get profiles scheduled for a given week using weighted round-robin.
 * High-priority (1): 3 runs/month → ~every week
 * Medium-priority (2): 2 runs/month → every other week
 * Low-priority (3): 1 run/month → every 4th week
 */
export function getProfilesForWeek(weekNumber: number): ApolloSearchProfile[] {
  const active = getActiveProfiles().sort((a, b) => a.priority - b.priority);

  return active.filter((profile) => {
    switch (profile.priority) {
      case 1:
        return true; // every week
      case 2:
        return weekNumber % 2 === 0; // every other week
      case 3:
        return weekNumber % 4 === 0; // every 4th week
      default:
        return false;
    }
  });
}

/**
 * Calculate the week number (since epoch) for rotation scheduling.
 */
export function getWeekNumber(date: Date = new Date()): number {
  return Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
}
