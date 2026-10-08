import { NextResponse } from 'next/server';
import { proxyAuthorizedJson } from '@/lib/bffAuth';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        return await proxyAuthorizedJson(
            `/api/products/${id}`,
            {
                method: 'PUT',
                body: JSON.stringify(body),
            },
            { fallbackError: 'Failed to update product' }
        );
    } catch (error) {
        console.error('Products PUT Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        return await proxyAuthorizedJson(
            `/api/products/${id}`,
            { method: 'DELETE' },
            { fallbackError: 'Failed to delete product' }
        );
    } catch (error) {
        console.error('Products DELETE Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
