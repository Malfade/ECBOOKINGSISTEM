import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { roomId, day, timeStart, timeEnd, subject, teacher } = body;

        if (!roomId || !day || !timeStart || !timeEnd || !subject) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const lesson = await prisma.lesson.create({
            data: {
                roomId,
                day,
                timeStart,
                timeEnd,
                subject,
                teacher
            }
        });

        return NextResponse.json(lesson, { status: 201 });
    } catch (error) {
        console.error('Error creating lesson:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
        return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
    }

    try {
        const lessons = await prisma.lesson.findMany({
            where: { roomId },
            orderBy: { timeStart: 'asc' }
        });
        return NextResponse.json(lessons);
    } catch (error) {
        console.error('Error fetching lessons:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
