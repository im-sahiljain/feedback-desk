import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const industry = searchParams.get('industry');

        return await proxyAuthorizedJson(
            `/api/products/labels?industry=${encodeURIComponent(industry || '')}`,
            undefined,
            { fallbackError: 'Failed to fetch labels' }
        );
    } catch (error) {
        console.error('Labels GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
