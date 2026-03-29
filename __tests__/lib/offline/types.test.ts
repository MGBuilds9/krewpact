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
    it('has a factory function for every entity type', () => {
      const entityTypes = Object.keys(CONFLICT_STRATEGIES);
      for (const type of entityTypes) {
        const factory =
          ENTITY_API_ENDPOINTS[type as keyof typeof ENTITY_API_ENDPOINTS];
        expect(typeof factory).toBe('function');
        expect(factory('proj-123')).toMatch(/^\/api\/projects\/proj-123\//);
      }
    });

    it('produces correct project-scoped paths', () => {
      const pid = 'abc-123';
      expect(ENTITY_API_ENDPOINTS.daily_logs(pid)).toBe(
        `/api/projects/${pid}/daily-logs`,
      );
      expect(ENTITY_API_ENDPOINTS.time_entries(pid)).toBe(
        `/api/projects/${pid}/time-entries`,
      );
      expect(ENTITY_API_ENDPOINTS.safety_forms(pid)).toBe(
        `/api/projects/${pid}/safety/forms`,
      );
      expect(ENTITY_API_ENDPOINTS.photos(pid)).toBe(
        `/api/projects/${pid}/photos`,
      );
    });
  });
});
