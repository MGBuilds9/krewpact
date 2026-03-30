import type { BrandingConfig } from '@/lib/validators/branding';

const DEFAULTS = {
  company_name: 'KrewPact',
  primary_color: '#2563eb',
  support_email: 'support@krewpact.com',
};

export function wrapInBrandedTemplate(body: string, branding: BrandingConfig): string {
  const companyName = branding.company_name ?? DEFAULTS.company_name;
  const primaryColor = branding.primary_color ?? DEFAULTS.primary_color;
  const supportEmail = branding.support_email ?? DEFAULTS.support_email;

  const headerContent = branding.logo_url
    ? `<img src="${branding.logo_url}" alt="${companyName}" style="max-height:40px;display:block;" />`
    : `<span style="color:#ffffff;font-size:20px;font-weight:700;font-family:sans-serif;">${companyName}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:${primaryColor};padding:20px 32px;border-radius:8px 8px 0 0;">
            ${headerContent}
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background-color:#ffffff;padding:32px;color:#111827;font-size:15px;line-height:1.6;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;text-align:center;font-size:13px;color:#6b7280;">
            ${companyName} &mdash; Questions? <a href="mailto:${supportEmail}" style="color:#2563eb;text-decoration:none;">${supportEmail}</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
