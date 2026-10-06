import { NextResponse } from 'next/server';
import { getBackendApiUrl, getBffTokens } from '@/lib/bffAuth';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { accessToken } = await getBffTokens();

        if (!accessToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const response = await fetch(`${getBackendApiUrl()}/api/products/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            let errorMessage = 'Failed to update product';
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
            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Products PUT Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { accessToken } = await getBffTokens();

        if (!accessToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const response = await fetch(`${getBackendApiUrl()}/api/products/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            let errorMessage = 'Failed to delete product';
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
            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Products DELETE Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
