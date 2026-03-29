import { describe, expect, it } from 'vitest';

import {
  CONFLICT_STRATEGIES,
  ENTITY_API_ENDPOINTS,
} from '@/lib/offline/types';

describe('Offline Types', () => {
  describe('CONFLICT_STRATEGIES', () => {
    it('maps daily_logs to last_write_wins', () => {
      expect(CONFLICT_STRATEGIES.daily_logs).toBe('last_write_wins');
    });

    it('maps time_entries to merge', () => {
      expect(CONFLICT_STRATEGIES.time_entries).toBe('merge');
    });

    it('maps safety_forms to last_write_wins', () => {
      expect(CONFLICT_STRATEGIES.safety_forms).toBe('last_write_wins');
    });

    it('maps photos to always_keep_both', () => {
      expect(CONFLICT_STRATEGIES.photos).toBe('always_keep_both');
    });

    it('covers all entity types', () => {
      const keys = Object.keys(CONFLICT_STRATEGIES);
      expect(keys).toHaveLength(4);
      expect(keys).toContain('daily_logs');
      expect(keys).toContain('time_entries');
      expect(keys).toContain('safety_forms');
      expect(keys).toContain('photos');
    });
  });

  describe('ENTITY_API_ENDPOINTS', () => {
    it('has an endpoint for every entity type', () => {
      const entityTypes = Object.keys(CONFLICT_STRATEGIES);
      for (const type of entityTypes) {
        expect(
          ENTITY_API_ENDPOINTS[type as keyof typeof ENTITY_API_ENDPOINTS],
        ).toBeDefined();
        expect(
          ENTITY_API_ENDPOINTS[type as keyof typeof ENTITY_API_ENDPOINTS],
        ).toMatch(/^\/api\//);
      }
    });

    it('has correct endpoint paths', () => {
      expect(ENTITY_API_ENDPOINTS.daily_logs).toBe('/api/projects/daily-logs');
      expect(ENTITY_API_ENDPOINTS.time_entries).toBe('/api/projects/time-entries');
      expect(ENTITY_API_ENDPOINTS.safety_forms).toBe('/api/safety/forms');
      expect(ENTITY_API_ENDPOINTS.photos).toBe('/api/projects/photos');
    });
  });
});
