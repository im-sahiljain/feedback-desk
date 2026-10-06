import { NextResponse } from 'next/server';
import { verifyParams } from '@/lib/crypto';
import { getBackendApiUrl } from '@/lib/bffAuth';

export async function POST(request: Request) {
    try {
        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
        }

        if (!body || typeof body !== 'object') {
            return NextResponse.json({ message: 'Request body must be an object' }, { status: 400 });
        }

        const productId = body.productId ?? body.product_id;
        const userId = body.userId ?? body.user_id;
        const industry = body.industry;
        const signature = body.signature ?? body.sig;
        const feedbackText = typeof body.feedback === 'string' ? body.feedback.trim() : '';

        // 1. Parameter presence validation
        if (!productId || !userId || !industry || !signature) {
            return NextResponse.json(
                { message: 'Missing required validation parameters or signature' },
                { status: 400 }
            );
        }

        if (!feedbackText) {
            return NextResponse.json(
                { message: 'Feedback text is required' },
                { status: 400 }
            );
        }

        // 2. Server-side HMAC Signature Verification
        const isValidSignature = verifyParams(
            { productId, userId, industry },
            String(signature)
        );

        if (!isValidSignature) {
            return NextResponse.json(
                { message: 'Invalid or tampered feedback link signature' },
                { status: 403 }
            );
        }

        // 3. Prepare payload using the validated product identifier and signature
        const backendPayload = {
            product_id: String(productId),
            user_id: String(userId),
            industry: String(industry),
            signature: String(signature),
            feedback: feedbackText,
            email: body.email ? String(body.email).trim() : '',
            rating: body.rating !== undefined && body.rating !== null && !isNaN(Number(body.rating)) ? Number(body.rating) : 0,
        };

        const response = await fetch(`${getBackendApiUrl()}/api/feedbacks/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(backendPayload),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error(`Backend feedback submission failed with status code ${response.status}`);

            let errorMessage = 'Failed to submit feedback';
            try {
                const parsed = JSON.parse(errorText);
                if (parsed.error && typeof parsed.error === 'string') {
                    errorMessage = parsed.error;
                } else if (parsed.message && typeof parsed.message === 'string') {
                    errorMessage = parsed.message;
                }
            } catch {
                // Keep default error message
            }

            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('Feedback Submit Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
