/**
 * Shared email layout helpers.
 * Brand: Navy #1E3A5F | Gold #D4A843 | Light #F5F5F5 | White #FFFFFF
 * All templates use inline styles for email client compatibility.
 */

export interface BrandedTemplate {
  id: string;
  name: string;
  category: 'outreach' | 'follow_up' | 'nurture' | 'event' | 'referral';
  description: string;
  subject: string;
  body_html: string;
  body_text: string;
  merge_fields: string[];
}

export const EMAIL_HEADER = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1E3A5F;">
  <tr>
    <td align="center" style="padding:24px 20px;">
      <img src="{{logo_url}}" alt="{{company_name}}" width="160" style="display:block;border:0;max-width:160px;" />
    </td>
  </tr>
</table>`.trim();

export const EMAIL_FOOTER = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1E3A5F;margin-top:0;">
  <tr>
    <td align="center" style="padding:24px 20px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#A8BDD4;line-height:1.6;">
      <p style="margin:0 0 4px 0;font-weight:600;color:#D4A843;letter-spacing:0.5px;">KREWPACT</p>
      <p style="margin:0 0 4px 0;"><a href="https://krewpact.com" style="color:#D4A843;text-decoration:none;">krewpact.com</a></p>
      <p style="margin:12px 0 0 0;font-size:11px;">
        You are receiving this email because you expressed interest in our services.<br />
        <a href="{{unsubscribe_url}}" style="color:#A8BDD4;text-decoration:underline;">Unsubscribe</a>
      </p>
    </td>
  </tr>
</table>`.trim();

export function wrapEmail(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>{{company_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr><td>${EMAIL_HEADER}</td></tr>
          <tr><td>${innerHtml}</td></tr>
          <tr><td>${EMAIL_FOOTER}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function ctaButton(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0 auto;">
  <tr>
    <td align="center" style="background-color:#D4A843;border-radius:4px;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;color:#1E3A5F;text-decoration:none;letter-spacing:0.3px;">${text}</a>
    </td>
  </tr>
</table>`;
}

export function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #E8E8E8;margin:0;" /></td></tr></table>`;
}
