import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { generatePdf } from '@/lib/pdf/generator';

const generateSchema = z.object({
  type: z.enum(['estimate', 'project-status']),
  data: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const buffer = await generatePdf(parsed.data.type, parsed.data.data);

    const filename = `${parsed.data.type}-${Date.now()}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    logger.error('PDF generation failed', { error, type: parsed.data.type });
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
