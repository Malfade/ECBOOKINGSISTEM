import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { password } = body;

        const correctPassword = process.env.ADMIN_PASSWORD;

        if (!correctPassword) {
            console.error("ADMIN_PASSWORD is not set in environment variables");
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        if (password === correctPassword) {
            const response = NextResponse.json({ success: true });

            // Set a cookie
            response.cookies.set('admin_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24, // 1 day
                path: '/',
            });

            return response;
        }

        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
