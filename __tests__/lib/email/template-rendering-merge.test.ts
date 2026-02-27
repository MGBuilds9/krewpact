import { describe, it, expect } from 'vitest';
import { renderTemplate, renderEmailTemplate } from '@/lib/email/template-renderer';
import { BRANDED_TEMPLATES } from '@/lib/email/branded-templates';

describe('renderTemplate with branded templates', () => {
  it('replaces merge fields in project-showcase template', () => {
    const template = BRANDED_TEMPLATES.find((t) => t.id === 'project-showcase');
    expect(template).toBeDefined();

    const rendered = renderTemplate(template!.body_html, {
      first_name: 'David',
      company_name: 'Acme Corp',
      project_name: 'Downtown Renovation',
      project_type: 'commercial',
      sqft: '15000',
      timeline: '4 months',
      budget_range: '$500K-$750K',
      project_image_url: 'https://example.com/img.jpg',
      cta_url: 'https://example.com/project',
      logo_url: 'https://example.com/logo.png',
      unsubscribe_url: 'https://example.com/unsub',
    });

    expect(rendered).toContain('David');
    expect(rendered).toContain('Acme Corp');
    expect(rendered).toContain('Downtown Renovation');
    expect(rendered).toContain('15000');
    expect(rendered).not.toContain('{{first_name}}');
    expect(rendered).not.toContain('{{company_name}}');
  });

  it('replaces merge fields in follow-up-nudge template', () => {
    const template = BRANDED_TEMPLATES.find((t) => t.id === 'follow-up-nudge');
    expect(template).toBeDefined();

    const rendered = renderTemplate(template!.body_text, {
      first_name: 'Michael',
      company_name: 'MDM Group',
      client_count: '200',
      years_in_business: '15',
      cta_url: 'https://example.com/book',
      unsubscribe_url: 'https://example.com/unsub',
    });

    expect(rendered).toContain('Michael');
    expect(rendered).toContain('200');
    expect(rendered).toContain('15');
    expect(rendered).not.toContain('{{client_count}}');
  });

  it('leaves unmatched merge fields empty', () => {
    const template = BRANDED_TEMPLATES.find((t) => t.id === 'event-invitation');
    expect(template).toBeDefined();

    const rendered = renderTemplate(template!.body_text, {
      first_name: 'Test',
    });

    expect(rendered).toContain('Test');
    // Unmatched fields become empty string
    expect(rendered).not.toContain('{{first_name}}');
    expect(rendered).not.toContain('{{event_name}}');
  });
});

describe('renderEmailTemplate with branded template', () => {
  it('renders subject and body', () => {
    const template = BRANDED_TEMPLATES.find((t) => t.id === 'referral-request');
    expect(template).toBeDefined();

    const result = renderEmailTemplate(
      {
        subject: template!.subject,
        body_html: template!.body_html,
        body_text: template!.body_text,
      },
      {
        first_name: 'Nervine',
        company_name: 'MDM Group',
        referral_url: 'https://example.com/refer',
        logo_url: 'https://example.com/logo.png',
        unsubscribe_url: 'https://example.com/unsub',
      },
    );

    expect(result.subject).toContain('Nervine');
    expect(result.html).toContain('MDM Group');
    expect(result.text).toContain('MDM Group');
    expect(result.text).not.toContain('{{company_name}}');
  });
});
