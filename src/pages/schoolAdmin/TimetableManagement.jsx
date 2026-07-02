import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import SchoolLayout from "../../components/erp/school/SchoolLayout";
import { schoolAdminApi } from "../../services/schoolAdminApi";
import { timetableApi } from "../../services/timetableApi";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TODAY_NAME = DAYS[(new Date().getDay() + 6) % 7] || null;

async function fetchAllPages(fetchPage, params = {}) {
    let page = 1;
    let all = [];
    let guard = 0;
    while (guard < 50) {
        guard += 1;
        const res = await fetchPage({ ...params, page, page_size: params.page_size || 100 });
        const results = res?.results ?? res ?? [];
        all = all.concat(Array.isArray(results) ? results : []);
        if (!res || !res.next) break;
        page += 1;
    }
    return all;
}

function toMinutes(t) {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}
function minutesToTime(mins) {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function fmtTime(t) {
    if (!t) return "";
    return t.slice(0, 5);
}

const SUBJECT_PALETTE = [
    { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", dot: "bg-blue-500" },
    { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", dot: "bg-emerald-500" },
    { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-800", dot: "bg-violet-500" },
    { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500" },
    { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", dot: "bg-rose-500" },
    { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-800", dot: "bg-cyan-500" },
    { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", dot: "bg-orange-500" },
    { bg: "bg-fuchsia-50", border: "border-fuchsia-200", text: "text-fuchsia-800", dot: "bg-fuchsia-500" },
];
function subjectColor(key) {
    if (!key) return SUBJECT_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length];
}

function Skeleton({ className = "", style = {} }) {
    return (
        <div
            className={`rounded-md ${className}`}
            style={{
                background:
                    "linear-gradient(90deg, color-mix(in srgb, var(--color-outline-variant) 16%, var(--color-surface-container-lowest)) 25%, color-mix(in srgb, var(--color-outline-variant) 28%, var(--color-surface-container-lowest)) 50%, color-mix(in srgb, var(--color-outline-variant) 16%, var(--color-surface-container-lowest)) 75%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-shimmer 1.4s ease infinite",
                ...style,
            }}
        />
    );
}

function TimetableSkeleton() {
    return (
        <div className="flex flex-col gap-4 px-4 md:px-8 pt-4 pb-12 max-w-7xl mx-auto w-full animate-[fadeIn_0.25s_ease]">
            <div>
                <Skeleton style={{ width: 220, height: 28 }} />
                <Skeleton style={{ width: 340, height: 16, marginTop: 8 }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} style={{ width: "100%", height: 76 }} />
                ))}
            </div>
            <div className="flex gap-3 flex-wrap">
                <Skeleton style={{ width: 180, height: 40 }} />
                <Skeleton style={{ width: 180, height: 40 }} />
                <Skeleton style={{ width: 180, height: 40 }} />
            </div>
            <div className="rounded-xl border border-outline-variant/10">
                <Skeleton style={{ width: "100%", height: 420 }} />
            </div>
        </div>
    );
}

function GridSkeleton() {
    return (
        <div className="p-4 animate-[fadeIn_0.2s_ease]">
            <Skeleton style={{ width: "100%", height: 360 }} />
        </div>
    );
}

function EmptyState({ icon, title, subtitle, action }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">{icon}</span>
            <p className="text-sm font-bold text-on-surface">{title}</p>
            {subtitle && <p className="text-xs text-on-surface-variant mt-1 max-w-sm">{subtitle}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

function Toast({ message, tone = "default", onDismiss }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 3200);
        return () => clearTimeout(t);
    }, [message, onDismiss]);
    const toneStyles = {
        default: "bg-surface-container-high text-on-surface border-outline-variant/10",
        success: "bg-emerald-50 text-emerald-800 border-emerald-200",
        error: "bg-red-50 text-red-700 border-red-200",
    };
    const toneIcon = { default: "info", success: "check_circle", error: "error" };
    return (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-semibold animate-[fadeIn_0.2s_ease] ${toneStyles[tone]}`}>
            <span className="material-symbols-outlined text-base">{toneIcon[tone]}</span>
            {message}
        </div>
    );
}

// ── In-app confirm dialog (replaces window.confirm) ──
function ConfirmDialog({
    title = "Are you sure?",
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "danger",
    busy = false,
    onConfirm,
    onCancel,
}) {
    const toneBtn =
        tone === "danger"
            ? "bg-red-600 hover:bg-red-700"
            : "bg-primary hover:bg-primary/90";
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease]">
            <div className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-outline-variant/10">
                <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tone === "danger" ? "bg-red-50 text-red-600" : "bg-primary/10 text-primary"}`}>
                        <span className="material-symbols-outlined text-lg">
                            {tone === "danger" ? "warning" : "help"}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-headline font-bold text-on-surface">{title}</h3>
                        <p className="text-xs text-on-surface-variant mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex gap-2 pt-4 mt-4 border-t border-outline-variant/10">
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className={`px-4 py-2 text-white rounded-lg text-sm font-bold disabled:opacity-70 transition-colors flex items-center gap-2 ${toneBtn}`}
                    >
                        {busy && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                        {confirmLabel}
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="px-4 py-2 border border-outline-variant/20 text-on-surface-variant rounded-lg text-sm font-bold hover:bg-surface-container-high transition-colors disabled:opacity-70"
                    >
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SettingsBanner({ onConfigure }) {
    return (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <span className="material-symbols-outlined text-amber-600">warning</span>
            <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Timetable settings not configured</p>
                <p className="text-xs text-amber-700 mt-1">
                    Periods per day, period duration, and working days must be set before slots can be generated.
                </p>
            </div>
            <button
                onClick={onConfigure}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 shrink-0 transition-colors"
            >
                Configure now
            </button>
        </div>
    );
}

function StatCard({ icon, label, value, accent = "text-primary", footnote }) {
    return (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 flex items-start gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-surface-container-high/60 shrink-0`}>
                <span className={`material-symbols-outlined text-lg ${accent}`}>{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-xl font-headline font-extrabold text-on-surface leading-tight">{value}</p>
                <p className="text-2xs font-bold uppercase tracking-wide text-on-surface-variant mt-0.5">{label}</p>
                {footnote && <p className="text-2xs text-outline mt-0.5 truncate">{footnote}</p>}
            </div>
        </div>
    );
}

function Field({ label, children, span = 1 }) {
    return (
        <div className={span === 2 ? "col-span-2" : ""}>
            <label className="text-2xs font-bold uppercase tracking-wide text-on-surface-variant block mb-1">{label}</label>
            {children}
        </div>
    );
}
const inputCls =
    "w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors";

function SettingsModal({ onClose, onSaved, isEdit = false, initialValues = null }) {
    const [form, setForm] = useState(() => {
        if (initialValues) {
            return {
                periods_per_day: initialValues.periods_per_day || 8,
                period_duration: initialValues.period_duration || 45,
                working_days: initialValues.working_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                school_start_time: (initialValues.school_start_time || "08:00").slice(0, 5),
                school_end_time: (initialValues.school_end_time || "15:00").slice(0, 5),
                lunch_duration: initialValues.lunch_duration || 30,
                lunch_start_after_period: initialValues.lunch_start_after_period || 4,
                max_same_subject_per_day: initialValues.max_same_subject_per_day || 2,
                max_same_subject_per_week: initialValues.max_same_subject_per_week || 6,
                auto_generate: initialValues.auto_generate || false,
            };
        }
        return {
            periods_per_day: 8,
            period_duration: 45,
            working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            school_start_time: "08:00",
            school_end_time: "15:00",
            lunch_duration: 30,
            lunch_start_after_period: 4,
            max_same_subject_per_day: 2,
            max_same_subject_per_week: 6,
            auto_generate: false,
        };
    });

    const [endTimeManuallyEdited, setEndTimeManuallyEdited] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const requiredMinutes = useMemo(
        () => (form.periods_per_day || 0) * (form.period_duration || 0) + (form.lunch_duration || 0),
        [form.periods_per_day, form.period_duration, form.lunch_duration]
    );
    const availableMinutes = useMemo(
        () => toMinutes(form.school_end_time) - toMinutes(form.school_start_time),
        [form.school_start_time, form.school_end_time]
    );
    const isBalanced = availableMinutes === requiredMinutes;
    const isOverBudget = availableMinutes < requiredMinutes;
    const surplusMinutes = availableMinutes - requiredMinutes;

    useEffect(() => {
        if (endTimeManuallyEdited) return;
        const startMins = toMinutes(form.school_start_time);
        const computedEnd = minutesToTime(startMins + requiredMinutes);
        if (computedEnd !== form.school_end_time) {
            setForm((f) => ({ ...f, school_end_time: computedEnd }));
        }
    }, [form.periods_per_day, form.period_duration, form.lunch_duration, form.school_start_time, endTimeManuallyEdited]);

    const toggleDay = (day) => {
        setForm((f) => ({
            ...f,
            working_days: f.working_days.includes(day)
                ? f.working_days.filter((d) => d !== day)
                : [...f.working_days, day],
        }));
    };

    const handleAutoFixEndTime = () => {
        const startMins = toMinutes(form.school_start_time);
        setForm((f) => ({ ...f, school_end_time: minutesToTime(startMins + requiredMinutes) }));
        setEndTimeManuallyEdited(false);
    };

    const handleSave = async () => {
        if (!isBalanced) {
            setError(
                isOverBudget
                    ? `Total time needed (${requiredMinutes} min) exceeds the school day (${availableMinutes} min). Click "Auto-fix" or adjust the values below.`
                    : `The school day (${availableMinutes} min) has ${Math.abs(surplusMinutes)} unused minutes. Click "Auto-fix" to tighten it, or adjust manually.`
            );
            return;
        }

        setSaving(true);
        setError("");
        try {
            const payload = {
                ...form,
                school_start_time: `${form.school_start_time}:00`,
                school_end_time: `${form.school_end_time}:00`,
            };
            if (isEdit) {
                await timetableApi.updateTimetableSettings(payload);
            } else {
                await timetableApi.onboardTimetableSettings(payload);
            }
            onSaved();
            onClose();
        } catch (err) {
            const data = err?.response?.data;
            let message = "Failed to save settings.";
            if (data) {
                if (data.detail) {
                    message = data.detail;
                } else {
                    const firstField = Object.keys(data)[0];
                    const firstMsg = Array.isArray(data[firstField]) ? data[firstField][0] : data[firstField];
                    if (firstField && firstMsg) {
                        message = `${firstField.replace(/_/g, " ")}: ${firstMsg}`;
                    }
                }
            }
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant/10 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-1">
                    <div>
                        <h3 className="text-lg font-headline font-bold text-on-surface">
                            {isEdit ? "Edit Timetable Settings" : "Configure Timetable Settings"}
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                            These rules drive period scheduling. Saving here never changes existing slots.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-surface-container-high rounded-lg shrink-0">
                        <span className="material-symbols-outlined text-on-surface-variant">close</span>
                    </button>
                </div>

                {error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">{error}</p>
                )}

                <div
                    className={`mt-4 rounded-lg border px-3 py-2.5 flex items-start gap-2.5 ${isBalanced
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-amber-50 border-amber-200"
                        }`}
                >
                    <span className={`material-symbols-outlined text-base mt-0.5 ${isBalanced ? "text-emerald-600" : "text-amber-600"}`}>
                        {isBalanced ? "check_circle" : "schedule"}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${isBalanced ? "text-emerald-800" : "text-amber-800"}`}>
                            {isBalanced
                                ? `Day fits exactly: ${requiredMinutes} min needed, ${availableMinutes} min available.`
                                : isOverBudget
                                    ? `Needs ${requiredMinutes} min but only ${availableMinutes} min available (over by ${Math.abs(surplusMinutes)} min).`
                                    : `Needs ${requiredMinutes} min but ${availableMinutes} min available (${surplusMinutes} min unused).`}
                        </p>
                        <p className={`text-2xs mt-0.5 ${isBalanced ? "text-emerald-700" : "text-amber-700"}`}>
                            {isBalanced
                                ? "School End adjusts automatically as you change periods, length, or lunch."
                                : "School End was edited manually and no longer matches. Auto-fix will recompute it."}
                        </p>
                    </div>
                    {!isBalanced && (
                        <button
                            type="button"
                            onClick={handleAutoFixEndTime}
                            className="shrink-0 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-2xs font-bold hover:bg-amber-700 transition-colors"
                        >
                            Auto-fix
                        </button>
                    )}
                </div>

                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Periods / Day">
                            <input
                                type="number"
                                min="1"
                                value={form.periods_per_day}
                                onChange={(e) => setForm((f) => ({ ...f, periods_per_day: Number(e.target.value) || 0 }))}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Period Length (min)">
                            <input
                                type="number"
                                min="1"
                                value={form.period_duration}
                                onChange={(e) => setForm((f) => ({ ...f, period_duration: Number(e.target.value) || 0 }))}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="School Start">
                            <input
                                type="time"
                                value={form.school_start_time}
                                onChange={(e) => {
                                    setForm((f) => ({ ...f, school_start_time: e.target.value }));
                                }}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="School End">
                            <input
                                type="time"
                                value={form.school_end_time}
                                onChange={(e) => {
                                    setEndTimeManuallyEdited(true);
                                    setForm((f) => ({ ...f, school_end_time: e.target.value }));
                                }}
                                className={`${inputCls} ${!isBalanced ? "border-amber-300 focus:border-amber-500 focus:ring-amber-500/10" : ""}`}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Lunch Duration (min)">
                            <input
                                type="number"
                                min="1"
                                value={form.lunch_duration}
                                onChange={(e) => setForm((f) => ({ ...f, lunch_duration: Number(e.target.value) || 0 }))}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Lunch After Period">
                            <input
                                type="number"
                                min="1"
                                max={form.periods_per_day - 1}
                                value={form.lunch_start_after_period}
                                onChange={(e) => setForm((f) => ({ ...f, lunch_start_after_period: Number(e.target.value) || 0 }))}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Max Same Subject / Day">
                            <input
                                type="number"
                                min="1"
                                value={form.max_same_subject_per_day}
                                onChange={(e) => setForm((f) => ({ ...f, max_same_subject_per_day: Number(e.target.value) || 0 }))}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Max Same Subject / Week">
                            <input
                                type="number"
                                min="1"
                                value={form.max_same_subject_per_week}
                                onChange={(e) => setForm((f) => ({ ...f, max_same_subject_per_week: Number(e.target.value) || 0 }))}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field label="Working Days">
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map((day) => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${form.working_days.includes(day)
                                        ? "bg-primary text-white border-primary"
                                        : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high"
                                        }`}
                                >
                                    {day.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <label className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2.5 cursor-pointer border border-outline-variant/10">
                        <input
                            type="checkbox"
                            checked={form.auto_generate}
                            onChange={(e) => setForm((f) => ({ ...f, auto_generate: e.target.checked }))}
                            className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-medium text-on-surface-variant">Enable auto-generation of future slots</span>
                    </label>

                    <div className="flex gap-2 pt-2 border-t border-outline-variant/10">
                        <button
                            onClick={handleSave}
                            disabled={saving || !isBalanced}
                            title={!isBalanced ? "Fix the time budget mismatch above before saving" : undefined}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                            {saving ? "Saving..." : "Save & Continue"}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-outline-variant/20 text-on-surface-variant rounded-lg text-sm font-bold hover:bg-surface-container-high transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Entry Modal (with sectionClassLevelId fix + subject-aware teacher filtering) ──
function EntryModal({
    mode,
    entry,
    timeSlot,
    classLevelId,
    sectionId,
    academicYearId,
    sectionClassLevelId,
    subjects,
    teachers,
    teacherAssignments = [],
    teacherAssignmentsLoading = false,
    teacherAssignmentsError = false,
    onClose,
    onSaved,
}) {
    const [subject, setSubject] = useState(entry?.subject || "");
    const [teacher, setTeacher] = useState(entry?.teacher || "");
    const [roomNumber, setRoomNumber] = useState(entry?.room_number || "");
    const [notes, setNotes] = useState(entry?.notes || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showAllTeachers, setShowAllTeachers] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const effectiveClassLevel = sectionClassLevelId || classLevelId;

    // IDs of teachers assigned to teach the selected subject, narrowed from most
    // to least specific: exact section match -> class level match -> subject-wide.
    // Returns null when no subject is chosen yet (distinct from an empty match).
    const assignedTeacherIds = useMemo(() => {
        if (!subject) return null;

        const bySection = new Set(
            teacherAssignments
                .filter(
                    (a) => String(a.subject_id) === String(subject) && sectionId && String(a.section_id) === String(sectionId)
                )
                .map((a) => String(a.teacher_id))
        );
        if (bySection.size > 0) return bySection;

        const byClassLevel = new Set(
            teacherAssignments
                .filter(
                    (a) =>
                        String(a.subject_id) === String(subject) &&
                        effectiveClassLevel &&
                        String(a.class_level_id) === String(effectiveClassLevel)
                )
                .map((a) => String(a.teacher_id))
        );
        if (byClassLevel.size > 0) return byClassLevel;

        return new Set(
            teacherAssignments
                .filter((a) => String(a.subject_id) === String(subject))
                .map((a) => String(a.teacher_id))
        );
    }, [subject, sectionId, effectiveClassLevel, teacherAssignments]);

    const noAssignedTeachers = subject && assignedTeacherIds && assignedTeacherIds.size === 0;

    // The list actually shown in the dropdown.
    const filteredTeachers = useMemo(() => {
        if (!subject || teacherAssignmentsError || showAllTeachers) return teachers;
        if (!assignedTeacherIds || assignedTeacherIds.size === 0) return [];
        return teachers.filter((t) => assignedTeacherIds.has(String(t.id)));
    }, [subject, teachers, assignedTeacherIds, showAllTeachers, teacherAssignmentsError]);

    // Never let the currently-selected teacher vanish from the list (e.g. when
    // editing an entry whose teacher's assignment has since changed).
    const teacherOptions = useMemo(() => {
        if (teacher && !filteredTeachers.some((t) => String(t.id) === String(teacher))) {
            const current = teachers.find((t) => String(t.id) === String(teacher));
            if (current) return [current, ...filteredTeachers];
        }
        return filteredTeachers;
    }, [filteredTeachers, teacher, teachers]);

    // Reset an incompatible teacher selection when the subject changes, and
    // collapse the "show all teachers" override back to the filtered view.
    const prevSubjectRef = useRef(subject);
    useEffect(() => {
        if (prevSubjectRef.current === subject) return;
        prevSubjectRef.current = subject;
        setShowAllTeachers(false);
        if (teacher && assignedTeacherIds && assignedTeacherIds.size > 0 && !assignedTeacherIds.has(String(teacher))) {
            setTeacher("");
        }
    }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

    // Convenience: if exactly one teacher is assigned to the subject, pre-select
    // them when creating a new entry (never overrides an existing edit value).
    useEffect(() => {
        if (mode === "edit" || teacher || showAllTeachers) return;
        if (assignedTeacherIds && assignedTeacherIds.size === 1) {
            setTeacher([...assignedTeacherIds][0]);
        }
    }, [assignedTeacherIds, mode, teacher, showAllTeachers]);

    const handleSave = async () => {
        if (!subject || !teacher) {
            setError("Subject and Teacher are required.");
            return;
        }
        if (!academicYearId) {
            setError("No academic year selected. Please select one above before adding periods.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const effectiveClassLevel = sectionClassLevelId || classLevelId;
            if (!effectiveClassLevel) {
                setError("Class level is not available for this section.");
                setSaving(false);
                return;
            }
            const payload = {
                academic_year: academicYearId,
                class_level: effectiveClassLevel,
                section: sectionId,
                subject,
                teacher,
                time_slot: timeSlot.id,
                room_number: roomNumber,
                notes,
            };
            if (mode === "edit" && entry?.id) {
                await timetableApi.updateTimetableEntry(entry.id, payload);
            } else {
                await timetableApi.createTimetableEntry(payload);
            }
            onSaved(mode === "edit" ? "Period updated." : "Period added.");
            onClose();
        } catch (err) {
            const detail = err?.response?.data?.detail
                || err?.response?.data?.academic_year?.[0]
                || err?.response?.data?.non_field_errors?.[0]
                || "Failed to save entry. Check for scheduling conflicts.";
            setError(detail);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            await timetableApi.deleteTimetableEntry(entry.id);
            onSaved("Period removed.");
            onClose();
        } catch (err) {
            setError("Failed to delete entry.");
            setSaving(false);
            setConfirmingDelete(false);
        }
    };

    const selectedSubjectName = subjects.find((s) => String(s.id) === String(subject))?.name;
    const accent = subjectColor(selectedSubjectName);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/10">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-headline font-bold text-on-surface">
                        {mode === "edit" ? "Edit" : "Add"} Period
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-surface-container-high rounded-lg">
                        <span className="material-symbols-outlined text-on-surface-variant">close</span>
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-4">
                    <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
                    <p className="text-xs text-on-surface-variant">
                        {timeSlot?.day} &bull; Period {timeSlot?.period_number} &bull; {fmtTime(timeSlot?.start_time)}–{fmtTime(timeSlot?.end_time)}
                    </p>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

                {confirmingDelete ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col gap-3">
                        <div className="flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-red-600 text-lg mt-0.5">warning</span>
                            <p className="text-xs text-red-800 font-medium">
                                Remove this timetable entry? This can't be undone.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDelete}
                                disabled={saving}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-70 transition-colors flex items-center gap-2"
                            >
                                {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                                {saving ? "Removing..." : "Yes, remove"}
                            </button>
                            <button
                                onClick={() => setConfirmingDelete(false)}
                                disabled={saving}
                                className="px-4 py-2 border border-outline-variant/20 text-on-surface-variant rounded-lg text-sm font-bold hover:bg-surface-container-high transition-colors disabled:opacity-70"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <Field label="Subject">
                            <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls}>
                                <option value="">Select subject</option>
                                {subjects.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Teacher">
                            <select
                                value={teacher}
                                onChange={(e) => setTeacher(e.target.value)}
                                disabled={!subject || teacherAssignmentsLoading}
                                className={`${inputCls} ${!subject || teacherAssignmentsLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                            >
                                <option value="">
                                    {!subject
                                        ? "Select a subject first"
                                        : teacherAssignmentsLoading
                                            ? "Loading teachers…"
                                            : "Select teacher"}
                                </option>
                                {teacherOptions.map((t) => (
                                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                                ))}
                            </select>
                            {subject && !teacherAssignmentsLoading && (
                                <p className="text-2xs mt-1">
                                    {teacherAssignmentsError ? (
                                        <span className="text-amber-600">
                                            Couldn't verify subject assignments — showing all teachers.
                                        </span>
                                    ) : noAssignedTeachers && !showAllTeachers ? (
                                        <span className="text-amber-600">
                                            No teacher is currently assigned to teach this subject.{" "}
                                            <button type="button" onClick={() => setShowAllTeachers(true)} className="underline font-bold">
                                                Show all teachers
                                            </button>
                                        </span>
                                    ) : showAllTeachers ? (
                                        <span className="text-on-surface-variant">
                                            Showing all teachers.{" "}
                                            <button type="button" onClick={() => setShowAllTeachers(false)} className="underline font-bold">
                                                Show only assigned
                                            </button>
                                        </span>
                                    ) : (
                                        <span className="text-on-surface-variant">
                                            {filteredTeachers.length} teacher{filteredTeachers.length === 1 ? "" : "s"} assigned to this subject.{" "}
                                            <button type="button" onClick={() => setShowAllTeachers(true)} className="underline font-bold">
                                                Show all
                                            </button>
                                        </span>
                                    )}
                                </p>
                            )}
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Room Number">
                                <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className={inputCls} placeholder="e.g. 201" />
                            </Field>
                        </div>
                        <Field label="Notes">
                            <textarea
                                rows="2"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className={`${inputCls} resize-none`}
                                placeholder="Optional — e.g. Lab session"
                            />
                        </Field>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-outline-variant/10">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-70 transition-colors"
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                            {mode === "edit" && (
                                <button
                                    onClick={() => setConfirmingDelete(true)}
                                    disabled={saving}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-70 transition-colors"
                                >
                                    Remove
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-outline-variant/20 text-on-surface-variant rounded-lg text-sm font-bold hover:bg-surface-container-high transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Slot Modal ──
function SlotModal({ day, periodNumber, defaultStart, defaultEnd, academicYearId, onClose, onSaved }) {
    const [startTime, setStartTime] = useState((defaultStart || "").slice(0, 5) || "08:00");
    const [endTime, setEndTime] = useState((defaultEnd || "").slice(0, 5) || "08:45");
    const [isBreak, setIsBreak] = useState(false);
    const [breakName, setBreakName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleCreate = async () => {
        if (!startTime || !endTime) {
            setError("Start and end time are required.");
            return;
        }
        if (toMinutes(endTime) <= toMinutes(startTime)) {
            setError("End time must be after start time.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await timetableApi.createTimeSlot({
                academic_year: academicYearId,
                day,
                period_number: periodNumber,
                start_time: `${startTime}:00`,
                end_time: `${endTime}:00`,
                is_break: isBreak,
                break_name: isBreak ? (breakName || "Break") : null,
            });
            onSaved(`Period ${periodNumber} added on ${day}.`);
            onClose();
        } catch (err) {
            setError(err?.response?.data?.detail || "Failed to create period slot. It may already exist or overlap another period.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-outline-variant/10">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-headline font-bold text-on-surface">Add Period Slot</h3>
                    <button onClick={onClose} className="p-1 hover:bg-surface-container-high rounded-lg">
                        <span className="material-symbols-outlined text-on-surface-variant">close</span>
                    </button>
                </div>
                <p className="text-xs text-on-surface-variant mb-4">{day} &bull; Period {periodNumber}</p>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Start Time">
                            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="End Time">
                            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
                        </Field>
                    </div>
                    <label className="flex items-center gap-2 bg-surface-container-low rounded-lg px-3 py-2.5 cursor-pointer border border-outline-variant/10">
                        <input
                            type="checkbox"
                            checked={isBreak}
                            onChange={(e) => setIsBreak(e.target.checked)}
                            className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-medium text-on-surface-variant">This is a break (not a teaching period)</span>
                    </label>
                    {isBreak && (
                        <Field label="Break Name">
                            <input
                                type="text"
                                value={breakName}
                                onChange={(e) => setBreakName(e.target.value)}
                                className={inputCls}
                                placeholder="e.g. Lunch Break"
                            />
                        </Field>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-outline-variant/10">
                        <button
                            onClick={handleCreate}
                            disabled={saving}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-70 transition-colors"
                        >
                            {saving ? "Adding..." : "Add Slot"}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-outline-variant/20 text-on-surface-variant rounded-lg text-sm font-bold hover:bg-surface-container-high transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ──
export default function TimetableManagement() {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [settingsChecked, setSettingsChecked] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [settingsFormData, setSettingsFormData] = useState(null);

    const [academicYears, setAcademicYears] = useState([]);
    const [classLevels, setClassLevels] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [teacherAssignments, setTeacherAssignments] = useState([]);
    const [teacherAssignmentsLoading, setTeacherAssignmentsLoading] = useState(false);
    const [teacherAssignmentsError, setTeacherAssignmentsError] = useState(false);

    const [academicYearId, setAcademicYearId] = useState("");
    const [classLevelId, setClassLevelId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [teacherFilter, setTeacherFilter] = useState("");

    const [timeSlots, setTimeSlots] = useState([]);
    const [entries, setEntries] = useState([]);
    const [gridLoading, setGridLoading] = useState(false);
    const [deploying, setDeploying] = useState(false);

    const [activeCell, setActiveCell] = useState(null);
    const [addingSlot, setAddingSlot] = useState(null);
    const [deletingSlotId, setDeletingSlotId] = useState(null);
    const [toast, setToast] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const notify = (message, tone = "default") => setToast({ message, tone });

    // ── initial load ──
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [ay, cls, subs, tch] = await Promise.all([
                    schoolAdminApi.getAcademicYears(),
                    schoolAdminApi.getClassLevels(),
                    schoolAdminApi.getSubjects(),
                    schoolAdminApi.getTeachers(),
                ]);
                setAcademicYears(ay.results || ay || []);
                setClassLevels(cls.results || cls || []);
                setSubjects(subs.results || subs || []);
                setTeachers(tch.results || tch || []);

                try {
                    const s = await timetableApi.getTimetableSettings();
                    setSettings(s);
                } catch (_) {
                    setSettings(null);
                }
                setSettingsChecked(true);
            } catch (err) {
                console.error("Init load error:", err);
                notify("Failed to load reference data.", "error");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ── teacher-subject assignments (drives the subject-aware teacher picker) ──
    useEffect(() => {
        if (!academicYearId) {
            setTeacherAssignments([]);
            setTeacherAssignmentsError(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setTeacherAssignmentsLoading(true);
            setTeacherAssignmentsError(false);
            try {
                if (typeof schoolAdminApi.getTeacherAssignments !== "function") {
                    throw new Error("schoolAdminApi.getTeacherAssignments is not available");
                }
                const rows = await fetchAllPages(schoolAdminApi.getTeacherAssignmentsForTimetable, { academic_year: academicYearId });
                if (!cancelled) setTeacherAssignments(Array.isArray(rows) ? rows : []);
            } catch (err) {
                console.error("Teacher assignments fetch error:", err);
                if (!cancelled) {
                    setTeacherAssignments([]);
                    setTeacherAssignmentsError(true);
                }
            } finally {
                if (!cancelled) setTeacherAssignmentsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [academicYearId]);
    useEffect(() => {
        if (!classLevelId) {
            setSections([]);
            setSectionId("");
            return;
        }
        (async () => {
            try {
                const res = await schoolAdminApi.getSectionsByClass(classLevelId);
                // ✅ Only keep sections that belong to the selected class level
                const filtered = (res.results || res || []).filter(s => s.class_level === classLevelId);
                setSections(filtered);
            } catch (err) {
                console.error("Sections fetch error:", err);
                notify("Failed to load sections for the selected class.", "error");
            }
        })();
        setSectionId("");
    }, [classLevelId]);

    const refreshGrid = useCallback(async () => {
        if (!academicYearId || !sectionId) {
            setTimeSlots([]);
            setEntries([]);
            return;
        }
        setGridLoading(true);
        try {
            // Compute the section's actual class level ID from the sections array
            const sectionObj = sections.find(s => s.id === sectionId);
            const sectionClassLevelId = sectionObj?.class_level?.id || sectionObj?.class_level_id || classLevelId;

            const [allSlots, allEntries] = await Promise.all([
                fetchAllPages(
                    (params) => timetableApi.getTimeSlots(params),
                    { academic_year: academicYearId }
                ),
                fetchAllPages(
                    (params) => timetableApi.getTimetableEntries(params),
                    {
                        academic_year: academicYearId,
                        class_level: sectionClassLevelId,  // ← use section’s class level
                        section: sectionId,
                        is_active: "true",
                    }
                ),
            ]);
            setTimeSlots(allSlots);
            setEntries(allEntries);
        } catch (err) {
            console.error("Grid fetch error:", err);
            notify("Failed to load the timetable grid.", "error");
        } finally {
            setGridLoading(false);
        }
    }, [academicYearId, sectionId, classLevelId, sections]); // add dependencies

    useEffect(() => {
        refreshGrid();
    }, [refreshGrid]);

    // ── Save (Deploy) Timetable ──
    const handleSaveTimetable = async () => {
        if (!academicYearId || !sectionId) {
            notify("Please select an academic year and section.", "error");
            return;
        }
        setDeploying(true);
        try {
            await timetableApi.publishTimetable(academicYearId, sectionId);
            notify("Timetable saved successfully. It is now visible to students and parents.", "success");
            refreshGrid();
        } catch (err) {
            notify(err?.response?.data?.detail || "Failed to save timetable.", "error");
        } finally {
            setDeploying(false);
        }
    };

    const handleEditSettings = async () => {
        try {
            const current = await timetableApi.getTimetableSettings();
            setSettingsFormData(current);
            setIsEditingSettings(true);
            setShowSettingsModal(true);
        } catch (err) {
            notify("Could not load current settings.", "error");
        }
    };

    const performDeleteSlot = async (slot) => {
        setConfirmDialog((c) => (c ? { ...c, busy: true } : c));
        setDeletingSlotId(slot.id);
        try {
            await timetableApi.deleteTimeSlot(slot.id);
            notify(`Period ${slot.period_number} removed from ${slot.day}.`, "success");
            setConfirmDialog(null);
            await refreshGrid();
        } catch (err) {
            notify(err?.response?.data?.detail || "Failed to delete slot.", "error");
            setConfirmDialog(null);
        } finally {
            setDeletingSlotId(null);
        }
    };

    const handleDeleteSlot = (slot, hasEntry) => {
        if (hasEntry) {
            notify("Remove the assigned subject/teacher from this period first, then delete the slot.", "error");
            return;
        }
        setConfirmDialog({
            title: "Delete this period slot?",
            message: `Delete Period ${slot.period_number} on ${slot.day} (${fmtTime(slot.start_time)}–${fmtTime(slot.end_time)})? This removes the slot for every section, not just this one.`,
            confirmLabel: "Delete",
            tone: "danger",
            busy: false,
            onConfirm: () => performDeleteSlot(slot),
            onCancel: () => setConfirmDialog(null),
        });
    };

    const periodNumbers = useMemo(() => {
        const set = new Set(timeSlots.map((s) => s.period_number));
        return Array.from(set).sort((a, b) => a - b);
    }, [timeSlots]);

    const activeDays = useMemo(() => {
        if (settings?.working_days?.length) {
            return DAYS.filter((d) => settings.working_days.includes(d));
        }
        const set = new Set(timeSlots.map((s) => s.day));
        return DAYS.filter((d) => set.has(d));
    }, [timeSlots, settings]);

    const slotMap = useMemo(() => {
        const m = {};
        timeSlots.forEach((s) => { m[`${s.day}__${s.period_number}`] = s; });
        return m;
    }, [timeSlots]);

    const entryMap = useMemo(() => {
        const m = {};
        entries.forEach((e) => { m[e.time_slot] = e; });
        return m;
    }, [entries]);

    const perDaySlots = useMemo(() => {
        const m = {};
        activeDays.forEach((d) => { m[d] = []; });
        timeSlots.forEach((s) => {
            if (!m[s.day]) m[s.day] = [];
            m[s.day].push(s);
        });
        Object.keys(m).forEach((d) => m[d].sort((a, b) => a.period_number - b.period_number));
        return m;
    }, [timeSlots, activeDays]);

    const openAddSlot = (day) => {
        const daySlots = perDaySlots[day] || [];
        const existingPeriods = new Set(daySlots.map((s) => s.period_number));

        let periodNumber = 1;
        while (existingPeriods.has(periodNumber)) periodNumber += 1;

        const repSlotForPeriod = timeSlots.find(
            (s) => s.period_number === periodNumber && s.day !== day && !s.is_break
        );

        let defaultStart, defaultEnd;
        if (repSlotForPeriod) {
            defaultStart = repSlotForPeriod.start_time;
            defaultEnd = repSlotForPeriod.end_time;
        } else {
            const duration = settings?.period_duration || 45;
            const prevSlot = daySlots
                .filter((s) => s.period_number < periodNumber)
                .sort((a, b) => b.period_number - a.period_number)[0];
            const startMins = prevSlot
                ? toMinutes(prevSlot.end_time)
                : toMinutes(settings?.school_start_time || "08:00");
            defaultStart = minutesToTime(startMins) + ":00";
            defaultEnd = minutesToTime(startMins + duration) + ":00";
        }

        setAddingSlot({ day, periodNumber, defaultStart, defaultEnd });
    };

    const openAddSlotAt = (day, periodNumber) => {
        const repSlotForPeriod = timeSlots.find(
            (s) => s.period_number === periodNumber && s.day !== day && !s.is_break
        );
        const daySlots = perDaySlots[day] || [];

        let defaultStart, defaultEnd;
        if (repSlotForPeriod) {
            defaultStart = repSlotForPeriod.start_time;
            defaultEnd = repSlotForPeriod.end_time;
        } else {
            const duration = settings?.period_duration || 45;
            const prevSlot = daySlots
                .filter((s) => s.period_number < periodNumber)
                .sort((a, b) => b.period_number - a.period_number)[0];
            const startMins = prevSlot
                ? toMinutes(prevSlot.end_time)
                : toMinutes(settings?.school_start_time || "08:00");
            defaultStart = minutesToTime(startMins) + ":00";
            defaultEnd = minutesToTime(startMins + duration) + ":00";
        }

        setAddingSlot({ day, periodNumber, defaultStart, defaultEnd });
    };

    const stats = useMemo(() => {
        const totalSlots = timeSlots.filter((s) => !s.is_break).length;
        const filled = entries.length;
        const uniqueTeachers = new Set(entries.map((e) => e.teacher)).size;
        const uniqueSubjects = new Set(entries.map((e) => e.subject)).size;
        const free = Math.max(totalSlots - filled, 0);
        return { totalSlots, filled, uniqueTeachers, uniqueSubjects, free };
    }, [timeSlots, entries]);

    const matchesTeacherFilter = useCallback(
        (entry) => {
            if (!teacherFilter) return true;
            return String(entry?.teacher) === String(teacherFilter);
        },
        [teacherFilter]
    );

    const selectedYearObj = academicYears.find((ay) => String(ay.id) === String(academicYearId));
    const selectedClassLabel = classLevels.find((c) => String(c.id) === String(classLevelId))?.name;
    const selectedSectionLabel = sections.find((s) => String(s.id) === String(sectionId))?.name;

    if (loading) {
        return (
            <SchoolLayout title="Timetable">
                <TimetableSkeleton />
            </SchoolLayout>
        );
    }

    // Show the full skeleton only when we truly have no grid data yet (first
    // fetch for this year/section). On subsequent refreshes (after a save,
    // delete, or filter change) we keep the existing grid visible and dim it
    // with a light overlay instead of unmounting it — avoids the jarring
    // flash/flicker of swapping the whole table for a skeleton each time.
    const showFullGridSkeleton = gridLoading && timeSlots.length === 0;
    const showDimOverlay = gridLoading && timeSlots.length > 0;

    return (
        <SchoolLayout title="Timetable">
            <div className="flex flex-col gap-5 px-4 md:px-8 pt-4 pb-12 max-w-7xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h2 className="text-2xl font-headline font-extrabold text-on-surface">Timetable Management</h2>
                        <p className="text-sm text-on-surface-variant mt-1">
                            Build and maintain class timetables. Students, teachers, and parents see this read-only.
                        </p>
                    </div>
                    {settings && (
                        <button
                            onClick={handleEditSettings}
                            title="Edit timetable settings"
                            className="p-2.5 border border-outline-variant/20 text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">settings</span>
                        </button>
                    )}
                </div>

                {settingsChecked && !settings && (
                    <SettingsBanner onConfigure={() => {
                        setIsEditingSettings(false);
                        setSettingsFormData(null);
                        setShowSettingsModal(true);
                    }} />
                )}

                <div className="flex flex-wrap items-center gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10 shadow-sm">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-on-surface-variant pointer-events-none">event</span>
                        <select
                            value={academicYearId}
                            onChange={(e) => setAcademicYearId(e.target.value)}
                            className="pl-8 pr-3 py-2 rounded-lg text-sm bg-surface-container-high/50 border border-outline-variant/10 focus:border-primary outline-none text-on-surface min-w-[190px] appearance-none cursor-pointer"
                        >
                            <option value="">Select Academic Year</option>
                            {academicYears.map((ay) => (
                                <option key={ay.id} value={ay.id}>
                                    {ay.name || ay.label || `${ay.start_date} – ${ay.end_date}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <select
                        value={classLevelId}
                        onChange={(e) => setClassLevelId(e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm bg-surface-container-high/50 border border-outline-variant/10 focus:border-primary outline-none text-on-surface min-w-[150px] cursor-pointer"
                    >
                        <option value="">Select Class</option>
                        {classLevels.map((cl) => (
                            <option key={cl.id} value={cl.id}>{cl.name}</option>
                        ))}
                    </select>

                    <select
                        value={sectionId}
                        onChange={(e) => setSectionId(e.target.value)}
                        disabled={!classLevelId}
                        className="px-3 py-2 rounded-lg text-sm bg-surface-container-high/50 border border-outline-variant/10 focus:border-primary outline-none text-on-surface min-w-[140px] disabled:opacity-50 cursor-pointer"
                    >
                        <option value="">Select Section</option>
                        {sections.map((s) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.class_level_name})</option>
                        ))}
                    </select>

                    {teachers.length > 0 && timeSlots.length > 0 && (
                        <select
                            value={teacherFilter}
                            onChange={(e) => setTeacherFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg text-sm bg-surface-container-high/50 border border-outline-variant/10 focus:border-primary outline-none text-on-surface min-w-[160px] cursor-pointer"
                        >
                            <option value="">All Teachers</option>
                            {teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                            ))}
                        </select>
                    )}

                    <div className="flex-1" />

                    {/* 👇 SAVE TIMETABLE BUTTON */}
                    <button
                        onClick={handleSaveTimetable}
                        disabled={!academicYearId || !sectionId || deploying}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        {deploying ? (
                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined text-base">save</span>
                        )}
                        {deploying ? "Saving..." : "Save Timetable"}
                    </button>
                </div>

                {academicYearId && sectionId && timeSlots.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard icon="grid_view" label="Total Slots" value={stats.totalSlots} />
                        <StatCard icon="event_available" label="Filled" value={stats.filled} accent="text-emerald-600" />
                        <StatCard icon="event_busy" label="Free" value={stats.free} accent="text-amber-600" />
                        <StatCard icon="diversity_3" label="Teachers Involved" value={stats.uniqueTeachers} accent="text-violet-600" />
                    </div>
                )}

                {academicYearId && sectionId && (
                    <p className="text-xs text-on-surface-variant -mt-2">
                        Showing <span className="font-bold text-on-surface">{selectedClassLabel}</span>
                        {selectedSectionLabel ? <> &bull; Section <span className="font-bold text-on-surface">{selectedSectionLabel}</span></> : null}
                        {" "}&bull; <span className="font-bold text-on-surface">{selectedYearObj?.name || selectedYearObj?.label}</span>
                        {teacherFilter && (
                            <>
                                {" "}&bull; filtered by{" "}
                                <button onClick={() => setTeacherFilter("")} className="font-bold text-primary hover:underline inline-flex items-center gap-0.5">
                                    {teachers.find((t) => String(t.id) === String(teacherFilter))?.first_name}{" "}
                                    {teachers.find((t) => String(t.id) === String(teacherFilter))?.last_name}
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </>
                        )}
                    </p>
                )}

                <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10 shadow-sm relative">
                    {!academicYearId || !sectionId ? (
                        <EmptyState
                            icon="calendar_month"
                            title="Select an academic year, class, and section"
                            subtitle="The weekly timetable grid will appear here once a section is selected."
                        />
                    ) : showFullGridSkeleton ? (
                        <GridSkeleton />
                    ) : timeSlots.length === 0 ? (
                        <EmptyState
                            icon="event_busy"
                            title="No time slots for this academic year"
                            subtitle={settings ? 'Use the "Add Period" buttons below to create periods.' : "Configure timetable settings first, then add periods."}
                            action={
                                !settings ? (
                                    <button
                                        onClick={() => {
                                            setIsEditingSettings(false);
                                            setSettingsFormData(null);
                                            setShowSettingsModal(true);
                                        }}
                                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
                                    >
                                        Configure Settings
                                    </button>
                                ) : null
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto relative">
                            {showDimOverlay && (
                                <div className="absolute inset-0 z-20 bg-surface-container-lowest/50 backdrop-blur-[1px] flex items-center justify-center transition-opacity duration-200 animate-[fadeIn_0.15s_ease]">
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
                                        <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <span className="text-xs font-bold text-on-surface-variant">Updating…</span>
                                    </div>
                                </div>
                            )}
                            <table className={`w-full text-left border-collapse transition-opacity duration-200 ${showDimOverlay ? "opacity-50" : "opacity-100"}`}>
                                <thead className="bg-surface-container-high/30 text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/10">
                                    <tr>
                                        <th className="px-3 py-3 sticky left-0 z-10 bg-surface-container-high/95 backdrop-blur">Period</th>
                                        {activeDays.map((day) => (
                                            <th
                                                key={day}
                                                className={`px-3 py-3 min-w-[170px] ${day === TODAY_NAME ? "text-primary" : ""}`}
                                            >
                                                <span className="inline-flex items-center gap-1.5">
                                                    {day}
                                                    {day === TODAY_NAME && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                    {periodNumbers.map((p) => {
                                        const repSlot = activeDays.map((d) => slotMap[`${d}__${p}`]).find(Boolean);
                                        if (repSlot?.is_break) {
                                            return (
                                                <tr key={p} className="bg-surface-container-high/20">
                                                    <td
                                                        colSpan={activeDays.length + 1}
                                                        className="px-3 py-2 text-2xs font-bold uppercase tracking-wide text-on-surface-variant text-center"
                                                    >
                                                        {repSlot.break_name || "Break"} &nbsp;·&nbsp; {fmtTime(repSlot.start_time)}–{fmtTime(repSlot.end_time)}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        return (
                                            <tr key={p}>
                                                <td className="px-3 py-2 text-xs font-bold text-on-surface-variant sticky left-0 z-10 bg-surface-container-lowest">
                                                    P{p}
                                                    {repSlot && (
                                                        <div className="text-2xs font-normal text-outline mt-0.5">
                                                            {fmtTime(repSlot.start_time)}–{fmtTime(repSlot.end_time)}
                                                        </div>
                                                    )}
                                                </td>
                                                {activeDays.map((day) => {
                                                    const slot = slotMap[`${day}__${p}`];
                                                    if (!slot) {
                                                        return (
                                                            <td key={day} className="px-2 py-2 align-top bg-surface-container-high/10">
                                                                <button
                                                                    onClick={() => openAddSlotAt(day, p)}
                                                                    className="w-full text-2xs font-bold text-primary/70 border border-dashed border-primary/20 rounded-lg py-2 hover:bg-primary/5 hover:border-primary/40 transition-colors flex items-center justify-center gap-1"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">add</span>
                                                                    P{p}
                                                                </button>
                                                            </td>
                                                        );
                                                    }
                                                    const entry = entryMap[slot.id];
                                                    const dimmed = entry && !matchesTeacherFilter(entry);
                                                    const accent = entry ? subjectColor(entry.subject_name) : null;
                                                    const isDeletingThis = deletingSlotId === slot.id;
                                                    return (
                                                        <td key={day} className={`relative group px-2 py-2 align-top ${day === TODAY_NAME ? "bg-primary/[0.03]" : ""}`}>
                                                            <button
                                                                onClick={() => {
                                                                    const sectionObj = sections.find(s => s.id === sectionId);
                                                                    const sectionClassLevelId = sectionObj?.class_level || sectionObj?.class_level_id || classLevelId;
                                                                    setActiveCell({
                                                                        timeSlot: slot,
                                                                        entry: entry || null,
                                                                        sectionClassLevelId
                                                                    });
                                                                }}
                                                                className={`w-full text-left rounded-lg p-2 text-xs transition-all border ${entry
                                                                    ? `${accent.bg} ${accent.border} hover:shadow-sm hover:-translate-y-0.5`
                                                                    : "border-dashed border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high/40 hover:border-primary/40"
                                                                    } ${dimmed ? "opacity-25" : ""}`}
                                                            >
                                                                {entry ? (
                                                                    <>
                                                                        <p className={`font-bold truncate flex items-center gap-1.5 ${accent.text}`}>
                                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accent.dot}`} />
                                                                            {entry.subject_name}
                                                                        </p>
                                                                        <p className="text-2xs text-on-surface-variant truncate mt-0.5">{entry.teacher_name}</p>
                                                                        {entry.room_number && (
                                                                            <p className="text-2xs text-outline truncate">Room {entry.room_number}</p>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <span className="flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-sm">add</span>
                                                                        Add
                                                                    </span>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteSlot(slot, Boolean(entry));
                                                                }}
                                                                disabled={isDeletingThis}
                                                                title={entry ? "Remove the assignment first to delete this period slot" : "Delete this period slot"}
                                                                className="absolute top-1 right-1 w-5 h-5 rounded-md bg-surface-container-lowest border border-outline-variant/20 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-opacity"
                                                            >
                                                                {isDeletingThis ? (
                                                                    <span className="w-2.5 h-2.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                                                                ) : (
                                                                    <span className="material-symbols-outlined text-[13px] text-red-500">close</span>
                                                                )}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                    <tr>
                                        <td className="px-3 py-2 text-2xs font-bold text-on-surface-variant sticky left-0 z-10 bg-surface-container-lowest">
                                            &nbsp;
                                        </td>
                                        {activeDays.map((day) => (
                                            <td key={day} className="px-2 py-2">
                                                <button
                                                    onClick={() => openAddSlot(day)}
                                                    className="w-full text-2xs font-bold text-primary border border-dashed border-primary/30 rounded-lg py-1.5 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">add</span>
                                                    Add Period
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showSettingsModal && (
                <SettingsModal
                    isEdit={isEditingSettings}
                    initialValues={settingsFormData}
                    onClose={() => {
                        setShowSettingsModal(false);
                        setIsEditingSettings(false);
                        setSettingsFormData(null);
                    }}
                    onSaved={async () => {
                        const s = await timetableApi.getTimetableSettings();
                        setSettings(s);
                        if (academicYearId) {
                            try {
                                await timetableApi.generateTimeSlots(academicYearId);
                                await refreshGrid();
                                notify("Timetable settings saved and applied to the grid.", "success");
                            } catch (err) {
                                notify("Settings saved, but the grid couldn't be refreshed automatically. Reload the page to see updated timings.", "error");
                            }
                        } else {
                            notify("Timetable settings saved.", "success");
                        }
                    }}
                />
            )}

            {activeCell && (
                <EntryModal
                    mode={activeCell.entry ? "edit" : "create"}
                    entry={activeCell.entry}
                    timeSlot={activeCell.timeSlot}
                    classLevelId={classLevelId}
                    sectionId={sectionId}
                    academicYearId={academicYearId}
                    sectionClassLevelId={activeCell.sectionClassLevelId}
                    subjects={subjects}
                    teachers={teachers}
                    teacherAssignments={teacherAssignments}
                    teacherAssignmentsLoading={teacherAssignmentsLoading}
                    teacherAssignmentsError={teacherAssignmentsError}
                    onClose={() => setActiveCell(null)}
                    onSaved={(msg) => {
                        refreshGrid();
                        if (msg) notify(msg, "success");
                    }}
                />
            )}

            {addingSlot && (
                <SlotModal
                    day={addingSlot.day}
                    periodNumber={addingSlot.periodNumber}
                    defaultStart={addingSlot.defaultStart}
                    defaultEnd={addingSlot.defaultEnd}
                    academicYearId={academicYearId}
                    onClose={() => setAddingSlot(null)}
                    onSaved={(msg) => {
                        refreshGrid();
                        if (msg) notify(msg, "success");
                    }}
                />
            )}

            {confirmDialog && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmLabel={confirmDialog.confirmLabel}
                    tone={confirmDialog.tone}
                    busy={confirmDialog.busy}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={confirmDialog.onCancel}
                />
            )}

            {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
        </SchoolLayout>
    );
}