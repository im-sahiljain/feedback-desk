import { NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/bffAuth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        if (!token) {
            return NextResponse.json({ message: 'Token is required' }, { status: 400 });
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
        }

        const url = `${getBackendApiUrl()}/api/feedbacks/invite/${encodeURIComponent(token)}/submit`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMessage = data.error || data.message || 'Failed to submit feedback';
            return NextResponse.json({ message: errorMessage }, { status: response.status });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('Invite feedback submit Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
