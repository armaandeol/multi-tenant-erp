import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = import.meta.env?.VITE_API_BASE_URL || process.env?.REACT_APP_API_BASE_URL;
        const token = localStorage.getItem("accessToken");

        const response = await fetch(`${baseUrl}v1/academics/subjects/`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch subjects from the database.");
        }

        const data = await response.json();
        setSubjects(data.results || data);
      } catch (err) {
        console.error("Fetch Subjects Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  // Helper to dynamically color code and assign icons to subjects
  const getSubjectAesthetics = (subjectName) => {
    const name = (subjectName || "").toLowerCase();
    if (name.includes("math") || name.includes("calc")) return { icon: "functions", colorClass: "primary" };
    if (name.includes("phys") || name.includes("chem") || name.includes("sci") || name.includes("bio")) return { icon: "science", colorClass: "secondary" };
    if (name.includes("hist") || name.includes("geo")) return { icon: "history_edu", colorClass: "tertiary" };
    if (name.includes("lit") || name.includes("eng")) return { icon: "auto_stories", colorClass: "on-surface-variant" };
    if (name.includes("comp") || name.includes("tech") || name.includes("code")) return { icon: "computer", colorClass: "primary" };
    return { icon: "menu_book", colorClass: "primary" };
  };

  return (
    <MainLayout title="The Academic Architect">
      <div className="px-8 py-8 max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">My Subjects</h2>
            <p className="text-on-surface-variant mt-1 font-medium">Manage your academic curriculum and performance</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-outline px-1">Academic Year</label>
              <select className="bg-surface-container-lowest border-none rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus:ring-primary outline-none">
                <option>2023-2024</option>
                <option>2022-2023</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-outline px-1">Semester</label>
              <select className="bg-surface-container-lowest border-none rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus:ring-primary outline-none">
                <option>Spring Semester</option>
                <option>Fall Semester</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200 shadow-sm flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-lg shadow-[0px_12px_32px_rgba(11,28,48,0.04)] overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Subject Name</th>
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Subject Code</th>
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest text-center">Grade (Mock)</th>
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Performance (Mock)</th>
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-16 text-outline">
                    <span className="material-symbols-outlined animate-spin text-3xl text-primary mb-3">progress_activity</span>
                    <p>Fetching curriculum data...</p>
                  </td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-16 text-outline">
                    <div className="w-16 h-16 bg-surface-container flex items-center justify-center rounded-full mx-auto mb-4 text-primary">
                      <span className="material-symbols-outlined text-3xl">menu_book</span>
                    </div>
                    <p className="font-bold text-on-surface">No Subjects Found</p>
                    <p className="text-sm">There are no subjects configured for this academic period.</p>
                  </td>
                </tr>
              ) : (
                subjects.map((subject) => {
                  const aes = getSubjectAesthetics(subject.name);
                  // Since the API only returns id, name, code, school, class_levels, 
                  // we are temporarily mocking the student-specific grade/performance UI parts
                  return (
                    <tr key={subject.id} className="hover:bg-surface-container-low/30 transition-colors group">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-md bg-${aes.colorClass}/10 flex items-center justify-center text-${aes.colorClass}`}>
                            <span className="material-symbols-outlined">{aes.icon}</span>
                          </div>
                          <div>
                            <p className="font-headline font-bold text-on-surface">{subject.name}</p>
                            <p className="text-xs text-outline font-mono">
                              ID: {subject.id.split('-')[0]}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="inline-block px-3 py-1 bg-surface-container-high rounded text-xs font-bold text-on-surface font-mono">
                          {subject.code || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`text-lg font-headline font-extrabold text-${aes.colorClass}`}>--</span>
                        <p className="text-[10px] text-outline font-bold">Awaiting Data</p>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-surface-container-high rounded-full overflow-hidden">
                            <div className={`h-full bg-${aes.colorClass} rounded-full`} style={{ width: '0%' }}/>
                          </div>
                          <span className="text-xs font-bold text-on-surface-variant">Pending</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <button className="bg-surface-container-high text-primary px-4 py-2 rounded-md text-xs font-bold group-hover:bg-primary group-hover:text-white transition-all outline-none">
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-primary-container text-on-primary-container p-8 rounded-lg relative overflow-hidden flex flex-col justify-between min-h-[240px]">
            <div className="relative z-10">
              <span className="material-symbols-outlined text-4xl mb-4" data-icon="auto_awesome">auto_awesome</span>
              <h3 className="text-2xl font-headline font-extrabold leading-tight">Your semester performance is <br/>up by 12% from last year.</h3>
              <p className="mt-2 text-primary-fixed opacity-90 text-sm max-w-md">Great job! You're showing significant improvement in STEM subjects. Your current GPA projection is 3.85.</p>
            </div>
            <div className="relative z-10 mt-6">
              <button className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-md text-sm font-bold hover:bg-white/30 transition-all outline-none">
                View Detailed Analysis
              </button>
            </div>
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"/>
          </div>
          
          <div className="bg-surface-container-low p-6 rounded-lg border-l-4 border-tertiary">
            <h4 className="text-xs font-bold text-tertiary uppercase tracking-widest mb-4">Upcoming Subject Tasks</h4>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <div className="bg-white w-10 h-10 rounded flex-shrink-0 flex items-center justify-center text-tertiary shadow-sm">
                  <span className="material-symbols-outlined text-xl" data-icon="lab_profile">lab_profile</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">Physics Lab Report</p>
                  <p className="text-[10px] text-outline">Due in 2 days</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="bg-white w-10 h-10 rounded flex-shrink-0 flex items-center justify-center text-secondary shadow-sm">
                  <span className="material-symbols-outlined text-xl" data-icon="history_edu">history_edu</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">Chem Quiz 4 Prep</p>
                  <p className="text-[10px] text-outline">Due tomorrow</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
      </div>
    </MainLayout>
  );
}