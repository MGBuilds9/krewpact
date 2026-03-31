/**
 * Follow-up email templates.
 * Templates: follow-up-nudge
 */

import { BrandedTemplate, ctaButton, divider, wrapEmail } from './shared';

// ---------------------------------------------------------------------------
// Template 6: follow-up-nudge
// ---------------------------------------------------------------------------

const followUpNudgeBody = wrapEmail(`
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:40px 40px 20px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">Hi {{first_name}},</p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        I wanted to follow up on my previous note about {{company_name}}'s construction services. I know your schedule is busy, so I will keep this short.
      </p>
      ${divider()}
    </td>
  </tr>
  <tr>
    <td style="padding:20px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;border-radius:4px;border-left:4px solid #D4A843;">
        <tr>
          <td style="padding:20px 24px;font-family:'Helvetica Neue',Arial,sans-serif;">
            <p style="margin:0 0 12px 0;font-size:14px;color:#1E3A5F;font-weight:700;">{{company_name}} at a Glance</p>
            <p style="margin:0 0 8px 0;font-size:14px;color:#444444;line-height:1.5;">
              <strong style="color:#1E3A5F;">{{client_count}}+</strong> clients served across the GTA
            </p>
            <p style="margin:0 0 8px 0;font-size:14px;color:#444444;line-height:1.5;">
              <strong style="color:#1E3A5F;">{{years_in_business}}+ years</strong> building in Ontario
            </p>
            <p style="margin:0;font-size:14px;color:#444444;line-height:1.5;">
              <strong style="color:#1E3A5F;">6 divisions</strong> — Contracting, Homes, Wood, Telecom, Management, Group Inc.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 36px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        If there is any current or upcoming project at {{company_name}} where we could be helpful, I am ready to put together a no-obligation estimate.
      </p>
      ${ctaButton('Request a Free Estimate', '{{cta_url}}')}
    </td>
  </tr>
</table>
`);

const followUpNudgeText = `Hi {{first_name}},

I wanted to follow up on my previous note about {{company_name}}'s construction services.

{{company_name}} at a Glance:
- {{client_count}}+ clients served across the GTA
- {{years_in_business}}+ years building in Ontario
- 6 divisions: Contracting, Homes, Wood, Telecom, Management, Group Inc.

If there is any current or upcoming project at {{company_name}} where we could be helpful, I am ready to put together a no-obligation estimate.

Request a free estimate: {{cta_url}}

---
KrewPact | krewpact.com
Unsubscribe: {{unsubscribe_url}}`;

export const FOLLOW_UP_TEMPLATES: BrandedTemplate[] = [
  {
    id: 'follow-up-nudge',
    name: 'Just Following Up',
    category: 'follow_up',
    description:
      'Short, respectful follow-up with social proof (client count, years in business). Clean layout with a single CTA. Best used 5-7 days after initial outreach.',
    subject: 'Following up — {{sender_company}} for {{company_name}}',
    body_html: followUpNudgeBody,
    body_text: followUpNudgeText,
    merge_fields: [
      'logo_url',
      'first_name',
      'company_name',
      'sender_company',
      'client_count',
      'years_in_business',
      'cta_url',
      'unsubscribe_url',
    ],
  },
];
