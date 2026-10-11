import { NextResponse } from 'next/server';
import { getBackendApiUrl, setBffCookies } from '@/lib/bffAuth';

export async function POST(request: Request) {
    try {
        const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
        const userAgent = request.headers.get('user-agent') || '';

        const response = await fetch(`${getBackendApiUrl()}/api/auth/demo-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-forwarded-for': clientIp,
                'user-agent': userAgent,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { message: data.error || data.message || 'Unable to start demo session' },
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
        console.error('Demo Login Proxy Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
