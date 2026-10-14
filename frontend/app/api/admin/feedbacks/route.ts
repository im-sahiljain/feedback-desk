import { NextRequest, NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams.toString();
        const path = searchParams ? `/api/admin/feedbacks?${searchParams}` : '/api/admin/feedbacks';
        return await proxyAuthorizedJson(path, undefined, {
            fallbackError: 'Failed to fetch platform feedbacks',
        });
    } catch (error) {
        console.error('Admin Feedbacks GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
