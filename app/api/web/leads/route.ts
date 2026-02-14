import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Schema for incoming lead data
const leadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    companyName: z.string().optional(), // Fallback to name if generic
    message: z.string().optional(),
    projectType: z.string().optional(), // Mapped from 'service'
    role: z.string().optional(), // Mapped from 'position'
    source: z.string().default('website_inbound'),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        // 1. Security Check
        const signature = req.headers.get('x-webhook-secret');
        const secret = process.env.WEBHOOK_SIGNING_SECRET;

        if (!secret || signature !== secret) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid or missing secret' },
                { status: 401 }
            );
        }

        // 2. Parse & Validate Body
        const body = await req.json();
        const result = leadSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation Failed', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const data = result.data;

        // 3. Init Supabase Admin
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase credentials');
            return NextResponse.json(
                { error: 'Server Configuration Error' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 4. Insert Logic
        // Strategy: Create Lead -> Create Contact

        // Default company name if missing (common for B2C/Sole props)
        const company = data.companyName || `${data.name}'s Company`;

        // A. Insert Lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .insert({
                company_name: company,
                source_channel: data.source,
                status: 'new',
                project_description: data.message,
                project_type: data.projectType,
                utm_source: data.utm_source,
                utm_medium: data.utm_medium,
                utm_campaign: data.utm_campaign,
                // domain: extractDomain(data.email) // Optional enhancement
            })
            .select('id')
            .single();

        if (leadError) {
            console.error('Lead Insert Error:', leadError);
            return NextResponse.json(
                { error: 'Failed to create lead', details: leadError.message },
                { status: 500 }
            );
        }

        // B. Insert Contact
        // Split name strictly for storage
        const nameParts = data.name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        const { error: contactError } = await supabase
            .from('contacts')
            .insert({
                lead_id: lead.id,
                full_name: data.name,
                first_name: firstName,
                last_name: lastName,
                email: data.email,
                phone: data.phone,
                title: data.role,
                is_primary: true
            });

        if (contactError) {
            console.error('Contact Insert Error:', contactError);
            // Non-fatal, return success with warning or just log
        }

        return NextResponse.json({
            success: true,
            lead_id: lead.id,
            message: 'Lead captured successfully'
        });

    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error', details: err.message },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({ status: 'active', service: 'krewpact-lead-intake' });
}
