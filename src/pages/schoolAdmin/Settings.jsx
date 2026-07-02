import SchoolLayout from "../../components/erp/school/SchoolLayout";
import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useSchoolAdmin } from "../../context/SchoolAdminProvider";

// ─────────────────────────────────────────────
// Skeleton Loader (matches other pages)
// ─────────────────────────────────────────────
function Skeleton({ className = "", style = {} }) {
  return (
    <div
      className={`rounded-md ${className}`}
      style={{
        background: "linear-gradient(90deg, color-mix(in srgb, var(--color-outline-variant) 16%, var(--color-surface-container-lowest)) 25%, color-mix(in srgb, var(--color-outline-variant) 28%, var(--color-surface-container-lowest)) 50%, color-mix(in srgb, var(--color-outline-variant) 16%, var(--color-surface-container-lowest)) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.4s ease infinite",
        ...style,
      }}
    />
  );
}

// ─────────────────────────────────────────────
// Stat Card (reused)
// ─────────────────────────────────────────────
function StatCard({ icon, label, value, accentColor }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 flex flex-col justify-between transition-all duration-200"
      style={{
        background: "var(--color-surface-container-lowest)",
        border: "1px solid color-mix(in srgb, var(--color-outline-variant) 12%, transparent)",
        borderLeft: `3px solid ${accentColor}`,
        minHeight: "72px",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px color-mix(in srgb, ${accentColor} 12%, transparent)`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full opacity-[0.04] pointer-events-none"
        style={{ background: accentColor }} />
      <div className="flex items-start justify-between">
        <div className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}>
          <span className="material-symbols-outlined" style={{ color: accentColor, fontSize: "16px" }}>{icon}</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
          style={{ color: "var(--color-on-surface-variant)" }}>{label}</p>
        <p className="text-xs md:text-xl font-headline font-black leading-none"
          style={{ color: "var(--color-on-surface)" }}>{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Toggle Switch Component
// ─────────────────────────────────────────────
function ToggleSwitch({ enabled, onChange, label, description, icon }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-outline-variant/10 last:border-0 last:pb-0 first:pt-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">{icon}</span>
          )}
          <p className="font-headline font-bold text-on-surface">{label}</p>
        </div>
        {description && (
          <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-7 rounded-full transition-all duration-300 flex items-center px-1 flex-shrink-0 ${enabled ? "bg-primary" : "bg-surface-container-high"}`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${enabled ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function Settings() {
  const { darkMode, toggleDarkMode } = useTheme();
  const {
    settings: contextSettings,
    loading: contextLoading,
    updateSettings,
  } = useSchoolAdmin();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    schoolName: "",
    email: "",
    phone: "",
    country: "India",
    address: "",
    grading: "4.0 GPA",
    attendance: true,
    academicYear: "",
  });
  const [originalForm, setOriginalForm] = useState(null);
  const [toast, setToast] = useState(null);

  // Force re-render on theme change
  const [renderKey, setRenderKey] = useState(0);
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [darkMode]);

  // Hydrate form from context settings
  useEffect(() => {
    if (contextLoading) return;
    if (!contextSettings) {
      setLoading(false);
      return;
    }
    const data = contextSettings;
    const newForm = {
      schoolName: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      country: data.country || "India",
      address: data.address || "",
      grading: data.grading_scale || "4.0 GPA",
      attendance: data.attendance_tracking_enabled ?? true,
      academicYear: data.default_academic_year || "",
    };
    setForm(newForm);
    setOriginalForm(newForm);
    setLoading(false);
  }, [contextSettings, contextLoading]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleAttendance = () => setForm({ ...form, attendance: !form.attendance });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const discard = () => {
    if (originalForm) {
      setForm({ ...originalForm });
      showToast("Changes discarded", "info");
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: form.schoolName,
        email: form.email,
        phone: form.phone,
        country: form.country,
        address: form.address,
        grading_scale: form.grading,
        attendance_tracking_enabled: form.attendance,
        default_academic_year: form.academicYear,
      };
      const updatedData = await updateSettings(payload);
      const updatedForm = {
        schoolName: updatedData.name || "",
        email: updatedData.email || "",
        phone: updatedData.phone || "",
        country: updatedData.country || "India",
        address: updatedData.address || "",
        grading: updatedData.grading_scale || "4.0 GPA",
        attendance: updatedData.attendance_tracking_enabled ?? true,
        academicYear: updatedData.default_academic_year || "",
      };
      setForm(updatedForm);
      setOriginalForm(updatedForm);
      showToast("Configuration updated successfully!", "success");
    } catch (error) {
      console.error("Save error:", error);
      showToast("Failed to save settings. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Skeleton loading
  if (loading) {
    return (
      <SchoolLayout key={`layout-${renderKey}`} title="Settings">
        <div className="px-4 md:px-8 pt-4 pb-12">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Skeleton style={{ width: 240, height: 32 }} />
              <Skeleton style={{ width: 320, height: 18 }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl p-4 border border-outline-variant/10 bg-surface-container-lowest">
                  <Skeleton style={{ width: 24, height: 24, borderRadius: 6 }} />
                  <Skeleton style={{ width: 80, height: 12, marginTop: 8 }} />
                  <Skeleton style={{ width: 48, height: 24, marginTop: 4 }} />
                </div>
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl p-6 border border-outline-variant/10 bg-surface-container-lowest">
                <Skeleton style={{ width: 140, height: 20 }} />
                <Skeleton style={{ width: 200, height: 14, marginTop: 4 }} />
                <div className="mt-6 flex flex-wrap gap-4">
                  <Skeleton style={{ width: 200, height: 40 }} />
                  <Skeleton style={{ width: 200, height: 40 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SchoolLayout>
    );
  }

  // Stats for overview cards
  const stats = [
    { icon: "school", label: "School Name", value: form.schoolName || "Not set", accentColor: "var(--color-primary)" },
    { icon: "event", label: "Academic Year", value: form.academicYear || "Not set", accentColor: "var(--color-secondary)" },
    { icon: "grading", label: "Grading Scale", value: form.grading || "Not set", accentColor: "var(--color-tertiary)" },
  ];

  return (
    <SchoolLayout key={`layout-${renderKey}`} title="Settings">
      <div className="px-4 md:px-8 pt-4 pb-12 animate-in fade-in duration-300" key={`content-${renderKey}`}>

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-3 transition-all duration-300 ${toast.type === "success"
            ? "bg-success text-white"
            : toast.type === "error"
              ? "bg-error text-white"
              : "bg-surface-container-high text-on-surface"
            }`}>
            <span className="material-symbols-outlined text-base">
              {toast.type === "success" ? "check_circle" : toast.type === "error" ? "error" : "info"}
            </span>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-black text-on-surface">School Configuration</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage your institution's identity and academic parameters.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-3 text-xs gap-4 mb-8">
          {stats.map((s, i) => (
            <StatCard key={i} icon={s.icon} label={s.label} value={s.value} accentColor={s.accentColor} />
          ))}
        </div>

        <form onSubmit={save} className="space-y-8">

          {/* ── SCHOOL PROFILE ── */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10 bg-surface-container-high/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">apartment</span>
                <div>
                  <h3 className="text-lg font-headline font-bold text-on-surface">School Profile</h3>
                  <p className="text-xs text-on-surface-variant">Public identity details for your reports and communication.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Logo Upload */}
              <div className="flex flex-col sm:flex-row items-start gap-6 pb-6 border-b border-outline-variant/10">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-xl bg-surface-container-high/50 flex items-center justify-center border-2 border-dashed border-primary/30 group-hover:border-primary transition-colors">
                    <span className="material-symbols-outlined text-4xl text-primary/50">school</span>
                  </div>
                  <button type="button" className="absolute -bottom-1 -right-1 w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
                <div>
                  <p className="font-headline font-bold text-on-surface">Institution Logo</p>
                  <p className="text-sm text-on-surface-variant mb-3">Recommended: 400×400px. PNG/SVG.</p>
                  <button type="button" className="px-5 py-2 bg-primary/10 text-primary font-bold text-sm rounded-lg hover:bg-primary/20 transition-colors">
                    Upload New Logo
                  </button>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid md:grid-cols-2 gap-5">
                {[
                  { key: "schoolName", label: "School Name", icon: "domain" },
                  { key: "email", label: "Email", icon: "email" },
                  { key: "phone", label: "Phone", icon: "phone" },
                ].map(({ key, label, icon }) => (
                  <div key={key}>
                    <label className="text-2xs font-headline font-black tracking-widest uppercase text-on-surface-variant flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[14px]">{icon}</span>
                      {label}
                    </label>
                    <input
                      name={key}
                      value={form[key]}
                      onChange={change}
                      className="w-full border px-4 py-2.5 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition bg-surface-container-low border-outline-variant/10 text-on-surface placeholder:text-outline font-body"
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-2xs font-headline font-black tracking-widest uppercase text-on-surface-variant flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[14px]">public</span>
                    Country
                  </label>
                  <select
                    name="country"
                    value={form.country}
                    onChange={change}
                    className="w-full border px-4 py-2.5 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition bg-surface-container-low border-outline-variant/10 text-on-surface font-body"
                  >
                    <option>India</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Canada</option>
                    <option>Australia</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-2xs font-headline font-black tracking-widest uppercase text-on-surface-variant flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[14px]">home</span>
                    Street Address
                  </label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={change}
                    className="w-full border px-4 py-2.5 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition bg-surface-container-low border-outline-variant/10 text-on-surface placeholder:text-outline font-body"
                    placeholder="Enter full address"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── APPEARANCE ── */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10 bg-surface-container-high/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">palette</span>
                <div>
                  <h3 className="text-lg font-headline font-bold text-on-surface">Appearance</h3>
                  <p className="text-xs text-on-surface-variant">Customize the look of your portal.</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <ToggleSwitch
                enabled={darkMode}
                onChange={toggleDarkMode}
                label="Dark Mode"
                description="Switch between light and dark interface."
                icon="dark_mode"
              />
            </div>
          </div>

          {/* ── ACADEMIC PREFERENCES ── */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10 bg-surface-container-high/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">menu_book</span>
                <div>
                  <h3 className="text-lg font-headline font-bold text-on-surface">Academic Preferences</h3>
                  <p className="text-xs text-on-surface-variant">Define operational logic for grading and reporting cycles.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2">
              {/* Grading Scale */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-outline-variant/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">grading</span>
                    <p className="font-headline font-bold text-on-surface">Grading Scale System</p>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">Choose how performance is evaluated.</p>
                </div>
                <select
                  name="grading"
                  value={form.grading}
                  onChange={change}
                  className="border px-4 py-2 rounded-lg text-sm font-bold bg-surface-container-low border-outline-variant/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                >
                  <option>4.0 GPA Scale</option>
                  <option>Percentage (0-100)</option>
                  <option>Letter Grades (A-F)</option>
                </select>
              </div>

              {/* Attendance Tracking */}
              <ToggleSwitch
                enabled={form.attendance}
                onChange={toggleAttendance}
                label="Attendance Tracking"
                description="Automated alerts for absences."
                icon="event_available"
              />

              {/* Default Academic Year */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-outline-variant/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">calendar_month</span>
                    <p className="font-headline font-bold text-on-surface">Default Academic Year</p>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">Active period for registrations.</p>
                </div>
                <select
                  name="academicYear"
                  value={form.academicYear}
                  onChange={change}
                  className="border px-4 py-2 rounded-lg text-sm font-bold bg-surface-container-low border-outline-variant/10 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                >
                  <option>2023-2024</option>
                  <option>2024-2025</option>
                  <option>2025-2026</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── SAVE / DISCARD ── */}
          <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant/10">
            <button
              type="button"
              onClick={discard}
              className="px-6 py-2.5 font-headline font-bold text-sm rounded-lg border border-outline-variant/10 text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-2.5 bg-primary text-white font-headline font-bold text-sm rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </SchoolLayout>
  );
}