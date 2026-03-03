/**
 * Merge field rendering for email templates.
 * Replaces {{variableName}} placeholders with resolved values.
 * Supports tracking pixel injection and click tracking link wrapping.
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

export interface TrackingConfig {
  outreachEventId: string;
  baseUrl: string; // e.g., "https://app.krewpact.com"
}

export function renderEmailTemplate(
  template: EmailTemplate,
  variables: TemplateVariables,
  tracking?: TrackingConfig,
): RenderedEmail {
  const subject = renderTemplate(template.subject, variables);
  let html = renderTemplate(template.body_html, variables);
  const text = template.body_text ? renderTemplate(template.body_text, variables) : undefined;

  if (tracking) {
    html = injectTrackingPixel(html, tracking);
    html = wrapLinksWithTracking(html, tracking);
  }

  return { subject, html, text };
}

/**
 * Injects a 1x1 tracking pixel before the closing </body> tag (or at end of HTML).
 */
function injectTrackingPixel(html: string, tracking: TrackingConfig): string {
  const pixelUrl = `${tracking.baseUrl}/api/email/track/open/${tracking.outreachEventId}`;
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;" />`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelTag}</body>`);
  }
  return html + pixelTag;
}

/**
 * Wraps all <a href="..."> links with click tracking redirects.
 * Preserves the original URL as a query parameter.
 */
function wrapLinksWithTracking(html: string, tracking: TrackingConfig): string {
  const trackBase = `${tracking.baseUrl}/api/email/track/click/${tracking.outreachEventId}`;

  return html.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (_match, before: string, url: string, after: string) => {
      // Skip tracking/anchor/mailto/tel links
      if (
        url.startsWith('#') ||
        url.startsWith('mailto:') ||
        url.startsWith('tel:') ||
        url.includes('/api/email/track/')
      ) {
        return `<a ${before}href="${url}"${after}>`;
      }

      const trackedUrl = `${trackBase}?url=${encodeURIComponent(url)}`;
      return `<a ${before}href="${trackedUrl}"${after}>`;
    },
  );
}
