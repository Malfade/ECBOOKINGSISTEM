import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const group = await prisma.group.findUnique({
            where: { id: params.id },
            include: {
                lessons: {
                    include: {
                        room: true
                    },
                    orderBy: [
                        { day: 'asc' },
                        { timeStart: 'asc' }
                    ]
                }
            }
        });

        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json(group);
    } catch (error) {
        console.error('Error fetching group:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const { name, course, description } = await request.json();

        const updatedGroup = await prisma.group.update({
            where: { id: params.id },
            data: {
                name,
                course: course ? parseInt(course) : null,
                description
            },
        });

        return NextResponse.json(updatedGroup);
    } catch (error) {
        console.error('Error updating group:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await prisma.group.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ message: 'Group deleted' });
    } catch (error) {
        console.error('Error deleting group:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
