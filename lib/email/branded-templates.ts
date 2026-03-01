/**
 * MDM Group Inc. — Pre-built branded HTML email templates.
 * Brand: Navy #1E3A5F | Gold #D4A843 | Light #F5F5F5 | White #FFFFFF
 * All templates use inline styles for email client compatibility.
 * Merge fields follow {{variable_name}} syntax (rendered by template-renderer.ts).
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

// ---------------------------------------------------------------------------
// Shared layout helpers (inline — not exported)
// ---------------------------------------------------------------------------

const EMAIL_HEADER = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1E3A5F;">
  <tr>
    <td align="center" style="padding:24px 20px;">
      <img src="{{logo_url}}" alt="MDM Group Inc." width="160" style="display:block;border:0;max-width:160px;" />
    </td>
  </tr>
</table>`.trim();

const EMAIL_FOOTER = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1E3A5F;margin-top:0;">
  <tr>
    <td align="center" style="padding:24px 20px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#A8BDD4;line-height:1.6;">
      <p style="margin:0 0 4px 0;font-weight:600;color:#D4A843;letter-spacing:0.5px;">MDM GROUP INC.</p>
      <p style="margin:0 0 4px 0;">Mississauga, Ontario &nbsp;|&nbsp; <a href="https://mdmcontracting.ca" style="color:#D4A843;text-decoration:none;">mdmcontracting.ca</a></p>
      <p style="margin:12px 0 0 0;font-size:11px;">
        You are receiving this email because you expressed interest in MDM Group Inc. services.<br />
        <a href="{{unsubscribe_url}}" style="color:#A8BDD4;text-decoration:underline;">Unsubscribe</a>
      </p>
    </td>
  </tr>
</table>`.trim();

function wrapEmail(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>MDM Group Inc.</title>
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

function ctaButton(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0 auto;">
  <tr>
    <td align="center" style="background-color:#D4A843;border-radius:4px;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;color:#1E3A5F;text-decoration:none;letter-spacing:0.3px;">${text}</a>
    </td>
  </tr>
</table>`;
}

function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #E8E8E8;margin:0;" /></td></tr></table>`;
}

// ---------------------------------------------------------------------------
// Template 1: project-showcase
// ---------------------------------------------------------------------------

const projectShowcaseBody = wrapEmail(`
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:32px 40px 8px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#D4A843;letter-spacing:1px;text-transform:uppercase;">Featured Project</p>
      <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#1E3A5F;line-height:1.3;">{{project_name}}</h1>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">Hi {{first_name}},</p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        We recently completed a {{project_type}} project that I thought would be relevant to {{company_name}}. Here is a brief look at what we delivered.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px;">
      <img src="{{project_image_url}}" alt="{{project_name}}" width="520" style="display:block;width:100%;max-width:520px;border-radius:4px;border:0;" />
    </td>
  </tr>
  <tr>
    <td style="padding:24px 40px 0 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;border-radius:4px;border-left:4px solid #D4A843;">
        <tr>
          <td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="33%" style="font-family:'Helvetica Neue',Arial,sans-serif;text-align:center;padding:0 8px;">
                  <p style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#1E3A5F;">{{sqft}}</p>
                  <p style="margin:0;font-size:12px;color:#777777;text-transform:uppercase;letter-spacing:0.5px;">Sq. Ft.</p>
                </td>
                <td width="33%" style="font-family:'Helvetica Neue',Arial,sans-serif;text-align:center;padding:0 8px;border-left:1px solid #DDDDDD;border-right:1px solid #DDDDDD;">
                  <p style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#1E3A5F;">{{timeline}}</p>
                  <p style="margin:0;font-size:12px;color:#777777;text-transform:uppercase;letter-spacing:0.5px;">Timeline</p>
                </td>
                <td width="33%" style="font-family:'Helvetica Neue',Arial,sans-serif;text-align:center;padding:0 8px;">
                  <p style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#1E3A5F;">{{budget_range}}</p>
                  <p style="margin:0;font-size:12px;color:#777777;text-transform:uppercase;letter-spacing:0.5px;">Budget Range</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 40px 32px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 16px 0;font-size:15px;color:#444444;line-height:1.6;">
        If you have a similar project in mind — or are exploring options for upcoming construction work — I would be glad to walk you through what MDM Group can deliver.
      </p>
      ${ctaButton('View Full Project Details', '{{cta_url}}')}
    </td>
  </tr>
</table>
`);

// ---------------------------------------------------------------------------
// Template 2: video-intro
// ---------------------------------------------------------------------------

const videoIntroBody = wrapEmail(`
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:32px 40px 20px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">Hi {{first_name}},</p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        My name is {{sender_name}}, {{sender_title}} at MDM Group Inc. I put together a short video specifically for {{company_name}} — it covers who we are, what we build, and how we work.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px;" align="center">
      <a href="{{video_url}}" style="display:block;position:relative;text-decoration:none;">
        <img src="{{video_thumbnail_url}}" alt="Watch our introduction video" width="520" style="display:block;width:100%;max-width:520px;border-radius:4px;border:0;" />
        <table cellpadding="0" cellspacing="0" border="0" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);margin:0;">
          <tr>
            <td style="background-color:rgba(30,58,95,0.85);width:64px;height:64px;border-radius:50%;text-align:center;vertical-align:middle;">
              <span style="font-size:24px;color:#D4A843;line-height:64px;padding-left:4px;">&#9654;</span>
            </td>
          </tr>
        </table>
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 40px 32px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 16px 0;font-size:15px;color:#444444;line-height:1.6;">
        It is under two minutes. I would love to hear your thoughts and explore whether there is a fit for {{company_name}}.
      </p>
      ${ctaButton('Watch the Video', '{{video_url}}')}
    </td>
  </tr>
</table>
`);

// ---------------------------------------------------------------------------
// Template 3: capability-deck
// ---------------------------------------------------------------------------

const capabilityDeckBody = wrapEmail(`
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:32px 40px 20px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#D4A843;letter-spacing:1px;text-transform:uppercase;">GTA Construction Specialists</p>
      <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#1E3A5F;line-height:1.3;">Building Excellence in the GTA</h1>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">Hi {{first_name}},</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#444444;line-height:1.6;">
        MDM Group has been delivering construction excellence across the Greater Toronto Area for over a decade. Here is a sample of our recent work for {{company_name}} to consider.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px;">
      <table width="100%" cellpadding="0" cellspacing="8" border="0">
        <tr>
          <td width="33%" style="padding:0 4px 0 0;vertical-align:top;">
            <img src="{{project1_image}}" alt="Project 1" width="160" style="display:block;width:100%;border-radius:4px;border:0;" />
          </td>
          <td width="33%" style="padding:0 4px;vertical-align:top;">
            <img src="{{project2_image}}" alt="Project 2" width="160" style="display:block;width:100%;border-radius:4px;border:0;" />
          </td>
          <td width="33%" style="padding:0 0 0 4px;vertical-align:top;">
            <img src="{{project3_image}}" alt="Project 3" width="160" style="display:block;width:100%;border-radius:4px;border:0;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 40px 0 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;border-radius:4px;">
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#1E3A5F;text-transform:uppercase;letter-spacing:0.5px;">Our Divisions</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="50%" style="font-family:'Helvetica Neue',Arial,sans-serif;vertical-align:top;padding-right:12px;">
                  <p style="margin:0 0 8px 0;font-size:14px;color:#444444;line-height:1.5;">
                    <span style="color:#D4A843;font-weight:700;">&#8212;</span> General Contracting
                  </p>
                  <p style="margin:0 0 8px 0;font-size:14px;color:#444444;line-height:1.5;">
                    <span style="color:#D4A843;font-weight:700;">&#8212;</span> Residential Construction
                  </p>
                  <p style="margin:0 0 8px 0;font-size:14px;color:#444444;line-height:1.5;">
                    <span style="color:#D4A843;font-weight:700;">&#8212;</span> Wood &amp; Millwork
                  </p>
                </td>
                <td width="50%" style="font-family:'Helvetica Neue',Arial,sans-serif;vertical-align:top;padding-left:12px;">
                  <p style="margin:0 0 8px 0;font-size:14px;color:#444444;line-height:1.5;">
                    <span style="color:#D4A843;font-weight:700;">&#8212;</span> Telecom &amp; Electrical
                  </p>
                  <p style="margin:0 0 8px 0;font-size:14px;color:#444444;line-height:1.5;">
                    <span style="color:#D4A843;font-weight:700;">&#8212;</span> Property Management
                  </p>
                  <p style="margin:0 0 8px 0;font-size:14px;color:#444444;line-height:1.5;">
                    <span style="color:#D4A843;font-weight:700;">&#8212;</span> Design-Build
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 40px 32px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      ${ctaButton('View Our Full Portfolio', '{{cta_url}}')}
    </td>
  </tr>
</table>
`);

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
            <p style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#1E3A5F;">Why plan ahead with MDM Group?</p>
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
        MDM Group Inc. is expanding its trusted subcontractor network across the GTA, and we are looking for qualified {{trade_type}} partners to join us on upcoming commercial and residential projects.
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
// Template 6: follow-up-nudge
// ---------------------------------------------------------------------------

const followUpNudgeBody = wrapEmail(`
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:40px 40px 20px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">Hi {{first_name}},</p>
      <p style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.6;">
        I wanted to follow up on my previous note about MDM Group's construction services. I know your schedule is busy, so I will keep this short.
      </p>
      ${divider()}
    </td>
  </tr>
  <tr>
    <td style="padding:20px 40px;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;border-radius:4px;border-left:4px solid #D4A843;">
        <tr>
          <td style="padding:20px 24px;font-family:'Helvetica Neue',Arial,sans-serif;">
            <p style="margin:0 0 12px 0;font-size:14px;color:#1E3A5F;font-weight:700;">MDM Group at a Glance</p>
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
        Questions? Reply to this email or contact us at <a href="https://mdmcontracting.ca" style="color:#1E3A5F;text-decoration:underline;">mdmcontracting.ca</a>
      </p>
    </td>
  </tr>
</table>
`);

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

// ---------------------------------------------------------------------------
// Plain text versions
// ---------------------------------------------------------------------------

const projectShowcaseText = `Hi {{first_name}},

We recently completed a {{project_name}} — a {{project_type}} project — that I thought would be relevant to {{company_name}}.

Project Highlights:
- Size: {{sqft}} sq. ft.
- Timeline: {{timeline}}
- Budget Range: {{budget_range}}

If you have a similar project in mind, I would be glad to walk you through what MDM Group can deliver.

View full project details: {{cta_url}}

---
MDM Group Inc. | Mississauga, Ontario | mdmcontracting.ca
Unsubscribe: {{unsubscribe_url}}`;

const videoIntroText = `Hi {{first_name}},

My name is {{sender_name}}, {{sender_title}} at MDM Group Inc. I put together a short video specifically for {{company_name}} — it covers who we are, what we build, and how we work.

Watch the video (under 2 minutes): {{video_url}}

I would love to hear your thoughts and explore whether there is a fit for {{company_name}}.

---
MDM Group Inc. | Mississauga, Ontario | mdmcontracting.ca
Unsubscribe: {{unsubscribe_url}}`;

const capabilityDeckText = `Hi {{first_name}},

MDM Group has been delivering construction excellence across the Greater Toronto Area for over a decade.

Our Divisions:
- General Contracting
- Residential Construction
- Wood & Millwork
- Telecom & Electrical
- Property Management
- Design-Build

View our full portfolio: {{cta_url}}

---
MDM Group Inc. | Mississauga, Ontario | mdmcontracting.ca
Unsubscribe: {{unsubscribe_url}}`;

const seasonalOutreachText = `Hi {{first_name}},

{{season}} is the optimal time for {{project_type}} projects in the GTA. We have availability opening for {{company_name}} right now.

Why plan ahead with MDM Group?
- Lock in preferred pricing before seasonal rate increases
- Guaranteed project start date with written scope
- Access to our full crew capacity

Book a planning call: {{cta_url}}

---
MDM Group Inc. | Mississauga, Ontario | mdmcontracting.ca
Unsubscribe: {{unsubscribe_url}}`;

const tradePartnerInviteText = `Hi {{first_name}},

MDM Group Inc. is expanding its trusted subcontractor network across the GTA. We are looking for qualified {{trade_type}} partners for upcoming projects.

What we offer:
- Consistent project pipeline across 6 divisions
- Prompt, reliable payment (Net-30 standard)
- Long-term partnership potential

{{company_name}} looks like a strong fit. Apply to join our network: {{cta_url}}

---
MDM Group Inc. | Mississauga, Ontario | mdmcontracting.ca
Unsubscribe: {{unsubscribe_url}}`;

const followUpNudgeText = `Hi {{first_name}},

I wanted to follow up on my previous note about MDM Group's construction services.

MDM Group at a Glance:
- {{client_count}}+ clients served across the GTA
- {{years_in_business}}+ years building in Ontario
- 6 divisions: Contracting, Homes, Wood, Telecom, Management, Group Inc.

If there is any current or upcoming project at {{company_name}} where we could be helpful, I am ready to put together a no-obligation estimate.

Request a free estimate: {{cta_url}}

---
MDM Group Inc. | Mississauga, Ontario | mdmcontracting.ca
Unsubscribe: {{unsubscribe_url}}`;

const eventInvitationText = `Hi {{first_name}},

You are invited to {{event_name}}.

Date: {{event_date}}
Location: {{event_location}}

We would like to invite you and the team at {{company_name}} to join us. Space is limited.

RSVP here: {{rsvp_url}}

---
MDM Group Inc. | Mississauga, Ontario | mdmcontracting.ca
Unsubscribe: {{unsubscribe_url}}`;

const referralRequestText = `Hi {{first_name}},

Thank you for being a valued client of MDM Group. It has been a pleasure working with {{company_name}}.

We are currently taking on new clients and would greatly appreciate a referral if you know of any colleagues or business contacts who could benefit from our services.

Submit a referral: {{referral_url}}

Thank you for your continued trust in MDM Group Inc.

---
MDM Group Inc. | Mississauga, Ontario | mdmcontracting.ca
Unsubscribe: {{unsubscribe_url}}`;

// ---------------------------------------------------------------------------
// Exported template collection
// ---------------------------------------------------------------------------

export const BRANDED_TEMPLATES: BrandedTemplate[] = [
  {
    id: 'project-showcase',
    name: 'See Our Latest Work',
    category: 'outreach',
    description:
      'Showcases a completed MDM Group project with stats (sqft, timeline, budget) and a featured image. Best used for prospects in a similar vertical or geography.',
    subject: 'See What We Built for a Client Like {{company_name}}',
    body_html: projectShowcaseBody,
    body_text: projectShowcaseText,
    merge_fields: [
      'logo_url',
      'first_name',
      'company_name',
      'project_name',
      'project_type',
      'sqft',
      'timeline',
      'budget_range',
      'project_image_url',
      'cta_url',
      'unsubscribe_url',
    ],
  },
  {
    id: 'video-intro',
    name: 'A Quick Introduction from MDM Group',
    category: 'outreach',
    description:
      'Personalized video introduction with a clickable thumbnail and play button overlay. Ideal for warm outreach where a human connection matters.',
    subject: 'A quick video for {{first_name}} at {{company_name}}',
    body_html: videoIntroBody,
    body_text: videoIntroText,
    merge_fields: [
      'logo_url',
      'first_name',
      'company_name',
      'video_thumbnail_url',
      'video_url',
      'sender_name',
      'sender_title',
      'unsubscribe_url',
    ],
  },
  {
    id: 'capability-deck',
    name: 'Building Excellence in the GTA',
    category: 'outreach',
    description:
      'Mini portfolio with three project thumbnails and a division capabilities list. Good for top-of-funnel cold outreach where context is needed.',
    subject: 'Building Excellence in the GTA — MDM Group Overview',
    body_html: capabilityDeckBody,
    body_text: capabilityDeckText,
    merge_fields: [
      'logo_url',
      'first_name',
      'company_name',
      'project1_image',
      'project2_image',
      'project3_image',
      'cta_url',
      'unsubscribe_url',
    ],
  },
  {
    id: 'seasonal-outreach',
    name: 'Plan Your {{season}} Project',
    category: 'outreach',
    description:
      'Weather-aware seasonal outreach emphasizing urgency and early booking advantages. Set season to Spring, Summer, Fall, or Winter.',
    subject: 'Plan Your {{season}} {{project_type}} Project — MDM Group',
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
      'Invitation for subcontractors and trade partners to join the MDM Group network. Highlights pipeline access, payment terms, and long-term relationship potential.',
    subject: "An Invitation for {{company_name}} — MDM Group's Partner Network",
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
  {
    id: 'follow-up-nudge',
    name: 'Just Following Up',
    category: 'follow_up',
    description:
      'Short, respectful follow-up with social proof (client count, years in business). Clean layout with a single CTA. Best used 5-7 days after initial outreach.',
    subject: 'Following up — MDM Group for {{company_name}}',
    body_html: followUpNudgeBody,
    body_text: followUpNudgeText,
    merge_fields: [
      'logo_url',
      'first_name',
      'company_name',
      'client_count',
      'years_in_business',
      'cta_url',
      'unsubscribe_url',
    ],
  },
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
  {
    id: 'referral-request',
    name: 'Know Someone Who Could Use Our Help?',
    category: 'referral',
    description:
      'Referral request sent to existing satisfied clients. Warm, appreciative tone with a clear single CTA to submit a referral.',
    subject: 'A quick ask, {{first_name}} — do you know anyone we could help?',
    body_html: referralRequestBody,
    body_text: referralRequestText,
    merge_fields: [
      'logo_url',
      'first_name',
      'company_name',
      'referral_url',
      'unsubscribe_url',
    ],
  },
];

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

export function getTemplateById(id: string): BrandedTemplate | undefined {
  return BRANDED_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(
  category: BrandedTemplate['category'],
): BrandedTemplate[] {
  return BRANDED_TEMPLATES.filter((t) => t.category === category);
}
