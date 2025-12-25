'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Booking {
    id: string;
    timeStart: string;
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
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [userName, setUserName] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (roomId) fetchRoom();
    }, [roomId]);

    useEffect(() => {
        if (roomId && date) {
            setSuccess(false); // Reset success on date change
            fetchBookings();
        }
    }, [roomId, date]);

    const fetchRoom = async () => {
        try {
            const res = await fetch(`/api/rooms/${roomId}`);
            if (res.ok) setRoom(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            const res = await fetch(`/api/bookings?roomId=${roomId}&date=${date}`);
            if (res.ok) setBookings(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const isSlotOccupied = (slotStart: string) => {
        const slotHour = parseInt(slotStart.split(':')[0]);
        return bookings.some(b => {
            const bDate = new Date(b.timeStart);
            const bHour = bDate.getUTCHours();
            return bHour === slotHour;
        });
    };

    const handleSlotClick = (slot: string) => {
        if (isSlotOccupied(slot)) return;

        // Prevent past booking
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        if (date < today) return;
        if (date === today) {
            const currentHour = now.getHours();
            const slotHour = parseInt(slot.split(':')[0]);
            if (slotHour <= currentHour) return;
        }

        setSelectedSlot(slot);
        setSuccess(false);
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSlot || !userName) return;

        setBookingLoading(true);
        // Calculate end time
        const [h, m] = selectedSlot.split(':').map(Number);
        const endH = h + 1;
        const timeEnd = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    date,
                    timeStart: selectedSlot,
                    timeEnd,
                    userName
                })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Booking failed');
                return;
            }

            setSuccess(true);
            setUserName('');
            fetchBookings();

            // Auto close after 2s
            setTimeout(() => {
                setSelectedSlot(null);
                setSuccess(false);
            }, 3000);

        } catch (e) {
            alert('Error creating booking');
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-neutral-400">Loading...</div>;
    if (!room) return <div className="flex h-screen items-center justify-center text-neutral-400">Room not found</div>;

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-900 px-6 py-4">
                <h1 className="text-xl font-bold tracking-tight">{room.name}</h1>
                <p className="text-sm text-neutral-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {room.location || 'No location'}
                </p>
            </header>

            <main className="p-6 max-w-lg mx-auto pb-32">
                {/* Date Selection */}
                <div className="mb-8">
                    <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-2 font-semibold">Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4 text-lg text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Slots */}
                <div>
                    <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-4 font-semibold">Available Slots</label>
                    <div className="grid grid-cols-2 gap-3">
                        {TIME_SLOTS.map(slot => {
                            const occupied = isSlotOccupied(slot);
                            // Simple optimization: check validity locally
                            const now = new Date();
                            const today = now.toISOString().split('T')[0];
                            let disabled = occupied;
                            if (date < today) disabled = true;
                            if (date === today) {
                                const currentHour = now.getHours();
                                const slotHour = parseInt(slot.split(':')[0]);
                                if (slotHour <= currentHour) disabled = true;
                            }

                            return (
                                <button
                                    key={slot}
                                    disabled={disabled}
                                    onClick={() => handleSlotClick(slot)}
                                    className={`
                                        relative py-4 px-4 rounded-xl text-lg font-medium transition-all duration-200 border
                                        ${disabled
                                            ? 'bg-neutral-900/50 border-neutral-900 text-neutral-600 cursor-not-allowed'
                                            : 'bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800 hover:border-blue-500/50 hover:shadow-lg active:scale-[0.98]'
                                        }
                                    `}
                                >
                                    {slot}
                                    {occupied && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500/50"></span>}
                                    {!occupied && !disabled && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500/50"></span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Booking Sheet (Bottom Overlay) */}
            {selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => !success && setSelectedSlot(null)} />

                    <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl transform transition-transform animate-in slide-in-from-bottom-10 fade-in duration-300">

                        {!success ? (
                            <form onSubmit={handleBook}>
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <p className="text-neutral-400 text-sm">Booking for</p>
                                        <h3 className="text-2xl font-bold text-white">{selectedSlot} <span className="text-neutral-500 text-lg font-normal">/ {date}</span></h3>
                                    </div>
                                    <button type="button" onClick={() => setSelectedSlot(null)} className="text-neutral-400 hover:text-white p-2">✕</button>
                                </div>

                                <div className="mb-6">
                                    <input
                                        type="text"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-4 text-white text-lg placeholder-neutral-600 focus:ring-2 focus:ring-blue-600 outline-none"
                                        placeholder="Enter your name"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={bookingLoading}
                                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {bookingLoading ? (
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        'Confirm Booking'
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="text-center py-8">
                                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Booked!</h3>
                                <p className="text-neutral-400">See you at {selectedSlot}.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
