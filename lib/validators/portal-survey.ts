import { z } from 'zod';

export const surveySubmissionSchema = z.object({
  overall_rating: z.number().int().min(1).max(5),
  communication_rating: z.number().int().min(1).max(5),
  quality_rating: z.number().int().min(1).max(5),
  schedule_rating: z.number().int().min(1).max(5),
  comments: z.string().max(2000).optional(),
  would_recommend: z.boolean(),
});

export type SurveySubmission = z.infer<typeof surveySubmissionSchema>;
