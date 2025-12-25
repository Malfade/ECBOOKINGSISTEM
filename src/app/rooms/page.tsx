'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Room {
    id: string;
    name: string;
    location: string | null;
}

export default function PublicRoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/rooms')
            .then(res => res.json())
            .then(data => {
                setRooms(data);
                setLoading(false);
            })
            .catch(err => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-black text-white p-6 font-sans">
            <div className="max-w-md mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Select a Room</h1>
                    <Link href="/" className="text-sm text-neutral-400">Home</Link>
                </header>

                {loading ? (
                    <div className="text-neutral-500">Loading rooms...</div>
                ) : (
                    <div className="grid gap-4">
                        {rooms.map(room => (
                            <Link
                                key={room.id}
                                href={`/room/${room.id}`}
                                className="block bg-neutral-900 border border-neutral-800 p-5 rounded-2xl hover:bg-neutral-800 transition-colors active:scale-[0.98]"
                            >
                                <h2 className="text-xl font-bold mb-1">{room.name}</h2>
                                {room.location && (
                                    <p className="text-neutral-400 text-sm flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {room.location}
                                    </p>
                                )}
                            </Link>
                        ))}

                        {rooms.length === 0 && !loading && (
                            <p className="text-neutral-500 text-center py-8">No rooms available yet.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
