'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from "react-qr-code";

interface Room {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
    createdAt: string;
}

interface Booking {
    id: string;
    roomId: string; // We'll need to join or fetch separately, or filtering
    date: string;
    timeStart: string;
    timeEnd: string;
    userName: string;
    createdAt: string;
}

export default function AdminPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]); // All bookings for simplicity or per room?
    // Let's fetch bookings per room on demand or fetch all if API supports it.
    // Our API supports GET /api/bookings?roomId=... 
    // We might want to add a "View Bookings" button per room.

    // Changing approach: View bookings inside a modal for specific room to keep UI clean.

    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Editing state
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [editName, setEditName] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editModalOpen, setEditModalOpen] = useState(false);

    // QR Modal
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrRoom, setQrRoom] = useState<Room | null>(null);

    // Bookings Modal
    const [bookingsModalOpen, setBookingsModalOpen] = useState(false);
    const [currentRoomBookings, setCurrentRoomBookings] = useState<Booking[]>([]);
    const [viewingRoomForBookings, setViewingRoomForBookings] = useState<Room | null>(null);

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

    const fetchRoomBookings = async (room: Room) => {
        setViewingRoomForBookings(room);
        setBookingsModalOpen(true);
        setCurrentRoomBookings([]); // Clear prev

        try {
            // We need a date to fetch bookings... the API requires date.
            // Oh, the TZ says GET bookings?roomId=...&date=...
            // Do we have an endpoint for ALL bookings of a room?
            // Checking Booking API...
            // It requires date. We might need to adjust API or just fetch "today".
            // Let's fetch "today" by default.

            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(`/api/bookings?roomId=${room.id}&date=${today}`);
            if (res.ok) {
                const data = await res.json();
                setCurrentRoomBookings(data);
            }
        } catch (e) {
            console.error("Failed to fetch bookings");
        }
    };

    // Allow date changing in modal
    const fetchBookingsByDate = async (roomId: string, date: string) => {
        try {
            const res = await fetch(`/api/bookings?roomId=${roomId}&date=${date}`);
            if (res.ok) {
                const data = await res.json();
                setCurrentRoomBookings(data);
            }
        } catch (e) {
            console.error(e);
        }
    }


    const createRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, location, description }),
            });

            if (!res.ok) {
                throw new Error('Failed to create room');
            }

            await fetchRooms();
            setName('');
            setLocation('');
            setDescription('');
        } catch (err) {
            setError('Error creating room');
        } finally {
            setLoading(false);
        }
    };

    const deleteBooking = async (id: string, roomId: string) => {
        if (!confirm("Delete this booking?")) return;
        try {
            const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
            if (res.ok) {
                // refresh
                const date = (document.querySelector('input[type="date"]') as HTMLInputElement)?.value;
                if (date) fetchBookingsByDate(roomId, date);
            }
        } catch (e) {
            alert('Error deleting booking');
        }
    };

    const deleteRoom = async (id: string) => {
        if (!confirm('Are you sure you want to delete this room?')) return;

        try {
            await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
            fetchRooms();
            if (qrRoom?.id === id) setQrModalOpen(false);
            if (editingRoom?.id === id) setEditModalOpen(false);
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const openEditModal = (room: Room) => {
        setEditingRoom(room);
        setEditName(room.name);
        setEditLocation(room.location || '');
        setEditDescription(room.description || '');
        setEditModalOpen(true);
    };

    const handleUpdateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRoom) return;

        try {
            const res = await fetch(`/api/rooms/${editingRoom.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, location: editLocation, description: editDescription })
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

    const getRoomUrl = (id: string) => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/room/${id}`;
        }
        return `/room/${id}`;
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return '';
        // Extract HH:mm from 1970-01-01THH:mm:ss.000Z
        // If string is 2023-.... it will also take HH:mm if after T
        // Robust way: create Date object
        const date = new Date(isoString);
        // We stored as UTC.
        const h = date.getUTCHours().toString().padStart(2, '0');
        const m = date.getUTCMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        QRBook Admin
                    </h1>
                    <Link href="/" className="text-neutral-400 hover:text-white transition-colors text-sm">
                        Home
                    </Link>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar / Create Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg sticky top-8">
                            <h2 className="text-xl font-semibold mb-4 text-neutral-200">New Room</h2>
                            <form onSubmit={createRoom} className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    placeholder="Room Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full text-white placeholder-neutral-500"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Location"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full text-white placeholder-neutral-500"
                                />
                                <textarea
                                    placeholder="Description (optional)"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full text-white placeholder-neutral-500 h-20 resize-none"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 w-full"
                                >
                                    {loading ? 'Adding...' : 'Add Room'}
                                </button>
                            </form>
                            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
                        </div>
                    </div>

                    {/* Room List */}
                    <div className="lg:col-span-3">
                        <h2 className="text-xl font-semibold mb-4 text-neutral-200">Rooms Management</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {rooms.map((room) => (
                                <div
                                    key={room.id}
                                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors shadow-sm flex flex-col justify-between"
                                >
                                    <div className="mb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-bold text-white">{room.name}</h3>
                                            <button
                                                onClick={() => openQrModal(room)}
                                                className="text-neutral-400 hover:text-blue-400 transition-colors p-1"
                                                title="Show QR Code"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75z" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-neutral-400 text-sm mb-1">{room.location || 'No location'}</p>
                                        {room.description && <p className="text-neutral-500 text-xs line-clamp-2 mb-4">{room.description}</p>}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => fetchRoomBookings(room)}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-1.5 px-3 rounded text-sm transition-colors border border-neutral-700 flex-1 text-center"
                                        >
                                            Bookings
                                        </button>
                                        <Link
                                            href={`/room/${room.id}`}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-1.5 px-3 rounded text-sm transition-colors border border-neutral-700 flex-1 text-center"
                                        >
                                            View
                                        </Link>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <button
                                            onClick={() => openEditModal(room)}
                                            className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-600/20 py-1.5 px-3 rounded text-sm transition-colors flex-1"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteRoom(room.id)}
                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-1.5 px-3 rounded text-sm transition-colors flex-1"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
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
                                <div className="mb-6">
                                    <label className="block text-sm text-neutral-400 mb-2">Description</label>
                                    <textarea
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white h-24 resize-none"
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
                            <p className="text-gray-500 mb-6 text-sm break-all text-center">{getRoomUrl(qrRoom.id)}</p>

                            <div className="bg-white p-2 border border-gray-200 rounded-lg">
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

                {/* Bookings Modal */}
                {bookingsModalOpen && viewingRoomForBookings && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setBookingsModalOpen(false)}>
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-2xl shadow-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Bookings: {viewingRoomForBookings.name}</h3>
                                <button onClick={() => setBookingsModalOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
                            </div>

                            <div className="mb-4">
                                <label className="text-sm text-neutral-400 mr-2">Filter Date:</label>
                                <input
                                    type="date"
                                    className="bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1"
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => fetchBookingsByDate(viewingRoomForBookings.id, e.target.value)}
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2">
                                {currentRoomBookings.length === 0 ? (
                                    <p className="text-neutral-500 text-center py-8">No bookings found for this date.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {currentRoomBookings.map(b => (
                                            <div key={b.id} className="bg-neutral-800 p-3 rounded-lg flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-white">
                                                        {formatTime(b.timeStart)} - {formatTime(b.timeEnd)}
                                                    </p>
                                                    <p className="text-sm text-neutral-400">{b.userName}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-xs text-neutral-500">
                                                        {b.createdAt?.split('T')[0]}
                                                    </div>
                                                    <button
                                                        onClick={() => deleteBooking(b.id, viewingRoomForBookings.id)}
                                                        className="text-red-500 hover:text-red-400 text-xs border border-red-500/20 bg-red-500/10 px-2 py-1 rounded"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div >
    );
}
