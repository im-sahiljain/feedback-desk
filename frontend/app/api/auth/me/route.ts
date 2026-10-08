import { NextResponse } from 'next/server';
import { authorizedBackendFetch } from '@/lib/bffAuth';

export async function GET() {
    try {
        const { response, unauthorized, applyAuthCookies } = await authorizedBackendFetch(
            '/api/auth/me'
        );

        if (unauthorized || !response || !response.ok) {
            const errorRes = NextResponse.json({ user: null }, { status: 401 });
            applyAuthCookies(errorRes);
            return errorRes;
        }

        const userData = await response.json();
        const nextResponse = NextResponse.json({ user: userData }, { status: 200 });
        applyAuthCookies(nextResponse);
        return nextResponse;
    } catch (error) {
        console.error('Auth Me Error:', error);
        return NextResponse.json({ user: null }, { status: 500 });
    }
}
