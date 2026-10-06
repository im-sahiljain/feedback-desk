import { NextResponse } from 'next/server';
import { getBackendApiUrl, setBffCookies } from '@/lib/bffAuth';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const response = await fetch(`${getBackendApiUrl()}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { message: data.message || data.error || 'Failed to send verification code' },
                { status: response.status }
            );
        }

        const nextResponse = NextResponse.json(data, { status: 200 });

        if (data.accessToken || data.token) {
            setBffCookies(nextResponse, {
                accessToken: data.accessToken || data.token,
                refreshToken: data.refreshToken,
            });
        }

        return nextResponse;
    } catch (error) {
        console.error('Login Proxy Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
