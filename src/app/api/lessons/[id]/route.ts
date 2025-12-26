import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await prisma.lesson.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ message: 'Lesson deleted' });
    } catch (error) {
        console.error('Error deleting lesson:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
