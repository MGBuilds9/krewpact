import { describe, it, expect } from 'vitest';
import {
  BRANDED_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
} from '@/lib/email/branded-templates';

describe('BRANDED_TEMPLATES', () => {
  it('contains exactly 8 templates', () => {
    expect(BRANDED_TEMPLATES).toHaveLength(8);
  });

  it('all templates have unique ids', () => {
    const ids = BRANDED_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all templates have required fields', () => {
    for (const t of BRANDED_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.subject).toBeTruthy();
      expect(t.body_html).toBeTruthy();
      expect(t.body_text).toBeTruthy();
      expect(t.merge_fields.length).toBeGreaterThan(0);
    }
  });

  it('all templates include unsubscribe_url merge field', () => {
    for (const t of BRANDED_TEMPLATES) {
      expect(t.merge_fields).toContain('unsubscribe_url');
    }
  });

  it('all body_html contains MDM Group branding', () => {
    for (const t of BRANDED_TEMPLATES) {
      expect(t.body_html).toContain('mdmcontracting.ca');
    }
  });

  it('all body_html is responsive (max-width 600px)', () => {
    for (const t of BRANDED_TEMPLATES) {
      expect(t.body_html).toContain('max-width:600px');
    }
  });

  it('all body_html uses inline styles only', () => {
    for (const t of BRANDED_TEMPLATES) {
      expect(t.body_html).not.toContain('<style>');
      expect(t.body_html).not.toContain('<style ');
    }
  });

  it('body_text contains merge field placeholders', () => {
    for (const t of BRANDED_TEMPLATES) {
      expect(t.body_text).toContain('{{first_name}}');
    }
  });

  it('categories are valid', () => {
    const validCategories = ['outreach', 'follow_up', 'nurture', 'event', 'referral'];
    for (const t of BRANDED_TEMPLATES) {
      expect(validCategories).toContain(t.category);
    }
  });
});

describe('getTemplateById', () => {
  it('returns the correct template', () => {
    const t = getTemplateById('project-showcase');
    expect(t).toBeDefined();
    expect(t?.id).toBe('project-showcase');
  });

  it('returns undefined for unknown id', () => {
    expect(getTemplateById('nonexistent')).toBeUndefined();
  });
});

describe('getTemplatesByCategory', () => {
  it('returns outreach templates', () => {
    const outreach = getTemplatesByCategory('outreach');
    expect(outreach.length).toBeGreaterThanOrEqual(3);
    for (const t of outreach) {
      expect(t.category).toBe('outreach');
    }
  });

  it('returns follow_up templates', () => {
    const followUp = getTemplatesByCategory('follow_up');
    expect(followUp.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array for unknown category', () => {
    expect(getTemplatesByCategory('nonexistent' as 'outreach')).toEqual([]);
  });
});
