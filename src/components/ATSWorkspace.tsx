import React, { useState, useMemo, useEffect } from "react";
import { 
  ArrowLeft, Star, Phone, MessageSquare, Mail, FileText, Check, AlertCircle,
  Clock, Plus, Sparkles, User, ArrowRight, Trash2, StickyNote, MoreVertical, Search, Filter,
  Bookmark, Eye, Gift, UserCheck, Briefcase, MapPin, MoreHorizontal, Bell, BarChart2, RefreshCw
} from "lucide-react";
import { Job, Candidate } from "../types";
import ResumePreviewer from "./ResumePreviewer";
import { calculateAtsScore } from "../lib/atsScore";
import { localResumeStorage } from "../lib/localResumeStorage";
import { formatResponseDateTime } from "./NotificationsModal";

interface ATSWorkspaceProps {
  job: Job;
  candidates: Candidate[];
  onBack: () => void;
  onUpdateCandidateStage: (candId: number, newStage: any) => void;
  onToggleFavourite: (candId: number) => void;
  onAddNote: (candId: number, noteText: string) => void;
  onSendBulkEmails: (candIds: number[]) => void;
  onRemoveCandidate: (candId: number) => void;
  onUpdateCandidate: (updatedCand: Candidate) => void;
}

const BOARD_STAGES: Array<Candidate["stage"]> = ["screening", "shortlist", "interview", "offer", "hired"];

const STAGE_CONFIGS: Record<Candidate["stage"], { title: string; color: string; hoverColor: string }> = {
  screening: { title: "Screening", color: "bg-slate-50 border-slate-200 text-slate-800", hoverColor: "hover:bg-slate-100" },
  shortlist: { title: "Shortlist", color: "bg-blue-50/40 border-blue-100 text-blue-900", hoverColor: "hover:bg-blue-50" },
  interview: { title: "Interview", color: "bg-purple-50/40 border-purple-100 text-purple-900", hoverColor: "hover:bg-purple-50" },
  offer: { title: "Offer", color: "bg-amber-50/40 border-amber-100 text-amber-900", hoverColor: "hover:bg-amber-50" },
  hired: { title: "Hired", color: "bg-emerald-50/40 border-emerald-100 text-emerald-950", hoverColor: "hover:bg-emerald-50" },
  rejected: { title: "Rejected", color: "bg-rose-50 border-rose-100 text-rose-900", hoverColor: "hover:bg-rose-100" }
};

