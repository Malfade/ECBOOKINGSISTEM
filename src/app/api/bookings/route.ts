import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const dateString = searchParams.get('date');

    if (!roomId || !dateString) {
        return NextResponse.json({ error: 'roomId and date are required' }, { status: 400 });
    }

    try {
        const date = new Date(dateString);
        // Ensure valid date
        if (isNaN(date.getTime())) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }

        const bookings = await prisma.booking.findMany({
            where: {
                roomId,
                date: date,
            },
            orderBy: {
                timeStart: 'asc',
            },
        });

        // Transform bookings to return simple time strings if needed, 
        // or return as is (ISO strings).
        // Frontend will interpret ISO strings.
        return NextResponse.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { roomId, date, timeStart, timeEnd, userName } = body;

        // Basic validation
        if (!roomId || !date || !timeStart || !timeEnd || !userName) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Parse inputs
        // date: "YYYY-MM-DD"
        // timeStart: "HH:MM"
        // timeEnd: "HH:MM"

        const bookingDate = new Date(date);
        if (isNaN(bookingDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }

        // Construct DateTimes for Time columns (Epoch + Time)
        // We use a fixed date for time comparison to avoid timezone shifts affecting limits
        // assuming input "10:00" means 10:00 UTC.
        const startEpoch = new Date(`1970-01-01T${timeStart}:00Z`);
        const endEpoch = new Date(`1970-01-01T${timeEnd}:00Z`);

        if (isNaN(startEpoch.getTime()) || isNaN(endEpoch.getTime())) {
            return NextResponse.json({ error: 'Invalid time format' }, { status: 400 });
        }

        // 1. Check duration = 1, 2, or 3 hours
        const durationMs = endEpoch.getTime() - startEpoch.getTime();
        const durationHours = durationMs / (60 * 60 * 1000);

        if (durationHours < 1 || durationHours > 3 || durationHours % 1 !== 0) {
            return NextResponse.json({ error: 'Booking duration must be 1, 2, or 3 hours' }, { status: 400 });
        }

        // 2. Check if in past
        // Combine date + timeStart to check against Now
        // bookingDate is YYYY-MM-DDT00:00:00.000Z (if parsed as UTC)
        // We need to construct full DateTime.
        // Assuming 'date' string "2023-01-01" is UTC date.
        const fullStartStr = `${date}T${timeStart}:00Z`;
        const fullStart = new Date(fullStartStr);

        if (fullStart < new Date()) {
            return NextResponse.json({ error: 'Cannot book in the past' }, { status: 400 });
        }

        // 3. Collision Detection
        // We check if any booking exists for same room & date where times overlap.
        // Existing: ExistStart, ExistEnd
        // Overlap if: ExistStart < NewEnd AND ExistEnd > NewStart

        // Note: Prisma Query for Time overlap is tricky with standard filtering on DateTime@db.Time fields
        // explicitly.
        // However, since we enforce 1H slots and typically they are aligned (09-10, 10-11), 
        // overlap usually implies exact match or verifying bounds.
        // But user might try 09:30-10:30.

        // Let's fetch all bookings for that day and check in code (simpler/safer for Time type).
        const dayBookings = await prisma.booking.findMany({
            where: {
                roomId,
                date: bookingDate,
            },
        });

        const isOverlapping = dayBookings.some((b: any) => {
            const bStart = new Date(b.timeStart).getTime(); // These are 1970-01-01 dates
            const bEnd = new Date(b.timeEnd).getTime();
            const newStart = startEpoch.getTime();
            const newEnd = endEpoch.getTime();

            return bStart < newEnd && bEnd > newStart;
        });

        if (isOverlapping) {
            return NextResponse.json({ error: 'Slot is already booked' }, { status: 409 });
        }

        // 4. Check Lesson Conflict (Priority)
        // Fetch lessons for this room and day of week
        const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const lessons = await prisma.lesson.findMany({
            where: {
                roomId,
                day: dayOfWeek
            }
        });

        const hasLessonConflict = lessons.some((l: any) => {
            // Lesson times are strings "HH:MM"
            // Convert to Epoch for comparison
            const lStart = new Date(`1970-01-01T${l.timeStart}:00Z`).getTime();
            const lEnd = new Date(`1970-01-01T${l.timeEnd}:00Z`).getTime();
            const newStart = startEpoch.getTime();
            const newEnd = endEpoch.getTime();

            return lStart < newEnd && lEnd > newStart;
        });

        if (hasLessonConflict) {
            return NextResponse.json({ error: 'Room is occupied by a scheduled class' }, { status: 409 });
        }

        // Create Booking
        const newBooking = await prisma.booking.create({
            data: {
                roomId,
                date: bookingDate,
                timeStart: startEpoch,
                timeEnd: endEpoch,
                userName,
            },
        });

        return NextResponse.json(newBooking, { status: 201 });

    } catch (error) {
        console.error('Error creating booking:', error);
        // Handle Unique constraint violation if race condition
        if ((error as any).code === 'P2002') {
            return NextResponse.json({ error: 'Slot is already booked' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
