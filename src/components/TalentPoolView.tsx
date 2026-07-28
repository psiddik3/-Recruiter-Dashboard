import React, { useState, useMemo } from "react";
import { 
  Users, Search, Star, Phone, MessageSquare, Mail, 
  Sparkles, Clipboard, ArrowRight, UserCheck, Trash2,
  X, Check, Loader2, Brain, ExternalLink, Briefcase, ChevronRight, CheckSquare, Square,
  Clock, Globe, Shield, Layers
} from "lucide-react";
import { Job, Candidate } from "../types";
import ResumePreviewer from "./ResumePreviewer";
import { formatResponseDateTime } from "./NotificationsModal";

import { calculateAtsScore } from "../lib/atsScore";

interface TalentPoolViewProps {
  candidates: Candidate[];
  jobs: Job[];
  onToggleFavourite: (candId: number) => void;
  onAssignToJob: (candId: number, targetJobId: number) => void;
  onRemoveCandidate: (candId: number) => void;
  onUpdateCandidateStage: (candId: number, newStage: Candidate["stage"]) => void;
  onOpenBulkEmail: (candIds: number[]) => void;
  isCentralPoolView?: boolean;
}

interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: string;
  educationMatch: string;
  recommendation: string;
}

// Highly descriptive, dynamic real-time local skill & resume ATS score calculator
export function calculateLocalAtsScore(cand: Candidate, job: Job): MatchResult {
  return calculateAtsScore(cand, job);
}

