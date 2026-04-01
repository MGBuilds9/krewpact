import { describe, expect, it } from 'vitest';
import { brandingSchema } from '@/lib/validators/branding';

describe('BoldSign per-tenant branding', () => {
  it('brandingSchema accepts boldsign_brand_id', () => {
    const result = brandingSchema.safeParse({
      company_name: 'Test Co',
      boldsign_brand_id: 'brand_abc123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.boldsign_brand_id).toBe('brand_abc123');
    }
  });

  it('brandingSchema allows empty boldsign_brand_id', () => {
    const result = brandingSchema.safeParse({
      company_name: 'Test Co',
      boldsign_brand_id: '',
    });
    expect(result.success).toBe(true);
  });

  it('brandingSchema omits boldsign_brand_id when not provided', () => {
    const result = brandingSchema.safeParse({ company_name: 'Test Co' });
    expect(result.success).toBe(true);
  });
});
