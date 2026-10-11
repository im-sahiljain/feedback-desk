import { NextResponse } from 'next/server';
import { getBackendApiUrl } from '@/lib/bffAuth';

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ message: 'Product identifier is required' }, { status: 400 });
        }

        const url = `${getBackendApiUrl()}/api/feedbacks/scan/${encodeURIComponent(id)}/dispense`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMessage = data.error || data.message || 'Failed to dispense feedback link';
            return NextResponse.json({ message: errorMessage }, { status: response.status });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('Counter QR dispense error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
