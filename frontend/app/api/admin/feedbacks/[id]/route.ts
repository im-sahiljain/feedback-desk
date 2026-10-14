import { NextRequest, NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        return await proxyAuthorizedJson(
            `/api/admin/feedbacks/${encodeURIComponent(id)}`,
            {
                method: 'PATCH',
                body: JSON.stringify(body),
            },
            { fallbackError: 'Failed to update feedback item' }
        );
    } catch (error) {
        console.error('Admin Feedback PATCH Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
