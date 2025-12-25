import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, location } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const room = await prisma.room.create({
            data: {
                name,
                location,
                description: body.description || null,
            },
        });

        return NextResponse.json(room, { status: 201 });
    } catch (error) {
        console.error('Error creating room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const rooms = await prisma.room.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
