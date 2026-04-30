import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';

export default function Dashboard() {
  // Aggregate Data States
  const [studentName, setStudentName] = useState("");
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [gpa, setGpa] = useState("0.00");
  const [upcomingExams, setUpcomingExams] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const baseUrl = import.meta.env?.VITE_API_BASE_URL || process.env?.REACT_APP_API_BASE_URL;
        const token = localStorage.getItem("accessToken");
        const headers = { "Authorization": `Bearer ${token}`, "Accept": "application/json" };

        // 1. Resolve Identity
        const meResponse = await fetch(`${baseUrl}v1/profiles/me/`, { headers });
        if (!meResponse.ok) throw new Error("Failed to authenticate user identity.");
        const meData = await meResponse.json();
        setStudentName(meData.identity?.first_name || "Scholar");

        // 2. Fetch all operational data concurrently (Data Science aggregation approach!)
        const [attRes, gradesRes, examsRes] = await Promise.all([
          fetch(`${baseUrl}v1/operations/attendance/`, { headers }),
          fetch(`${baseUrl}v1/operations/grades/`, { headers }),
          fetch(`${baseUrl}v1/operations/exams/`, { headers })
        ]);

        // Process Attendance
        if (attRes.ok) {
          const attData = await attRes.json();
          const records = attData.results || attData;
          if (records.length > 0) {
            const present = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
            setAttendanceRate(Math.round((present / records.length) * 100));
          }
        }

        // Process Grades -> GPA
        if (gradesRes.ok) {
          const gradesData = await gradesRes.json();
          const records = gradesData.results || gradesData;
          if (records.length > 0) {
            let totalMarks = 0;
            let totalMax = 0;
            records.forEach(g => {
              if (g.marks_obtained && g.max_marks) {
                totalMarks += Math.abs(parseFloat(g.marks_obtained));
                totalMax += Math.abs(parseFloat(g.max_marks));
              }
            });
            if (totalMax > 0) {
              setGpa(((totalMarks / totalMax) * 4.0).toFixed(2));
            }
          }
        }

        // Process Exams
        if (examsRes.ok) {
          const examsData = await examsRes.json();
          const records = examsData.results || examsData;
          
          // Filter published exams that are in the future
          const today = new Date();
          const upcoming = records
            .filter(e => e.is_published && new Date(e.start_date) >= today)
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
            .slice(0, 2); // Get top 2 closest exams
            
          setUpcomingExams(upcoming);
        }

      } catch (err) {
        console.error("Dashboard Sync Error:", err);
        setError("Failed to sync some dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getDaysRemaining = (startDate) => {
    if (!startDate) return 0;
    const diffTime = new Date(startDate) - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl block">progress_activity</span>
            <p className="font-semibold tracking-wide">Aggregating Academic Metrics...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard">
      <div className="px-8 py-8 space-y-8">

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-container p-8 text-white shadow-lg">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-extrabold font-headline mb-2 tracking-tight">Welcome back, {studentName}!</h2>
            <p className="text-primary-fixed opacity-90 text-lg leading-relaxed">
              Your overall academic standing is strong. Keep an eye on your upcoming exams to maintain your GPA. Here's what's happening today.
            </p>
          </div>
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"/>
          <div className="absolute right-12 bottom-0 hidden lg:block pointer-events-none">
            <span className="material-symbols-outlined text-[160px] opacity-10 block" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
        </section>

        {error && (
          <div className="p-4 bg-amber-50 text-amber-800 rounded-md border border-amber-200 shadow-sm flex items-center gap-3">
             <span className="material-symbols-outlined">warning</span>
             <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {/* Top KPI Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col justify-between group transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <span className="p-3 rounded-lg bg-blue-50 text-primary">
                <span className="material-symbols-outlined block">calendar_today</span>
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${attendanceRate >= 75 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                {attendanceRate >= 75 ? 'ON TRACK' : 'ACTION REQ'}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-on-surface-variant mb-1">Attendance Rate</p>
              <h3 className="text-4xl font-extrabold font-headline">{attendanceRate}<span className="text-2xl font-semibold">%</span></h3>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col justify-between group transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <span className="p-3 rounded-lg bg-purple-50 text-secondary">
                <span className="material-symbols-outlined block">grade</span>
              </span>
              <span className="text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">COMPUTED</span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-on-surface-variant mb-1">Current GPA</p>
              <h3 className="text-4xl font-extrabold font-headline">{gpa}<span className="text-2xl font-semibold">/4.0</span></h3>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col justify-between group transition-all hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <span className="p-3 rounded-lg bg-green-50 text-green-700">
                <span className="material-symbols-outlined block">verified</span>
              </span>
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"/>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-on-surface-variant mb-1">Fees Status</p>
              <h3 className="text-4xl font-extrabold font-headline">Paid</h3>
              <p className="text-xs text-on-surface-variant mt-1 font-medium">Next due: Oct 15, 2024</p>
            </div>
          </div>
        </section>

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">

            {/* School Board (Static Info for Aesthetics) */}
            <section className="bg-surface-container-low/30 rounded-xl p-6 border border-surface-container">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold font-headline">School Board</h3>
                <button className="text-primary text-sm font-bold hover:underline outline-none border-none bg-transparent cursor-pointer">View All</button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4 p-5 bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/10">
                  <div className="shrink-0 w-12 h-12 bg-tertiary/10 text-tertiary rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined block">campaign</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface text-base">Annual Science Fair Registration</h4>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">The registration for the upcoming annual science fair is now open for all students from Grades 9 to 12. Submit your project abstracts by Friday.</p>
                    <span className="text-[10px] font-bold text-outline-variant uppercase mt-3 block tracking-widest">Posted 2 hours ago • Principal's Office</span>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/10">
                  <div className="shrink-0 w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined block">event</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface text-base">Updated Library Hours for Finals Week</h4>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">To support your preparation for finals, the main campus library will remain open until 10:00 PM starting next Monday.</p>
                    <span className="text-[10px] font-bold text-outline-variant uppercase mt-3 block tracking-widest">Posted Yesterday • Librarian</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Dynamic Upcoming Exams */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold font-headline">Upcoming Exams</h3>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold outline-none border-none">ALL EXAMS</button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingExams.length === 0 ? (
                  <div className="md:col-span-2 p-8 bg-surface-container-lowest rounded-lg shadow-sm border border-dashed border-outline-variant/30 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">event_available</span>
                    <p className="font-bold text-slate-600">No Upcoming Exams</p>
                    <p className="text-sm text-slate-500">Your schedule is currently clear of major assessments.</p>
                  </div>
                ) : (
                  upcomingExams.map((exam, idx) => {
                    const daysLeft = getDaysRemaining(exam.start_date);
                    const isUrgent = daysLeft <= 7;
                    const colorClass = idx % 2 === 0 ? 'primary' : 'secondary';
                    const borderClass = idx % 2 === 0 ? 'border-primary' : 'border-secondary';
                    const bgHeader = idx % 2 === 0 ? 'bg-primary/10' : 'bg-secondary/10';

                    return (
                      <div key={exam.id} className={`p-6 bg-surface-container-lowest rounded-xl shadow-sm border-l-4 ${borderClass} relative overflow-hidden`}>
                        <div className="flex justify-between mb-4 relative z-10">
                          <span className={`text-[10px] font-black tracking-widest text-${colorClass} uppercase bg-${colorClass}/10 px-2 py-0.5 rounded`}>Exam</span>
                          <span className={`text-xs font-bold ${isUrgent ? 'text-red-600' : 'text-on-surface-variant'}`}>
                            {formatDate(exam.start_date)}
                          </span>
                        </div>
                        <h4 className="font-bold text-lg mb-1 relative z-10 truncate">{exam.name}</h4>
                        <p className="text-sm text-on-surface-variant mb-6 relative z-10">
                          {exam.academic_year_name || 'General Academic Year'}
                        </p>
                        <div className="flex justify-between items-center relative z-10">
                          <div className={`flex items-center text-xs font-bold ${isUrgent ? 'text-red-500' : `text-${colorClass}`} gap-1.5`}>
                            <span className="material-symbols-outlined text-sm block">timer</span>
                            {daysLeft === 0 ? 'Today' : `${daysLeft} days left`}
                          </div>
                          <Link to={`/exams/${exam.id}`} className={`text-xs font-bold py-2 px-4 ${bgHeader} text-${colorClass} rounded-md hover:bg-${colorClass}/20 transition-colors`}>
                            View Details
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 space-y-8">
            
            {/* Quick Actions */}
            <section className="bg-surface-container-low/30 rounded-xl p-6 border border-surface-container">
              <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/attendance" className="flex flex-col items-center justify-center p-5 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 hover:bg-blue-50 transition-colors group">
                  <span className="material-symbols-outlined text-primary mb-2 group-hover:scale-110 transition-transform block text-3xl">fact_check</span>
                  <span className="text-sm font-bold text-slate-700">Attendance</span>
                </Link>
                <Link to="/grades" className="flex flex-col items-center justify-center p-5 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 hover:bg-blue-50 transition-colors group">
                  <span className="material-symbols-outlined text-primary mb-2 group-hover:scale-110 transition-transform block text-3xl">grading</span>
                  <span className="text-sm font-bold text-slate-700">Report Card</span>
                </Link>
              </div>
            </section>

            {/* Static Recent Activity */}
            <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10">
              <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-6">Recent Activity</h3>
              <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-container-high">
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center ring-4 ring-white">
                    <span className="material-symbols-outlined text-green-700 text-xs block" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">Grade Updated: Physics Lab</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">You received an <span className="font-bold text-green-700">A</span> for the Optics experiment.</p>
                  <span className="text-[10px] text-outline-variant mt-1.5 block font-bold uppercase tracking-wider">15 mins ago</span>
                </div>
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center ring-4 ring-white">
                    <span className="material-symbols-outlined text-amber-700 text-xs block" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">Attendance Marked</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Present for Period 4: Computer Science.</p>
                  <span className="text-[10px] text-outline-variant mt-1.5 block font-bold uppercase tracking-wider">4 hours ago</span>
                </div>
              </div>
              <button className="w-full mt-6 py-3 border-t border-surface-container-low text-xs font-bold text-primary hover:text-primary-container transition-colors uppercase tracking-widest outline-none bg-transparent cursor-pointer">
                Show Full Timeline
              </button>
            </section>

            {/* AI Summary Widget */}
            <div className="relative p-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 overflow-hidden shadow-sm">
              <div className="absolute top-4 right-4 bg-white/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">AI Insight</div>
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary block" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                Semester Progress
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Your data indicates you are performing <span className="font-bold text-primary">12% better</span> than your historical average in STEM subjects. Keep prioritizing Mathematics to secure Honors standing.
              </p>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}