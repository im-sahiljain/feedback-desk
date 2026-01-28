import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        // Fetch user from backend using token
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const userData = await response.json();
        return NextResponse.json({ user: userData }, { status: 200 });

    } catch (error) {
        console.error('Auth Me Error:', error);
        return NextResponse.json({ user: null }, { status: 500 });
    }
}
