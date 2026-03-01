import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/web/leads/route';
import { NextRequest } from 'next/server';

// Mock division router
vi.mock('@/lib/crm/division-router', () => ({
    routeToDivision: vi.fn(() => 'contracting'),
    resolveDivisionId: vi.fn(() => Promise.resolve('div-001')),
}));

// Mock Supabase
const mockSupabase = {
    from: vi.fn((_table: string): Record<string, unknown> => ({
        insert: vi.fn(),
        select: vi.fn(),
        single: vi.fn(),
    })),
};

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabase),
}));

describe('Lead Intake API (/api/web/leads)', () => {
    const SECRET = 'test-secret';

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.WEBHOOK_SIGNING_SECRET = SECRET;
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    });

    function createRequest(body: Record<string, unknown>, secret: string | null = SECRET) {
        const headers = new Headers();
        headers.set('content-type', 'application/json');
        if (secret) headers.set('x-webhook-secret', secret);

        return new NextRequest('http://localhost/api/web/leads', {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
    }

    it('should reject requests without a secret header', async () => {
        const req = createRequest({ name: 'Test', email: 'test@example.com' }, null);
        const res = await POST(req);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toMatch(/unauthorized/i);
    });

    it('should reject requests with an invalid secret', async () => {
        const req = createRequest({ name: 'Test', email: 'test@example.com' }, 'wrong-secret');
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should validate required fields (Zod: name, email)', async () => {
        const req = createRequest({ name: '', email: 'not-an-email' }); // Invalid
        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('Validation Failed');
        expect(json.details.fieldErrors.name).toBeDefined();
        expect(json.details.fieldErrors.email).toBeDefined();
    });

    it('should successfully create a lead and contact (Happy Path)', async () => {
        // Mock Supabase Chains
        const mockInsertLead = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                    data: { id: 'lead-123' },
                    error: null
                })
            })
        });

        const mockInsertContact = vi.fn().mockResolvedValue({ error: null });

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'leads') return { insert: mockInsertLead };
            if (table === 'contacts') return { insert: mockInsertContact };
            return {};
        });

        const payload = {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '555-0123',
            message: 'I need a quote',
            projectType: 'Renovation',
            source: 'website_form'
        };

        const req = createRequest(payload);
        const res = await POST(req);

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.lead_id).toBe('lead-123');

        // Verify Lead Insert
        expect(mockInsertLead).toHaveBeenCalledWith(expect.objectContaining({
            company_name: "John Doe's Company", // Default title logic
            status: 'new',
            project_description: 'I need a quote',
            project_type: 'Renovation'
        }));

        // Verify Contact Insert
        expect(mockInsertContact).toHaveBeenCalledWith(expect.objectContaining({
            lead_id: 'lead-123',
            full_name: 'John Doe',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
        }));
    });

    it('should handle database errors gracefully', async () => {
        // Mock DB Error
        mockSupabase.from.mockReturnValue({
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'DB Connection Failed' }
                    })
                })
            })
        });

        const req = createRequest({ name: 'Test', email: 'test@example.com' });
        const res = await POST(req);

        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toMatch(/failed to create lead/i);
    });
});
