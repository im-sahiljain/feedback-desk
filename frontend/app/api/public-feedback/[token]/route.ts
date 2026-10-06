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

        const response = await fetch(
            `${getBackendApiUrl()}/api/feedbacks/public/${encodeURIComponent(token)}/meta`,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { message: errData.error || errData.message || 'Feedback link not found' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Public feedback meta Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