export default function TalentPoolView({ 
  candidates, 
  jobs, 
  onToggleFavourite, 
  onAssignToJob, 
  onRemoveCandidate,
  onUpdateCandidateStage,
  onOpenBulkEmail,
  isCentralPoolView = false
}: TalentPoolViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState<number>(0);
  const [locationQuery, setLocationQuery] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<string>("all");
  
  // Selected candidates for bulk operations
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Quick-shortlist dropdown open state per candidate ID
  const [shortlistPopoverId, setShortlistPopoverId] = useState<number | null>(null);

  // Detailed profile slide-out drawer state
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);

  // Interactive Match Criteria evaluation state inside the drawer
  const [evaluationJobId, setEvaluationJobId] = useState<number | "">("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<MatchResult | null>(null);
  const [evaluationError, setEvaluationError] = useState("");

  // Quick specifications view & Bulk actions modals state
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [bulkShortlistModalOpen, setBulkShortlistModalOpen] = useState(false);
  const [bulkShortlistTargetJobId, setBulkShortlistTargetJobId] = useState<number | "">("");

  // Filter candidates globally
  const filteredCandidates = useMemo(() => {
    return candidates.map(c => {
      // If candidate has an assigned job but no ATS score (or score is 0), calculate it on the fly!
      if (c.jobId && (!c.ats || c.ats.score === 0)) {
        const targetJob = jobs.find(j => j.id === c.jobId);
        if (targetJob) {
          return {
            ...c,
            ats: calculateLocalAtsScore(c, targetJob)
          };
        }
      }
      return c;
    }).filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        c.name.toLowerCase().includes(q) || 
        c.role.toLowerCase().includes(q) || 
        c.location.toLowerCase().includes(q) ||
        (c.resumeText && c.resumeText.toLowerCase().includes(q));

      const matchesScore = (c.ats?.score || 0) >= minScore;

      // Location match
      const locQ = locationQuery.toLowerCase();
      const matchesLocation = !locationQuery || c.location.toLowerCase().includes(locQ);

      // Experience Level match
      let matchesExp = true;
      if (experienceLevel !== "all") {
        const expLower = c.experience.toLowerCase();
        const yrsMatch = expLower.match(/(\d+)\s*(?:-|to)?\s*(\d*)\s*years?/);
        const yearsNum = yrsMatch ? parseInt(yrsMatch[1]) : 0;

        if (experienceLevel === "senior") {
          matchesExp = expLower.includes("senior") || expLower.includes("lead") || expLower.includes("architect") || yearsNum >= 5;
        } else if (experienceLevel === "mid") {
          matchesExp = (!expLower.includes("senior") && !expLower.includes("lead") && yearsNum >= 2 && yearsNum < 5) || expLower.includes("mid");
        } else if (experienceLevel === "junior") {
          matchesExp = expLower.includes("junior") || expLower.includes("entry") || expLower.includes("intern") || yearsNum < 2;
        }
      }

      return matchesSearch && matchesScore && matchesLocation && matchesExp;
    });
  }, [candidates, jobs, searchQuery, minScore, locationQuery, experienceLevel]);

  const activeJobs = useMemo(() => {
    return jobs.filter(j => j.status === "active");
  }, [jobs]);

  // Toggle selection for a single candidate
  const handleToggleSelect = (candId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click
    setSelectedIds(prev => 
      prev.includes(candId) ? prev.filter(id => id !== candId) : [...prev, candId]
    );
  };

  // Select/Deselect all filtered candidates
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredCandidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCandidates.map(c => c.id));
    }
  };

  // Bulk: Shortlist for selected job opening
  const handleBulkShortlist = (jobIdStr: string) => {
    if (!jobIdStr || selectedIds.length === 0) return;
    const jobId = Number(jobIdStr);
    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob) return;

    selectedIds.forEach(id => {
      onAssignToJob(id, jobId);
      onUpdateCandidateStage(id, "shortlist");
    });

    alert(`Successfully shortlisted ${selectedIds.length} candidate(s) for the "${targetJob.title}" opening!`);
    setSelectedIds([]);
  };

  // Bulk: Move to Stage
  const handleBulkMoveStage = (stage: Candidate["stage"]) => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => {
      onUpdateCandidateStage(id, stage);
    });
    alert(`Successfully moved ${selectedIds.length} candidate(s) to ${stage.toUpperCase()}!`);
    setSelectedIds([]);
  };

  // Bulk: Email Outreach
  const handleBulkEmailOutreach = () => {
    if (selectedIds.length === 0) return;
    onOpenBulkEmail(selectedIds);
    setSelectedIds([]);
  };

  // Individual: Quick Shortlist action
  const handleQuickShortlist = (candId: number, jobId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob) return;

    onAssignToJob(candId, jobId);
    onUpdateCandidateStage(candId, "shortlist");
    setShortlistPopoverId(null);
    alert(`Candidate successfully shortlisted for "${targetJob.title}"!`);
  };

  // Drawer: Open a candidate profile details
  const handleOpenProfile = (candidate: Candidate) => {
    setActiveCandidate(candidate);
    setEvaluationJobId("");
    setEvaluationResult(candidate.ats || null);
    setEvaluationError("");
  };

  // Drawer: Analyze Match with Gemini AI
  const handleEvaluateMatchCriteria = async () => {
    if (!activeCandidate || !evaluationJobId) return;
    setIsEvaluating(true);
    setEvaluationResult(null);
    setEvaluationError("");

    const targetJob = jobs.find(j => j.id === Number(evaluationJobId));
    if (!targetJob) {
      setIsEvaluating(false);
      return;
    }

    try {
      const response = await fetch("/api/gemini/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: activeCandidate.resumeText || `Name: ${activeCandidate.name}\nRole: ${activeCandidate.role}\nExperience: ${activeCandidate.experience}\nEducation: ${activeCandidate.education}`,
          jobTitle: targetJob.title,
          jobSkills: targetJob.skills || [],
          jobDescription: targetJob.description || ""
        })
      });

      if (!response.ok) throw new Error("Resume screening API failed");
      const result: MatchResult = await response.json();
      
      // Update local evaluation layout
      setEvaluationResult(result);
      
      // Do not overwrite activeCandidate.ats here, as this is just a preview evaluation against any job.
    } catch (err: any) {
      console.error(err);
      setEvaluationError("AI match evaluation failed. Please make sure that your server is online and configured.");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 relative pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {isCentralPoolView ? (
              <>
                <Globe className="w-6 h-6 text-emerald-600" /> Central Pool Database
              </>
            ) : (
              <>
                <Users className="w-6 h-6 text-indigo-600" /> Talent Pool Workspace
              </>
            )}
          </h1>
          <p className="text-sm text-slate-500">
            {isCentralPoolView 
              ? `Master central database containing all ${candidates.length} company candidate records across all job postings.`
              : "Search, filter, shortlist, and evaluate candidate profiles globally across all active company job requirements."}
          </p>
        </div>

        {/* Highlighted Badge Count */}
        <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 shadow-xs ${
          isCentralPoolView 
            ? "bg-emerald-50 border-emerald-200 text-emerald-950" 
            : "bg-indigo-50 border-indigo-200 text-indigo-950"
        }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
            isCentralPoolView ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
          }`}>
            {candidates.length}
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              {isCentralPoolView ? "Central Database" : "Talent Pool Size"}
            </span>
            <span className="text-xs font-extrabold">
              {isCentralPoolView ? `${candidates.length} Central Candidates` : `${candidates.length} Talent Pool Profiles`}
            </span>
          </div>
        </div>
      </div>

      {/* Number Count Summary Cards & Pool Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Count */}
        <div className={`p-4 rounded-2xl border shadow-2xs ${
          isCentralPoolView ? "bg-emerald-50/50 border-emerald-100" : "bg-indigo-50/50 border-indigo-100"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isCentralPoolView ? "Central Candidates Data" : "Talent Pool Candidates"}
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              isCentralPoolView ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
            }`}>
              {isCentralPoolView ? <Globe className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{candidates.length}</span>
            <span className="text-xs text-slate-500 font-bold">Total Profiles</span>
          </div>
        </div>

        {/* Card 2: Active Job Talent Pools */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isCentralPoolView ? "Central Job Openings" : "Job Talent Pools"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{jobs.length}</span>
            <span className="text-xs text-slate-500 font-bold">Active Pools</span>
          </div>
        </div>

        {/* Card 3: Shortlisted / High Match */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isCentralPoolView ? "Top Matched Records" : "Shortlisted Candidates"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {candidates.filter(c => c.stage === "shortlist" || (c.ats?.score || 0) >= 75).length}
            </span>
            <span className="text-xs text-slate-500 font-bold">Candidates</span>
          </div>
        </div>
      </div>

      {/* Individual Job Talent Pool Counts Chips */}
      {jobs.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              {isCentralPoolView ? "Central Database Count by Opening:" : "Job Talent Pool Counts:"}
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {jobs.length} Active Position(s)
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {jobs.map(job => {
              const count = candidates.filter(c => 
                c.jobId === job.id || (c.role && c.role.trim().toLowerCase() === job.title.trim().toLowerCase())
              ).length;
              return (
                <div 
                  key={job.id} 
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 flex items-center gap-2 transition-colors"
                >
                  <span className="truncate max-w-[180px]">{job.title}</span>
                  <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              );
            })}
            {/* Unassigned Pool */}
            {(() => {
              const unassignedCount = candidates.filter(c => !c.jobId && !jobs.some(j => j.title.trim().toLowerCase() === (c.role || "").trim().toLowerCase())).length;
              if (unassignedCount > 0) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-900 flex items-center gap-2">
                    <span>Unassigned Talent Pool</span>
                    <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {unassignedCount}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Main Keyword / Resume Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input autoCapitalize="words"
              type="text"
              placeholder="Search keyword (name, skills, resume context)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium capitalize"
            />
          </div>

          {/* Location Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input autoCapitalize="words"
              type="text"
              placeholder="Filter by location (e.g. Mumbai, Bengaluru)..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium capitalize"
            />
          </div>

          {/* Experience Level & ATS Rating and Select All */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
            {/* Experience Level Dropdown */}
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="border border-slate-200 rounded-xl text-xs py-2.5 px-4 bg-white focus:outline-none font-semibold text-slate-700 cursor-pointer flex-1 shadow-sm"
            >
              <option value="all">All Experience Levels</option>
              <option value="junior">Junior (&lt; 2 Years / Intern)</option>
              <option value="mid">Mid-level (2 - 5 Years)</option>
              <option value="senior">Senior (5+ Years / Lead / Architect)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* ATS Score Filter */}
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="border border-slate-200 rounded-xl text-xs py-2.5 px-4 bg-white focus:outline-none font-semibold text-slate-700 cursor-pointer shadow-sm w-full sm:w-64"
            >
              <option value={0}>All Match Percentages</option>
              <option value={80}>Exceptional Fit (80%+ ATS Score)</option>
              <option value={60}>Aligned Fit (60%+ ATS Score)</option>
            </select>

            {/* Clear Filters Button */}
            {(searchQuery || locationQuery || experienceLevel !== "all" || minScore > 0) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setLocationQuery("");
                  setExperienceLevel("all");
                  setMinScore(0);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 font-medium">
              Showing <strong>{filteredCandidates.length}</strong> of <strong>{candidates.length}</strong> profiles
            </span>
            {filteredCandidates.length > 0 && (
              <button
                onClick={handleToggleSelectAll}
                className="text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-2 px-3 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                {selectedIds.length === filteredCandidates.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Candidates List Container */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {filteredCandidates.map((c) => {
            const currentJobName = jobs.find(j => j.id === c.jobId)?.title || "General Candidate Pool";
            const isSelected = selectedIds.includes(c.id);

            return (
              <div 
                key={c.id} 
                onClick={() => handleOpenProfile(c)}
                className={`p-5 hover:bg-slate-50/80 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 cursor-pointer relative group ${
                  isSelected ? "bg-indigo-50/20 border-l-4 border-indigo-600" : ""
                }`}
              >
                {/* Checkbox and Profile Summary */}
                <div className="flex items-start gap-4">
                  <button
                    onClick={(e) => handleToggleSelect(c.id, e)}
                    className="mt-1 text-slate-400 hover:text-indigo-600 shrink-0 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />
                    )}
                  </button>

                  <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-indigo-100/50 shadow-2xs">
                    {c.avatarUrl ? (
                      <img 
                        src={c.avatarUrl} 
                        alt={c.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center font-sans text-base">
                        {c.avatar.startsWith('http') ? c.name.substring(0,2).toUpperCase() : c.avatar}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                        {c.name}
                      </h3>
                      <Star
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavourite(c.id);
                        }}
                        className={`w-4 h-4 cursor-pointer transition-transform hover:scale-110 ${c.favourite ? "text-amber-400 fill-amber-400" : "text-slate-300 hover:text-slate-400"}`}
                      />
                    </div>
                    <p className="text-xs text-slate-600 font-semibold">{c.role} · {c.experience} Experience</p>
                    <p className="text-xs text-slate-400">
                      Job Assigned: <span className="font-bold text-slate-600">{currentJobName}</span> ({c.stage})
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1">
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1" title="Candidate Job Response Date and Time">
                        <Clock className="w-3 h-3 text-amber-600 shrink-0" /> Response Time: {formatResponseDateTime(c.applied, c.timeline)}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        📍 {c.location}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        ⏱️ notice: {c.noticePeriod}
                      </span>
                    </div>

                    {/* Job Match Context Selector (Individually show all available jobs) */}
                    <div className="flex flex-wrap items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evaluate Against:</span>
                      <select
                        value={c.jobId || ""}
                        onChange={(e) => {
                          const targetId = e.target.value === "" ? 0 : Number(e.target.value);
                          onAssignToJob(c.id, targetId);
                          
                          // Dynamically calculate and save ATS Match score immediately!
                          const targetJob = jobs.find(j => j.id === targetId);
                          if (targetJob) {
                            c.ats = calculateLocalAtsScore(c, targetJob);
                          }
                        }}
                        className="bg-slate-50 border border-slate-200 text-xs rounded-xl py-1 px-2.5 font-bold text-slate-700 cursor-pointer shadow-xs focus:outline-none"
                      >
                        <option value="">General Candidate Pool (Unassigned)</option>
                        {activeJobs.map(job => (
                          <option key={job.id} value={job.id}>{job.title}</option>
                        ))}
                      </select>

                      {c.jobId ? (
                        <button
                          onClick={() => {
                            const targetJob = jobs.find(j => j.id === c.jobId);
                            if (targetJob) setViewingJob(targetJob);
                          }}
                          className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-2 rounded-lg font-bold transition-all flex items-center gap-0.5 shrink-0"
                          title="Open job requirements specifications"
                        >
                          <Briefcase className="w-3 h-3" /> View Job description
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* ATS Score & Match Skills Indicator */}
                <div className="lg:w-64 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                      {c.ats?.score !== undefined ? c.ats.score : 0}% Match
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Skills Matches</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <>
                      {(c.ats?.matchedSkills || []).slice(0, 3).map((sk, idx) => (
                        <span key={idx} className="bg-slate-50 text-slate-600 border border-slate-100 text-[9px] font-medium px-2 py-0.5 rounded">
                          {sk}
                        </span>
                      ))}
                      {(c.ats?.matchedSkills || []).length > 3 && (
                        <span className="text-slate-400 text-[9px] font-bold self-center pl-1">
                          +{c.ats!.matchedSkills.length - 3} more
                        </span>
                      )}
                    </>
                  </div>
                </div>

                {/* Actions Block */}
                <div className="flex items-center gap-2.5 self-start lg:self-center">
                  {/* View details button explicitly */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenProfile(c);
                    }}
                    className="text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    Open Profile <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Individual Quick Shortlist Action */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShortlistPopoverId(prev => prev === c.id ? null : c.id);
                      }}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Shortlist
                    </button>

                    {shortlistPopoverId === c.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 space-y-2 animate-fade-in text-left"
                      >
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Select Job to Shortlist</h4>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {activeJobs.map(job => (
                            <button
                              key={job.id}
                              onClick={(e) => handleQuickShortlist(c.id, job.id, e)}
                              className="w-full text-left text-xs hover:bg-indigo-50 hover:text-indigo-700 p-2 rounded-xl font-medium transition-colors"
                            >
                              {job.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Call and Email quicklinks */}
                  <div className="flex gap-1 border-l border-slate-100 pl-2.5">
                    <a 
                      href={`tel:${c.phone}`} 
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a 
                      href={`mailto:${c.email}`} 
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCandidates.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-sm">
              No candidates found matching your filters in the database.
            </div>
          )}
        </div>
      </div>

      {/* Bulk Floating Actions Roster Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center justify-between gap-5 z-40 border border-slate-800 animate-slide-up max-w-[95%] w-max flex-row flex-nowrap overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-xs font-black flex items-center justify-center text-white shadow-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-black text-slate-200 tracking-wide uppercase">Selected</span>
          </div>

          <div className="h-5 w-[1.5px] bg-slate-800 shrink-0"></div>

          <div className="flex items-center gap-2.5 flex-row flex-nowrap shrink-0">
            <button
              onClick={() => {
                setBulkShortlistTargetJobId("");
                setBulkShortlistModalOpen(true);
              }}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-4 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5" /> Shortlist Selected
            </button>

            <button
              onClick={() => handleBulkMoveStage("interview")}
              className="text-xs bg-slate-800 hover:bg-indigo-950 border border-slate-700 hover:border-indigo-600 text-slate-200 font-bold py-2 px-3.5 rounded-xl transition-colors cursor-pointer"
            >
              Move to Interview
            </button>

            <button
              onClick={() => handleBulkMoveStage("offer")}
              className="text-xs bg-slate-800 hover:bg-indigo-950 border border-slate-700 hover:border-indigo-600 text-slate-200 font-bold py-2 px-3.5 rounded-xl transition-colors cursor-pointer"
            >
              Move to Offer
            </button>

            <button
              onClick={handleBulkEmailOutreach}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-4 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" /> Bulk Outreach
            </button>
          </div>

          <div className="h-5 w-[1.5px] bg-slate-800 shrink-0"></div>

          <button
            onClick={() => setSelectedIds([])}
            className="text-slate-400 hover:text-white p-1 ml-auto hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            title="Deselect all candidates"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Slide-out Candidate Detailed Drawer */}
      {activeCandidate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div 
            className="w-full max-w-2xl bg-white h-screen flex flex-col shadow-2xl animate-slide-left border-l border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 text-lg font-bold flex items-center justify-center font-sans">
                  {activeCandidate.avatar.startsWith('http') ? activeCandidate.name.substring(0,2).toUpperCase() : activeCandidate.avatar}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{activeCandidate.name}</h2>
                  <p className="text-xs text-slate-500">{activeCandidate.role} · {activeCandidate.experience}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveCandidate(null)}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Contents - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Contact and Metadata Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Email ID</span>
                  <a href={`mailto:${activeCandidate.email}`} className="font-semibold text-slate-700 hover:text-indigo-600 block">{activeCandidate.email}</a>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Phone Number</span>
                  <a href={`tel:${activeCandidate.phone}`} className="font-semibold text-slate-700 hover:text-indigo-600 block">{activeCandidate.phone}</a>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Location / Zone</span>
                  <span className="font-semibold text-slate-700">{activeCandidate.location}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Notice Period</span>
                  <span className="font-semibold text-slate-700">{activeCandidate.noticePeriod}</span>
                </div>
              </div>

              {/* Match Criteria Assessment Area */}
              <div className="border border-indigo-100 bg-indigo-50/20 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Acuity AI Match Criteria Evaluation</h3>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Evaluate this candidate's fit criteria, skills alignment, and recommendation score against any posted company openings using Gemini AI.
                </p>

                <div className="flex items-center gap-2">
                  <select
                    value={evaluationJobId}
                    onChange={(e) => {
                      setEvaluationJobId(e.target.value === "" ? "" : Number(e.target.value));
                      setEvaluationResult(null);
                    }}
                    className="flex-1 border border-slate-200 rounded-xl text-xs py-2 px-3 bg-white focus:outline-none"
                  >
                    <option value="">Choose requirement opening...</option>
                    {activeJobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleEvaluateMatchCriteria}
                    disabled={!evaluationJobId || isEvaluating}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm shrink-0"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Evaluate Fit
                      </>
                    )}
                  </button>
                </div>

                {evaluationError && (
                  <p className="text-xs text-rose-500 font-semibold">{evaluationError}</p>
                )}

                {/* Match criteria results visualization */}
                {evaluationResult && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">ATS Match Rating</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-black text-slate-900">{evaluationResult.score}% Compatibility</span>
                        </div>
                      </div>
                      
                      {/* Big circle rating badge */}
                      <div className="w-12 h-12 rounded-full border-4 border-indigo-100 flex items-center justify-center font-black text-xs text-indigo-700 bg-indigo-50">
                        {evaluationResult.score}%
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 border-t border-slate-100 pt-3">
                      <div>
                        <h4 className="font-bold text-[10px] text-emerald-600 uppercase tracking-wide mb-1.5">✓ Matched Skills</h4>
                        <div className="flex flex-wrap gap-1">
                          {evaluationResult.matchedSkills.map((sk, idx) => (
                            <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-100/60 text-[9px] px-1.5 py-0.5 rounded-md font-medium">
                              {sk}
                            </span>
                          ))}
                          {evaluationResult.matchedSkills.length === 0 && <span className="text-slate-400">None detected</span>}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-[10px] text-amber-600 uppercase tracking-wide mb-1.5">⚠ Missing Skills</h4>
                        <div className="flex flex-wrap gap-1">
                          {evaluationResult.missingSkills.map((sk, idx) => (
                            <span key={idx} className="bg-amber-50/50 text-amber-700 border border-amber-100/60 text-[9px] px-1.5 py-0.5 rounded-md font-medium">
                              {sk}
                            </span>
                          ))}
                          {evaluationResult.missingSkills.length === 0 && <span className="text-emerald-600">Perfect skill match!</span>}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <div>
                        <span className="font-bold text-slate-400 text-[9px] uppercase">Experience Suitability</span>
                        <p className="text-slate-700 font-medium">{evaluationResult.experienceMatch}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 text-[9px] uppercase">Academic Credentials</span>
                        <p className="text-slate-700 font-medium">{evaluationResult.educationMatch}</p>
                      </div>
                      <div>
                        <span className="font-bold text-indigo-600 text-[9px] uppercase tracking-wider">AI Hiring Recommendation</span>
                        <p className="text-slate-800 leading-relaxed font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">{evaluationResult.recommendation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Professional Experience Text Detail */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Primary Professional Experience</h3>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {activeCandidate.experience}
                </div>
              </div>

              {/* Resume Document Box */}
              <div className="space-y-2">
                <ResumePreviewer candidate={activeCandidate} />
              </div>

              {/* Internal Recruiter Notes */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Internal Assessment Logs</h3>
                <div className="space-y-2">
                  {activeCandidate.notes && activeCandidate.notes.map((n, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400 mb-1 font-semibold">
                        <span>{n.author}</span>
                        <span>{new Date(n.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-700">{n.text}</p>
                    </div>
                  ))}
                  {(!activeCandidate.notes || activeCandidate.notes.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No notes logged for this profile yet.</p>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Outreach & Activity Log</h3>
                <div className="space-y-2.5 text-xs pl-2.5 border-l-2 border-slate-100">
                  {activeCandidate.timeline && activeCandidate.timeline.map((item, idx) => (
                    <div key={idx} className="relative pl-4">
                      <div className="absolute left-[-15px] top-1.5 w-2 h-2 rounded-full bg-indigo-500"></div>
                      <p className="text-slate-700 font-medium">{item.event}</p>
                      <span className="text-[10px] text-slate-400">{new Date(item.date).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Interactive Bulk Shortlist Target Job Selector Dialog Modal */}
      {bulkShortlistModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" /> Shortlist Candidates
              </h3>
              <button
                onClick={() => setBulkShortlistModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                You have selected <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{selectedIds.length} candidate(s)</span>. 
                Please choose the active job opening you want to assign and shortlist them into:
              </p>

              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Target Job Opening</label>
                <select
                  value={bulkShortlistTargetJobId}
                  onChange={(e) => setBulkShortlistTargetJobId(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600"
                >
                  <option value="">-- Choose active job spec --</option>
                  {activeJobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title} ({j.dept})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setBulkShortlistModalOpen(false)}
                className="text-xs text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-xl font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!bulkShortlistTargetJobId) return;
                  const jobId = Number(bulkShortlistTargetJobId);
                  const targetJob = jobs.find(j => j.id === jobId);
                  if (!targetJob) return;

                  selectedIds.forEach(id => {
                    onAssignToJob(id, jobId);
                    onUpdateCandidateStage(id, "shortlist");
                    
                    // Update in-memory match scores instantly
                    const candidate = candidates.find(c => c.id === id);
                    if (candidate) {
                      candidate.ats = calculateLocalAtsScore(candidate, targetJob);
                    }
                  });

                  setBulkShortlistModalOpen(false);
                  setSelectedIds([]);
                  alert(`Successfully assigned and shortlisted candidates for "${targetJob.title}"!`);
                }}
                disabled={!bulkShortlistTargetJobId}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl shadow-sm cursor-pointer transition-all disabled:opacity-40"
              >
                Confirm Shortlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Job Specification & Description Viewer Drawer */}
      {viewingJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div 
            className="w-full max-w-xl bg-white h-screen flex flex-col shadow-2xl animate-slide-left border-l border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Job Specifications</h2>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{viewingJob.dept} Department</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingJob(null)}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-1.5">
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight">{viewingJob.title}</h1>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">📍 {viewingJob.location}</span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">💰 {viewingJob.salary}</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">⏱ {viewingJob.experience} exp</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Candidate Profile & Job Details</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{viewingJob.description}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Required Skills Criteria</h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewingJob.skills && viewingJob.skills.map((skill, idx) => (
                    <span key={idx} className="bg-slate-50 text-slate-700 border border-slate-200 text-xs px-3 py-1 rounded-xl font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employee Benefits & Culture</h3>
                <p className="text-xs text-slate-500 italic leading-relaxed font-medium">{viewingJob.benefits || "Comprehensive health benefits, flexible remote structure, and performance bonuses."}</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setViewingJob(null)}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Close specifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
