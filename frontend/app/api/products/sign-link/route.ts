import { NextResponse } from 'next/server';
import { getBackendApiUrl, getBffTokens } from '@/lib/bffAuth';
import { signParams } from '@/lib/crypto';

export async function POST(request: Request) {
    try {
        const { accessToken } = await getBffTokens();

        if (!accessToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Get user from backend using token
        const userResponse = await fetch(`${getBackendApiUrl()}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!userResponse.ok) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        const body = await request.json();
        const { productId, industry } = body;

        if (!productId || !industry) {
            return NextResponse.json(
                { message: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const signature = signParams({ productId, userId, industry });

        return NextResponse.json({ signature, userId });

    } catch (error) {
        console.error('Signing Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
