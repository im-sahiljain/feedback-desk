import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET() {
    try {
        return await proxyAuthorizedJson('/api/admin/audit-logs', undefined, {
            fallbackError: 'Failed to fetch platform audit logs',
        });
    } catch (error) {
        console.error('Admin Audit Logs GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
