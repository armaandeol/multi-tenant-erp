import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { useParams, useNavigate } from 'react-router-dom';

export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExamDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = import.meta.env?.VITE_API_BASE_URL || process.env?.REACT_APP_API_BASE_URL;
        const token = localStorage.getItem("accessToken");

        const response = await fetch(`${baseUrl}v1/operations/exams/${id}/`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
          }
        });

        if (!response.ok) {
          if (response.status === 404) throw new Error("Exam not found or you do not have permission to view it.");
          throw new Error("Failed to fetch exam details.");
        }

        const data = await response.json();
        setExam(data);

      } catch (err) {
        console.error("Fetch Exam Detail Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExamDetails();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return "To Be Announced";
    const options = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getDaysRemaining = (startDate) => {
    if (!startDate) return null;
    const diffTime = Math.abs(new Date(startDate) - new Date());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <MainLayout title="Exam Profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl block">progress_activity</span>
            <p className="font-semibold tracking-wide">Retrieving Exam Details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !exam) {
    return (
      <MainLayout title="Exam Profile">
        <div className="max-w-3xl mx-auto mt-12 p-8 bg-white rounded-xl shadow-sm border border-red-100 text-center">
          <span className="material-symbols-outlined text-5xl text-red-500 mb-4 block">error_outline</span>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 font-display">Details Unavailable</h2>
          <p className="text-gray-500 mb-8">{error}</p>
          <button 
            onClick={() => navigate("/exams")} 
            className="px-8 py-3 bg-primary text-white font-bold rounded-md shadow-md hover:opacity-90 transition-opacity"
          >
            Return to Directory
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Exam Details">
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <button 
              onClick={() => navigate("/exams")}
              className="flex items-center gap-1 text-sm font-bold text-primary hover:-translate-x-1 transition-transform mb-4 outline-none border-none cursor-pointer bg-transparent"
            >
              <span className="material-symbols-outlined text-[18px] block">arrow_back</span>
              Back to Exams
            </button>
            <h1 className="text-4xl font-extrabold text-on-surface tracking-tight font-display mb-2">{exam.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
              <span className="px-3 py-1 bg-blue-50 text-primary border border-blue-100 rounded-full text-xs font-bold uppercase tracking-wider">
                {exam.academic_year_name || "Academic Year"}
              </span>
              <span className="text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] block">tag</span>
                ID: {exam.id.split('-')[0]}
              </span>
            </div>
          </div>
          <button className="px-6 py-3 bg-surface-container-high text-on-surface font-bold rounded-md shadow-sm hover:bg-surface-container-highest transition-colors flex items-center gap-2 w-max">
            <span className="material-symbols-outlined text-lg block">download</span>
            Download Syllabus
          </button>
        </div>

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 space-y-6">
            {/* Timeline Card */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_12px_32px_rgba(11,28,48,0.04)] border border-outline-variant/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="font-display text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary block">event</span>
                Examination Timeline
              </h3>
              
              <div className="relative border-l-2 border-primary/20 pl-6 pb-2 space-y-8 ml-2">
                <div className="relative">
                  <span className="absolute -left-[31px] bg-primary w-3 h-3 rounded-full top-1.5 shadow-[0_0_0_4px_rgba(0,88,190,0.1)]"></span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Commencement Date</p>
                  <p className="text-lg font-bold text-on-surface">{formatDate(exam.start_date)}</p>
                </div>
                
                <div className="relative">
                  <span className="absolute -left-[31px] bg-secondary w-3 h-3 rounded-full top-1.5 shadow-[0_0_0_4px_rgba(107,56,212,0.1)]"></span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Conclusion Date</p>
                  <p className="text-lg font-bold text-on-surface">{formatDate(exam.end_date)}</p>
                </div>
              </div>

              {exam.start_date && new Date(exam.start_date) > new Date() && (
                <div className="mt-8 pt-6 border-t border-outline-variant/20 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-600">Preparation Time Remaining:</p>
                  <p className="text-xl font-black text-primary font-display">{getDaysRemaining(exam.start_date)} Days</p>
                </div>
              )}
            </div>

            {/* Results / Grades Placeholder Card */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_12px_32px_rgba(11,28,48,0.04)] border border-outline-variant/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display text-xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary block">school</span>
                  My Results
                </h3>
                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded uppercase tracking-wider border border-slate-200">Pending Evaluation</span>
              </div>
              
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-8 text-center flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">hourglass_empty</span>
                <p className="font-bold text-slate-700 mb-1">Results not yet published</p>
                <p className="text-sm text-slate-500 max-w-sm">
                  Grades for this examination will appear here automatically once grading is completed by your faculty.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Status Panel */}
            <div className="bg-gradient-to-br from-primary to-primary-container p-6 rounded-xl shadow-lg text-white">
              <h4 className="text-sm font-bold uppercase tracking-widest text-blue-200 mb-4">Official Status</h4>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl block" style={{ fontVariationSettings: `'FILL' 1` }}>verified</span>
                </div>
                <div>
                  <p className="text-2xl font-display font-black">Published</p>
                  <p className="text-xs text-blue-100 font-medium mt-0.5">Approved by Administration</p>
                </div>
              </div>
            </div>

            {/* Preparation AI Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_12px_32px_rgba(11,28,48,0.04)] border-t-4 border-tertiary">
              <h4 className="font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary block">lightbulb</span>
                AI Study Plan
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Generate a personalized study timeline based on your historic performance data to prepare efficiently for {exam.name}.
              </p>
              <button className="w-full py-2.5 bg-tertiary text-white rounded-md text-sm font-bold shadow-md hover:bg-amber-700 transition-colors outline-none border-none cursor-pointer">
                Generate Plan
              </button>
            </div>

          </div>
        </div>

      </div>
    </MainLayout>
  );
}