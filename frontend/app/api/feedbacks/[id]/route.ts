import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ message: 'Feedback ID is required' }, { status: 400 });
        }

        return await proxyAuthorizedJson(
            `/api/feedbacks/${encodeURIComponent(id)}`,
            undefined,
            { fallbackError: 'Failed to fetch feedback details' }
        );
    } catch (error) {
        console.error('Feedback details GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
