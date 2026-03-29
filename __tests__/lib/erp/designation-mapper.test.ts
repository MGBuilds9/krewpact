import { describe, expect, it } from 'vitest';

import { mapDesignationFromErp } from '@/lib/erp/designation-mapper';

describe('mapDesignationFromErp', () => {
  it('maps all fields correctly', () => {
    const result = mapDesignationFromErp({
      name: 'Project Manager',
      designation: 'Project Manager',
      description: 'Manages construction projects',
      creation: '2026-01-01T00:00:00',
      modified: '2026-01-01T00:00:00',
    });

    expect(result.erp_name).toBe('Project Manager');
    expect(result.designation).toBe('Project Manager');
    expect(result.description).toBe('Manages construction projects');
  });

  it('returns null description when not provided', () => {
    const result = mapDesignationFromErp({
      name: 'Estimator',
      designation: 'Estimator',
      description: null,
      creation: '2026-01-01T00:00:00',
      modified: '2026-01-01T00:00:00',
    });

    expect(result.description).toBeNull();
  });
});
