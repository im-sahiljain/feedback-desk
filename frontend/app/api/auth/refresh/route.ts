import { NextResponse } from 'next/server';
import { getBackendApiUrl, getBffTokens, setBffCookies, clearBffCookies } from '@/lib/bffAuth';

export async function POST() {
    try {
        const { refreshToken } = await getBffTokens();

        if (!refreshToken) {
            const errorResponse = NextResponse.json({ message: 'No refresh token provided' }, { status: 401 });
            clearBffCookies(errorResponse);
            return errorResponse;
        }

        const response = await fetch(`${getBackendApiUrl()}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            const errorResponse = NextResponse.json({ message: 'Session expired. Please log in again.' }, { status: 401 });
            clearBffCookies(errorResponse);
            return errorResponse;
        }

        const data = await response.json();
        const nextResponse = NextResponse.json({ success: true }, { status: 200 });

        setBffCookies(nextResponse, {
            accessToken: data.accessToken || data.token,
            refreshToken: data.refreshToken,
        });

        return nextResponse;
    } catch (error) {
        console.error('Refresh Token Proxy Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
