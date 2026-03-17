import { describe, expect, it } from 'vitest';

import { generatePdf } from '@/lib/pdf/generator';

describe('generatePdf', () => {
  it('generates an estimate PDF buffer', async () => {
    const data = {
      companyName: 'MDM Group Inc.',
      estimateNumber: 'EST-001',
      date: '2026-03-01',
      client: {
        name: 'Acme Corp',
        address: '123 Main St, Toronto, ON',
        email: 'acme@example.com',
      },
      lineItems: [
        {
          description: 'Drywall installation',
          quantity: 100,
          unit: 'sqft',
          unitCost: 5.0,
          markup: 10,
        },
        { description: 'Painting', quantity: 200, unit: 'sqft', unitCost: 3.5, markup: 15 },
      ],
      subtotal: 1200,
      markupTotal: 175,
      taxRate: 13,
      taxAmount: 178.75,
      total: 1553.75,
      terms: 'Net 30. Valid for 30 days.',
    };

    const buffer = await generatePdf('estimate', data);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF magic bytes: %PDF
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('generates a project status PDF buffer', async () => {
    const data = {
      companyName: 'MDM Group Inc.',
      project: {
        name: 'Office Renovation',
        code: 'PRJ-001',
        status: 'in_progress',
        startDate: '2026-01-15',
        endDate: '2026-06-15',
      },
      milestones: [
        { name: 'Foundation', progress: 100, dueDate: '2026-02-01' },
        { name: 'Framing', progress: 75, dueDate: '2026-03-15' },
        { name: 'Finishing', progress: 0, dueDate: '2026-05-01' },
      ],
      taskSummary: {
        total: 42,
        completed: 18,
        inProgress: 12,
        overdue: 3,
      },
      recentLogs: [
        { date: '2026-03-08', author: 'John Smith', summary: 'Completed framing on level 2' },
        { date: '2026-03-07', author: 'Jane Doe', summary: 'Electrical rough-in started' },
      ],
    };

    const buffer = await generatePdf('project-status', data);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('throws on unknown template type', async () => {
    await expect(generatePdf('unknown' as never, {})).rejects.toThrow('Unknown PDF template');
  });
});
