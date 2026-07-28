import React, { useState } from "react";
import { 
  Users, Briefcase, Calendar, Award, CheckCircle2, 
  AlertTriangle, ArrowRight, Star, Sparkles, TrendingUp, Globe, Shield, FileText, X
} from "lucide-react";
import { Job, Candidate } from "../types";
import ResumePreviewer from "./ResumePreviewer";

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

  const activeJobsCount = jobs.filter(j => j.status === "active").length;
  const totalCandidatesCount = candidates.length;
  const interviewCount = candidates.filter(c => c.stage === "interview").length;
  const hiredCount = candidates.filter(c => c.stage === "hired").length;
  const screeningCount = candidates.filter(c => c.stage === "screening").length;
  const highAtsWaiting = candidates.filter(c => c.stage === "screening" && (c.ats?.score || 0) >= 80).length;

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
    <div className="space-y-8">
      {/* GLOBAL DATABASE ACCESS UNLOCKED - SURPRISE CELEBRATORY CARD */}
      {!isFounderMode && hasCentralPoolAccess && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute left-1/3 bottom-0 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 justify-between relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-600/25 border border-indigo-500/40 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 animate-spin-slow text-indigo-400" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                  ⭐ Authority Privilege Unlocked
                </span>
                <h3 className="text-base font-extrabold tracking-tight">Global Central Pool Access Active</h3>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Congratulations! The company founder has authorized your account with **Global Database Scope**. You can now inspect, search, and assign candidates from our entire centralized talent pool.
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onNavigateToTalentPool}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl px-4 py-3 shadow transition-colors flex items-center gap-1.5 whitespace-nowrap self-start sm:self-center"
            >
              Open Central Pool <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {isFounderMode ? (
              <>
                <Shield className="w-6 h-6 text-rose-600" /> Founder Admin Workspace Dashboard
              </>
            ) : (
              "Overview Dashboard"
            )}
          </h1>
          <p className="text-sm text-slate-500">
            {isFounderMode 
              ? "Global company-wide view of recruitment funnels, active postings, and recruiter audit status."
              : "Monitor applicant activity, job conversions, and high-match hiring signals in real-time."
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFounderMode && onToggleGlobalPool && (
            <button
              onClick={onToggleGlobalPool}
              className={`font-medium text-sm rounded-xl px-4 py-2.5 transition-colors focus:outline-none shadow-sm flex items-center gap-1.5 ${globalPoolEnabled ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              <Globe className="w-4 h-4" /> Central Pool Access: {globalPoolEnabled ? "ON" : "OFF"}
            </button>
          )}
          <button
            onClick={onNavigateToJobs}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-sm rounded-xl px-4 py-2.5 transition-colors focus:outline-none shadow-sm"
          >
            {isFounderMode ? "Analyze Posted Jobs" : "Manage Jobs"}
          </button>
          <button
            onClick={onNavigateToTalentPool}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl px-4 py-2.5 transition-colors focus:outline-none shadow-sm flex items-center gap-1.5"
          >
            {isFounderMode || hasCentralPoolAccess ? "Central Pool" : "Talent Pool"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div 
          onClick={() => onSelectWidgetFilter("active")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Jobs</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{activeJobsCount}</span>
            <span className="text-xs text-slate-400">Openings</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div 
          onClick={() => onSelectWidgetFilter("all")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Applicants</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{totalCandidatesCount}</span>
            <span className="text-xs text-slate-400">Total</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => onSelectWidgetFilter("screening")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-amber-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Needs Screening</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{screeningCount}</span>
            <span className="text-xs text-slate-500 font-medium text-amber-600 flex items-center gap-1">
              {highAtsWaiting} High Match
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={() => onSelectWidgetFilter("hired")}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hires</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{hiredCount}</span>
            <span className="text-xs text-slate-500 font-medium text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> High conversion
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
            {candidates.slice(0, 4).map((c) => (
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
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
