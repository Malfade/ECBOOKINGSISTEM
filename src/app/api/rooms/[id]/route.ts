import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const room = await prisma.room.findUnique({
            where: { id: params.id },
        });

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        return NextResponse.json(room);
    } catch (error) {
        console.error('Error fetching room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await prisma.room.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ message: 'Room deleted' });
    } catch (error) {
        console.error('Error deleting room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
