'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Lesson {
    id: string;
    day: string;
    timeStart: string;
    timeEnd: string;
    subject: string;
    teacher: string | null;
    room: {
        id: string;
        name: string;
        location: string | null;
    };
}

interface Group {
    id: string;
    name: string;
    course: number | null;
    description: string | null;
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

const DAY_EMOJI: Record<string, string> = {
    monday: '📘',
    tuesday: '📗',
    wednesday: '📙',
    thursday: '📕',
    friday: '📔',
    saturday: '📓',
    sunday: '📖'
};

export default function SchedulePage() {
    const params = useParams();
    const router = useRouter();
    const groupId = params.courseId as string; // Keep param name for backwards compatibility

    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [group, setGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchScheduleData();
    }, [groupId]);

    const fetchScheduleData = async () => {
        if (!groupId) return;

        setLoading(true);
        setError(null);

        try {
            // Fetch lessons for this group
            const lessonsRes = await fetch(`/api/lessons?groupId=${groupId}`);
            if (!lessonsRes.ok) {
                throw new Error('Failed to fetch schedule');
            }
            const lessonsData = await lessonsRes.json();
            setLessons(lessonsData);

            // Fetch group info
            const groupRes = await fetch(`/api/groups/${groupId}`);
            if (groupRes.ok) {
                const groupData = await groupRes.json();
                setGroup(groupData);
            }
        } catch (err) {
            console.error('Error fetching schedule:', err);
            setError('Не удалось загрузить расписание. Попробуйте еще раз.');
        } finally {
            setLoading(false);
        }
    };

    const getLessonsByDay = (day: string) => {
        return lessons
            .filter(l => l.day === day)
            .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
    };

    const hasLessonsOnDay = (day: string) => {
        return lessons.some(l => l.day === day);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white p-4 sm:p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header Skeleton */}
                    <div className="mb-8 animate-pulse">
                        <div className="h-10 bg-white/10 rounded-lg w-3/4 mb-4"></div>
                        <div className="h-6 bg-white/10 rounded-lg w-1/2"></div>
                    </div>

                    {/* Schedule Skeleton */}
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse">
                                <div className="h-8 bg-white/10 rounded-lg w-1/3 mb-4"></div>
                                <div className="space-y-3">
                                    <div className="h-32 bg-white/10 rounded-xl"></div>
                                    <div className="h-32 bg-white/10 rounded-xl"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-6">😞</div>
                    <h2 className="text-2xl font-bold mb-4">Ошибка загрузки</h2>
                    <p className="text-white/70 mb-6">{error}</p>
                    <button
                        onClick={fetchScheduleData}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105 active:scale-95"
                    >
                        Попробовать снова
                    </button>
                    <Link
                        href="/"
                        className="block mt-4 text-white/60 hover:text-white transition-colors"
                    >
                        Вернуться на главную
                    </Link>
                </div>
            </div>
        );
    }

    const activeDays = DAYS.filter(hasLessonsOnDay);

    if (lessons.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-6">📅</div>
                    <h2 className="text-2xl font-bold mb-4">Расписание пусто</h2>
                    <p className="text-white/70 mb-6">
                        {group ? `Для группы "${group.name}" пока нет занятий` : 'Занятия не найдены'}
                    </p>
                    <Link
                        href="/"
                        className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105 active:scale-95"
                    >
                        Вернуться на главную
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-10 backdrop-blur-xl bg-slate-950/80 border-b border-white/10 shadow-lg">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                    <div className="flex items-center justify-between mb-2">
                        <Link
                            href="/"
                            className="text-white/60 hover:text-white transition-colors flex items-center gap-2 text-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                            Назад
                        </Link>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-1">
                        {group?.name || 'Расписание'}
                    </h1>
                    {group?.description && (
                        <p className="text-white/60 text-sm flex items-center gap-2">
                            {group.description}
                        </p>
                    )}
                </div>
            </header>

            {/* Schedule Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="space-y-8">
                    {activeDays.map((day, index) => {
                        const dayLessons = getLessonsByDay(day);
                        if (dayLessons.length === 0) return null;

                        return (
                            <section key={day} className="scroll-mt-24">
                                {/* Day Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl" role="img" aria-label={DAY_LABELS[day]}>
                                        {DAY_EMOJI[day]}
                                    </span>
                                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                                        {DAY_LABELS[day]}
                                    </h2>
                                    <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent"></div>
                                </div>

                                {/* Lessons Grid */}
                                <div className="space-y-3">
                                    {dayLessons.map((lesson, lessonIndex) => (
                                        <article
                                            key={lesson.id}
                                            className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
                                            style={{
                                                animationDelay: `${lessonIndex * 50}ms`,
                                                animation: 'fadeInUp 0.5s ease-out forwards'
                                            }}
                                        >
                                            {/* Time Badge */}
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <time className="flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-xl px-4 py-2 font-mono text-sm sm:text-base font-bold text-blue-300">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{lesson.timeStart} — {lesson.timeEnd}</span>
                                                    </time>
                                                </div>
                                            </div>

                                            {/* Subject */}
                                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
                                                {lesson.subject}
                                            </h3>

                                            {/* Teacher & Room Info */}
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-white/70">
                                                {lesson.teacher && (
                                                    <div className="flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-purple-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                                        </svg>
                                                        <span className="font-medium text-white/90">{lesson.teacher}</span>
                                                    </div>
                                                )}
                                                {lesson.room && (
                                                    <div className="flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-400">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                                                        </svg>
                                                        <span className="font-medium text-white/90">{lesson.room.name}</span>
                                                        {lesson.room.location && (
                                                            <span className="text-white/50 text-xs">• {lesson.room.location}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Decorative gradient line */}
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl"></div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>

                {/* Footer */}
                <footer className="mt-12 pt-8 border-t border-white/10 text-center text-white/50 text-sm">
                    <p>Всего занятий в неделю: <span className="font-bold text-white">{lessons.length}</span></p>
                </footer>
            </main>

            {/* CSS Animation */}
            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
