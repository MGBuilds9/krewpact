import { describe, expect, it } from 'vitest';

import { renderEmailTemplate, renderTemplate } from '@/lib/email/template-renderer';

describe('renderTemplate', () => {
  it('replaces a single merge field', () => {
    expect(renderTemplate('Hello {{name}}!', { name: 'Michael' })).toBe('Hello Michael!');
  });

  it('replaces multiple merge fields', () => {
    expect(renderTemplate('{{first}} {{last}}', { first: 'John', last: 'Doe' })).toBe('John Doe');
  });

  it('replaces null value with empty string', () => {
    expect(renderTemplate('Hi {{name}}', { name: null })).toBe('Hi ');
  });

  it('replaces undefined value with empty string', () => {
    expect(renderTemplate('Hi {{name}}', { name: undefined })).toBe('Hi ');
  });

  it('replaces unmatched fields with empty string', () => {
    expect(renderTemplate('Hello {{unknown}}', {})).toBe('Hello ');
  });

  it('coerces number values to string', () => {
    expect(renderTemplate('Score: {{score}}', { score: 85 })).toBe('Score: 85');
  });

  it('returns empty string unchanged when template is empty', () => {
    expect(renderTemplate('', { name: 'test' })).toBe('');
  });
});

describe('renderEmailTemplate', () => {
  it('renders subject and body_html into subject and html', () => {
    const template = {
      subject: 'Hello {{first_name}}',
      body_html: '<p>Welcome, {{company_name}}</p>',
    };
    const result = renderEmailTemplate(template, { first_name: 'Mike', company_name: 'MDM' });
    expect(result.subject).toBe('Hello Mike');
    expect(result.html).toBe('<p>Welcome, MDM</p>');
  });

  it('renders body_text into text when present', () => {
    const template = {
      subject: 'Test',
      body_html: '<p>HTML</p>',
      body_text: 'Plain {{name}}',
    };
    const result = renderEmailTemplate(template, { name: 'Test' });
    expect(result.text).toBe('Plain Test');
  });

  it('omits text property when body_text is null', () => {
    const template = { subject: 'Test', body_html: '<p>HTML</p>', body_text: null };
    const result = renderEmailTemplate(template, {});
    expect(result.text).toBeUndefined();
  });

  it('omits text property when body_text is not provided', () => {
    const template = { subject: 'Test', body_html: '<p>HTML</p>' };
    const result = renderEmailTemplate(template, {});
    expect(result.text).toBeUndefined();
  });
});
