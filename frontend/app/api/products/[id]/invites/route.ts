import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const query = searchParams.toString();
        const targetPath = query ? `/api/products/${id}/invites?${query}` : `/api/products/${id}/invites`;

        return await proxyAuthorizedJson(targetPath, undefined, {
            fallbackError: 'Failed to fetch single-use invitations',
        });
    } catch (error) {
        console.error('Invites GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        let body: unknown = {};
        try {
            body = await request.json();
        } catch {
            body = {};
        }

        return await proxyAuthorizedJson(
            `/api/products/${id}/invites`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            },
            {
                fallbackError: 'Failed to generate single-use invitation link',
            }
        );
    } catch (error) {
        console.error('Invites POST Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
