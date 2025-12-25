'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Booking {
    id: string;
    timeStart: string; // ISO string or "1970-..."
    timeEnd: string;
}

interface Room {
    id: string;
    name: string;
    location: string | null;
}

const TIME_SLOTS = [
    '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00'
];

export default function RoomPage() {
    const params = useParams();
    const roomId = params?.id as string;

    const [room, setRoom] = useState<Room | null>(null);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [userName, setUserName] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);

    useEffect(() => {
        if (roomId) fetchRoom();
    }, [roomId]);

    useEffect(() => {
        if (roomId && date) fetchBookings();
    }, [roomId, date]);

    const fetchRoom = async () => {
        try {
            const res = await fetch(`/api/rooms/${roomId}`);
            if (res.ok) {
                const data = await res.json();
                setRoom(data);
            } else {
                // Handle 404
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            const res = await fetch(`/api/bookings?roomId=${roomId}&date=${date}`);
            if (res.ok) {
                const data = await res.json();
                setBookings(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const isSlotOccupied = (slotStart: string) => {
        // Slot is 1 hour.
        // Check if any booking overlaps.
        // Booking times are ISO strings (because Prisma returns DateTime)
        // BUT we stored them as 1970-01-01TtimeZ in DB.
        // The API might return them as full ISO strings (serialized JSON).

        // We need to compare TIME only.
        // Parse slotStart to minutes/hours.
        const slotHour = parseInt(slotStart.split(':')[0]);

        return bookings.some(b => {
            const bDate = new Date(b.timeStart);
            const bHour = bDate.getUTCHours(); // Stored as UTC on 1970-01-01
            // If we stored time as UTC, we compare UTC hours.
            return bHour === slotHour;
        });
    };

    const calculateEndTime = (start: string) => {
        const [h, m] = start.split(':').map(Number);
        const endH = h + 1;
        return `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const handleSlotClick = (slot: string) => {
        if (isSlotOccupied(slot)) return;

        // Check if past
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        if (date < today) return; // Can't book past dates

        if (date === today) {
            const currentHour = now.getHours(); // Local hour
            const slotHour = parseInt(slot.split(':')[0]);
            if (slotHour <= currentHour) {
                // Can't book past hours today? 
                // Requirement: "нельзя бронировать прошлое"
                // We should compare stricter
            }
        }

        setSelectedSlot(slot);
        setModalOpen(true);
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSlot || !userName) return;

        setBookingLoading(true);
        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    date,
                    timeStart: selectedSlot,
                    timeEnd: calculateEndTime(selectedSlot),
                    userName
                })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Booking failed');
                return;
            }

            setModalOpen(false);
            setUserName('');
            fetchBookings();
        } catch (e) {
            alert('Error bookings');
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) return <div className="text-white p-8">Loading room...</div>;
    if (!room) return <div className="text-white p-8">Room not found</div>;

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 pb-20 font-sans">
            <div className="max-w-md mx-auto">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-white">{room.name}</h1>
                    <p className="text-neutral-400">{room.location}</p>
                </header>

                {/* Date Picker */}
                <div className="mb-6">
                    <label className="block text-sm text-neutral-500 mb-2">Select Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                </div>

                {/* Slots Grid */}
                <div className="grid grid-cols-3 gap-3">
                    {TIME_SLOTS.map(slot => {
                        const occupied = isSlotOccupied(slot);
                        return (
                            <button
                                key={slot}
                                disabled={occupied}
                                onClick={() => handleSlotClick(slot)}
                                className={`
                  py-3 rounded-lg text-sm font-medium transition-colors border
                  ${occupied
                                        ? 'bg-red-500/10 border-red-500/20 text-red-500 cursor-not-allowed'
                                        : 'bg-neutral-900 border-neutral-800 text-green-400 hover:bg-neutral-800 hover:border-green-500/50'
                                    }
                `}
                            >
                                {slot}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Booking Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">Book {selectedSlot}</h3>
                        <form onSubmit={handleBook}>
                            <div className="mb-4">
                                <label className="block text-sm text-neutral-400 mb-2">Your Name</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                                    placeholder="John Doe"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 bg-neutral-800 text-neutral-300 py-3 rounded-lg font-medium hover:bg-neutral-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={bookingLoading}
                                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
                                >
                                    {bookingLoading ? 'Booking...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
