/**
 * Tests for lib/validators/portal-survey.ts
 */
import { describe, expect, it } from 'vitest';

import { surveySubmissionSchema } from '@/lib/validators/portal-survey';

const valid = {
  overall_rating: 5,
  communication_rating: 4,
  quality_rating: 3,
  schedule_rating: 2,
  comments: 'Great experience.',
  would_recommend: true,
};

describe('surveySubmissionSchema', () => {
  it('accepts a valid full submission', () => {
    const result = surveySubmissionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts submission without optional comments', () => {
    const { comments: _c, ...withoutComments } = valid;
    const result = surveySubmissionSchema.safeParse(withoutComments);
    expect(result.success).toBe(true);
  });

  it('rejects ratings below 1', () => {
    const result = surveySubmissionSchema.safeParse({ ...valid, overall_rating: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects ratings above 5', () => {
    const result = surveySubmissionSchema.safeParse({ ...valid, communication_rating: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer ratings', () => {
    const result = surveySubmissionSchema.safeParse({ ...valid, quality_rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it('rejects comments exceeding 2000 chars', () => {
    const result = surveySubmissionSchema.safeParse({
      ...valid,
      comments: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing would_recommend', () => {
    const { would_recommend: _wr, ...missing } = valid;
    const result = surveySubmissionSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });
});
