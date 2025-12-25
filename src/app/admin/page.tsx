'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from "react-qr-code";

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

    // Editing state
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [editName, setEditName] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editModalOpen, setEditModalOpen] = useState(false);

    // QR Modal
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrRoom, setQrRoom] = useState<Room | null>(null);

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

    const openEditModal = (room: Room) => {
        setEditingRoom(room);
        setEditName(room.name);
        setEditLocation(room.location || '');
        setEditModalOpen(true);
    };

    const handleUpdateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRoom) return;

        try {
            const res = await fetch(`/api/rooms/${editingRoom.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, location: editLocation })
            });

            if (!res.ok) throw new Error("Failed to update");

            setEditModalOpen(false);
            setEditingRoom(null);
            fetchRooms();
        } catch (e) {
            alert('Error updating room');
        }
    };

    const openQrModal = (room: Room) => {
        setQrRoom(room);
        setQrModalOpen(true);
    };

    // Helper to get full URL (client-side)
    const getRoomUrl = (id: string) => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/room/${id}`;
        }
        return `/room/${id}`;
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        QRBook Admin
                    </h1>
                    <Link href="/" className="text-neutral-400 hover:text-white transition-colors text-sm">
                        Home
                    </Link>
                </header>

                {/* Create Room Section */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8 shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-neutral-200">Create New Room</h2>
                    <form onSubmit={createRoom} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Room Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1 text-white placeholder-neutral-500"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Location"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors shadow-sm flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-white">{room.name}</h3>
                                    <button
                                        onClick={() => openQrModal(room)}
                                        className="text-neutral-400 hover:text-blue-400 transition-colors"
                                        title="Show QR Code"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75z" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-neutral-400 text-sm mb-4">{room.location || 'No location'}</p>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <Link
                                    href={`/room/${room.id}`}
                                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 px-3 rounded text-sm transition-colors border border-neutral-700"
                                >
                                    View
                                </Link>
                                <button
                                    onClick={() => openEditModal(room)}
                                    className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-600/20 py-2 px-3 rounded text-sm transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => deleteRoom(room.id)}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-2 px-3 rounded text-sm transition-colors ml-auto"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Edit Modal */}
                {editModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
                            <h3 className="text-xl font-bold mb-4 text-white">Edit Room</h3>
                            <form onSubmit={handleUpdateRoom}>
                                <div className="mb-4">
                                    <label className="block text-sm text-neutral-400 mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                                        required
                                    />
                                </div>
                                <div className="mb-6">
                                    <label className="block text-sm text-neutral-400 mb-2">Location</label>
                                    <input
                                        type="text"
                                        value={editLocation}
                                        onChange={e => setEditLocation(e.target.value)}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white"
                                    />
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-neutral-400 hover:text-white">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* QR Modal */}
                {qrModalOpen && qrRoom && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 px-4" onClick={() => setQrModalOpen(false)}>
                        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold mb-2 text-black">{qrRoom.name}</h3>
                            <p className="text-gray-500 mb-6 text-sm">{getRoomUrl(qrRoom.id)}</p>

                            <div className="bg-white p-2">
                                <QRCode
                                    value={getRoomUrl(qrRoom.id)}
                                    size={200}
                                />
                            </div>

                            <button
                                onClick={() => window.print()}
                                className="mt-8 text-sm text-blue-600 hover:underline print:hidden"
                            >
                                Print QR Code
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
