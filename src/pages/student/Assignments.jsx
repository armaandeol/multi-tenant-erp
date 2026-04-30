import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { useNavigate } from 'react-router-dom';

export default function Exams() {
  const navigate = useNavigate();
  
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = import.meta.env?.VITE_API_BASE_URL || process.env?.REACT_APP_API_BASE_URL;
        const token = localStorage.getItem("accessToken");

        const response = await fetch(`${baseUrl}v1/operations/exams/`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error("Failed to load examinations from the database.");
        }

        const data = await response.json();
        // For students, we ONLY want to show exams that are published!
        const publishedExams = (data.results || data).filter(exam => exam.is_published);
        setExams(publishedExams);

      } catch (err) {
        console.error("Fetch Exams Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "TBA";
    const options = { month: 'short', day: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <MainLayout title="Examinations">
      <div className="p-8 max-w-7xl mx-auto">

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-surface-container-lowest p-6 rounded-xl ambient-shadow flex flex-col gap-2 border border-outline-variant/20">
            <span className="text-on-surface-variant text-sm font-medium">Upcoming Exams</span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-primary">02</span>
              <span className="text-xs text-on-surface-variant">this term</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl ambient-shadow flex flex-col gap-2 border border-outline-variant/20">
            <span className="text-on-surface-variant text-sm font-medium">Average Score</span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-secondary">88%</span>
              <span className="text-xs text-on-surface-variant">+4% from last year</span>
            </div>
          </div>
          <div className="col-span-2 bg-primary-container p-6 rounded-xl ambient-shadow primary-gradient text-on-primary flex justify-between items-center overflow-hidden relative">
            <div className="z-10">
              <h3 className="font-headline text-xl font-bold mb-1">Next Major Assessment</h3>
              <p className="text-blue-100 text-sm opacity-90">Midterm Examinations • Starts Oct 24</p>
              <button className="mt-4 bg-white text-primary px-4 py-2 rounded-md text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm">View Timetable</button>
            </div>
            <span className="material-symbols-outlined text-white/20 text-8xl absolute -right-4 -bottom-4 rotate-12" data-icon="auto_awesome">quiz</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
          <div className="flex flex-1 w-full max-w-md bg-surface-container-low rounded-md px-4 py-2.5 items-center gap-3 border border-outline-variant/30 focus-within:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-slate-400 text-xl" data-icon="search">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 outline-none text-on-surface" placeholder="Search exams..." type="text"/>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select className="bg-surface-container-low border-none rounded-md px-4 py-2.5 text-sm text-on-surface-variant focus:ring-2 focus:ring-surface-tint min-w-[140px] outline-none">
              <option>All Academic Years</option>
              <option>2023-2024</option>
              <option>2022-2023</option>
            </select>
            <select className="bg-surface-container-low border-none rounded-md px-4 py-2.5 text-sm text-on-surface-variant focus:ring-2 focus:ring-surface-tint min-w-[140px] outline-none">
              <option>All Statuses</option>
              <option>Upcoming</option>
              <option>Completed</option>
            </select>
            <button className="p-2.5 bg-surface-container-low text-primary rounded-md hover:bg-surface-container-high transition-colors outline-none">
              <span className="material-symbols-outlined" data-icon="tune">tune</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200 shadow-sm flex items-center gap-3">
             <span className="material-symbols-outlined">error</span>
             <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {/* Exams Table */}
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden ambient-shadow border border-outline-variant/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/20">
                  <th className="px-6 py-4 font-headline text-sm font-bold uppercase tracking-wider">Exam Name</th>
                  <th className="px-6 py-4 font-headline text-sm font-bold uppercase tracking-wider">Academic Year</th>
                  <th className="px-6 py-4 font-headline text-sm font-bold uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-4 font-headline text-sm font-bold uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-4 font-headline text-sm font-bold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-outline">
                      <span className="material-symbols-outlined animate-spin text-3xl text-primary mb-3 block">progress_activity</span>
                      <p className="font-medium text-sm">Syncing academic calendars...</p>
                    </td>
                  </tr>
                ) : exams.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-outline">
                      <div className="w-16 h-16 bg-surface-container flex items-center justify-center rounded-full mx-auto mb-4 text-primary">
                        <span className="material-symbols-outlined text-3xl block">event_busy</span>
                      </div>
                      <p className="font-bold text-on-surface">No Exams Scheduled</p>
                      <p className="text-sm mt-1">There are no published exams for your academic year yet.</p>
                    </td>
                  </tr>
                ) : (
                  exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface text-base">{exam.name}</span>
                          <span className="text-xs text-on-surface-variant font-mono mt-0.5">ID: {exam.id.split('-')[0]}...</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wider uppercase border border-blue-100">
                          {exam.academic_year_name || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-sm font-bold text-on-surface-variant">
                        {formatDate(exam.start_date)}
                      </td>
                      <td className="px-6 py-6 text-sm font-bold text-on-surface-variant">
                        {formatDate(exam.end_date)}
                      </td>
                      <td className="px-6 py-6">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 w-max px-2.5 py-1 rounded-md border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                          Official
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <button 
                          onClick={() => navigate(`/exams/${exam.id}`)}
                          className="primary-gradient text-white px-5 py-2.5 rounded-md text-xs font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:shadow-lg active:scale-95 outline-none"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-on-surface-variant font-medium">Showing {exams.length} published exams</span>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-md hover:bg-white transition-colors text-slate-400 disabled:opacity-50" disabled>
                <span className="material-symbols-outlined block" data-icon="chevron_left">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded-md bg-primary text-white text-xs font-bold shadow-sm">1</button>
              <button className="p-1.5 rounded-md hover:bg-white transition-colors text-slate-400">
                <span className="material-symbols-outlined block" data-icon="chevron_right">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Insight Footer */}
        <div className="mt-12 bg-white/40 border border-white p-8 rounded-xl flex items-center gap-8 relative overflow-hidden glass-card shadow-sm">
          <div className="w-20 h-20 rounded-2xl bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0 shadow-sm border border-tertiary/20">
            <span className="material-symbols-outlined text-4xl block" data-icon="psychology" style={{ fontVariationSettings: `'FILL' 1` }}>psychology</span>
          </div>
          <div className="relative z-10">
            <h4 className="font-headline font-bold text-xl text-on-surface mb-2">Personalized Recommendation</h4>
            <p className="text-on-surface-variant leading-relaxed max-w-2xl text-sm">
                Based on your performance in the previous semester, we recommend prioritizing your revision for <span className="font-bold text-primary">Advanced Physics</span> ahead of the upcoming exams.
            </p>
            <div className="flex gap-4 mt-6">
              <button className="bg-tertiary text-white px-6 py-2.5 rounded-md font-bold text-sm shadow-sm hover:opacity-90 transition-opacity outline-none border-none">Get Study Plan</button>
              <button className="text-on-surface-variant px-6 py-2.5 rounded-md font-bold text-sm hover:bg-white/50 transition-colors outline-none border-none">Dismiss</button>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-tertiary/5 rounded-full blur-3xl"/>
        </div>

      </div>
    </MainLayout>
  );
}