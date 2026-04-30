import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';

export default function GradesCard() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [filterSubject, setFilterSubject] = useState("All Subjects");
  const [filterExam, setFilterExam] = useState("All Exams");

  useEffect(() => {
    const fetchGrades = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = import.meta.env?.VITE_API_BASE_URL || process.env?.REACT_APP_API_BASE_URL;
        const token = localStorage.getItem("accessToken");

        const response = await fetch(`${baseUrl}v1/operations/grades/`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error("Failed to load grades from the server.");
        }

        const data = await response.json();
        setGrades(data.results || data);

      } catch (err) {
        console.error("Fetch Grades Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, []);

  // --- Data Aggregation & Filtering Logic ---
  
  // Extract unique filters
  const uniqueSubjects = ["All Subjects", ...new Set(grades.map(g => g.subject_name).filter(Boolean))];
  const uniqueExams = ["All Exams", ...new Set(grades.map(g => g.exam_name).filter(Boolean))];

  // Apply filters
  const filteredGrades = grades.filter(g => {
    const matchSubject = filterSubject === "All Subjects" || g.subject_name === filterSubject;
    const matchExam = filterExam === "All Exams" || g.exam_name === filterExam;
    return matchSubject && matchExam;
  });

  // Calculate Overall Performance (Total Percentage -> GPA approximation)
  let totalMarks = 0;
  let totalMax = 0;
  grades.forEach(g => {
    if (g.marks_obtained && g.max_marks) {
      // Math.abs used defensively in case of weird data entry, as seen in schema examples
      totalMarks += Math.abs(parseFloat(g.marks_obtained)); 
      totalMax += Math.abs(parseFloat(g.max_marks));
    }
  });

  const overallPercentage = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;
  const overallGPA = totalMax > 0 ? ((overallPercentage / 100) * 4.0).toFixed(2) : "0.00";

  // Auto-Calculate Grade Letter based on percentage
  const calculateGradeLetter = (marks, max) => {
    if (!marks || !max || max <= 0) return { letter: '--', color: 'bg-gray-100 text-gray-500' };
    const percentage = (Math.abs(parseFloat(marks)) / Math.abs(parseFloat(max))) * 100;
    
    if (percentage >= 90) return { letter: 'A+', color: 'bg-green-100 text-green-700' };
    if (percentage >= 80) return { letter: 'A', color: 'bg-blue-100 text-blue-700' };
    if (percentage >= 70) return { letter: 'B', color: 'bg-purple-100 text-purple-700' };
    if (percentage >= 60) return { letter: 'C', color: 'bg-yellow-100 text-yellow-700' };
    return { letter: 'F', color: 'bg-red-100 text-red-700' };
  };

  const getSubjectAesthetics = (subjectName) => {
    const name = (subjectName || "").toLowerCase();
    if (name.includes("math") || name.includes("calc")) return { icon: "calculate", color: "blue" };
    if (name.includes("phys") || name.includes("sci")) return { icon: "rocket_launch", color: "purple" };
    if (name.includes("comp") || name.includes("code")) return { icon: "code", color: "orange" };
    if (name.includes("hist") || name.includes("lit") || name.includes("eng")) return { icon: "history_edu", color: "indigo" };
    return { icon: "menu_book", color: "emerald" };
  };

  return (
    <MainLayout title="Grades & Report Card">
      <section className="p-8 max-w-7xl mx-auto">

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Main GPA Card */}
          <div className="md:col-span-2 primary-gradient rounded-xl p-8 text-white relative overflow-hidden shadow-lg">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <h3 className="text-lg font-headline font-semibold opacity-90">Academic Performance Summary</h3>
                <div className="flex items-end gap-4 mt-2">
                  <p className="text-5xl font-headline font-extrabold tracking-tight">GPA {overallGPA}</p>
                  <p className="text-xl font-bold opacity-80 pb-1">/ 4.0</p>
                </div>
                <p className="text-sm mt-3 opacity-90 flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/20">
                  <span className="material-symbols-outlined text-sm">analytics</span>
                  Cumulative Average: {overallPercentage.toFixed(1)}%
                </p>
              </div>
              <div className="flex flex-wrap gap-4 mt-8">
                <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-2.5 rounded-md text-sm font-semibold transition-all">
                  View Trend Analytics
                </button>
                <button className="bg-white text-primary px-6 py-2.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 shadow-md hover:scale-[1.02]">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Download Official Transcript
                </button>
              </div>
            </div>
            {/* Decorative background flare */}
            <div className="absolute -right-12 -bottom-12 w-80 h-80 bg-white/10 rounded-full blur-3xl"/>
            <span className="material-symbols-outlined absolute -right-8 -top-8 text-[180px] text-white/5 rotate-12" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
          </div>

          {/* Quick Stats / Recent Exam Card */}
          <div className="bg-surface-container-lowest rounded-xl p-8 flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/20">
            <div>
              <span className="text-xs font-bold text-secondary tracking-widest uppercase bg-secondary/10 px-2.5 py-1 rounded-full">Database Integrity</span>
              <h4 className="text-3xl font-headline font-bold text-on-surface mt-4">{grades.length}</h4>
              <p className="text-sm font-medium text-on-surface-variant mt-1">Total Grades Recorded</p>
            </div>
            
            <div className="mt-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-bold border border-tertiary/20">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: `'FILL' 1` }}>auto_awesome</span>
                AI Insight: Excelling in STEM courses based on recent entries.
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200 shadow-sm flex items-center gap-3">
             <span className="material-symbols-outlined">error</span>
             <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {/* Detailed Grades Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
          
          {/* Table Header & Filters */}
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest border-b border-outline-variant/20">
            <h3 className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">data_table</span>
              Detailed Score Breakdown
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={filterSubject}
                onChange={e => setFilterSubject(e.target.value)}
                className="bg-surface-container-low border-none rounded-md text-sm py-2.5 px-4 font-semibold text-on-surface-variant focus:ring-2 focus:ring-primary outline-none cursor-pointer"
              >
                {uniqueSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              <select 
                value={filterExam}
                onChange={e => setFilterExam(e.target.value)}
                className="bg-surface-container-low border-none rounded-md text-sm py-2.5 px-4 font-semibold text-on-surface-variant focus:ring-2 focus:ring-primary outline-none cursor-pointer"
              >
                {uniqueExams.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
              <button 
                onClick={() => { setFilterSubject("All Subjects"); setFilterExam("All Exams"); }}
                className="w-10 h-10 flex items-center justify-center rounded-md bg-surface-container-low hover:bg-surface-container-high transition-colors text-on-surface-variant"
                title="Reset Filters"
              >
                <span className="material-symbols-outlined">sync</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-surface-container-low/50">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Assessment / Exam</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Marks Obtained</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Faculty Remarks</th>
                  <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-outline">
                      <span className="material-symbols-outlined animate-spin text-3xl text-primary mb-3 block">progress_activity</span>
                      <p className="font-medium text-sm">Syncing academic records from server...</p>
                    </td>
                  </tr>
                ) : filteredGrades.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-outline">
                      <div className="w-16 h-16 bg-surface-container flex items-center justify-center rounded-full mx-auto mb-4 text-primary">
                        <span className="material-symbols-outlined text-3xl block">assignment_turned_in</span>
                      </div>
                      <p className="font-bold text-on-surface">No Records Found</p>
                      <p className="text-sm mt-1">There are no grades matching your current filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredGrades.map((grade) => {
                    const aes = getSubjectAesthetics(grade.subject_name);
                    const gradeMetrics = calculateGradeLetter(grade.marks_obtained, grade.max_marks);
                    
                    return (
                      <tr key={grade.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-${aes.color}-50 flex items-center justify-center text-${aes.color}-600 border border-${aes.color}-100`}>
                              <span className="material-symbols-outlined">{aes.icon}</span>
                            </div>
                            <span className="font-bold text-on-surface">{grade.subject_name || "General Subject"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-sm text-on-surface-variant font-medium">
                          {grade.exam_name || "Unknown Assessment"}
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-on-surface">{Math.abs(parseFloat(grade.marks_obtained || 0))}</span>
                            <span className="text-xs font-bold text-slate-400">/ {Math.abs(parseFloat(grade.max_marks || 100))}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span className={`px-3 py-1.5 rounded-md ${gradeMetrics.color} font-black text-xs uppercase tracking-widest shadow-sm`}>
                            {gradeMetrics.letter}
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          {grade.remarks ? (
                            <div className="text-sm text-on-surface-variant italic leading-relaxed max-w-xs bg-slate-50 p-2 rounded border border-slate-100">
                              "{grade.remarks}"
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No remarks provided.</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button className="text-primary hover:text-blue-900 font-bold text-xs hover:underline underline-offset-4 transition-all outline-none border-none bg-transparent cursor-pointer">
                            View Detailed Analysis
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 bg-surface-container-low/30 border-t border-surface-container flex justify-between items-center rounded-b-xl">
            <p className="text-xs font-medium text-on-surface-variant italic">Showing {filteredGrades.length} graded assessments.</p>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-md flex items-center justify-center border border-outline-variant/30 text-on-surface-variant hover:bg-white transition-colors" disabled>
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded-md flex items-center justify-center bg-primary text-white text-xs font-bold shadow-sm">1</button>
              <button className="w-8 h-8 rounded-md flex items-center justify-center border border-outline-variant/30 text-on-surface-variant hover:bg-white transition-colors text-xs font-bold">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Counseling Call-to-Action */}
      <footer className="px-8 pb-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 items-center bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex-1">
            <h4 className="font-headline font-bold text-on-surface text-lg">Request Academic Counseling</h4>
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
              Not satisfied with your results or need guidance on subject selection? Schedule a 15-minute 1-on-1 call with your designated academic advisor to discuss a personalized roadmap.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 bg-white text-primary font-bold rounded-lg shadow-sm hover:bg-blue-50 transition-all border border-blue-100 outline-none cursor-pointer">
              Schedule Meeting
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-primary to-[#2170e4] text-white font-bold rounded-lg shadow-md hover:scale-[1.02] transition-all outline-none border-none cursor-pointer flex items-center gap-2">
              <span className="material-symbols-outlined text-lg block">picture_as_pdf</span>
              Export PDF Report
            </button>
          </div>
        </div>
      </footer>

    </MainLayout>
  );
}