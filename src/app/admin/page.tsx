'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Room {
    id: string;
    name: string;
    location: string | null;
    createdAt: string;
}

export default function AdminPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch rooms on mount
    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const res = await fetch('/api/rooms');
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            }
        } catch (err) {
            console.error('Failed to fetch rooms', err);
        }
    };

    const createRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, location }),
            });

            if (!res.ok) {
                throw new Error('Failed to create room');
            }

            await fetchRooms();
            setName('');
            setLocation('');
        } catch (err) {
            setError('Error creating room');
        } finally {
            setLoading(false);
        }
    };

    const deleteRoom = async (id: string) => {
        if (!confirm('Are you sure you want to delete this room?')) return;

        try {
            await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
            fetchRooms();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    QRBook Admin
                </h1>

                {/* Create Room Section */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8 shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-neutral-200">Create New Room</h2>
                    <form onSubmit={createRoom} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Room Name (e.g. Conference A)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1 text-white placeholder-neutral-500"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Location (Optional)"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1 text-white placeholder-neutral-500"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Room'}
                        </button>
                    </form>
                    {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
                </div>

                {/* Room List */}
                <h2 className="text-xl font-semibold mb-4 text-neutral-200">Existing Rooms</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors shadow-sm flex flex-col justify-between"
                        >
                            <div>
                                <h3 className="text-lg font-medium text-white">{room.name}</h3>
                                <p className="text-neutral-400 text-sm mb-4">{room.location || 'No location'}</p>
                                <div className="text-xs text-neutral-500 mb-4 bg-neutral-950 p-2 rounded border border-neutral-800 break-all family-mono">
                                    /room/{room.id}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <Link
                                    href={`/room/${room.id}`}
                                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-center py-2 rounded-lg text-sm transition-colors border border-neutral-700"
                                >
                                    View / Book
                                </Link>
                                <button
                                    onClick={() => deleteRoom(room.id)}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-2 px-4 rounded-lg text-sm transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {rooms.length === 0 && (
                        <div className="text-neutral-500 text-center col-span-full py-8">
                            No rooms created yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
