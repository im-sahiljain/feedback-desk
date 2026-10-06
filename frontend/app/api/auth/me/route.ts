import { NextResponse } from 'next/server';
import { getBackendApiUrl, getBffTokens, setBffCookies, clearBffCookies } from '@/lib/bffAuth';

export async function GET() {
    try {
        let { accessToken: token, refreshToken } = await getBffTokens();

        if (!token && !refreshToken) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        let newTokens: any = null;
        const API_BASE_URL = getBackendApiUrl();

        // If no active access token but refresh token exists, attempt refresh first
        if (!token && refreshToken) {
            const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
                newTokens = await refreshRes.json();
                token = newTokens.accessToken || newTokens.token;
            } else {
                const errorRes = NextResponse.json({ user: null }, { status: 401 });
                clearBffCookies(errorRes);
                return errorRes;
            }
        }

        let response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        // If access token expired during request, attempt silent refresh
        if (response.status === 401 && refreshToken && !newTokens) {
            const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
                newTokens = await refreshRes.json();
                token = newTokens.accessToken || newTokens.token;

                // Retry /api/auth/me with new token
                response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
            }
        }

        if (!response.ok) {
            const errorRes = NextResponse.json({ user: null }, { status: 401 });
            clearBffCookies(errorRes);
            return errorRes;
        }

        const userData = await response.json();
        const nextResponse = NextResponse.json({ user: userData }, { status: 200 });

        if (newTokens) {
            setBffCookies(nextResponse, {
                accessToken: newTokens.accessToken || newTokens.token,
                refreshToken: newTokens.refreshToken,
            });
        }

        return nextResponse;
    } catch (error) {
        console.error('Auth Me Error:', error);
        return NextResponse.json({ user: null }, { status: 500 });
    }
}
