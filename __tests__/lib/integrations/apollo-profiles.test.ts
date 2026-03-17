import { describe, expect, it } from 'vitest';

import {
  getActiveProfiles,
  getProfileById,
  getProfilesByDivision,
  getProfilesForWeek,
  getWeekNumber,
  MDM_SEARCH_PROFILES,
} from '@/lib/integrations/apollo-profiles';

describe('MDM_SEARCH_PROFILES', () => {
  it('has exactly 12 profiles', () => {
    expect(MDM_SEARCH_PROFILES.length).toBe(12);
  });

  it.each(MDM_SEARCH_PROFILES)('profile "$name" has required fields', (profile) => {
    expect(profile.id).toBeTruthy();
    expect(profile.name).toBeTruthy();
    expect(profile.divisionCode).toBeTruthy();
    expect(profile.vertical).toBeTruthy();
    expect(typeof profile.isActive).toBe('boolean');
    expect(profile.searchParams).toBeDefined();
    expect(typeof profile.creditBudgetPerWeek).toBe('number');
    expect(typeof profile.priority).toBe('number');
    expect(typeof profile.batchSize).toBe('number');
  });

  it.each(MDM_SEARCH_PROFILES)('profile "$name" has valid searchParams shape', (profile) => {
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
    if (params.person_seniorities) {
      expect(Array.isArray(params.person_seniorities)).toBe(true);
    }
    if (params.q_keywords) {
      expect(Array.isArray(params.q_keywords)).toBe(true);
    }
  });

  it('has unique IDs across all profiles', () => {
    const ids = MDM_SEARCH_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all 5 MDM divisions', () => {
    const divisions = new Set(MDM_SEARCH_PROFILES.map((p) => p.divisionCode));
    expect(divisions.has('contracting')).toBe(true);
    expect(divisions.has('homes')).toBe(true);
    expect(divisions.has('telecom')).toBe(true);
    expect(divisions.has('wood')).toBe(true);
    expect(divisions.has('management')).toBe(true);
  });

  it('covers key verticals', () => {
    const verticals = new Set(MDM_SEARCH_PROFILES.map((p) => p.vertical));
    expect(verticals.has('pharmacy')).toBe(true);
    expect(verticals.has('restaurant')).toBe(true);
    expect(verticals.has('property_mgmt')).toBe(true);
    expect(verticals.has('telecom_carriers')).toBe(true);
  });

  it('has valid priority values (1, 2, or 3)', () => {
    for (const profile of MDM_SEARCH_PROFILES) {
      expect([1, 2, 3]).toContain(profile.priority);
    }
  });

  it('has positive creditBudgetPerWeek for all profiles', () => {
    for (const profile of MDM_SEARCH_PROFILES) {
      expect(profile.creditBudgetPerWeek).toBeGreaterThan(0);
    }
  });

  it('total weekly credit budget does not exceed 200', () => {
    const total = MDM_SEARCH_PROFILES.filter((p) => p.isActive).reduce(
      (sum, p) => sum + p.creditBudgetPerWeek,
      0,
    );
    expect(total).toBeLessThanOrEqual(200);
  });
});

