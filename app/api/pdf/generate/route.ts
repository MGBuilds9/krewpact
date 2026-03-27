import { NextResponse } from 'next/server';
import { z } from 'zod';

import { serverError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { generatePdf } from '@/lib/pdf/generator';

const generateSchema = z.object({
  type: z.enum(['estimate', 'project-status']),
  data: z.record(z.string(), z.unknown()),
});

export const POST = withApiRoute(
  { bodySchema: generateSchema, rateLimit: { limit: 30, window: '1 m' } },
  async ({ body }) => {
    const { type, data } = body as z.infer<typeof generateSchema>;

    try {
      const buffer = await generatePdf(type, data);
      const filename = `${type}-${Date.now()}.pdf`;
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(buffer.length),
        },
      });
    } catch (error) {
      logger.error('PDF generation failed', { error, type });
      throw serverError('PDF generation failed');
    }
  },
);
