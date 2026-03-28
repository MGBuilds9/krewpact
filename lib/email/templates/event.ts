/**
 * MDM Group Inc. — Event email templates.
 * Templates: event-invitation
 */

import { BrandedTemplate, ctaButton, wrapEmail } from './shared';

// ---------------------------------------------------------------------------
// Template 7: event-invitation
// ---------------------------------------------------------------------------

const eventInvitationBody = wrapEmail(`
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background-color:#1E3A5F;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:32px 40px;font-family:'Helvetica Neue',Arial,sans-serif;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#D4A843;letter-spacing:2px;text-transform:uppercase;">You Are Invited</p>
            <h1 style="margin:0 0 16px 0;font-size:28px;font-weight:700;color:#FFFFFF;line-height:1.3;">{{event_name}}</h1>
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td style="padding:0 16px;border-right:1px solid rgba(255,255,255,0.3);text-align:center;">
                  <p style="margin:0 0 4px 0;font-size:12px;color:#A8BDD4;text-transform:uppercase;letter-spacing:0.5px;">Date</p>
                  <p style="margin:0;font-size:14px;font-weight:700;color:#FFFFFF;">{{event_date}}</p>
                </td>
                <td style="padding:0 16px;text-align:center;">
                  <p style="margin:0 0 4px 0;font-size:12px;color:#A8BDD4;text-transform:uppercase;letter-spacing:0.5px;">Location</p>
                  <p style="margin:0;font-size:14px;font-weight:700;color:#FFFFFF;">{{event_location}}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px 20px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">Hi {{first_name}},</p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        We would like to invite you and the team at {{company_name}} to join us at <strong style="color:#1E3A5F;">{{event_name}}</strong>. This is an opportunity to connect with the MDM Group leadership team, see our latest project portfolio, and discuss how we can support your upcoming construction needs.
      </p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#444444;line-height:1.6;">
        Space is limited. Please RSVP at your earliest convenience to secure your spot.
      </p>
      ${ctaButton('RSVP Now', '{{rsvp_url}}')}
      <p style="margin:24px 0 0 0;font-size:13px;color:#777777;line-height:1.5;text-align:center;">
        Questions? Reply to this email or contact us at <a href="https://krewpact.com" style="color:#1E3A5F;text-decoration:underline;">krewpact.com</a>
      </p>
    </td>
  </tr>
</table>
`);

const eventInvitationText = `Hi {{first_name}},

You are invited to {{event_name}}.

Date: {{event_date}}
Location: {{event_location}}

We would like to invite you and the team at {{company_name}} to join us. Space is limited.

RSVP here: {{rsvp_url}}

---
KrewPact | krewpact.com
Unsubscribe: {{unsubscribe_url}}`;

export const EVENT_TEMPLATES: BrandedTemplate[] = [
  {
    id: 'event-invitation',
    name: "You're Invited",
    category: 'event',
    description:
      'Formal event invitation with date and location prominently displayed in the navy header. Suitable for open houses, project showcases, and networking events.',
    subject: "You're Invited — {{event_name}} | MDM Group",
    body_html: eventInvitationBody,
    body_text: eventInvitationText,
    merge_fields: [
      'logo_url',
      'first_name',
      'company_name',
      'event_name',
      'event_date',
      'event_location',
      'rsvp_url',
      'unsubscribe_url',
    ],
  },
];
