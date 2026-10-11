import { NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/bffAuth';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        if (!token) {
            return NextResponse.json({ message: 'Token is required' }, { status: 400 });
        }

        const url = `${getBackendApiUrl()}/api/feedbacks/invite/${encodeURIComponent(token)}/meta`;
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMessage = data.error || data.message || 'Feedback link not active';
            return NextResponse.json({ message: errorMessage }, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Invite feedback meta Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
