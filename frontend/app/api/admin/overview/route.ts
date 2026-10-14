import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET() {
    try {
        return await proxyAuthorizedJson('/api/admin/overview', undefined, {
            fallbackError: 'Failed to fetch platform overview metrics',
        });
    } catch (error) {
        console.error('Admin Overview GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
