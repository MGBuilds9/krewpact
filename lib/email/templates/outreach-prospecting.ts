/**
 * KrewPact — Prospecting outreach templates.
 * Templates: seasonal-outreach, trade-partner-invite
 */

import { BrandedTemplate, ctaButton, wrapEmail } from './shared';

// ---------------------------------------------------------------------------
// Template 4: seasonal-outreach
// ---------------------------------------------------------------------------

const seasonalOutreachBody = wrapEmail(`
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:32px 40px 20px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#D4A843;letter-spacing:1px;text-transform:uppercase;">{{season}} Construction Planning</p>
      <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#1E3A5F;line-height:1.3;">Plan Your {{season}} Project Now</h1>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">Hi {{first_name}},</p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        {{season}} is the optimal season for {{project_type}} projects in the GTA. Contractors fill up quickly, and securing your slot early gives you first pick on scheduling, materials pricing, and our most experienced crews.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;border-left:4px solid #D4A843;border-radius:0 4px 4px 0;margin-bottom:20px;">
        <tr>
          <td style="padding:20px 24px;font-family:'Helvetica Neue',Arial,sans-serif;">
            <p style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#1E3A5F;">Why plan ahead with KrewPact?</p>
            <p style="margin:0 0 8px 0;font-size:14px;color:#444444;line-height:1.5;">Lock in preferred pricing before seasonal rate increases.</p>
            <p style="margin:0 0 8px 0;font-size:14px;color:#444444;line-height:1.5;">Guaranteed project start date with written scope.</p>
            <p style="margin:0;font-size:14px;color:#444444;line-height:1.5;">Access to our full crew capacity — not leftover availability.</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        We have availability opening for {{company_name}} right now. A 30-minute call is all it takes to get a scope and rough budget on paper.
      </p>
      ${ctaButton('Book a Planning Call', '{{cta_url}}')}
    </td>
  </tr>
</table>
`);

// ---------------------------------------------------------------------------
// Template 5: trade-partner-invite
// ---------------------------------------------------------------------------

const tradePartnerInviteBody = wrapEmail(`
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background-color:#1E3A5F;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:28px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
            <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#D4A843;letter-spacing:1px;text-transform:uppercase;">Partner Network Invitation</p>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#FFFFFF;line-height:1.3;">Join MDM's Trusted Partner Network</h1>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px 20px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">Hi {{first_name}},</p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        KrewPact is expanding its trusted subcontractor network across the GTA, and we are looking for qualified {{trade_type}} partners to join us on upcoming commercial and residential projects.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
        <tr>
          <td style="padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:0 0 12px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;border-radius:4px;">
                    <tr>
                      <td style="padding:16px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
                        <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#1E3A5F;">Consistent Project Pipeline</p>
                        <p style="margin:0;font-size:14px;color:#555555;line-height:1.5;">Access to our full portfolio of active and upcoming contracts across 6 divisions.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 12px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;border-radius:4px;">
                    <tr>
                      <td style="padding:16px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
                        <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#1E3A5F;">Prompt, Reliable Payment</p>
                        <p style="margin:0;font-size:14px;color:#555555;line-height:1.5;">Net-30 standard terms, digital invoicing, and clear scope documentation on every job.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;border-radius:4px;">
                    <tr>
                      <td style="padding:16px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
                        <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#1E3A5F;">Long-Term Partnership Potential</p>
                        <p style="margin:0;font-size:14px;color:#555555;line-height:1.5;">We build lasting relationships with our trade partners, not one-off transactions.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        {{company_name}} looks like a strong fit for what we need. I would like to set up a quick call to learn more about your capacity and discuss how we can work together.
      </p>
      ${ctaButton('Apply to Join the Network', '{{cta_url}}')}
    </td>
  </tr>
</table>
`);

// ---------------------------------------------------------------------------
// Plain text versions
// ---------------------------------------------------------------------------

const seasonalOutreachText = `Hi {{first_name}},

{{season}} is the optimal time for {{project_type}} projects in the GTA. We have availability opening for {{company_name}} right now.

Why plan ahead with KrewPact?
- Lock in preferred pricing before seasonal rate increases
- Guaranteed project start date with written scope
- Access to our full crew capacity

Book a planning call: {{cta_url}}

---
KrewPact | krewpact.com
Unsubscribe: {{unsubscribe_url}}`;

const tradePartnerInviteText = `Hi {{first_name}},

KrewPact is expanding its trusted subcontractor network across the GTA. We are looking for qualified {{trade_type}} partners for upcoming projects.

What we offer:
- Consistent project pipeline across 6 divisions
- Prompt, reliable payment (Net-30 standard)
- Long-term partnership potential

{{company_name}} looks like a strong fit. Apply to join our network: {{cta_url}}

---
KrewPact | krewpact.com
Unsubscribe: {{unsubscribe_url}}`;

// ---------------------------------------------------------------------------
// Exported templates
// ---------------------------------------------------------------------------

export const OUTREACH_PROSPECTING_TEMPLATES: BrandedTemplate[] = [
  {
    id: 'seasonal-outreach',
    name: 'Plan Your {{season}} Project',
    category: 'outreach',
    description:
      'Weather-aware seasonal outreach emphasizing urgency and early booking advantages. Set season to Spring, Summer, Fall, or Winter.',
    subject: 'Plan Your {{season}} {{project_type}} Project — KrewPact',
    body_html: seasonalOutreachBody,
    body_text: seasonalOutreachText,
    merge_fields: [
      'logo_url',
      'first_name',
      'company_name',
      'season',
      'project_type',
      'cta_url',
      'unsubscribe_url',
    ],
  },
  {
    id: 'trade-partner-invite',
    name: "Join MDM's Trusted Partner Network",
    category: 'outreach',
    description:
      'Invitation for subcontractors and trade partners to join the KrewPact network. Highlights pipeline access, payment terms, and long-term relationship potential.',
    subject: "An Invitation for {{company_name}} — KrewPact's Partner Network",
    body_html: tradePartnerInviteBody,
    body_text: tradePartnerInviteText,
    merge_fields: [
      'logo_url',
      'first_name',
      'company_name',
      'trade_type',
      'cta_url',
      'unsubscribe_url',
    ],
  },
];
