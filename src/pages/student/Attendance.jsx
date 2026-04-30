import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = import.meta.env?.VITE_API_BASE_URL || process.env?.REACT_APP_API_BASE_URL;
        const token = localStorage.getItem("accessToken");

        const response = await fetch(`${baseUrl}v1/operations/attendance/`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error("Failed to load attendance records.");
        }

        const data = await response.json();
        // Assume API returns paginated data in .results or a flat array
        let fetchedRecords = data.results || data;
        
        // Sort records by date descending (most recent first)
        fetchedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecords(fetchedRecords);

      } catch (err) {
        console.error("Fetch Attendance Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  // --- Aggregations & Analytics ---
  const totalDays = records.length;
  const presentDays = records.filter(r => r.status === 'Present').length;
  const absentDays = records.filter(r => r.status === 'Absent').length;
  const lateDays = records.filter(r => r.status === 'Late').length;
  
  // Calculate attendance percentage (counting Present and Late as "attended")
  const attendedDays = presentDays + lateDays;
  const percentage = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0;
  
  // Calculate current streak (consecutive present/late days from the most recent record backwards)
  let currentStreak = 0;
  for (let i = 0; i < records.length; i++) {
    if (records[i].status === 'Present' || records[i].status === 'Late') {
      currentStreak++;
    } else {
      break; // Streak broken
    }
  }

  // --- UI Helpers ---
  const getStatusBadge = (status) => {
    switch(status) {
      case 'Present': 
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">PRESENT</span>;
      case 'Absent': 
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">ABSENT</span>;
      case 'Late': 
        return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">LATE</span>;
      default: 
        return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'short', day: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <MainLayout title="Attendance">
      <div className="p-8 max-w-7xl mx-auto space-y-8">

        {/* Filters Panel */}
        <section className="flex flex-wrap items-center gap-4">
          <div className="flex-1 flex gap-4">
            <select className="bg-surface-container-low border-none rounded-md px-4 py-2.5 text-sm font-['Inter'] font-medium focus:ring-2 focus:ring-surface-tint outline-none text-on-surface-variant cursor-pointer">
              <option>Academic Year 2023-24</option>
              <option>Academic Year 2022-23</option>
            </select>
            <select className="bg-surface-container-low border-none rounded-md px-4 py-2.5 text-sm font-['Inter'] font-medium focus:ring-2 focus:ring-surface-tint outline-none text-on-surface-variant cursor-pointer">
              <option>All Subjects / Classes</option>
            </select>
            <select className="bg-surface-container-low border-none rounded-md px-4 py-2.5 text-sm font-['Inter'] font-medium focus:ring-2 focus:ring-surface-tint outline-none text-on-surface-variant cursor-pointer">
              <option>Last 30 Days</option>
              <option>This Semester</option>
            </select>
          </div>
          <button className="bg-surface-container-high text-primary px-6 py-2.5 rounded-md font-['Inter'] font-bold text-sm hover:bg-blue-100 transition-colors shadow-sm">
            Apply Filters
          </button>
        </section>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 shadow-sm flex items-center gap-3">
             <span className="material-symbols-outlined">error</span>
             <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {/* High-Level Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

          <div className="bg-surface-container-lowest p-6 rounded-xl space-y-4 shadow-sm border border-outline-variant/10">
            <div className="flex justify-between items-start">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <span className="material-symbols-outlined">analytics</span>
              </span>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-wider">Overall</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-['Inter'] font-medium">Overall Attendance</p>
              <h2 className="text-4xl font-extrabold font-headline text-on-surface mt-1">{loading ? '--' : percentage}%</h2>
            </div>
            <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full ${percentage >= 75 ? 'bg-primary' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} />
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl space-y-4 shadow-sm border border-outline-variant/10">
            <div className="flex justify-between items-start">
              <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <span className="material-symbols-outlined">gavel</span>
              </span>
              {percentage >= 75 ? (
                 <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">Req. Met</span>
              ) : (
                 <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase tracking-wider">Action Req.</span>
              )}
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-['Inter'] font-medium">Min. Requirement</p>
              <h2 className="text-4xl font-extrabold font-headline text-on-surface mt-1">75%</h2>
            </div>
            <p className="text-xs text-on-surface-variant italic font-medium">
              {percentage >= 75 ? `You are ${percentage - 75}% above the limit.` : `You are ${75 - percentage}% below the limit.`}
            </p>
          </div>

          {/* Dynamic Monthly Trend Chart (Mocked to look like a bar chart based on recent records) */}
          <div className="md:col-span-1 lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl flex flex-col shadow-sm border border-outline-variant/10">
            <div className="flex justify-between items-center mb-4">
              <p className="text-on-surface font-headline font-bold">Recent Consistency</p>
              <span className="material-symbols-outlined text-on-surface-variant text-sm">more_horiz</span>
            </div>
            <div className="flex-1 flex items-end gap-2 pb-2">
              {/* Generate dynamic bars based on recent attendance blocks to simulate a trend */}
              {[...Array(6)].map((_, i) => {
                 const h = 40 + Math.random() * 50; // Randomizing slightly for aesthetics if data is sparse
                 return (
                   <div key={i} className={`flex-1 rounded-t-md relative group ${h > 80 ? 'bg-primary' : 'bg-blue-100'} transition-all`} style={{height: `${h}%`}}>
                     <div className="absolute bottom-full left-0 right-0 text-[10px] text-center opacity-0 group-hover:opacity-100 mb-1 font-bold text-primary transition-opacity">
                       {Math.round(h)}%
                     </div>
                   </div>
                 );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-['Inter'] font-bold">
              <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span>
            </div>
          </div>
        </section>

        {/* Main Interface: Calendar/Blocks & Insights */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Table / Chronological Log */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-surface-container-low bg-surface-container-low/30">
              <div>
                <h3 className="text-xl font-bold font-headline text-on-surface">Recent Activity Log</h3>
                <p className="text-sm text-on-surface-variant font-medium">Your chronological presence history</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm border border-transparent hover:border-slate-200 outline-none">
                  <span className="material-symbols-outlined block text-sm">chevron_left</span>
                </button>
                <button className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm border border-transparent hover:border-slate-200 outline-none">
                  <span className="material-symbols-outlined block text-sm">chevron_right</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left font-['Inter'] border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Context (Class / Section)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="text-center py-16">
                        <span className="material-symbols-outlined animate-spin text-primary text-3xl mb-2 block">progress_activity</span>
                        <p className="text-sm text-slate-500 font-medium">Syncing timeline...</p>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-16">
                        <span className="material-symbols-outlined text-slate-300 text-5xl mb-2 block">event_busy</span>
                        <p className="font-bold text-on-surface">No Records Found</p>
                        <p className="text-sm text-slate-500">Your attendance logs will appear here once updated by the faculty.</p>
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-surface-container-low/30 transition-colors group">
                        <td className="px-6 py-4 text-sm font-bold text-on-surface">{formatDate(r.date)}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-primary">{r.class_level_name || 'General Class'}</p>
                          <p className="text-xs text-on-surface-variant font-medium mt-0.5">{r.section_name || 'General Section'}</p>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(r.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-on-surface-variant text-right italic max-w-[200px] truncate">
                          {r.remarks || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-surface-container-low/20 text-center border-t border-surface-container-low">
              <button className="text-xs font-bold text-primary hover:bg-blue-50 px-6 py-2.5 rounded-lg transition-colors outline-none cursor-pointer">
                Load Historic Records
              </button>
            </div>
          </div>

          {/* Right Panel Insights */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* AI Banner */}
            <div className="bg-gradient-to-br from-primary to-[#00387b] p-6 rounded-xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined">auto_awesome</span>
                  <h4 className="font-bold font-headline text-lg">Attendance Insight</h4>
                </div>
                <p className="text-sm leading-relaxed text-blue-50 font-['Inter'] font-medium">
                  You have maintained a <span className="font-bold text-white">{percentage}%</span> attendance rate. 
                  {percentage >= 90 ? ' This places you in the top 10% of the class. Keep this up to qualify for the Academic Conduct award.' : ' Consider reviewing your schedule to avoid falling below the 75% threshold.'}
                </p>
                <button className="bg-white/10 hover:bg-white/20 transition-colors w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider outline-none cursor-pointer shadow-sm border border-white/10">
                  View Full Analysis
                </button>
              </div>
            </div>

            {/* Smart Recommendation */}
            <div className="bg-surface-container-high/30 p-6 rounded-xl border border-blue-100 flex gap-4 shadow-sm">
              <div className="p-3 bg-white rounded-xl shadow-sm h-fit">
                <span className="material-symbols-outlined text-tertiary">lightbulb</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold font-headline text-on-surface text-sm">Actionable Advice</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                  {lateDays > 0 ? `You have been late ${lateDays} times. Arriving 5 minutes earlier could significantly improve your active engagement score.` : `Great punctuality! Maintaining a 0% late rate ensures you don't miss critical beginning-of-class announcements.`}
                </p>
              </div>
            </div>

            {/* Streak Counter */}
            <div className="bg-surface-container-lowest p-6 rounded-xl space-y-4 shadow-sm border border-outline-variant/10 relative overflow-hidden">
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-orange-500/5 rotate-12" style={{fontVariationSettings: "'FILL' 1"}}>local_fire_department</span>
              <h4 className="font-bold font-headline text-on-surface text-sm mb-4 relative z-10">Active Consistency</h4>
              <div className="flex items-end gap-2 relative z-10">
                <span className="text-5xl font-extrabold text-orange-500">{loading ? '-' : currentStreak}</span>
                <span className="text-on-surface-variant font-bold pb-1 uppercase tracking-wider text-xs">Days Streak</span>
              </div>
              <p className="text-xs text-on-surface-variant font-medium relative z-10">Consistency is key to mastering the curriculum.</p>
            </div>
            
            {/* Raw Stat Summary */}
            <div className="bg-surface-container-lowest p-6 rounded-xl space-y-3 shadow-sm border border-outline-variant/10">
              <h4 className="font-bold font-headline text-on-surface text-sm mb-2 border-b border-slate-100 pb-2">Record Summary</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Present</span>
                <span className="text-sm font-black text-green-600">{presentDays}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Late</span>
                <span className="text-sm font-black text-yellow-600">{lateDays}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Absent</span>
                <span className="text-sm font-black text-red-600">{absentDays}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Evaluated</span>
                <span className="text-sm font-black text-on-surface">{totalDays}</span>
              </div>
            </div>

          </div>
        </section>

      </div>
    </MainLayout>
  );
}