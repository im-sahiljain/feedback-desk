import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET() {
    try {
        return await proxyAuthorizedJson('/api/admin/users', undefined, {
            fallbackError: 'Failed to fetch platform users',
        });
    } catch (error) {
        console.error('Admin Users GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
