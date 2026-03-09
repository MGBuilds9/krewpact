import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('queryKeys factory', () => {
  // --- Structure tests: every entity has the expected shape ---

  const entities = [
    'leads',
    'accounts',
    'contacts',
    'opportunities',
    'estimates',
    'projects',
    'tasks',
    'notifications',
  ] as const;

  it.each(entities)('%s has all, lists, list, details, detail methods', (entity) => {
    const k = queryKeys[entity];
    expect(k.all).toBeDefined();
    expect(typeof k.lists).toBe('function');
    expect(typeof k.list).toBe('function');
    expect(typeof k.details).toBe('function');
    expect(typeof k.detail).toBe('function');
  });

  // --- Hierarchy tests: child keys extend parent keys ---

  it.each(entities)('%s.lists() starts with %s.all', (entity) => {
    const k = queryKeys[entity];
    const lists = k.lists();
    expect(lists.slice(0, k.all.length)).toEqual([...k.all]);
  });

  it.each(entities)('%s.list(filters) starts with %s.lists()', (entity) => {
    const k = queryKeys[entity];
    const filters = { status: 'active' };
    const list = k.list(filters);
    const lists = k.lists();
    expect(list.slice(0, lists.length)).toEqual([...lists]);
    expect(list[list.length - 1]).toEqual(filters);
  });

  it.each(entities)('%s.details() starts with %s.all', (entity) => {
    const k = queryKeys[entity];
    const details = k.details();
    expect(details.slice(0, k.all.length)).toEqual([...k.all]);
  });

  it.each(entities)('%s.detail(id) starts with %s.details()', (entity) => {
    const k = queryKeys[entity];
    const id = 'abc-123';
    const detail = k.detail(id);
    const details = k.details();
    expect(detail.slice(0, details.length)).toEqual([...details]);
    expect(detail[detail.length - 1]).toBe(id);
  });

  // --- Uniqueness tests: top-level keys don't collide ---

  it('all entity root keys are unique', () => {
    const rootKeys = entities.map((e) => queryKeys[e].all[0]);
    const unique = new Set(rootKeys);
    expect(unique.size).toBe(rootKeys.length);
  });

  // --- Specific value tests ---

  it('leads.all equals ["leads"]', () => {
    expect(queryKeys.leads.all).toEqual(['leads']);
  });

  it('leads.list({status:"new"}) produces correct key', () => {
    const key = queryKeys.leads.list({ status: 'new' });
    expect(key).toEqual(['leads', 'list', { status: 'new' }]);
  });

  it('leads.detail("id-1") produces correct key', () => {
    const key = queryKeys.leads.detail('id-1');
    expect(key).toEqual(['leads', 'detail', 'id-1']);
  });

  // --- Dashboard tests ---

  it('dashboard.all equals ["dashboard"]', () => {
    expect(queryKeys.dashboard.all).toEqual(['dashboard']);
  });

  it('dashboard.executive() extends dashboard.all', () => {
    const key = queryKeys.dashboard.executive();
    expect(key).toEqual(['dashboard', 'executive']);
  });

  it('dashboard.pm() extends dashboard.all', () => {
    const key = queryKeys.dashboard.pm();
    expect(key).toEqual(['dashboard', 'pm']);
  });

  // --- Estimates sub-keys tests ---

  it('estimates.lines(id) extends estimates.detail(id)', () => {
    const id = 'est-123';
    const lines = queryKeys.estimates.lines(id);
    const detail = queryKeys.estimates.detail(id);
    expect(lines.slice(0, detail.length)).toEqual([...detail]);
    expect(lines[lines.length - 1]).toBe('lines');
  });

  it('estimates.versions(id) extends estimates.detail(id)', () => {
    const id = 'est-456';
    const versions = queryKeys.estimates.versions(id);
    const detail = queryKeys.estimates.detail(id);
    expect(versions.slice(0, detail.length)).toEqual([...detail]);
    expect(versions[versions.length - 1]).toBe('versions');
  });

  // --- Immutability tests ---

  it('keys are readonly (as const)', () => {
    const key1 = queryKeys.leads.list({ a: 1 });
    const key2 = queryKeys.leads.list({ a: 1 });
    // Each call produces a new array — no shared mutable state
    expect(key1).toEqual(key2);
    expect(key1).not.toBe(key2);
  });

  // --- Filter isolation tests ---

  it('different filters produce different list keys', () => {
    const key1 = queryKeys.projects.list({ divisionId: 'a' });
    const key2 = queryKeys.projects.list({ divisionId: 'b' });
    expect(key1).not.toEqual(key2);
  });

  it('empty vs non-empty filters produce different keys', () => {
    const key1 = queryKeys.tasks.list({});
    const key2 = queryKeys.tasks.list({ projectId: 'p-1' });
    expect(key1).not.toEqual(key2);
  });
});
