import { describe, it, expect } from 'vitest';
import { exportToCSV } from '@/lib/csv/exporter';

describe('exportToCSV', () => {
  it('returns header row when data is empty', () => {
    const result = exportToCSV([], ['name', 'email']);
    expect(result).toBe('name,email');
  });

  it('exports simple data rows', () => {
    const data = [
      { name: 'Alice', email: 'alice@test.com' },
      { name: 'Bob', email: 'bob@test.com' },
    ];
    const csv = exportToCSV(data, ['name', 'email']);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('name,email');
    expect(lines[1]).toBe('Alice,alice@test.com');
    expect(lines[2]).toBe('Bob,bob@test.com');
  });

  it('handles null and undefined values as empty strings', () => {
    const data = [{ name: null, email: undefined, phone: '' }];
    const csv = exportToCSV(data as Record<string, unknown>[], ['name', 'email', 'phone']);
    const lines = csv.split('\n');
    expect(lines[1]).toBe(',,');
  });

  it('handles missing columns as empty strings', () => {
    const data = [{ name: 'Alice' }];
    const csv = exportToCSV(data, ['name', 'email']);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('Alice,');
  });

  it('wraps values containing commas in quotes', () => {
    const data = [{ name: 'Smith, John', email: 'john@test.com' }];
    const csv = exportToCSV(data, ['name', 'email']);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('"Smith, John",john@test.com');
  });

  it('escapes double quotes by doubling them', () => {
    const data = [{ name: 'The "Best" Company', email: 'info@best.com' }];
    const csv = exportToCSV(data, ['name', 'email']);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('"The ""Best"" Company",info@best.com');
  });

  it('wraps values containing newlines in quotes', () => {
    const data = [{ notes: 'Line 1\nLine 2', email: 'a@b.com' }];
    const csv = exportToCSV(data, ['notes', 'email']);
    const _lines = csv.split('\n');
    // The value with newline should be wrapped in quotes
    expect(csv).toContain('"Line 1\nLine 2"');
  });

  it('handles numeric values', () => {
    const data = [{ count: 42, rate: 3.14 }];
    const csv = exportToCSV(data, ['count', 'rate']);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('42,3.14');
  });

  it('only includes specified columns in order', () => {
    const data = [{ z: 'last', a: 'first', m: 'middle' }];
    const csv = exportToCSV(data, ['a', 'm', 'z']);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('a,m,z');
    expect(lines[1]).toBe('first,middle,last');
  });

  it('handles values with commas and quotes combined', () => {
    const data = [{ desc: 'He said, "hello"' }];
    const csv = exportToCSV(data, ['desc']);
    expect(csv).toContain('"He said, ""hello"""');
  });
});
