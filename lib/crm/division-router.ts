/**
 * Division routing for incoming leads.
 * Pure functions — no database or auth dependencies.
 */

interface DivisionRouting {
  divisionCode: string;
  keywords: string[];
}

const DIVISION_ROUTES: DivisionRouting[] = [
  {
    divisionCode: 'homes',
    keywords: [
      'home',
      'house',
      'residential',
      'renovation',
      'condo',
      'apartment',
      'townhouse',
      'basement',
      'kitchen remodel',
      'bathroom remodel',
    ],
  },
  {
    divisionCode: 'wood',
    keywords: [
      'cabinet',
      'millwork',
      'wood',
      'furniture',
      'carpentry',
      'custom woodwork',
      'vanity',
      'shelving',
    ],
  },
  {
    divisionCode: 'telecom',
    keywords: [
      'telecom',
      'electrical',
      'wiring',
      'data',
      'fiber',
      'cable',
      'network',
      'low voltage',
      'structured cabling',
    ],
  },
  {
    divisionCode: 'contracting',
    keywords: [
      'medical',
      'pharmacy',
      'clinic',
      'healthcare',
      'restaurant',
      'retail',
      'commercial',
      'office',
      'dental',
      'optometry',
      'veterinary',
      'spa',
      'salon',
    ],
  },
];

const DEFAULT_DIVISION = 'contracting';

interface LeadFields {
  project_type?: string | null;
  project_description?: string | null;
  industry?: string | null;
  company_name?: string | null;
}

export function routeToDivision(lead: LeadFields): string {
  const searchText = [
    lead.project_type,
    lead.project_description,
    lead.industry,
    lead.company_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!searchText) return DEFAULT_DIVISION;

  for (const route of DIVISION_ROUTES) {
    for (const keyword of route.keywords) {
      if (searchText.includes(keyword)) {
        return route.divisionCode;
      }
    }
  }

  return DEFAULT_DIVISION;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = { from: (...args: any[]) => any };

export async function resolveDivisionId(
  supabase: SupabaseClient,
  divisionCode: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('divisions')
    .select('id')
    .eq('code', divisionCode)
    .limit(1)
    .single();

  return data?.id ?? null;
}
