import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signParams } from '@/lib/crypto';

export async function POST(request: Request) {
    try {
        // Authenticate the user (Admin only)
        // We check for the token cookie as done in other routes
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { productId, userId, industry } = body;

        if (!productId || !userId || !industry) {
            return NextResponse.json(
                { message: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const signature = signParams({ productId, userId, industry });

        return NextResponse.json({ signature });

    } catch (error) {
        console.error('Signing Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
