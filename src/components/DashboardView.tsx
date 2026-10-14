import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, Briefcase, Calendar, Award, CheckCircle2, 
  AlertTriangle, ArrowRight, Star, Sparkles, TrendingUp, Globe, Shield, FileText, X
} from "lucide-react";
import { Job, Candidate } from "../types";
import ResumePreviewer from "./ResumePreviewer";
import { getCandidateResponseTimestamp } from "../lib/formatUtils";

interface DashboardViewProps {
  jobs: Job[];
  candidates: Candidate[];
  onNavigateToJobs: () => void;
  onNavigateToTalentPool: () => void;
  onSelectWidgetFilter: (filterName: string) => void;
  companyLogo?: string;
  logoPosition?: "header" | "dashboard" | "cards";
  hasCentralPoolAccess?: boolean;
  isFounderMode?: boolean;
  globalPoolEnabled?: boolean;
  onToggleGlobalPool?: () => void;
}

export default function DashboardView({ 
  jobs, 
  candidates, 
  onNavigateToJobs, 
  onNavigateToTalentPool,
  onSelectWidgetFilter,
  companyLogo,
  logoPosition,
  hasCentralPoolAccess = false,
  isFounderMode = false,
  globalPoolEnabled = false,
  onToggleGlobalPool
}: DashboardViewProps) {
  
  const [selectedResumeCandidate, setSelectedResumeCandidate] = useState<Candidate | null>(null);

  // Keyboard Escape listener to close resume modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedResumeCandidate) {
        setSelectedResumeCandidate(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedResumeCandidate]);

  const activeJobsCount = jobs.filter(j => j.status === "active").length;
  const totalCandidatesCount = candidates.length;
  const interviewCount = candidates.filter(c => c.stage === "interview").length;
  const hiredCount = candidates.filter(c => c.stage === "hired").length;
  const screeningCount = candidates.filter(c => c.stage === "screening").length;
  const highAtsWaiting = candidates.filter(c => c.stage === "screening" && (c.ats?.score || 0) >= 80).length;

  const recentCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => getCandidateResponseTimestamp(b) - getCandidateResponseTimestamp(a));
  }, [candidates]);

  // Challenges faced by recruiters and our features
  const CHALLENGES = [
    {
      title: "Manual Resume Screening is Slow",
      description: "Recruiters waste hours reading resumes that don't fit. Often missing great candidates in the clutter.",
      solution: "Gemini ATS Screening Score",
      impact: "We use Gemini to compare candidate experience & core skills against job requirements, ranking applicants instantly with detailed matching feedback."
    },
    {
      title: "Hard to Promote Jobs on Social Media",
      description: "Building graphic designs and engaging posts for LinkedIn and Instagram takes too much marketing effort.",
      solution: "Automated ShareKit Banner & Copy",
      impact: "Generate beautiful job marketing graphic posters with custom brand themes, download them instantly, and generate AI-optimized copy with Gemini in one click."
    },
    {
      title: "Candidate Sourcing & Disconnected Portals",
      description: "Public job portals are disconnected from internal tracking workflows, causing state and data leaks.",
      solution: "Integrated Community Job Board",
      impact: "We link a native Public Job Portal that flows new candidate forms, custom skills and resume text directly into the recruiter ATS flow."
    },
    {
      title: "Disorganized Process Management",
      description: "Tracking comments, notice periods, and contact updates via spreadsheets is chaotic and error-prone.",
      solution: "Visual ATS Kanban Board",
      impact: "Drag candidates across clear visual hiring stages, set reminders, maintain timeline events, and call or text candidates via quick action nodes."
    }
  ];

  return (
    <div className="space-y-4 md:space-y-8">
      {/* GLOBAL DATABASE ACCESS UNLOCKED - SURPRISE CELEBRATORY CARD */}
      {!isFounderMode && hasCentralPoolAccess && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute left-1/3 bottom-0 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 justify-between relative z-10">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600/25 border border-indigo-500/40 text-indigo-400 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase inline-block">
                  ⭐ Authority Privilege Unlocked
                </span>
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight">Global Central Pool Access Active</h3>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  The company founder has authorized your account with **Global Database Scope**. Inspect, search, and assign candidates from our centralized talent pool.
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onNavigateToTalentPool}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl px-4 py-2.5 sm:py-3 shadow transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap self-stretch sm:self-center cursor-pointer"
            >
              Open Central Pool <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-3 sm:pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {isFounderMode ? (
              <>
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 shrink-0" /> Founder Admin Workspace Dashboard
              </>
            ) : (
              "Overview Dashboard"
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isFounderMode 
              ? "Global company-wide view of recruitment funnels, active postings, and recruiter audit status."
              : "Monitor applicant activity, job conversions, and high-match hiring signals in real-time."
            }
          </p>
        </div>
        <div className={`grid ${isFounderMode && onToggleGlobalPool ? 'grid-cols-3' : 'grid-cols-2'} sm:flex sm:items-center gap-1.5 sm:gap-3 w-full sm:w-auto shrink-0`}>
          {isFounderMode && onToggleGlobalPool && (
            <button
              type="button"
              onClick={onToggleGlobalPool}
              className={`font-bold text-[10px] xs:text-xs sm:text-sm rounded-xl px-1.5 xs:px-2 sm:px-4 py-2 sm:py-2.5 transition-colors focus:outline-none shadow-xs flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center ${globalPoolEnabled ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Central Pool: {globalPoolEnabled ? "ON" : "OFF"}</span>
              <span className="sm:hidden">Central: {globalPoolEnabled ? "ON" : "OFF"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateToJobs}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[10px] xs:text-xs sm:text-sm rounded-xl px-1.5 xs:px-2 sm:px-4 py-2 sm:py-2.5 transition-colors focus:outline-none shadow-xs flex items-center justify-center text-center cursor-pointer"
          >
            <span className="hidden sm:inline">{isFounderMode ? "Analyze Posted Jobs" : "Manage Jobs"}</span>
            <span className="sm:hidden">{isFounderMode ? "Analyze Jobs" : "Manage Jobs"}</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToTalentPool}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] xs:text-xs sm:text-sm rounded-xl px-1.5 xs:px-2 sm:px-4 py-2 sm:py-2.5 transition-colors focus:outline-none shadow-xs flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center"
          >
            <span className="hidden sm:inline">{isFounderMode || hasCentralPoolAccess ? "Central Pool" : "Talent Pool"}</span>
            <span className="sm:hidden">{isFounderMode || hasCentralPoolAccess ? "Central Pool" : "Talent Pool"}</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 hidden xs:inline-block" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1 */}
        <div 
          onClick={() => onSelectWidgetFilter("active")}
          className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Active Jobs</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
              <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{activeJobsCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-400">Openings</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div 
          onClick={() => onSelectWidgetFilter("all")}
          className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Total Applicants</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalCandidatesCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-400">Total</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => onSelectWidgetFilter("screening")}
          className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:shadow-md hover:border-amber-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Needs Screening</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{screeningCount}</span>
            <span className="text-[10px] sm:text-xs text-amber-600 font-medium truncate">
              {highAtsWaiting} High Match
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={() => onSelectWidgetFilter("hired")}
          className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Total Hires</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{hiredCount}</span>
            <span className="text-[10px] sm:text-xs text-emerald-600 font-medium truncate">
              High conversion
            </span>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Applications & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900">Recent Applications</h3>
            <button 
              onClick={() => onSelectWidgetFilter("all")} 
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              View recruitment
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentCandidates.slice(0, 4).map((c) => (
              <div 
                key={c.id} 
                onClick={() => setSelectedResumeCandidate(c)}
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors -mx-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                    {c.avatar.startsWith('http') ? c.name.substring(0,2).toUpperCase() : c.avatar}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{c.name}</h4>
                    <p className="text-xs text-slate-400">
                      Applied for <span className="font-medium text-slate-500">{c.role}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    c.stage === "hired" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                    c.stage === "interview" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                    c.stage === "offer" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                    c.stage === "shortlist" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                    "bg-slate-50 text-slate-700 border border-slate-200"
                  }`}>
                    {c.stage}
                  </span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {c.ats?.score || 70}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Activity Logs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900">Activity Logs</h3>
            <span className="text-xs text-slate-400 font-medium">Real-time</span>
          </div>

          <div className="py-8 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">No recent system activity</p>
            <p className="text-[10px] text-slate-400 mt-1">Actions from recruiters and candidates will appear here.</p>
          </div>
        </div>
      </div>

      {selectedResumeCandidate && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setSelectedResumeCandidate(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {selectedResumeCandidate.avatar.startsWith('http') ? selectedResumeCandidate.name.substring(0,2).toUpperCase() : selectedResumeCandidate.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedResumeCandidate.name}</h3>
                  <p className="text-xs text-slate-500">Applicant for {selectedResumeCandidate.role}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedResumeCandidate(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <ResumePreviewer candidate={selectedResumeCandidate} />
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelectedResumeCandidate(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Close Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
