import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const response = await fetch(`${API_BASE_URL}/api/products`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: 'Failed to fetch products' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Products GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // console.log("body", body);

        // Transform the body to match backend requirements
        // Backend expects: { name, industry, description, categories: string[] }
        const backendPayload = {
            name: body.name,
            industry: body.industry,
            description: body.description,
            categories: body.config?.categories || body.categories || [],
        };

        const response = await fetch(`${API_BASE_URL}/api/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(backendPayload),
        });

        if (!response.ok) {
            let errorMessage = 'Failed to create product';
            try {
                const error = await response.json();
                // console.log("Backend Error Response:", JSON.stringify(error, null, 2));
                errorMessage = error.message || errorMessage;
            } catch (e) {
                console.error("Failed to parse backend error json:", e);
                const text = await response.text();
                // console.log("Backend Error Text:", text);
            }

            return NextResponse.json(
                { message: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Products POST Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
