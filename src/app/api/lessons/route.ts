import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { groupId, roomId, day, timeStart, timeEnd, subject, teacher } = body;

        if (!groupId || !roomId || !day || !timeStart || !timeEnd || !subject) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check for room conflicts
        const conflict = await prisma.lesson.findFirst({
            where: {
                roomId,
                day,
                OR: [
                    {
                        timeStart: { lte: timeStart },
                        timeEnd: { gt: timeStart }
                    },
                    {
                        timeStart: { lt: timeEnd },
                        timeEnd: { gte: timeEnd }
                    }
                ]
            },
            include: {
                group: true
            }
        });

        if (conflict) {
            return NextResponse.json({
                error: `Room conflict: ${conflict.group.name} has ${conflict.subject} at this time`
            }, { status: 409 });
        }

        const lesson = await prisma.lesson.create({
            data: {
                groupId,
                roomId,
                day,
                timeStart,
                timeEnd,
                subject,
                teacher
            },
            include: {
                group: true,
                room: true
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
    const groupId = searchParams.get('groupId');

    try {
        const lessons = await prisma.lesson.findMany({
            where: {
                ...(roomId && { roomId }),
                ...(groupId && { groupId })
            },
            include: {
                group: true,
                room: true
            },
            orderBy: [
                { day: 'asc' },
                { timeStart: 'asc' }
            ]
        });
        return NextResponse.json(lessons);
    } catch (error) {
        console.error('Error fetching lessons:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
