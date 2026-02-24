/**
 * Merge field rendering for email templates.
 * Replaces {{variableName}} placeholders with resolved values.
 */

type TemplateVariables = Record<string, string | number | null | undefined>;

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

interface EmailTemplate {
  subject: string;
  body_html: string;
  body_text?: string | null;
}

interface RenderedEmail {
  subject: string;
  html: string;
  text?: string;
}

export function renderEmailTemplate(
  template: EmailTemplate,
  variables: TemplateVariables,
): RenderedEmail {
  return {
    subject: renderTemplate(template.subject, variables),
    html: renderTemplate(template.body_html, variables),
    text: template.body_text ? renderTemplate(template.body_text, variables) : undefined,
  };
}
