import {
  CONFLICT_STRATEGIES,
  ENTITY_API_ENDPOINTS,
} from '@/lib/offline/types';
import type {
  OfflineEntityType,
  OfflineAction,
  OfflineQueueStatus,
  ConflictStrategy,
} from '@/lib/offline/types';

describe('offline/types', () => {
  it('defines all entity types with conflict strategies', () => {
    const entities: OfflineEntityType[] = [
      'daily_logs',
      'time_entries',
      'safety_forms',
      'photos',
    ];

    for (const entity of entities) {
      expect(CONFLICT_STRATEGIES[entity]).toBeDefined();
    }
  });

  it('maps photos to always_keep_both strategy', () => {
    expect(CONFLICT_STRATEGIES.photos).toBe('always_keep_both');
  });

  it('maps time_entries to merge strategy', () => {
    expect(CONFLICT_STRATEGIES.time_entries).toBe('merge');
  });

  it('maps daily_logs and safety_forms to last_write_wins', () => {
    expect(CONFLICT_STRATEGIES.daily_logs).toBe('last_write_wins');
    expect(CONFLICT_STRATEGIES.safety_forms).toBe('last_write_wins');
  });

  it('defines API endpoints for all entity types', () => {
    expect(ENTITY_API_ENDPOINTS.daily_logs).toBe('/api/projects/daily-logs');
    expect(ENTITY_API_ENDPOINTS.time_entries).toBe('/api/projects/time-entries');
    expect(ENTITY_API_ENDPOINTS.safety_forms).toBe('/api/safety/forms');
    expect(ENTITY_API_ENDPOINTS.photos).toBe('/api/projects/photos');
  });
});
