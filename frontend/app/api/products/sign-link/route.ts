import { NextResponse } from 'next/server';
import { authorizedBackendFetch } from '@/lib/bffAuth';
import { signParams } from '@/lib/crypto';

export async function POST(request: Request) {
    try {
        const { response, unauthorized, applyAuthCookies } = await authorizedBackendFetch(
            '/api/auth/me'
        );

        if (unauthorized || !response || !response.ok) {
            const errorResponse = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
            applyAuthCookies(errorResponse);
            return errorResponse;
        }

        const userData = await response.json();
        const userId = userData.id;

        const body = await request.json();
        const { productId, industry } = body;

        if (!productId || !industry) {
            const errorResponse = NextResponse.json(
                { message: 'Missing required parameters' },
                { status: 400 }
            );
            applyAuthCookies(errorResponse);
            return errorResponse;
        }

        const signature = signParams({ productId, userId, industry });
        const nextResponse = NextResponse.json({ signature, userId });
        applyAuthCookies(nextResponse);
        return nextResponse;
    } catch (error) {
        console.error('Signing Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
