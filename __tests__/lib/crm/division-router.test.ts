import { describe, it, expect } from 'vitest';
import { routeToDivision } from '@/lib/crm/division-router';

describe('routeToDivision', () => {
  it('routes pharmacy leads to contracting', () => {
    // 'pharmacy renovation' hits the 'renovation' keyword first (homes takes priority).
    // Use a pharmacy input without residential keywords to reach contracting.
    expect(routeToDivision({ project_type: 'pharmacy buildout' })).toBe('contracting');
  });

  it('routes residential leads to homes', () => {
    expect(routeToDivision({ project_type: 'home renovation' })).toBe('homes');
  });

  it('routes cabinet leads to wood', () => {
    expect(routeToDivision({ project_description: 'custom cabinet install' })).toBe('wood');
  });

  it('routes telecom infrastructure leads to telecom', () => {
    expect(routeToDivision({ industry: 'telecom infrastructure' })).toBe('telecom');
  });

  it('defaults to contracting for unknown project type', () => {
    expect(routeToDivision({ project_type: 'office building' })).toBe('contracting');
  });

  it('defaults to contracting for empty input', () => {
    expect(routeToDivision({})).toBe('contracting');
  });

  it('matches across multiple fields — prefers wood when company name contains furniture keyword', () => {
    expect(
      routeToDivision({ company_name: 'ABC Furniture Co', project_type: 'display case' }),
    ).toBe('wood');
  });

  it('is case insensitive', () => {
    expect(routeToDivision({ project_type: 'RESIDENTIAL RENOVATION' })).toBe('homes');
  });

  it('routes dental clinic buildout to contracting', () => {
    expect(routeToDivision({ project_description: 'New dental clinic buildout' })).toBe(
      'contracting',
    );
  });

  it('routes restaurant industry to contracting', () => {
    expect(routeToDivision({ industry: 'restaurant' })).toBe('contracting');
  });

  it('routes basement finishing to homes', () => {
    expect(routeToDivision({ project_type: 'basement finishing' })).toBe('homes');
  });

  it('routes structured cabling project to telecom', () => {
    expect(
      routeToDivision({ project_description: 'structured cabling for office' }),
    ).toBe('telecom');
  });
});
