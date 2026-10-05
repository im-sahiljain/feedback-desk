import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signParams } from '@/lib/crypto';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Get user from backend using token
        const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
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
