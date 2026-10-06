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

        const response = await fetch(
            `${getBackendApiUrl()}/api/feedbacks/public/${encodeURIComponent(token)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            let errorMessage = 'Failed to submit feedback';
            try {
                const parsed = JSON.parse(errorText);
                if (parsed.error && typeof parsed.error === 'string') {
                    errorMessage = parsed.error;
                } else if (parsed.message && typeof parsed.message === 'string') {
                    errorMessage = parsed.message;
                }
            } catch {
                // keep default
            }
            return NextResponse.json({ message: errorMessage }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data, { status: response.status === 200 ? 200 : 201 });
    } catch (error) {
        console.error('Public feedback submit Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
