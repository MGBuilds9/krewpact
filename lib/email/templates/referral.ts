/**
 * MDM Group Inc. — Referral email templates.
 * Templates: referral-request
 */

import { BrandedTemplate, ctaButton, wrapEmail } from './shared';

// ---------------------------------------------------------------------------
// Template 8: referral-request
// ---------------------------------------------------------------------------

const referralRequestBody = wrapEmail(`
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:40px 40px 20px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#D4A843;letter-spacing:1px;text-transform:uppercase;">A Quick Ask</p>
      <h1 style="margin:0 0 20px 0;font-size:24px;font-weight:700;color:#1E3A5F;line-height:1.3;">Know Someone Who Could Use Our Help?</h1>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">Hi {{first_name}},</p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        Thank you for being a valued client of MDM Group. It has been a pleasure working with {{company_name}}, and we hope the results have exceeded your expectations.
      </p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        We are currently taking on new clients and would greatly appreciate a referral if you know of any colleagues, business contacts, or property owners who could benefit from our services.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 20px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;border-radius:4px;">
        <tr>
          <td style="padding:24px;font-family:'Helvetica Neue',Arial,sans-serif;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#1E3A5F;">Refer a Contact to MDM Group</p>
            <p style="margin:0 0 16px 0;font-size:14px;color:#555555;line-height:1.5;">
              Share our work with someone you trust. It only takes a moment and means a great deal to us.
            </p>
            ${ctaButton('Submit a Referral', '{{referral_url}}')}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 36px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:20px 0 0 0;font-size:14px;color:#777777;line-height:1.5;text-align:center;">
        Thank you for your continued trust in MDM Group Inc.
      </p>
    </td>
  </tr>
</table>
`);

const referralRequestText = `Hi {{first_name}},

Thank you for being a valued client of MDM Group. It has been a pleasure working with {{company_name}}.

We are currently taking on new clients and would greatly appreciate a referral if you know of any colleagues or business contacts who could benefit from our services.

Submit a referral: {{referral_url}}

Thank you for your continued trust in MDM Group Inc.

---
MDM Group Inc. | Mississauga, Ontario | mdmcontracting.ca
Unsubscribe: {{unsubscribe_url}}`;

export const REFERRAL_TEMPLATES: BrandedTemplate[] = [
  {
    id: 'referral-request',
    name: 'Know Someone Who Could Use Our Help?',
    category: 'referral',
    description:
      'Referral request sent to existing satisfied clients. Warm, appreciative tone with a clear single CTA to submit a referral.',
    subject: 'A quick ask, {{first_name}} — do you know anyone we could help?',
    body_html: referralRequestBody,
    body_text: referralRequestText,
    merge_fields: ['logo_url', 'first_name', 'company_name', 'referral_url', 'unsubscribe_url'],
  },
];
