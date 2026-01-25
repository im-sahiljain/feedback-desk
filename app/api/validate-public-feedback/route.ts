import { NextResponse } from 'next/server';
import { INDUSTRY_LABELS } from '@/types';
import { verifyParams } from '@/lib/crypto';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productId, userId, industry, signature } = body;

        // 1. Basic Parameter Presence Check
        if (!productId || !userId || !industry || !signature) {
            return NextResponse.json(
                { valid: false, message: 'Missing required parameters or signature' },
                { status: 400 }
            );
        }

        // 2. Signature Verification (HMAC)
        // Verify that the parameters match the signature using the secret key
        const isValidSignature = verifyParams({ productId, userId, industry }, signature);

        if (!isValidSignature) {
            return NextResponse.json(
                { valid: false, message: 'Invalid or tampered link' },
                { status: 403 }
            );
        }

        // 3. Industry Validation (Optional but good for type safety on frontend)
        // Since signature matches, we know the industry was set by admin.
        // But for extra safety we can still check if it's a known industry key/value.

        const validIndustryKeys = Object.keys(INDUSTRY_LABELS);
        const validIndustryValues = Object.values(INDUSTRY_LABELS).map(v => v.toLowerCase());
        const industryLower = industry.toLowerCase();

        const isValidIndustry = validIndustryKeys.includes(industryLower) || validIndustryValues.includes(industryLower);

        if (!isValidIndustry) {
            return NextResponse.json(
                { valid: false, message: 'Invalid Industry' },
                { status: 400 }
            );
        }

        // Return success
        return NextResponse.json({ valid: true });

    } catch (error) {
        console.error('Validation Error:', error);
        return NextResponse.json(
            { valid: false, message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
