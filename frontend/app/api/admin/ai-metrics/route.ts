import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET() {
    try {
        return await proxyAuthorizedJson('/api/admin/ai-metrics', undefined, {
            fallbackError: 'Failed to fetch AI engine metrics',
        });
    } catch (error) {
        console.error('Admin AI Metrics GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
