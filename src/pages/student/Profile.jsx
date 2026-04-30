import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';

export default function Profile() {
  const [identity, setIdentity] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = import.meta.env?.VITE_API_BASE_URL || process.env?.REACT_APP_API_BASE_URL;
        const token = localStorage.getItem("accessToken");
        const headers = { "Authorization": `Bearer ${token}`, "Accept": "application/json" };

        // STEP 1: Get Base Identity & Profile IDs
        const meResponse = await fetch(`${baseUrl}v1/profiles/me/`, { headers });
        
        if (!meResponse.ok) {
          throw new Error("Session expired or failed to authenticate user identity.");
        }

        const meData = await meResponse.json();
        setIdentity(meData.identity);

        const studentProfileId = meData.profiles?.student?.id;

        if (!meData.profiles?.student?.exists || !studentProfileId) {
          throw new Error("Access Denied: No Student profile is linked to your account.");
        }

        // STEP 2: Fetch the specific Student Profile details
        const studentResponse = await fetch(`${baseUrl}v1/profiles/students/${studentProfileId}/`, { headers });

        if (!studentResponse.ok) {
          throw new Error("Failed to load student profile details.");
        }

        const studentData = await studentResponse.json();
        setProfile(studentData);

      } catch (err) {
        console.error("Profile Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const getInitials = (first, last, email) => {
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first.substring(0, 2).toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return "ST";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <MainLayout title="Student Profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl block">progress_activity</span>
            <p className="font-semibold tracking-wide">Syncing Profile Data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error && !profile) {
    return (
      <MainLayout title="Student Profile">
        <div className="max-w-4xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-sm border border-red-100 text-center">
          <span className="material-symbols-outlined text-5xl text-red-500 mb-4 block">gpp_bad</span>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 font-display">Profile Resolution Failed</h2>
          <p className="text-gray-500 mb-6">{error}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Student Profile">
      <div className="max-w-5xl mx-auto pb-12">

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
          {/* Top Main Identity Card */}
          <div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8 transition-all hover:bg-surface-bright shadow-sm border border-outline-variant/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
            
            <div className="relative group shrink-0">
              {profile?.profile_picture ? (
                <img alt="Profile Photo" className="w-40 h-40 md:w-48 md:h-48 rounded-2xl object-cover shadow-xl border-4 border-white" src={profile.profile_picture} />
              ) : (
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl shadow-xl border-4 border-white bg-primary/10 flex items-center justify-center text-primary text-6xl font-bold">
                  {getInitials(profile?.first_name || identity?.first_name, profile?.last_name || identity?.last_name, identity?.email)}
                </div>
              )}
              <button className="absolute -bottom-3 -right-3 bg-primary-container text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform outline-none border-none cursor-pointer">
                <span className="material-symbols-outlined text-lg block" data-icon="photo_camera">photo_camera</span>
              </button>
            </div>
            
            <div className="flex-1 text-center md:text-left z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h1 className="text-4xl font-extrabold font-headline text-on-surface">
                  {profile?.first_name || profile?.last_name 
                    ? `${profile.first_name} ${profile.last_name}` 
                    : (identity?.first_name ? `${identity.first_name} ${identity.last_name || ''}` : 'Student Profile')}
                </h1>
                <span className={`px-4 py-1.5 text-xs font-bold rounded-full self-center md:self-auto backdrop-blur-md border ${profile?.is_archived ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                  {profile?.is_archived ? 'ARCHIVED' : 'ACTIVE STUDENT'}
                </span>
              </div>
              <p className="text-on-surface-variant font-medium text-lg mb-6">Registered Student • Enrolled Scholar</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <button className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:-translate-y-0.5 transition-all outline-none border-none cursor-pointer">
                  <span className="material-symbols-outlined block" data-icon="edit">edit</span>
                  Edit Profile
                </button>
                <button className="bg-surface-container-high text-primary px-8 py-3 rounded-xl font-bold hover:bg-surface-variant transition-all outline-none border-none cursor-pointer shadow-sm">
                  Download ID Card
                </button>
              </div>
            </div>
          </div>

          {/* Top Quick Stats (Mocked for Visuals as they are aggregations) */}
          <div className="md:col-span-4 grid grid-cols-1 gap-6">
            <div className="bg-surface-container-lowest rounded-xl p-6 flex items-center justify-between group transition-all shadow-sm border border-outline-variant/20">
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">System User ID</p>
                <p className="text-xl font-black text-on-surface font-mono mt-2">{identity?.id?.split('-')[0]}...</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-3xl block" data-icon="fingerprint">fingerprint</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 flex items-center justify-between group transition-all shadow-sm border border-outline-variant/20">
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Student Link ID</p>
                <p className="text-xl font-black text-on-surface font-mono mt-2">{profile?.id?.split('-')[0]}...</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <span className="material-symbols-outlined text-3xl block" data-icon="link">link</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Academic Information Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <span className="material-symbols-outlined text-primary block" data-icon="school">school</span>
              <h2 className="text-xl font-bold font-headline">Academic Information</h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/20">
              <div className="p-6 space-y-6">
                
                <div className="flex justify-between items-start">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase font-label">Enrollment Number</label>
                    <p className="text-on-surface font-semibold text-lg font-mono mt-1">{profile?.enrollment_number || "Not Assigned"}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 block" data-icon="pin">pin</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase font-label">Date of Birth</label>
                    <p className="text-on-surface font-semibold text-lg mt-1">{formatDate(profile?.date_of_birth)}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 block" data-icon="cake">cake</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase font-label">Blood Group</label>
                    <p className="text-red-600 bg-red-50 px-3 py-1 rounded-md font-bold text-lg mt-1 w-max">
                      {profile?.blood_group ? profile.blood_group.toUpperCase() : "Unknown"}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 block" data-icon="bloodtype">bloodtype</span>
                </div>

                <div className="flex justify-between items-start pt-4 border-t border-slate-100">
                  <div className="w-full">
                    <label className="text-xs font-bold text-slate-400 uppercase font-label mb-2 block">Institution Tenant</label>
                    <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3 border border-slate-100">
                      <span className="material-symbols-outlined text-slate-400 block">domain</span>
                      <p className="text-slate-600 font-mono text-sm truncate">{profile?.school}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Personal Contact Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <span className="material-symbols-outlined text-primary block" data-icon="contact_page">contact_page</span>
              <h2 className="text-xl font-bold font-headline">Personal Contact</h2>
            </div>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/20">
              <div className="p-6 space-y-6">
                
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary block" data-icon="mail">mail</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <label className="text-xs font-bold text-slate-400 uppercase font-label">Login Email</label>
                    <p className="text-on-surface font-semibold truncate mt-0.5">{profile?.email || identity?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary block" data-icon="call">call</span>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase font-label">Phone Number</label>
                    <p className="text-on-surface font-semibold mt-0.5">{profile?.phone_number || "Not Provided"}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary block" data-icon="location_on">location_on</span>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase font-label">Registered Address</label>
                    <p className="text-on-surface font-semibold mt-0.5 leading-relaxed">
                      {profile?.address || "No address details available on record."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-orange-500 block" data-icon="security">security</span>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase font-label">Data Privacy</label>
                    <p className="text-slate-600 text-sm mt-0.5">Your profile is isolated to your school tenant via Row-Level Security.</p>
                  </div>
                </div>

              </div>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}