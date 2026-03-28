/**
 * KrewPact — Portfolio outreach templates.
 * Templates: project-showcase, video-intro, capability-deck
 */

import { BrandedTemplate, ctaButton, wrapEmail } from './shared';

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
        If you have a similar project in mind — or are exploring options for upcoming construction work — I would be glad to walk you through what KrewPact can deliver.
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
        My name is {{sender_name}}, {{sender_title}} at KrewPact I put together a short video specifically for {{company_name}} — it covers who we are, what we build, and how we work.
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
        KrewPact has been delivering construction excellence across the Greater Toronto Area for over a decade. Here is a sample of our recent work for {{company_name}} to consider.
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
// Plain text versions
// ---------------------------------------------------------------------------

const projectShowcaseText = `Hi {{first_name}},

We recently completed a {{project_name}} — a {{project_type}} project — that I thought would be relevant to {{company_name}}.

Project Highlights:
- Size: {{sqft}} sq. ft.
- Timeline: {{timeline}}
- Budget Range: {{budget_range}}

If you have a similar project in mind, I would be glad to walk you through what KrewPact can deliver.

View full project details: {{cta_url}}

---
KrewPact | krewpact.com
Unsubscribe: {{unsubscribe_url}}`;

const videoIntroText = `Hi {{first_name}},

My name is {{sender_name}}, {{sender_title}} at KrewPact I put together a short video specifically for {{company_name}} — it covers who we are, what we build, and how we work.

Watch the video (under 2 minutes): {{video_url}}

I would love to hear your thoughts and explore whether there is a fit for {{company_name}}.

---
KrewPact | krewpact.com
Unsubscribe: {{unsubscribe_url}}`;

const capabilityDeckText = `Hi {{first_name}},

KrewPact has been delivering construction excellence across the Greater Toronto Area for over a decade.

Our Divisions:
- General Contracting
- Residential Construction
- Wood & Millwork
- Telecom & Electrical
- Property Management
- Design-Build

View our full portfolio: {{cta_url}}

---
KrewPact | krewpact.com
Unsubscribe: {{unsubscribe_url}}`;

// ---------------------------------------------------------------------------
// Exported templates
// ---------------------------------------------------------------------------

export const OUTREACH_PORTFOLIO_TEMPLATES: BrandedTemplate[] = [
  {
    id: 'project-showcase',
    name: 'See Our Latest Work',
    category: 'outreach',
    description:
      'Showcases a completed KrewPact project with stats (sqft, timeline, budget) and a featured image. Best used for prospects in a similar vertical or geography.',
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
    name: 'A Quick Introduction from KrewPact',
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
    subject: 'Building Excellence in the GTA — KrewPact Overview',
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
];