export default function ATSWorkspace({
  job,
  candidates,
  onBack,
  onUpdateCandidateStage,
  onToggleFavourite,
  onAddNote,
  onSendBulkEmails,
  onRemoveCandidate,
  onUpdateCandidate
}: ATSWorkspaceProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const activeSelectedCandidate = useMemo(() => {
    if (!selectedCandidate) return null;
    const hasAts = selectedCandidate.ats && typeof selectedCandidate.ats.score === "number" && selectedCandidate.ats.score > 0;
    return {
      ...selectedCandidate,
      ats: hasAts ? selectedCandidate.ats : calculateAtsScore(selectedCandidate, job)
    };
  }, [selectedCandidate, job]);

  const [isBackgroundAnalyzing, setIsBackgroundAnalyzing] = useState(false);
  const [backgroundStatus, setBackgroundStatus] = useState("");

  useEffect(() => {
    if (!selectedCandidate) return;

    const isPendingPdf = selectedCandidate.resumePDF && 
      (selectedCandidate.resumeText === "" || 
       selectedCandidate.resumeText?.includes("pending extraction") ||
       selectedCandidate.resumeText?.includes("Failed to transcribe") ||
       selectedCandidate.resumeText?.includes("pending AI extraction") ||
       !selectedCandidate.resumeText);

    if (isPendingPdf && !isBackgroundAnalyzing) {
      const triggerBackgroundScreening = async () => {
        setIsBackgroundAnalyzing(true);
        setBackgroundStatus("Retrieving uploaded PDF document...");
        try {
          let base64Pdf = await localResumeStorage.getResume(selectedCandidate.id);
          if (!base64Pdf && selectedCandidate.resumePDF && selectedCandidate.resumePDF.startsWith("data:")) {
            base64Pdf = selectedCandidate.resumePDF;
          }

          if (!base64Pdf) {
            throw new Error("No PDF binary in local cache");
          }

          setBackgroundStatus("Extracting text from PDF resume...");
          const textExtractRes = await fetch("/api/gemini/extract-pdf-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64Pdf })
          });

          let extractedText = "";
          if (textExtractRes.ok) {
            const resJson = await textExtractRes.json();
            extractedText = resJson.text || "";
          } else {
            throw new Error("Failed to extract PDF text");
          }

          if (!extractedText) {
            throw new Error("Extracted text is empty");
          }

          setBackgroundStatus("Calculating ATS score based on job description...");
          const parseRes = await fetch("/api/gemini/parse-resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resumeText: extractedText,
              jobTitle: job.title,
              jobSkills: job.skills || [],
              jobDescription: job.description || ""
            })
          });

          if (parseRes.ok) {
            const parseJson = await parseRes.json();
            const finalResult = {
              score: typeof parseJson.score === "number" ? parseJson.score : 0,
              matchedSkills: parseJson.matchedSkills || [],
              missingSkills: parseJson.missingSkills || [],
              experienceMatch: parseJson.experienceMatch || "",
              educationMatch: parseJson.educationMatch || "",
              recommendation: parseJson.recommendation || ""
            };

            const updatedCand: Candidate = {
              ...selectedCandidate,
              resumeText: extractedText,
              ats: finalResult
            };

            onUpdateCandidate(updatedCand);
            setSelectedCandidate(updatedCand);
          } else {
            throw new Error("Parsing resume failed");
          }
        } catch (err) {
          console.error("Background screening failed, calculating local score:", err);
          const localResult = calculateAtsScore({
            ...selectedCandidate,
            resumeText: "Empty or unparseable format"
          }, job);

          const updatedCand: Candidate = {
            ...selectedCandidate,
            resumeText: "Failed to transcribe PDF binary. Standard parsing failed.",
            ats: localResult
          };

          onUpdateCandidate(updatedCand);
          setSelectedCandidate(updatedCand);
        } finally {
          setIsBackgroundAnalyzing(false);
          setBackgroundStatus("");
        }
      };

      triggerBackgroundScreening();
    }
  }, [selectedCandidate?.id, selectedCandidate?.resumeText, isBackgroundAnalyzing]);

  const [searchQuery, setSearchQuery] = useState("");
  const [atsFilter, setAtsFilter] = useState<string>("all");
  const [noticeFilter, setNoticeFilter] = useState<string>("all");
  const [selectedBulk, setSelectedBulk] = useState<number[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [expandedStage, setExpandedStage] = useState<Candidate["stage"] | null>("screening");
  const [showJobDetails, setShowJobDetails] = useState(false);

  // Filters and enriches candidates for this specific job with dynamic ATS scores on the fly
  const jobCandidates = useMemo(() => {
    return candidates
      .filter(c => String(c.jobId) === String(job.id) || c.role?.toLowerCase() === job.title?.toLowerCase())
      .map(c => {
        const hasAts = c.ats && typeof c.ats.score === "number" && c.ats.score > 0;
        return {
          ...c,
          ats: hasAts ? c.ats! : calculateAtsScore(c, job)
        };
      });
  }, [candidates, job]);

  // Apply search and filter
  const filteredCandidates = useMemo(() => {
    return jobCandidates.filter(c => {
      // Search match
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        c.name.toLowerCase().includes(searchLower) || 
        c.role.toLowerCase().includes(searchLower) || 
        c.location.toLowerCase().includes(searchLower);

      // ATS filter match
      let matchesAts = true;
      if (atsFilter === "high") matchesAts = (c.ats?.score || 0) >= 80;
      else if (atsFilter === "mid") matchesAts = (c.ats?.score || 0) >= 60 && (c.ats?.score || 0) < 80;
      else if (atsFilter === "low") matchesAts = (c.ats?.score || 0) < 60;

      // Notice filter match
      let matchesNotice = true;
      if (noticeFilter === "immediate") matchesNotice = c.noticePeriod.toLowerCase().includes("immediate");
      else if (noticeFilter === "2weeks") matchesNotice = c.noticePeriod.toLowerCase().includes("2 week");

      return matchesSearch && matchesAts && matchesNotice;
    });
  }, [jobCandidates, searchQuery, atsFilter, noticeFilter]);

  const toggleSelectBulk = (id: number) => {
    setSelectedBulk(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedBulk.length === filteredCandidates.length) {
      setSelectedBulk([]);
    } else {
      setSelectedBulk(filteredCandidates.map(c => c.id));
    }
  };

  const handleNoteSubmit = (e: React.FormEvent, candId: number) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(candId, newNoteText);
    
    // Update local state if drawer is open
    if (selectedCandidate && selectedCandidate.id === candId) {
      setSelectedCandidate(prev => prev ? {
        ...prev,
        notes: [
          { text: newNoteText, author: "Rahul Sharma", date: new Date().toISOString() },
          ...(prev.notes || [])
        ]
      } : null);
    }
    setNewNoteText("");
  };

  return (
    <div className="space-y-6">
      {/* Back Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors shadow-sm focus:outline-none"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ATS Workspace</span>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{job.title}</h1>
              <button 
                onClick={() => setShowJobDetails(true)}
                className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
              >
                View Job Details
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">{job.company} · {job.dept}</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input autoCapitalize="words" 
              placeholder="Search applicant..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white shadow-sm w-44 md:w-56 capitalize"
            />
          </div>

          {/* ATS Filter Dropdown */}
          <select 
            value={atsFilter}
            onChange={(e) => setAtsFilter(e.target.value)}
            className="border border-slate-200 rounded-xl text-xs py-2 px-3 bg-white shadow-sm focus:outline-none"
          >
            <option value="all">All ATS Scores</option>
            <option value="high">Score 80+ (High Match)</option>
            <option value="mid">Score 60-79 (Good Fit)</option>
            <option value="low">Score &lt; 60 (Needs Review)</option>
          </select>

          {/* Notice Period Filter */}
          <select 
            value={noticeFilter}
            onChange={(e) => setNoticeFilter(e.target.value)}
            className="border border-slate-200 rounded-xl text-xs py-2 px-3 bg-white shadow-sm focus:outline-none"
          >
            <option value="all">All Notice Periods</option>
            <option value="immediate">Immediate Joiners</option>
            <option value="2weeks">2 Weeks notice</option>
          </select>

          {/* Bulk Select Action */}
          {selectedBulk.length > 0 && (
            <button
              onClick={() => onSendBulkEmails(selectedBulk)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              Bulk Email ({selectedBulk.length}) <Mail className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sleek, Professional Compact Horizontal Tab Bar for Stages */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {BOARD_STAGES.map((stage) => {
            const stageCandidates = filteredCandidates.filter(c => c.stage === stage);
            const isActive = expandedStage === stage;
            
            const formatCount = (num: number) => num < 10 ? `0${num}` : `${num}`;
            const getStageIcon = (stg: string, active: boolean) => {
              const iconClass = `w-3.5 h-3.5 ${active ? "text-white" : "text-slate-400"}`;
              switch(stg) {
                case "screening": return <FileText className={iconClass} />;
                case "shortlist": return <Star className={iconClass} />;
                case "interview": return <Eye className={iconClass} />;
                case "offer": return <Gift className={iconClass} />;
                case "hired": return <User className={iconClass} />;
                default: return <FileText className={iconClass} />;
              }
            };

            return (
              <button
                key={stage}
                onClick={() => setExpandedStage(stage)}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap focus:outline-none ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-slate-200/50"
                }`}
              >
                {getStageIcon(stage, isActive)}
                <span className="capitalize">{stage}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {formatCount(stageCandidates.length)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0 flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-slate-400" />
          Recruiter Workspace
        </div>
      </div>

      {/* Full Width content container directly below side-by-side headings */}
      {expandedStage && (() => {
        const stageCandidates = filteredCandidates.filter(c => c.stage === expandedStage);
        const config = STAGE_CONFIGS[expandedStage];

        return (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden animate-in fade-in duration-300">
            {/* Header row of the active stage panel */}
            <div className="bg-slate-50/30 px-6 py-5 border-b border-slate-100/85 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="capitalize">{expandedStage}</span> Stage Candidates
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {stageCandidates.length} candidates in this stage
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* View Report Button */}
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs focus:outline-none cursor-pointer"
                  onClick={() => alert("Generating ATS Analytics Report...")}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
                  View Report
                </button>

                {/* Filter Icon button */}
                <button
                  className="p-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-2xs focus:outline-none cursor-pointer"
                  title="Advanced Filters"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Sort dropdown */}
                <select
                  className="border border-slate-200 rounded-xl text-xs py-1.5 pl-2.5 pr-8 bg-white shadow-2xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                  defaultValue="newest"
                >
                  <option value="newest">Newest Applied</option>
                  <option value="score_desc">Highest ATS Score</option>
                  <option value="score_asc">Lowest ATS Score</option>
                </select>

                <button
                  onClick={() => setExpandedStage(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1.5 hover:bg-slate-100 rounded-xl transition-all focus:outline-none ml-2 cursor-pointer"
                  title="Close Panel"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* List container covering full width */}
            <div className="p-6 divide-y divide-slate-100 space-y-4 bg-slate-50/10">
              {stageCandidates.map((c) => {
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCandidate(c)}
                    className="bg-white p-5 rounded-2xl border border-slate-200/75 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col lg:flex-row justify-between gap-6 cursor-pointer relative group"
                  >
                    {/* Left Details Column */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Bookmark and checkbox */}
                      <div className="flex flex-col items-center gap-4 mt-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={selectedBulk.includes(c.id)}
                          onChange={() => toggleSelectBulk(c.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <button
                          onClick={() => onToggleFavourite(c.id)}
                          className="text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer"
                          title="Bookmark candidate"
                        >
                          <Bookmark className={`w-4 h-4 ${c.favourite ? "text-indigo-600 fill-indigo-600" : "text-slate-300"}`} />
                        </button>
                      </div>

                      {/* Candidate Avatar (DP) */}
                      <div className="relative shrink-0 mt-1">
                        {c.avatarUrl ? (
                          <img 
                            src={c.avatarUrl} 
                            alt={c.name}
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 rounded-[20px] object-cover border border-slate-100 shadow-2xs"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-[20px] bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center font-sans text-xl shrink-0 border border-indigo-100/50 shadow-2xs">
                            {c.avatar.startsWith('http') ? c.name.substring(0,2).toUpperCase() : c.avatar}
                          </div>
                        )}
                        {/* Status Green Indicator Dot */}
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" title="Active Candidate" />
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Name and Pill */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                            {c.name}
                          </h4>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/70 px-2.5 py-0.5 rounded-md border border-indigo-100/40 uppercase tracking-wider">
                            {c.role}
                          </span>
                        </div>

                        {/* Contact info inline with icons */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium pt-0.5">
                          <span className="flex items-center gap-1.5" title="Email">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> {c.email}
                          </span>
                          <span className="flex items-center gap-1.5" title="Phone">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {c.phone}
                          </span>
                          <span className="flex items-center gap-1.5" title="Location">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.location}
                          </span>
                          <span className="flex items-center gap-1.5" title="Experience">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {c.experience} Experience
                          </span>
                        </div>

                        {/* Structured Specification Grid - Identical to screenshot! */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-1.5 py-2 max-w-xl text-xs border-t border-slate-100/70 pt-2.5 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Notice Period</span>
                            <span className="text-slate-800 font-extrabold">{c.noticePeriod}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Expected Salary</span>
                            <span className="text-slate-800 font-extrabold">{c.expectedSalary}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Education</span>
                            <span className="text-slate-800 font-extrabold truncate max-w-[180px]">{c.education}</span>
                          </div>
                          <div className="flex items-center justify-between col-span-1 sm:col-span-2 bg-amber-50/70 border border-amber-200/60 px-3 py-1.5 rounded-xl">
                            <span className="text-amber-900 font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Response Time (Date & Time)
                            </span>
                            <span className="text-amber-950 font-black">
                              {formatResponseDateTime(c.applied, c.timeline)}
                            </span>
                          </div>
                        </div>

                        {/* Skills Badges bottom row */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {(c.ats?.matchedSkills || []).slice(0, 3).map((sk, idx) => (
                            <span key={idx} className="bg-slate-50 text-slate-600 border border-slate-200/60 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg shadow-2xs">
                              {sk}
                            </span>
                          ))}
                          {(c.ats?.matchedSkills || []).length > 3 && (
                            <span className="bg-indigo-50 text-indigo-600 border border-indigo-100/50 text-[11px] font-bold px-2 py-0.5 rounded-lg">
                              +{(c.ats?.matchedSkills || []).length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: ATS Score & Actions */}
                    <div className="flex flex-col md:flex-row lg:flex-col justify-between gap-4 lg:w-48 shrink-0">
                      {/* ATS Score card */}
                      <div className="bg-indigo-50/20 border border-indigo-100/40 rounded-2xl p-4 flex flex-col justify-between w-full shadow-2xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">ATS Score</span>
                          <>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-2xl font-black text-slate-900">{c.ats?.score !== undefined ? c.ats.score : 0}%</span>
                            </div>
                            <span className={`text-[11px] font-bold block mt-0.5 ${
                              (c.ats?.score || 0) >= 80 ? "text-indigo-600" :
                              (c.ats?.score || 0) >= 60 ? "text-emerald-600" :
                              "text-amber-600"
                            }`}>
                              {(c.ats?.score || 0) >= 80 ? "Excellent Fit" :
                               (c.ats?.score || 0) >= 60 ? "Good Fit" :
                               "Needs Review"}
                            </span>
                          </>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              (c.ats?.score || 0) >= 80 ? "bg-indigo-500" :
                              (c.ats?.score || 0) >= 60 ? "bg-emerald-500" :
                              "bg-amber-500"
                            }`}
                            style={{ width: `${c.ats?.score || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Action buttons (View Profile, Add Note, ...) */}
                      <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setSelectedCandidate(c)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5 text-slate-400" /> View Profile
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCandidate(c);
                            }}
                            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            title="Add Note"
                          >
                            <FileText className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          {BOARD_STAGES.indexOf(c.stage) < BOARD_STAGES.length - 1 ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateCandidateStage(c.id, BOARD_STAGES[BOARD_STAGES.indexOf(c.stage) + 1]);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 border border-indigo-100/50 rounded-xl hover:bg-indigo-100 text-xs font-bold text-indigo-700 shadow-2xs transition-all cursor-pointer"
                            >
                              Move to {STAGE_CONFIGS[BOARD_STAGES[BOARD_STAGES.indexOf(c.stage) + 1]].title}
                            </button>
                          ) : (
                            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 border border-emerald-100/50 rounded-xl text-xs font-bold text-emerald-700 shadow-2xs">
                              <Check className="w-3.5 h-3.5" /> Hired
                            </div>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to decline ${c.name}?`)) {
                                onUpdateCandidateStage(c.id, "rejected");
                              }
                            }}
                            className="p-2 bg-rose-50 border border-rose-100/50 rounded-xl hover:bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                            title="Decline Candidate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {stageCandidates.length === 0 && (
                <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                  No candidates in {config.title} stage currently.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Candidate Profile Slide-out Drawer */}
      {activeSelectedCandidate && (() => {
        const selectedCandidate = activeSelectedCandidate;
        return (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
            {/* Overlay click to close */}
            <div className="absolute inset-0" onClick={() => setSelectedCandidate(null)}></div>
          
          {/* Drawer Frame */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col p-6 animate-in slide-in-from-right duration-300">
            {/* Drawer Close */}
            <button 
              onClick={() => setSelectedCandidate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none"
            >
              ✕
            </button>

            {/* Candidate Header Summary */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold font-sans">
                {selectedCandidate.avatar.startsWith('http') ? selectedCandidate.name.substring(0,2).toUpperCase() : selectedCandidate.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{selectedCandidate.name}</h2>
                  <Star 
                    onClick={() => {
                      onToggleFavourite(selectedCandidate.id);
                      setSelectedCandidate(prev => prev ? { ...prev, favourite: !prev.favourite } : null);
                    }}
                    className={`w-4 h-4 cursor-pointer ${selectedCandidate.favourite ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} 
                  />
                </div>
                <p className="text-xs text-slate-500 font-medium mb-2">{selectedCandidate.role}</p>
                <p className="text-xs text-slate-400">Notice Period: <span className="text-slate-600 font-medium">{selectedCandidate.noticePeriod}</span> · Expected Salary: <span className="text-slate-600 font-medium">{selectedCandidate.expectedSalary}</span></p>
              </div>

              {/* Match Dial */}
              <div className="text-right">
                <span className="text-3xl font-extrabold text-indigo-600">{selectedCandidate.ats?.score !== undefined ? selectedCandidate.ats.score : 0}%</span>
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">ATS Alignment</span>
              </div>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="grid grid-cols-4 gap-2 mb-6 text-center">
              <a 
                href={`tel:${selectedCandidate.phone}`}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all text-xs font-semibold gap-1"
              >
                <Phone className="w-4 h-4" /> Call
              </a>
              <a 
                href={`https://wa.me/${selectedCandidate.phone.replace(/\s/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all text-xs font-semibold gap-1"
              >
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </a>
              <a 
                href={`mailto:${selectedCandidate.email}`}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all text-xs font-semibold gap-1"
              >
                <Mail className="w-4 h-4" /> Email
              </a>
              <button 
                onClick={() => {
                  if (confirm(`Are you sure you want to decline ${selectedCandidate.name}?`)) {
                    onUpdateCandidateStage(selectedCandidate.id, "rejected");
                    setSelectedCandidate(null);
                  }
                }}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all text-xs font-semibold gap-1 focus:outline-none"
              >
                <Trash2 className="w-4 h-4 text-rose-500" /> Decline
              </button>
            </div>

            {/* Update Board Stage Select */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase block">Hiring Stage</span>
                <span className="text-sm font-bold text-slate-700 uppercase">{selectedCandidate.stage}</span>
              </div>
              <select
                value={selectedCandidate.stage}
                onChange={(e) => {
                  const val = e.target.value as Candidate["stage"];
                  onUpdateCandidateStage(selectedCandidate.id, val);
                  setSelectedCandidate(prev => prev ? { ...prev, stage: val } : null);
                }}
                className="border border-slate-200 bg-white rounded-xl text-xs py-1.5 px-3 focus:outline-none font-medium"
              >
                <option value="screening">Screening</option>
                <option value="shortlist">Shortlist</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* ATS Analysis Report Card */}
            {selectedCandidate.ats && (
              <div className="border border-indigo-100 bg-indigo-50/50 p-5 rounded-2xl space-y-4 mb-6">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Automated ATS Match Report
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wide block mb-1">Matched Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedCandidate.ats.matchedSkills.map((sk, idx) => (
                        <span key={idx} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                          {sk}
                        </span>
                      ))}
                      {selectedCandidate.ats.matchedSkills.length === 0 && <span className="text-slate-400">None detected</span>}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wide block mb-1 text-red-500">Missing Core Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedCandidate.ats.missingSkills.map((sk, idx) => (
                        <span key={idx} className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">
                          {sk}
                        </span>
                      ))}
                      {selectedCandidate.ats.missingSkills.length === 0 && <span className="text-emerald-600">All key skills matched!</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wide block mb-0.5">Experience Fit</span>
                    <p className="text-slate-600">{selectedCandidate.ats.experienceMatch}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wide block mb-0.5">Education Check</span>
                    <p className="text-slate-600">{selectedCandidate.ats.educationMatch}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-indigo-100/60 text-xs">
                  <span className="font-bold text-indigo-700 block mb-1">Recommendation Summary</span>
                  <p className="text-slate-600 leading-relaxed italic">{selectedCandidate.ats.recommendation}</p>
                </div>
              </div>
            )}

            {/* Candidate Resume Document */}
            {selectedCandidate.resumePDF && (
              <div className="mb-6">
                <ResumePreviewer candidate={selectedCandidate} />
              </div>
            )}

            {/* Recruiter Notes Area */}
            <div className="space-y-3 mb-6 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-slate-500" /> Recruiter Comments & Notes
              </h3>

              <form onSubmit={(e) => handleNoteSubmit(e, selectedCandidate.id)} className="flex items-center gap-2">
                <input autoCapitalize="words" 
                  placeholder="Add custom notes..."
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 capitalize"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-4 py-2 transition-colors focus:outline-none"
                >
                  Post Note
                </button>
              </form>

              <div className="space-y-2.5 max-h-40 overflow-y-auto">
                {selectedCandidate.notes && selectedCandidate.notes.length > 0 ? (
                  selectedCandidate.notes.map((note, idx) => (
                    <div key={idx} className="bg-slate-50/50 border border-slate-200/50 p-3 rounded-xl space-y-1">
                      <p className="text-xs text-slate-700">{note.text}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span>by {note.author}</span>
                        <span>{new Date(note.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No comments posted yet.</p>
                )}
              </div>
            </div>

            {/* Stage Change Log Timeline */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> Application Timeline Log
              </h3>
              <div className="space-y-2 text-xs divide-y divide-slate-100">
                {selectedCandidate.timeline && selectedCandidate.timeline.map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 first:pt-0">
                    <span className="text-slate-600">{event.event}</span>
                    <span className="text-slate-400 text-[10px]">{new Date(event.date).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Job Details Modal */}
      {showJobDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl flex flex-col space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase">Opening Details</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{job.title}</h2>
              </div>
              <button 
                onClick={() => setShowJobDetails(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-4 bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <div className="flex-1 min-w-[120px]">
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1 whitespace-nowrap">Company</span>
                <span className="text-xs font-bold text-slate-800 block whitespace-nowrap">{job.company}</span>
              </div>
              <div className="flex-1 min-w-[120px]">
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1 whitespace-nowrap">Location</span>
                <span className="text-xs font-bold text-slate-800 block whitespace-nowrap">{job.location}</span>
              </div>
              <div className="flex-1 min-w-[120px]">
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1 whitespace-nowrap">Salary</span>
                <span className="text-xs font-bold text-slate-800 block whitespace-nowrap">{job.salary}</span>
              </div>
              <div className="flex-1 min-w-[120px]">
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1 whitespace-nowrap">Type</span>
                <span className="text-xs font-bold text-slate-800 block whitespace-nowrap">{job.employment}</span>
              </div>
              <div className="flex-1 min-w-[120px]">
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1 whitespace-nowrap">Experience</span>
                <span className="text-xs font-bold text-slate-800 block whitespace-nowrap">{job.experience || "Not specified"}</span>
              </div>
              <div className="flex-1 min-w-[120px]">
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1 whitespace-nowrap">Department</span>
                <span className="text-xs font-bold text-slate-800 block whitespace-nowrap">{job.dept}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-tight border-b border-slate-100 pb-2">Full Job Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                {job.description ? job.description.split(/\*\*(.*?)\*\*/g).map((part, i) => i % 2 === 1 ? <strong key={i} className="font-extrabold text-slate-900">{part}</strong> : part) : "No description provided."}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-tight border-b border-slate-100 pb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills && job.skills.length > 0 ? (
                  job.skills.map((s, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200/50">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 font-medium">No specific skills listed.</span>
                )}
              </div>
            </div>

            {job.benefits && (
              <div className="space-y-4 pb-4">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-tight border-b border-slate-100 pb-2">Benefits</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                  {job.benefits}
                </p>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowJobDetails(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl px-5 py-2.5 transition-colors focus:outline-none"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
