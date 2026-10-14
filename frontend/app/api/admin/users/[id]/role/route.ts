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
            `/api/admin/users/${encodeURIComponent(id)}/role`,
            {
                method: 'PATCH',
                body: JSON.stringify(body),
            },
            { fallbackError: 'Failed to update user role' }
        );
    } catch (error) {
        console.error('Admin User Role PATCH Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