describe('getProfileById', () => {
  it('returns a profile by ID', () => {
    const profile = getProfileById('contracting-pharmacy-healthcare-on');
    expect(profile).toBeDefined();
    expect(profile!.name).toBe('Pharmacy & Healthcare (Ontario)');
  });

  it('returns a contracting profile by new ID', () => {
    const profile = getProfileById('contracting-commercial-developers-gta');
    expect(profile).toBeDefined();
    expect(profile!.divisionCode).toBe('contracting');
  });

  it('returns undefined for unknown ID', () => {
    expect(getProfileById('nonexistent')).toBeUndefined();
  });

  it('returns undefined for old pharmacy-owners-gta ID', () => {
    expect(getProfileById('pharmacy-owners-gta')).toBeUndefined();
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

  it('returns all 12 profiles (all currently active)', () => {
    const active = getActiveProfiles();
    expect(active.length).toBe(12);
  });
});

describe('getProfilesByDivision', () => {
  it('returns profiles for contracting division', () => {
    const profiles = getProfilesByDivision('contracting');
    expect(profiles.length).toBeGreaterThan(0);
    for (const p of profiles) {
      expect(p.divisionCode).toBe('contracting');
    }
  });

  it('returns 6 contracting profiles (5 industry + 1 signal)', () => {
    const profiles = getProfilesByDivision('contracting');
    expect(profiles.length).toBe(6);
  });

  it('returns profiles for telecom division', () => {
    const profiles = getProfilesByDivision('telecom');
    expect(profiles.length).toBeGreaterThan(0);
    for (const p of profiles) {
      expect(p.divisionCode).toBe('telecom');
    }
  });

  it('returns 2 telecom profiles', () => {
    const profiles = getProfilesByDivision('telecom');
    expect(profiles.length).toBe(2);
  });

  it('returns profiles for homes division', () => {
    const profiles = getProfilesByDivision('homes');
    expect(profiles.length).toBe(2);
    for (const p of profiles) {
      expect(p.divisionCode).toBe('homes');
    }
  });

  it('returns 1 wood profile', () => {
    const profiles = getProfilesByDivision('wood');
    expect(profiles.length).toBe(1);
    expect(profiles[0].divisionCode).toBe('wood');
  });

  it('returns 1 management profile', () => {
    const profiles = getProfilesByDivision('management');
    expect(profiles.length).toBe(1);
    expect(profiles[0].divisionCode).toBe('management');
  });

  it('returns empty for unknown division', () => {
    expect(getProfilesByDivision('nonexistent')).toEqual([]);
  });
});

describe('getProfilesForWeek', () => {
  it('always includes priority-1 profiles every week', () => {
    const priority1Ids = MDM_SEARCH_PROFILES.filter((p) => p.isActive && p.priority === 1).map(
      (p) => p.id,
    );
    for (const week of [0, 1, 2, 3, 7, 13]) {
      const scheduled = getProfilesForWeek(week).map((p) => p.id);
      for (const id of priority1Ids) {
        expect(scheduled).toContain(id);
      }
    }
  });

  it('includes priority-2 profiles on even weeks only', () => {
    const priority2 = MDM_SEARCH_PROFILES.filter((p) => p.isActive && p.priority === 2);
    if (priority2.length === 0) return; // skip if none

    const evenWeek = getProfilesForWeek(2).map((p) => p.id);
    const oddWeek = getProfilesForWeek(3).map((p) => p.id);

    for (const p of priority2) {
      expect(evenWeek).toContain(p.id);
      expect(oddWeek).not.toContain(p.id);
    }
  });

  it('includes priority-3 profiles on week multiples of 4 only', () => {
    const priority3 = MDM_SEARCH_PROFILES.filter((p) => p.isActive && p.priority === 3);
    if (priority3.length === 0) return; // skip if none

    const week4 = getProfilesForWeek(4).map((p) => p.id);
    const week8 = getProfilesForWeek(8).map((p) => p.id);
    const week2 = getProfilesForWeek(2).map((p) => p.id);
    const week1 = getProfilesForWeek(1).map((p) => p.id);

    for (const p of priority3) {
      expect(week4).toContain(p.id);
      expect(week8).toContain(p.id);
      expect(week2).not.toContain(p.id);
      expect(week1).not.toContain(p.id);
    }
  });

  it('returns results sorted by priority ascending', () => {
    const result = getProfilesForWeek(0);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].priority).toBeGreaterThanOrEqual(result[i - 1].priority);
    }
  });

  it('returns at least the priority-1 profiles on any week', () => {
    const p1Count = MDM_SEARCH_PROFILES.filter((p) => p.isActive && p.priority === 1).length;
    for (const week of [0, 1, 3, 5, 7]) {
      expect(getProfilesForWeek(week).length).toBeGreaterThanOrEqual(p1Count);
    }
  });
});

describe('getWeekNumber', () => {
  it('returns a number', () => {
    expect(typeof getWeekNumber()).toBe('number');
  });

  it('increases by 1 each week', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const nextWeek = new Date('2026-01-08T00:00:00Z');
    expect(getWeekNumber(nextWeek) - getWeekNumber(now)).toBe(1);
  });

  it('is deterministic for the same date', () => {
    const date = new Date('2026-03-13T12:00:00Z');
    expect(getWeekNumber(date)).toBe(getWeekNumber(date));
  });

  it('uses current date when no argument is provided', () => {
    const approxNow = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    expect(Math.abs(getWeekNumber() - approxNow)).toBeLessThanOrEqual(1);
  });
});
