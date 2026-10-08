import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        return await proxyAuthorizedJson(
            `/api/products/${id}/public-link/regenerate`,
            { method: 'POST' },
            { fallbackError: 'Failed to regenerate public link' }
        );
    } catch (error) {
        console.error('Public link regenerate Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
