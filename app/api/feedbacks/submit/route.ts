import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        console.log('Feedback Submit Request:', body);

        // Transform payload to match backend schema exactly
        const backendPayload = {
            product_id: Number(body.product_id), // Ensure number
            feedback: body.feedback,
            email: body.email || "", // content-type json usually expects all keys or specific optional handling. sending empty string if undefined just in case
            rating: Number(body.rating || 0),
            // User ID and Industry are passed in URL for tracking but backend submit endpoint 
            // seemingly only takes the above. We inject them if the backend supports them in the future
            // or if we need to log them. For now, let's stick to the curl command's strict schema 
            // to avoid 422/400 errors, but since it's 404, valid ID is crucial.
        };

        // If the backend actually supports user_id and industry, we should add them. 
        // But the user curl didn't show them. Let's start with strict adherence to curl.

        console.log('Sending to Backend:', backendPayload);

        const response = await fetch(`${API_BASE_URL}/api/feedbacks/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(backendPayload),
        });

        if (!response.ok) {
            // Try to get error details
            const errorText = await response.text();
            console.error(`Backend failed with ${response.status}: ${errorText}`);

            return NextResponse.json(
                { message: 'Failed to submit feedback' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Feedback Submit Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
