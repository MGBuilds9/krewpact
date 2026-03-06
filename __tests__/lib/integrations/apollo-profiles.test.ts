import { describe, it, expect } from 'vitest';
import {
  MDM_SEARCH_PROFILES,
  getProfileById,
  getActiveProfiles,
  getProfilesByDivision,
} from '@/lib/integrations/apollo-profiles';

describe('MDM_SEARCH_PROFILES', () => {
  it('has at least 5 profiles', () => {
    expect(MDM_SEARCH_PROFILES.length).toBeGreaterThanOrEqual(5);
  });

  it.each(MDM_SEARCH_PROFILES)('profile "$name" has required fields', (profile) => {
    expect(profile.id).toBeTruthy();
    expect(profile.name).toBeTruthy();
    expect(profile.division).toBeTruthy();
    expect(profile.vertical).toBeTruthy();
    expect(typeof profile.isActive).toBe('boolean');
    expect(profile.searchParams).toBeDefined();
  });

  it.each(MDM_SEARCH_PROFILES)(
    'profile "$name" has valid searchParams shape',
    (profile) => {
      const params = profile.searchParams;
      if (params.person_titles) {
        expect(Array.isArray(params.person_titles)).toBe(true);
        expect(params.person_titles!.length).toBeGreaterThan(0);
      }
      if (params.organization_locations) {
        expect(Array.isArray(params.organization_locations)).toBe(true);
      }
      if (params.organization_num_employees_ranges) {
        expect(Array.isArray(params.organization_num_employees_ranges)).toBe(true);
        for (const range of params.organization_num_employees_ranges!) {
          expect(range).toMatch(/^\d+,\d+$/);
        }
      }
    },
  );

  it('has unique IDs across all profiles', () => {
    const ids = MDM_SEARCH_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all MDM divisions', () => {
    const divisions = new Set(MDM_SEARCH_PROFILES.map((p) => p.division));
    expect(divisions.has('contracting')).toBe(true);
    expect(divisions.has('telecom')).toBe(true);
  });

  it('covers key verticals', () => {
    const verticals = new Set(MDM_SEARCH_PROFILES.map((p) => p.vertical));
    expect(verticals.has('pharmacy')).toBe(true);
    expect(verticals.has('restaurant')).toBe(true);
    expect(verticals.has('dental')).toBe(true);
    expect(verticals.has('property_mgmt')).toBe(true);
    expect(verticals.has('telecom')).toBe(true);
  });
});

describe('getProfileById', () => {
  it('returns a profile by ID', () => {
    const profile = getProfileById('pharmacy-owners-gta');
    expect(profile).toBeDefined();
    expect(profile!.name).toBe('Pharmacy Owners (GTA)');
  });

  it('returns undefined for unknown ID', () => {
    expect(getProfileById('nonexistent')).toBeUndefined();
  });
});

describe('getActiveProfiles', () => {
  it('returns only active profiles', () => {
    const active = getActiveProfiles();
    expect(active.length).toBeGreaterThan(0);
    for (const p of active) {
      expect(p.isActive).toBe(true);
    }
  });
});

describe('getProfilesByDivision', () => {
  it('returns profiles for contracting division', () => {
    const profiles = getProfilesByDivision('contracting');
    expect(profiles.length).toBeGreaterThan(0);
    for (const p of profiles) {
      expect(p.division).toBe('contracting');
    }
  });

  it('returns profiles for telecom division', () => {
    const profiles = getProfilesByDivision('telecom');
    expect(profiles.length).toBeGreaterThan(0);
    for (const p of profiles) {
      expect(p.division).toBe('telecom');
    }
  });

  it('returns empty for unknown division', () => {
    expect(getProfilesByDivision('nonexistent')).toEqual([]);
  });
});
