import { NextResponse } from 'next/server';
import { getBackendApiUrl, getBffTokens, clearBffCookies } from '@/lib/bffAuth';

export async function POST() {
    try {
        const { accessToken, refreshToken } = await getBffTokens();

        if (refreshToken || accessToken) {
            await fetch(`${getBackendApiUrl()}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({ refreshToken }),
            }).catch(() => {});
        }

        const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
        clearBffCookies(response);
        return response;
    } catch {
        const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
        clearBffCookies(response);
        return response;
    }
}
