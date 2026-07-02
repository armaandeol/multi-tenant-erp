// src/pages/teacher/TeacherTimetable.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '../../components/erp/teacher/MainLayout';
import { timetableApi } from '../../services/timetableApi';
import { schoolAdminApi } from '../../services/schoolAdminApi';

// ── Helpers (identical to StudentTimetable — generic, no hardcoding) ──
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_IDX = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

const todayName = () => {
    const d = new Date().getDay();
    return DAYS.find(day => DAY_IDX[day] === d) || 'Monday';
};

const parseTime = (str) => {
    if (!str) return 0;
    const s = String(str).trim();
    const ampm = /([ap]m)/i.exec(s);
    const parts = s.replace(/[ap]m/i, '').trim().split(':');
    let h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1] || '0', 10) || 0;
    if (ampm) {
        const sf = ampm[1].toLowerCase();
        if (sf === 'pm' && h !== 12) h += 12;
        if (sf === 'am' && h === 12) h = 0;
    }
    return h * 60 + m;
};

const formatTime = (str) => {
    if (!str) return '';
    const mins = parseTime(str);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const sf = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${sf}`;
};

const nowMins = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const isOngoing = l => l?.start_time && l?.end_time && parseTime(l.start_time) <= nowMins() && nowMins() < parseTime(l.end_time);
const isUpcoming = l => l?.start_time && parseTime(l.start_time) > nowMins();

// ── Normalize a single raw entry. For a teacher, each entry may belong to a
// different class/section, so we surface class_level/section per-entry
// instead of assuming one fixed section (unlike a student's fixed timetable). ──
function normalizeEntry(day, periodNumber, p) {
    if (!p) return null;
    const start = p.time_slot?.start_time || p.start_time;
    const end = p.time_slot?.end_time || p.end_time;
    const isBreak = !!(p.is_break ?? p.time_slot?.is_break);
    if (isBreak || !start) return null;
    return {
        id: p.id ?? `${day}-${periodNumber ?? p.period_number ?? p.time_slot?.period_number ?? start}`,
        period_number: Number(periodNumber ?? p.period_number ?? p.time_slot?.period_number ?? 0),
        subject_name: p.subject_name || p.subject || 'Free Period',
        class_level_name: p.class_level_name || p.class_level || '',
        section_name: p.section_name || p.section || '',
        classroom: p.room_number || p.room || p.classroom || '',
        lecture_type: p.lecture_type || p.type || 'Theory',
        start_time: start,
        end_time: end,
    };
}

// ── Normalize the my-timetable response. Supports every shape the backend
// might return, same defensive approach as StudentTimetable — no hardcoding
// to one contract. ──
function normalizeTimetable(payload) {
    const out = {};
    DAYS.forEach(day => { out[day] = []; });

    const byDay = payload?.timetable || payload?.data?.timetable;

    if (byDay && typeof byDay === 'object' && !Array.isArray(byDay)) {
        DAYS.forEach(day => {
            const periods = byDay[day];
            if (!periods) return;
            const entries = Array.isArray(periods)
                ? periods.map(p => normalizeEntry(day, p.period_number, p))
                : Object.entries(periods).map(([periodNumber, p]) => normalizeEntry(day, periodNumber, p));
            out[day] = entries.filter(Boolean);
        });
        return out;
    }

    const flatList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.entries)
                ? payload.entries
                : null;

    if (flatList) {
        flatList.forEach(raw => {
            const day = raw.day || raw.time_slot?.day;
            if (!day || !out[day]) return;
            const entry = normalizeEntry(day, raw.period_number, raw);
            if (entry) out[day].push(entry);
        });
    }

    return out;
}

// ── Subject colours ──
const PALETTE = [
    { bg: '#EEF2FF', text: '#3730A3', border: '#A5B4FC', dot: '#6366F1' },
    { bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7', dot: '#10B981' },
    { bg: '#EFF6FF', text: '#1E40AF', border: '#93C5FD', dot: '#3B82F6' },
    { bg: '#FFF7ED', text: '#9A3412', border: '#FDB87A', dot: '#F97316' },
    { bg: '#FDF4FF', text: '#6B21A8', border: '#D8B4FE', dot: '#A855F7' },
    { bg: '#FFF1F2', text: '#9F1239', border: '#FDA4AF', dot: '#F43F5E' },
    { bg: '#F0FDF4', text: '#166534', border: '#86EFAC', dot: '#22C55E' },
];
const colorMap = {};
let cIdx = 0;
const subjectColor = name => {
    if (!colorMap[name]) {
        colorMap[name] = PALETTE[cIdx++ % PALETTE.length];
    }
    return colorMap[name];
};

const TYPE_META = {
    Theory: { label: 'Theory', bg: 'bg-blue-50', text: 'text-blue-700', icon: 'menu_book' },
    Lab: { label: 'Lab', bg: 'bg-green-50', text: 'text-green-700', icon: 'science' },
    Tutorial: { label: 'Tutorial', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'edit_note' },
};
const getType = t => TYPE_META[t] || { label: t || 'Lecture', bg: 'bg-slate-50', text: 'text-slate-600', icon: 'school' };

// ── Weekly Gantt chart ──
const C_START = 8 * 60, C_END = 18 * 60, C_SPAN = C_END - C_START;
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

function WeeklyChart({ timetable, today }) {
    return (
        <div className="overflow-x-auto pb-2">
            <div style={{ minWidth: 640 }}>
                <div className="flex ml-16 mb-1">
                    {HOURS.map(h => (
                        <div key={h} style={{ flex: `0 0 ${100 / HOURS.length}%` }}
                            className="text-[10px] font-semibold text-slate-400">
                            {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                        </div>
                    ))}
                </div>

                {DAYS.slice(0, 5).map(day => {
                    const lecs = [...(timetable[day] || [])].sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
                    const isTday = day === today;
                    return (
                        <div key={day} className="flex items-center mb-1.5">
                            <div className={`w-14 shrink-0 text-right pr-2 text-[11px] font-bold ${isTday ? 'text-primary' : 'text-slate-400'}`}>
                                {day.slice(0, 3).toUpperCase()}
                                {isTday && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-0.5" />}
                            </div>
                            <div className={`flex-1 relative h-9 rounded-lg border ${isTday ? 'bg-blue-50 border-blue-200' : 'bg-surface-container border-surface-container'} overflow-hidden`}>
                                {HOURS.map((_, i) => (
                                    <div key={i} className="absolute top-0 bottom-0 w-px bg-slate-200 opacity-50"
                                        style={{ left: `${(i / (HOURS.length - 1)) * 100}%` }} />
                                ))}
                                {isTday && nowMins() >= C_START && nowMins() <= C_END && (
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                                        style={{ left: `${((nowMins() - C_START) / C_SPAN) * 100}%` }}>
                                        <div className="w-2 h-2 rounded-full bg-red-500 -mt-0.5 -ml-0.5" />
                                    </div>
                                )}
                                {lecs.map(lec => {
                                    const s = Math.max(parseTime(lec.start_time), C_START);
                                    const e = Math.min(parseTime(lec.end_time), C_END);
                                    if (s >= C_END || e <= C_START) return null;
                                    const left = ((s - C_START) / C_SPAN) * 100;
                                    const width = ((e - s) / C_SPAN) * 100;
                                    const c = subjectColor(lec.subject_name);
                                    return (
                                        <div key={lec.id}
                                            title={`${lec.subject_name} · ${formatTime(lec.start_time)}–${formatTime(lec.end_time)} · ${lec.class_level_name} ${lec.section_name} · ${lec.classroom}`}
                                            style={{
                                                position: 'absolute', left: `${left}%`, width: `${width}%`, top: 3, bottom: 3,
                                                background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 5,
                                                display: 'flex', alignItems: 'center', padding: '0 4px', overflow: 'hidden'
                                            }}>
                                            <span style={{ fontSize: 9, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                                {isOngoing(lec) ? '● ' : ''}{lec.subject_name.split(' ').map(w => w[0]).join('')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                <div className="flex flex-wrap gap-3 ml-16 mt-3 pt-3 border-t border-surface-container-low">
                    {Object.keys(colorMap).map(s => (
                        <div key={s} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: colorMap[s].dot }} />
                            <span className="text-[11px] font-medium text-on-surface-variant">{s}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                        <span className="text-[11px] font-medium text-on-surface-variant">Now</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Skeleton ──
function Skeleton({ className = '' }) {
    return <div className={`animate-pulse bg-gray-200 rounded-md ${className}`} />;
}

function TimetableSkeleton() {
    return (
        <MainLayout title="Timetable">
            <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex gap-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="flex-1 h-20 rounded-xl" />)}
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="flex-1 h-10 rounded-xl" />)}
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="w-full h-20 rounded-xl" />)}
                </div>
            </div>
        </MainLayout>
    );
}

function ErrorState({ message, onRetry }) {
    return (
        <MainLayout title="Timetable">
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/10">
                    <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
                    <p className="text-sm font-bold text-on-surface">Couldn't load your timetable</p>
                    <p className="text-xs text-on-surface-variant mt-1 max-w-sm">{message}</p>
                    <button onClick={onRetry} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
                        Retry
                    </button>
                </div>
            </div>
        </MainLayout>
    );
}

function NotPublishedState({ onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/10">
            <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">hourglass_empty</span>
            <p className="text-sm font-bold text-on-surface">Your timetable hasn't been published yet</p>
            <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
                Your school's admin is still building this week's schedule. Check back once it's been saved/deployed.
            </p>
            <button onClick={onRetry} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
                Refresh
            </button>
        </div>
    );
}

// ── Academic Year Selector ──
function AcademicYearSelect({ years, value, onChange }) {
    if (!years || years.length === 0) return null;
    return (
        <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-on-surface-variant shrink-0">
                Academic Year
            </label>
            <select
                value={value}
                onChange={onChange}
                className="h-9 px-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
                {years.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                ))}
            </select>
        </div>
    );
}

// ── Main component ──
export default function TeacherTimetable() {
    const today = todayName();
    const [activeDay, setActiveDay] = useState(today);
    const [slideDir, setSlideDir] = useState('right');
    const [animating, setAnimating] = useState(false);
    const [timetable, setTimetable] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [tick, setTick] = useState(0);
    const [viewMode, setViewMode] = useState('list');
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedYearId, setSelectedYearId] = useState('');

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 60_000);
        return () => clearInterval(id);
    }, []);

    // Load the list of academic years once, for the dropdown
    useEffect(() => {
        (async () => {
            try {
                const data = await schoolAdminApi.getAcademicYears();
                const years = data?.results || data || [];
                setAcademicYears(years);
            } catch (err) {
                console.error('Failed to load academic years:', err);
            }
        })();
    }, []);

    const fetchTimetable = useCallback(async (yearId) => {
        setLoading(true);
        setError(null);
        try {
            const params = yearId ? { academic_year: yearId } : {};
            const payload = await timetableApi.getMyTimetable(params);
            setTimetable(normalizeTimetable(payload));
            // Keep the dropdown in sync with whichever year the backend
            // actually resolved to, when the caller didn't pin one down.
            if (payload?.academic_year && !yearId) {
                setAcademicYears(prev => {
                    const matched = prev.find(y => y.name === payload.academic_year);
                    if (matched) setSelectedYearId(matched.id);
                    return prev;
                });
            }
        } catch (err) {
            const status = err?.response?.status;
            setError(
                status === 404
                    ? 'No timetable has been generated for you yet. Please check back once your school publishes it.'
                    : err?.response?.data?.detail || 'Something went wrong while loading your timetable.'
            );
            setTimetable({});
        } finally {
            setLoading(false);
        }
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchTimetable(selectedYearId); }, [fetchTimetable]);

    const handleYearChange = (e) => {
        const yearId = e.target.value;
        setSelectedYearId(yearId);
        fetchTimetable(yearId);
    };

    const switchDay = day => {
        if (day === activeDay || animating) return;
        setSlideDir(DAYS.indexOf(day) > DAYS.indexOf(activeDay) ? 'right' : 'left');
        setAnimating(true);
        setActiveDay(day);
        setTimeout(() => setAnimating(false), 280);
    };

    const handleTabKey = (e, day) => {
        const i = DAYS.indexOf(day);
        if (e.key === 'ArrowRight') { e.preventDefault(); switchDay(DAYS[(i + 1) % DAYS.length]); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); switchDay(DAYS[(i - 1 + DAYS.length) % DAYS.length]); }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const lectures = useMemo(() => {
        const raw = [...(timetable[activeDay] || [])].sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
        if (!search.trim()) return raw;
        const q = search.toLowerCase();
        return raw.filter(l =>
            l.subject_name?.toLowerCase().includes(q) ||
            l.class_level_name?.toLowerCase().includes(q) ||
            l.section_name?.toLowerCase().includes(q) ||
            l.classroom?.toLowerCase().includes(q)
        );
    }, [timetable, activeDay, search, tick]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const todayLecs = useMemo(() =>
        [...(timetable[today] || [])].sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time)),
        [timetable, today, tick]
    );
    const liveClass = useMemo(() => todayLecs.find(isOngoing), [todayLecs]);
    const nextClass = useMemo(() => todayLecs.find(isUpcoming), [todayLecs]);
    const remainingToday = useMemo(() => todayLecs.filter(l => parseTime(l.start_time) >= nowMins()).length, [todayLecs]);
    const weekSubjects = useMemo(() => new Set(Object.values(timetable).flat().map(l => l.subject_name)).size, [timetable]);
    const totalWeekLectures = useMemo(() => Object.values(timetable).flat().length, [timetable]);

    if (loading) return <TimetableSkeleton />;
    if (error) return <ErrorState message={error} onRetry={() => fetchTimetable(selectedYearId)} />;

    const dur = (s, e) => { const d = parseTime(e) - parseTime(s); return d >= 60 ? `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}m` : ''}` : ` ${d}m`; };

    if (totalWeekLectures === 0) {
        return (
            <MainLayout title="Timetable">
                <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
                    <AcademicYearSelect years={academicYears} value={selectedYearId} onChange={handleYearChange} />
                    <NotPublishedState onRetry={() => fetchTimetable(selectedYearId)} />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Timetable">
            <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

                <AcademicYearSelect years={academicYears} value={selectedYearId} onChange={handleYearChange} />

                {/* Stat cards */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-surface-container-lowest rounded-xl px-4 py-3 shadow-sm border border-outline-variant/10 flex items-center gap-3">
                        <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                            <span className="material-symbols-outlined text-xl">calendar_month</span>
                        </span>
                        <div>
                            <p className="text-xs font-medium text-on-surface-variant">Today's classes</p>
                            <p className="text-xl font-bold text-on-surface leading-tight">{todayLecs.length}</p>
                        </div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-xl px-4 py-3 shadow-sm border border-outline-variant/10 flex items-center gap-3">
                        <span className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                            <span className="material-symbols-outlined text-xl">hourglass_bottom</span>
                        </span>
                        <div>
                            <p className="text-xs font-medium text-on-surface-variant">Remaining</p>
                            <p className="text-xl font-bold text-on-surface leading-tight">{remainingToday} left</p>
                        </div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-xl px-4 py-3 shadow-sm border border-outline-variant/10 flex items-center gap-3">
                        <span className={`p-2 rounded-lg shrink-0 ${liveClass ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                            <span className="material-symbols-outlined text-xl">{liveClass ? 'wifi' : 'alarm'}</span>
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-on-surface-variant">{liveClass ? 'Teaching now' : 'Next class'}</p>
                            <p className="text-sm font-bold text-on-surface leading-tight truncate">
                                {liveClass ? liveClass.subject_name : nextClass ? formatTime(nextClass.start_time) : 'All done!'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-xl px-4 py-3 shadow-sm border border-outline-variant/10 flex items-center gap-3">
                        <span className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                            <span className="material-symbols-outlined text-xl">library_books</span>
                        </span>
                        <div>
                            <p className="text-xs font-medium text-on-surface-variant">Subjects / week</p>
                            <p className="text-xl font-bold text-on-surface leading-tight">{weekSubjects}</p>
                        </div>
                    </div>
                </section>

                {liveClass && (
                    <div className="flex items-center justify-between flex-wrap gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 mb-0.5">● Live now</p>
                            <p className="text-sm font-bold text-on-surface">{liveClass.subject_name}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                                {liveClass.class_level_name} {liveClass.section_name} · {liveClass.classroom}
                            </p>
                        </div>
                        <p className="text-2xl font-black text-blue-700 tracking-tight whitespace-nowrap">
                            {formatTime(liveClass.start_time)} → {formatTime(liveClass.end_time)}
                        </p>
                    </div>
                )}
                {!liveClass && activeDay === today && nextClass && (
                    <div className="flex items-center justify-between flex-wrap gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-green-700 mb-0.5">↑ Next class</p>
                            <p className="text-sm font-bold text-on-surface">{nextClass.subject_name}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                                {nextClass.class_level_name} {nextClass.section_name} · {nextClass.classroom}
                            </p>
                        </div>
                        <p className="text-2xl font-black text-green-700 tracking-tight whitespace-nowrap">
                            {formatTime(nextClass.start_time)}
                        </p>
                    </div>
                )}

                {/* Day tabs */}
                <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-1.5 flex gap-1 overflow-x-auto scrollbar-hide"
                    role="tablist" aria-label="Days of the week">
                    {DAYS.map((day, i) => {
                        const count = (timetable[day] || []).length;
                        const active = activeDay === day;
                        const isT = day === today;
                        return (
                            <button key={day} role="tab" aria-selected={active}
                                tabIndex={active ? 0 : -1}
                                onKeyDown={e => handleTabKey(e, day)}
                                onClick={() => switchDay(day)}
                                className={`flex-1 min-w-[52px] flex flex-col items-center gap-0.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all relative
                  ${active
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-on-surface-variant hover:bg-surface-container'
                                    }`}
                            >
                                <span className="hidden sm:inline">{day}</span>
                                <span className="sm:hidden">{SHORT_DAYS[i]}</span>
                                {count > 0 && <span className={`text-[9px] font-extrabold ${active ? 'opacity-80' : 'opacity-60'}`}>{count}</span>}
                                {isT && !active && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
                            </button>
                        );
                    })}
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">search</span>
                        <input type="search"
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            placeholder="Subject, class, section, room…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {search && (
                        <button onClick={() => setSearch('')}
                            className="h-9 px-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
                            ✕ Clear
                        </button>
                    )}
                    <div className="flex gap-1 bg-surface-container rounded-lg p-1 ml-auto">
                        {[['list', '☰ List'], ['chart', '▦ Chart']].map(([mode, label]) => (
                            <button key={mode} onClick={() => setViewMode(mode)}
                                className={`h-7 px-3 rounded-md text-xs font-semibold transition-all
                  ${viewMode === mode ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {viewMode === 'list' && (
                        <span className="text-xs text-on-surface-variant font-medium">
                            {lectures.length} lecture{lectures.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {/* Content */}
                {viewMode === 'chart' ? (
                    <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-6 shadow-sm border border-outline-variant/10">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-bold text-on-surface">Weekly Schedule</p>
                            <p className="text-xs text-on-surface-variant">Mon – Fri · 8 AM – 6 PM</p>
                        </div>
                        <WeeklyChart timetable={timetable} today={today} />
                    </div>
                ) : (
                    <div className={`space-y-2.5 ${animating ? (slideDir === 'right' ? 'animate-[slideInRight_0.25s_ease]' : 'animate-[slideInLeft_0.25s_ease]') : ''}`}>
                        {lectures.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-4xl text-on-surface-variant">
                                        {search ? 'search_off' : 'event_available'}
                                    </span>
                                </div>
                                <p className="text-base font-bold text-on-surface mb-1">
                                    {search ? 'No matching lectures' : 'No classes scheduled'}
                                </p>
                                <p className="text-sm text-on-surface-variant max-w-[260px] leading-relaxed">
                                    {search ? 'Try a different subject, class, or room.' : 'Enjoy your free day! 🎉'}
                                </p>
                            </div>
                        ) : lectures.map(lec => {
                            const c = subjectColor(lec.subject_name);
                            const tm = getType(lec.lecture_type);
                            const live = isOngoing(lec);
                            return (
                                <div key={lec.id}
                                    className={`bg-surface-container-lowest rounded-xl border shadow-sm flex overflow-hidden transition-all hover:shadow-md hover:-translate-y-px
                    ${live ? 'border-blue-300 ring-2 ring-blue-100 animate-pulse-border' : 'border-outline-variant/10'}`}>
                                    <div className="w-1 shrink-0" style={{ background: c.dot }} />
                                    <div className="flex-1 px-4 py-3 flex flex-wrap items-center gap-3 min-w-0">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
                                                    style={{ background: c.bg, color: c.text, borderColor: c.border }}>
                                                    {lec.subject_name}
                                                </span>
                                                {live && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider bg-primary text-white px-2 py-0.5 rounded-full animate-pulse">
                                                        <span className="w-1.5 h-1.5 bg-white rounded-full" />Live
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-on-surface-variant flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">groups</span>
                                                {lec.class_level_name} {lec.section_name && `· ${lec.section_name}`}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${tm.bg} ${tm.text}`}>
                                                    <span className="material-symbols-outlined text-[11px]">{tm.icon}</span>
                                                    {tm.label}
                                                </span>
                                                {lec.classroom && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-on-surface-variant">
                                                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                                                        {lec.classroom}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 gap-0.5">
                                            <p className="text-sm font-extrabold text-on-surface whitespace-nowrap">
                                                {formatTime(lec.start_time)}
                                                <span className="text-slate-300 mx-1">→</span>
                                                {formatTime(lec.end_time)}
                                            </p>
                                            <p className="text-[10px] font-semibold text-on-surface-variant">{dur(lec.start_time, lec.end_time)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}