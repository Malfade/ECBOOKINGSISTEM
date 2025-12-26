'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Group {
    id: string;
    name: string;
    course: number | null;
    description: string | null;
    _count?: {
        lessons: number;
    };
}

interface Room {
    id: string;
    name: string;
    location: string | null;
}

interface Lesson {
    id: string;
    groupId: string;
    roomId: string;
    day: string;
    timeStart: string;
    timeEnd: string;
    subject: string;
    teacher: string | null;
    room: Room;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье'
};

export default function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);

    // Form states
    const [name, setName] = useState('');
    const [course, setCourse] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    // Lessons modal
    const [lessonsModalOpen, setLessonsModalOpen] = useState(false);
    const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
    const [groupLessons, setGroupLessons] = useState<Lesson[]>([]);
    const [newLesson, setNewLesson] = useState({
        day: 'monday',
        timeStart: '09:00',
        timeEnd: '10:30',
        subject: '',
        teacher: '',
        roomId: ''
    });

    useEffect(() => {
        fetchGroups();
        fetchRooms();
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await fetch('/api/groups');
            if (res.ok) {
                const data = await res.json();
                setGroups(data);
            }
        } catch (err) {
            console.error('Failed to fetch groups', err);
        }
    };

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

    const createGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    course: course ? parseInt(course) : null,
                    description
                }),
            });

            if (!res.ok) throw new Error('Failed to create group');

            await fetchGroups();
            setName('');
            setCourse('');
            setDescription('');
        } catch (err) {
            alert('Error creating group');
        } finally {
            setLoading(false);
        }
    };

    const deleteGroup = async (id: string) => {
        if (!confirm('Удалить группу? Все занятия будут также удалены.')) return;
        try {
            await fetch(`/api/groups/${id}`, { method: 'DELETE' });
            fetchGroups();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const openLessonsModal = async (group: Group) => {
        setViewingGroup(group);
        setLessonsModalOpen(true);
        setGroupLessons([]);

        try {
            const res = await fetch(`/api/lessons?groupId=${group.id}`);
            if (res.ok) {
                const data = await res.json();
                setGroupLessons(data);
            }
        } catch (e) {
            console.error("Failed to fetch lessons");
        }
    };

    const createLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewingGroup) return;

        try {
            const res = await fetch('/api/lessons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: viewingGroup.id,
                    ...newLesson
                })
            });

            if (res.ok) {
                openLessonsModal(viewingGroup);
                setNewLesson({ ...newLesson, subject: '', teacher: '' });
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to create lesson');
            }
        } catch (e) {
            alert('Error creating lesson');
        }
    };

    const deleteLesson = async (id: string) => {
        if (!confirm('Delete this lesson?')) return;
        try {
            await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
            if (viewingGroup) openLessonsModal(viewingGroup);
        } catch (e) {
            alert('Error deleting lesson');
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Управление группами
                    </h1>
                    <Link href="/admin" className="text-neutral-400 hover:text-white transition-colors text-sm">
                        ← Назад в админку
                    </Link>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Create Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg sticky top-8">
                            <h2 className="text-xl font-semibold mb-4 text-neutral-200">Новая группа</h2>
                            <form onSubmit={createGroup} className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    placeholder="Название группы (ИС-21)"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full text-white placeholder-neutral-500"
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Курс (1, 2, 3, 4)"
                                    value={course}
                                    onChange={(e) => setCourse(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full text-white placeholder-neutral-500"
                                    min="1"
                                    max="6"
                                />
                                <textarea
                                    placeholder="Описание (optional)"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full text-white placeholder-neutral-500 h-20 resize-none"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 w-full"
                                >
                                    {loading ? 'Создание...' : 'Создать группу'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Groups List */}
                    <div className="lg:col-span-3">
                        <h2 className="text-xl font-semibold mb-4 text-neutral-200">Список групп</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {groups.map((group) => (
                                <div
                                    key={group.id}
                                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors shadow-sm flex flex-col justify-between"
                                >
                                    <div className="mb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-bold text-white">{group.name}</h3>
                                            {group.course && (
                                                <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                                                    {group.course} курс
                                                </span>
                                            )}
                                        </div>
                                        {group.description && (
                                            <p className="text-neutral-500 text-xs line-clamp-2 mb-2">{group.description}</p>
                                        )}
                                        <p className="text-neutral-400 text-sm">
                                            Занятий: {group._count?.lessons || 0}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => openLessonsModal(group)}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-1.5 px-3 rounded text-sm transition-colors border border-neutral-700 flex-1 text-center"
                                        >
                                            Расписание
                                        </button>
                                        <Link
                                            href={`/schedule/${group.id}`}
                                            target="_blank"
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-1.5 px-3 rounded text-sm transition-colors border border-neutral-700 flex-1 text-center"
                                        >
                                            Просмотр
                                        </Link>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => deleteGroup(group.id)}
                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-1.5 px-3 rounded text-sm transition-colors flex-1"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Lessons Modal */}
                {lessonsModalOpen && viewingGroup && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setLessonsModalOpen(false)}>
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-5xl shadow-2xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Расписание: {viewingGroup.name}</h3>
                                <button onClick={() => setLessonsModalOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
                                {/* Create Lesson Form */}
                                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 h-fit">
                                    <h4 className="font-semibold mb-4 text-blue-400">Добавить занятие</h4>
                                    <form onSubmit={createLesson} className="space-y-3">
                                        <div>
                                            <label className="text-xs text-neutral-500 block mb-1">День недели</label>
                                            <select
                                                value={newLesson.day}
                                                onChange={e => setNewLesson({ ...newLesson, day: e.target.value })}
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white capitalize"
                                            >
                                                {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs text-neutral-500 block mb-1">Начало</label>
                                                <input
                                                    type="time"
                                                    value={newLesson.timeStart}
                                                    onChange={e => setNewLesson({ ...newLesson, timeStart: e.target.value })}
                                                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-neutral-500 block mb-1">Конец</label>
                                                <input
                                                    type="time"
                                                    value={newLesson.timeEnd}
                                                    onChange={e => setNewLesson({ ...newLesson, timeEnd: e.target.value })}
                                                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 block mb-1">Предмет</label>
                                            <input
                                                type="text"
                                                value={newLesson.subject}
                                                onChange={e => setNewLesson({ ...newLesson, subject: e.target.value })}
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white"
                                                placeholder="Математика"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 block mb-1">Преподаватель</label>
                                            <input
                                                type="text"
                                                value={newLesson.teacher}
                                                onChange={e => setNewLesson({ ...newLesson, teacher: e.target.value })}
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white"
                                                placeholder="Проф. Иванов"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 block mb-1">Кабинет</label>
                                            <select
                                                value={newLesson.roomId}
                                                onChange={e => setNewLesson({ ...newLesson, roomId: e.target.value })}
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white"
                                                required
                                            >
                                                <option value="">Выберите кабинет</option>
                                                {rooms.map(r => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.name} {r.location && `(${r.location})`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition-colors">
                                            Добавить
                                        </button>
                                    </form>
                                </div>

                                {/* Lessons List */}
                                <div className="md:col-span-2 overflow-y-auto pr-2">
                                    <div className="space-y-4">
                                        {DAYS.map(day => {
                                            const dayLessons = groupLessons.filter(l => l.day === day);
                                            if (dayLessons.length === 0) return null;
                                            return (
                                                <div key={day} className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-800">
                                                    <h5 className="capitalize font-bold text-neutral-400 mb-3 border-b border-neutral-700 pb-2">{DAY_LABELS[day]}</h5>
                                                    <div className="space-y-2">
                                                        {dayLessons.map(l => (
                                                            <div key={l.id} className="bg-neutral-900 p-3 rounded-lg flex justify-between items-center border border-neutral-800">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-mono text-blue-400 font-bold text-sm">{l.timeStart} - {l.timeEnd}</span>
                                                                        <span className="font-semibold text-white">{l.subject}</span>
                                                                    </div>
                                                                    <p className="text-sm text-neutral-500">{l.teacher}</p>
                                                                    <p className="text-xs text-green-400">📍 {l.room.name}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => deleteLesson(l.id)}
                                                                    className="text-red-500 hover:bg-red-500/10 p-2 rounded transition-colors"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {groupLessons.length === 0 && (
                                            <p className="text-neutral-500 text-center py-10">Занятий пока нет.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
