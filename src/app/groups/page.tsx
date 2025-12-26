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

export default function GroupsListPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchGroups();
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
        } finally {
            setLoading(false);
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white p-4 sm:p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 sm:mb-12 text-center">
                    <Link href="/" className="inline-block text-white/60 hover:text-white transition-colors mb-4 text-sm">
                        ← Главная
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        Выберите свою группу
                    </h1>
                    <p className="text-white/70 text-sm sm:text-base">
                        Просмотр расписания занятий
                    </p>
                </header>

                {/* Search */}
                <div className="mb-8">
                    <input
                        type="text"
                        placeholder="Поиск группы..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="mt-4 text-white/60">Загрузка групп...</p>
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-semibold mb-2">Группы не найдены</h3>
                        <p className="text-white/60 text-sm">
                            {search ? 'Попробуйте другой запрос' : 'Группы пока не добавлены'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {filteredGroups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/schedule/${group.id}`}
                                className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/30 rounded-2xl p-6 transition-all transform hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                        {group.name}
                                    </h3>
                                    {group.course && (
                                        <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30">
                                            {group.course} курс
                                        </span>
                                    )}
                                </div>

                                {group.description && (
                                    <p className="text-white/60 text-sm mb-4 line-clamp-2">
                                        {group.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-2 text-xs text-white/50">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                    </svg>
                                    <span>{group._count?.lessons || 0} занятий в неделю</span>
                                </div>

                                {/* Arrow icon */}
                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
