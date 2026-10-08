import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        return await proxyAuthorizedJson(`/api/products/${id}/public-link`, undefined, {
            fallbackError: 'Failed to fetch public link',
        });
    } catch (error) {
        console.error('Public link GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
