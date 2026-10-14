import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET() {
    try {
        return await proxyAuthorizedJson('/api/admin/distribution', undefined, {
            fallbackError: 'Failed to fetch distribution metrics',
        });
    } catch (error) {
        console.error('Admin Distribution GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
