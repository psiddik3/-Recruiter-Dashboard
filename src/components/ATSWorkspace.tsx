import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  ArrowLeft, Star, Phone, MessageSquare, Mail, FileText, Check, AlertCircle,
  Clock, Plus, User, ArrowRight, Trash2, StickyNote, MoreVertical, Search, Filter,
  Bookmark, Eye, Gift, UserCheck, Briefcase, MapPin, MoreHorizontal, Bell, BarChart2, RefreshCw, X, Target
} from "lucide-react";
import { Job, Candidate } from "../types";
import ResumePreviewer from "./ResumePreviewer";
import { calculateAtsScore } from "../lib/atsScore";
import { localResumeStorage } from "../lib/localResumeStorage";
import { formatResponseDateTime } from "./NotificationsModal";
import { cleanMarkdownText, getCandidateResponseTimestamp } from "../lib/formatUtils";

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
    const cleanResumeText = selectedCandidate.resumeText?.includes("Failed to transcribe") ? "" : selectedCandidate.resumeText;
    return {
      ...selectedCandidate,
      resumeText: cleanResumeText,
      ats: hasAts ? selectedCandidate.ats : calculateAtsScore(selectedCandidate, job)
    };
  }, [selectedCandidate, job]);

  const [isBackgroundAnalyzing, setIsBackgroundAnalyzing] = useState(false);
  const [backgroundStatus, setBackgroundStatus] = useState("");

  const attemptedExtractionsRef = useRef<Set<number>>(new Set());
  const activeCandidateIdRef = useRef<number | null>(null);

  // Keep activeCandidateIdRef in sync with currently open candidate
  useEffect(() => {
    activeCandidateIdRef.current = selectedCandidate ? selectedCandidate.id : null;
  }, [selectedCandidate]);

  const handleCloseDrawer = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    activeCandidateIdRef.current = null;
    setSelectedCandidate(null);
  };

  // Keyboard Escape listener to immediately close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedCandidate) {
        handleCloseDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCandidate]);

  useEffect(() => {
    if (!selectedCandidate) return;

    const candId = selectedCandidate.id;
    if (attemptedExtractionsRef.current.has(candId)) return;

    // If candidate already has an established ATS score, skip background extraction
    const hasValidAts = selectedCandidate.ats && typeof selectedCandidate.ats.score === "number" && selectedCandidate.ats.score > 0;
    if (hasValidAts) return;

    const isPendingPdf = selectedCandidate.resumePDF && 
      (selectedCandidate.resumeText === "" || 
       selectedCandidate.resumeText?.includes("pending extraction") ||
       selectedCandidate.resumeText?.includes("pending AI extraction") ||
       !selectedCandidate.resumeText);

    if (isPendingPdf && !isBackgroundAnalyzing) {
      attemptedExtractionsRef.current.add(candId);

      const triggerBackgroundScreening = async () => {
        setIsBackgroundAnalyzing(true);
        setBackgroundStatus("Retrieving uploaded PDF document...");
        try {
          let base64Pdf = await localResumeStorage.getResume(candId);
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
            // Only update local drawer state if user has NOT closed the drawer
            if (activeCandidateIdRef.current === candId) {
              setSelectedCandidate(updatedCand);
            }
          } else {
            throw new Error("Parsing resume failed");
          }
        } catch (err) {
          console.error("Background screening failed, calculating local score:", err);
          const cleanText = selectedCandidate.resumeText?.includes("Failed to transcribe") ? "" : (selectedCandidate.resumeText || "");
          const localResult = calculateAtsScore({
            ...selectedCandidate,
            resumeText: cleanText
          }, job);

          const updatedCand: Candidate = {
            ...selectedCandidate,
            resumeText: cleanText,
            ats: selectedCandidate.ats?.score ? selectedCandidate.ats : localResult
          };

          onUpdateCandidate(updatedCand);
          // Only update local drawer state if user has NOT closed the drawer
          if (activeCandidateIdRef.current === candId) {
            setSelectedCandidate(updatedCand);
          }
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
  const [sortOrder, setSortOrder] = useState<"newest" | "score_desc" | "score_asc">("newest");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

  // Apply search, filter (Name, Phone Number, Email ID, Role, Location), and sort (default: newest responses first)
  const filteredCandidates = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    const cleanSearchDigits = searchLower.replace(/[^0-9]/g, "");

    const matched = jobCandidates.filter(c => {
      // Search match across candidate Name, Phone Number, Email ID, Role, Location
      let matchesSearch = true;
      if (searchLower) {
        const nameMatch = c.name && c.name.toLowerCase().includes(searchLower);
        const emailMatch = c.email && c.email.toLowerCase().includes(searchLower);
        const phoneMatch = c.phone && (
          c.phone.toLowerCase().includes(searchLower) ||
          (cleanSearchDigits.length > 0 && c.phone.replace(/[^0-9]/g, "").includes(cleanSearchDigits))
        );
        const roleMatch = c.role && c.role.toLowerCase().includes(searchLower);
        const locationMatch = c.location && c.location.toLowerCase().includes(searchLower);

        matchesSearch = Boolean(nameMatch || emailMatch || phoneMatch || roleMatch || locationMatch);
      }

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

    return [...matched].sort((a, b) => {
      if (sortOrder === "score_desc") {
        return (b.ats?.score || 0) - (a.ats?.score || 0);
      }
      if (sortOrder === "score_asc") {
        return (a.ats?.score || 0) - (b.ats?.score || 0);
      }
      // Default: newest responses first
      return getCandidateResponseTimestamp(b) - getCandidateResponseTimestamp(a);
    });
  }, [jobCandidates, searchQuery, atsFilter, noticeFilter, sortOrder]);

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
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative col-span-2 xs:col-span-1 sm:w-56 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              placeholder="Search by name, email, phone..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 sm:pl-9 pr-2 sm:pr-4 py-1.5 sm:py-2 border border-slate-200 rounded-xl text-[11px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white shadow-xs w-full"
            />
          </div>

          {/* ATS Filter Dropdown */}
          <select 
            value={atsFilter}
            onChange={(e) => setAtsFilter(e.target.value)}
            className="border border-slate-200 rounded-xl text-[11px] sm:text-xs py-1.5 sm:py-2 px-2 sm:px-3 bg-white shadow-xs focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All ATS Scores</option>
            <option value="high">Score 80+ (High Fit)</option>
            <option value="mid">Score 60-79 (Good Fit)</option>
            <option value="low">Score &lt; 60 (Review)</option>
          </select>

          {/* Notice Period Filter */}
          <select 
            value={noticeFilter}
            onChange={(e) => setNoticeFilter(e.target.value)}
            className="border border-slate-200 rounded-xl text-[11px] sm:text-xs py-1.5 sm:py-2 px-2 sm:px-3 bg-white shadow-xs focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All Notice Periods</option>
            <option value="immediate">Immediate</option>
            <option value="2weeks">2 Weeks</option>
          </select>

          {/* Bulk Select Action */}
          {selectedBulk.length > 0 && (
            <button
              onClick={() => onSendBulkEmails(selectedBulk)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] sm:text-xs rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-1.5 transition-colors shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
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
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden animate-in fade-in duration-300">
            {/* Header row of the active stage panel */}
            <div className="bg-slate-50/30 px-3 sm:px-6 py-2.5 sm:py-4 border-b border-slate-100/85 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0"></div>
                <div>
                  <h3 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                    <span className="capitalize">{expandedStage}</span> <span className="hidden xs:inline">Stage</span> Candidates
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-medium whitespace-nowrap">
                    {stageCandidates.length} candidates
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 whitespace-nowrap">
                {/* View Report Button */}
                <button
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-[11px] sm:text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs focus:outline-none cursor-pointer shrink-0"
                  onClick={() => alert("Generating ATS Analytics Report...")}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">View Report</span>
                  <span className="sm:hidden">Report</span>
                </button>

                {/* Filter Icon button */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`p-1.5 border rounded-xl transition-all shadow-2xs focus:outline-none cursor-pointer shrink-0 ${
                    showAdvancedFilters || atsFilter !== "all" || noticeFilter !== "all"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-600 font-bold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Toggle Filters"
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>

                {/* Sort dropdown */}
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="border border-slate-200 rounded-xl text-[11px] sm:text-xs py-1.5 pl-2 sm:pl-2.5 pr-6 sm:pr-8 bg-white shadow-2xs text-slate-700 font-bold focus:outline-none cursor-pointer shrink-0"
                >
                  <option value="newest">Newest Applied</option>
                  <option value="score_desc">Highest Score</option>
                  <option value="score_asc">Lowest Score</option>
                </select>

                <button
                  onClick={() => setExpandedStage(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1.5 hover:bg-slate-100 rounded-xl transition-all focus:outline-none ml-0.5 sm:ml-2 cursor-pointer shrink-0"
                  title="Close Panel"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Collapsible Quick Filter Bar */}
            {showAdvancedFilters && (
              <div className="bg-slate-50 px-3 sm:px-6 py-2.5 border-b border-slate-200/80 flex flex-wrap items-center gap-2.5 text-xs animate-in slide-in-from-top-1 duration-200">
                <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Stage Filters:</span>
                
                <select
                  value={atsFilter}
                  onChange={(e) => setAtsFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg text-xs py-1 px-2.5 bg-white font-medium focus:outline-none cursor-pointer shadow-2xs"
                >
                  <option value="all">All ATS Scores</option>
                  <option value="high">Score 80+ (High Fit)</option>
                  <option value="mid">Score 60-79 (Good Fit)</option>
                  <option value="low">Score &lt; 60 (Review)</option>
                </select>

                <select
                  value={noticeFilter}
                  onChange={(e) => setNoticeFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg text-xs py-1 px-2.5 bg-white font-medium focus:outline-none cursor-pointer shadow-2xs"
                >
                  <option value="all">All Notice Periods</option>
                  <option value="immediate">Immediate</option>
                  <option value="2weeks">2 Weeks</option>
                </select>

                {(atsFilter !== "all" || noticeFilter !== "all" || searchQuery) && (
                  <button
                    onClick={() => {
                      setAtsFilter("all");
                      setNoticeFilter("all");
                      setSearchQuery("");
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold ml-auto cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}

            {/* List container covering full width */}
            <div className="p-1 sm:p-6 divide-y divide-slate-100 space-y-2.5 sm:space-y-4 bg-slate-50/10">
              {stageCandidates.map((c) => {
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCandidate(c)}
                    className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/75 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col lg:flex-row justify-between gap-3 sm:gap-6 cursor-pointer relative group"
                  >
                    {/* Left Details Column */}
                    <div className="flex items-start gap-2.5 sm:gap-4 flex-1 min-w-0">
                      {/* Bookmark and checkbox */}
                      <div className="flex flex-col items-center gap-2.5 sm:gap-4 mt-1 sm:mt-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                      <div className="relative shrink-0 mt-0.5 sm:mt-1">
                        {c.avatarUrl ? (
                          <img 
                            src={c.avatarUrl} 
                            alt={c.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 sm:w-20 sm:h-20 rounded-xl sm:rounded-[20px] object-cover border border-slate-100 shadow-2xs"
                          />
                        ) : (
                          <div className="w-11 h-11 sm:w-20 sm:h-20 rounded-xl sm:rounded-[20px] bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center font-sans text-sm sm:text-xl shrink-0 border border-indigo-100/50 shadow-2xs">
                            {c.avatar.startsWith('http') ? c.name.substring(0,2).toUpperCase() : c.avatar}
                          </div>
                        )}
                        {/* Status Green Indicator Dot */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border-2 border-white" title="Active Candidate" />
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        {/* Name and Pill */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors truncate">
                            {c.name}
                          </h4>
                          <span className="text-[9px] sm:text-[10px] font-bold text-indigo-600 bg-indigo-50/70 px-2 sm:px-2.5 py-0.5 rounded-md border border-indigo-100/40 uppercase tracking-wider truncate">
                            {c.role}
                          </span>
                        </div>

                        {/* Contact info inline with icons */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-500 font-medium pt-0.5">
                          <span className="flex items-center gap-1 truncate" title="Email">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {c.email}
                          </span>
                          <span className="flex items-center gap-1 truncate" title="Phone">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {c.phone}
                          </span>
                          <span className="flex items-center gap-1 truncate" title="Location">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {c.location}
                          </span>
                          <span className="flex items-center gap-1 truncate" title="Experience">
                            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" /> {c.experience}
                          </span>
                        </div>

                        {/* Structured Specification Grid */}
                        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-12 gap-y-1 py-1.5 sm:py-2 max-w-xl text-[11px] sm:text-xs border-t border-slate-100/70 pt-2 mt-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-400 font-medium truncate">Notice</span>
                            <span className="text-slate-800 font-extrabold shrink-0">{c.noticePeriod}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-400 font-medium truncate">Expected</span>
                            <span className="text-slate-800 font-extrabold shrink-0">{c.expectedSalary}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 col-span-2 sm:col-span-1">
                            <span className="text-slate-400 font-medium truncate">Education</span>
                            <span className="text-slate-800 font-extrabold truncate max-w-[160px] sm:max-w-[180px]">{c.education}</span>
                          </div>
                          <div className="flex items-center justify-between col-span-2 bg-amber-50/70 border border-amber-200/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl">
                            <span className="text-amber-900 font-bold flex items-center gap-1 text-[10px] sm:text-xs">
                              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0" /> Response Time
                            </span>
                            <span className="text-amber-950 font-black text-[10px] sm:text-xs">
                              {formatResponseDateTime(c.applied, c.timeline)}
                            </span>
                          </div>
                        </div>

                        {/* Skills Badges bottom row */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-1">
                          {(c.ats?.matchedSkills || []).slice(0, 3).map((sk, idx) => (
                            <span key={idx} className="bg-slate-50 text-slate-600 border border-slate-200/60 text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-lg shadow-2xs">
                              {sk}
                            </span>
                          ))}
                          {(c.ats?.matchedSkills || []).length > 3 && (
                            <span className="bg-indigo-50 text-indigo-600 border border-indigo-100/50 text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-lg">
                              +{(c.ats?.matchedSkills || []).length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: ATS Score & Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col justify-between gap-2.5 sm:gap-4 lg:w-48 shrink-0 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                      {/* ATS Score card */}
                      <div className="bg-indigo-50/20 border border-indigo-100/40 rounded-xl sm:rounded-2xl p-2 sm:p-4 flex flex-row sm:flex-col justify-between items-center sm:items-start w-full shadow-2xs">
                        <div className="flex items-center sm:block gap-2">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block sm:inline">ATS:</span>
                          <span className="text-base sm:text-2xl font-black text-slate-900">{c.ats?.score !== undefined ? c.ats.score : 0}%</span>
                          <span className={`text-[10px] sm:text-[11px] font-bold ${
                            (c.ats?.score || 0) >= 80 ? "text-indigo-600" :
                            (c.ats?.score || 0) >= 60 ? "text-emerald-600" :
                            "text-amber-600"
                          }`}>
                            {(c.ats?.score || 0) >= 80 ? "Excellent Fit" :
                             (c.ats?.score || 0) >= 60 ? "Good Fit" :
                             "Needs Review"}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-24 sm:w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0 sm:mt-3">
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
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Overlay click to close */}
            <div 
              className="absolute inset-0 cursor-pointer" 
              onClick={handleCloseDrawer}
              title="Click outside to close"
            />
          
          {/* Drawer Frame */}
          <div 
            className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Drawer Header Bar - Always visible regardless of scrolling */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Candidate Profile & Response</span>
              </div>
              <button 
                type="button"
                onClick={handleCloseDrawer}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-extrabold flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
                title="Close Candidate Profile (Esc)"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-1.5 sm:p-6 space-y-4 sm:space-y-6">

            {/* Candidate Header Summary */}
            <div className="flex items-start gap-3 sm:gap-4 pb-3 sm:pb-6 border-b border-slate-100">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg sm:text-xl font-bold font-sans shrink-0">
                {selectedCandidate.avatar.startsWith('http') ? selectedCandidate.name.substring(0,2).toUpperCase() : selectedCandidate.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{selectedCandidate.name}</h2>
                  <Star 
                    onClick={() => {
                      onToggleFavourite(selectedCandidate.id);
                      setSelectedCandidate(prev => prev ? { ...prev, favourite: !prev.favourite } : null);
                    }}
                    className={`w-4 h-4 cursor-pointer shrink-0 ${selectedCandidate.favourite ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} 
                  />
                </div>
                <p className="text-xs text-slate-500 font-medium mb-1 sm:mb-2 truncate">{selectedCandidate.role}</p>
                <p className="text-[11px] sm:text-xs text-slate-400">Notice: <span className="text-slate-600 font-medium">{selectedCandidate.noticePeriod}</span> · Expected: <span className="text-slate-600 font-medium">{selectedCandidate.expectedSalary}</span></p>
              </div>

              {/* Match Dial */}
              <div className="text-right shrink-0">
                <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600">{selectedCandidate.ats?.score !== undefined ? selectedCandidate.ats.score : 0}%</span>
                <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-bold">ATS Alignment</span>
              </div>
            </div>

            {/* New Touch-Friendly ATS Score & Summary Box */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-700/50 pb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-200">Candidate ATS Profile & Score Box</span>
                </div>
                <span className="bg-indigo-600/60 text-white font-extrabold text-xs px-2.5 py-1 rounded-xl border border-indigo-400/30">
                  ATS Score: {selectedCandidate.ats?.score || 0}%
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Candidate Name</span>
                  <span className="font-extrabold text-white">{selectedCandidate.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Applied Role</span>
                  <span className="font-extrabold text-indigo-300">{selectedCandidate.role}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Experience Level</span>
                  <span className="font-extrabold text-white">{selectedCandidate.experience || "Specified in Resume"}</span>
                </div>
              </div>
            </div>

            {/* Target Job Opening Description (4-5 Lines Summary) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 sm:p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-900">Job Description ({job.title})</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {job.dept || "Engineering"}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line line-clamp-5">
                {cleanMarkdownText(job.description) || `We are recruiting for the ${job.title} position at ${job.company}. Position responsibilities include handling core deliverables and collaborating across the ${job.dept} team.`}
              </p>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
              <a 
                href={`tel:${selectedCandidate.phone}`}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all text-xs font-semibold gap-1"
              >
                <Phone className="w-4 h-4" /> Call
              </a>
              <a 
                href={`https://wa.me/${selectedCandidate.phone.replace(/\s/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all text-xs font-semibold gap-1"
              >
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </a>
              <a 
                href={`mailto:${selectedCandidate.email}`}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all text-xs font-semibold gap-1"
              >
                <Mail className="w-4 h-4" /> Email
              </a>
              <button 
                onClick={() => {
                  if (confirm(`Are you sure you want to decline ${selectedCandidate.name}?`)) {
                    onUpdateCandidateStage(selectedCandidate.id, "rejected");
                    handleCloseDrawer();
                  }
                }}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all text-xs font-semibold gap-1 focus:outline-none cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-500" /> Decline
              </button>
            </div>

            {/* Update Board Stage Select */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-4 rounded-2xl mb-4 sm:mb-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase block">Hiring Stage</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase">{selectedCandidate.stage}</span>
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
            {selectedCandidate.ats && (!selectedCandidate.ats.missingSkills || selectedCandidate.ats.missingSkills.length === 0) && (
              <div className="border border-indigo-100 bg-indigo-50/50 p-2.5 sm:p-5 rounded-2xl space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-indigo-600" /> Candidate Match Criteria Report
                </h3>
                
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wide block mb-1 text-[10px] sm:text-xs">Matched Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedCandidate.ats.matchedSkills.map((sk, idx) => (
                        <span key={idx} className="bg-emerald-50 text-emerald-700 px-1.5 sm:px-2 py-0.5 rounded border border-emerald-100 text-[10px] sm:text-xs">
                          {sk}
                        </span>
                      ))}
                      {selectedCandidate.ats.matchedSkills.length === 0 && <span className="text-slate-400 text-[10px]">None detected</span>}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wide block mb-1 text-red-500 text-[10px] sm:text-xs">Missing Core Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedCandidate.ats.missingSkills.map((sk, idx) => (
                        <span key={idx} className="bg-red-50 text-red-700 px-1.5 sm:px-2 py-0.5 rounded border border-red-100 text-[10px] sm:text-xs">
                          {sk}
                        </span>
                      ))}
                      {selectedCandidate.ats.missingSkills.length === 0 && <span className="text-emerald-600 text-[10px]">All key skills matched!</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 text-xs pt-2">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wide block mb-0.5 text-[10px] sm:text-xs">Experience Fit</span>
                    <p className="text-slate-600 text-[11px] sm:text-xs">{selectedCandidate.ats.experienceMatch}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wide block mb-0.5 text-[10px] sm:text-xs">Education Check</span>
                    <p className="text-slate-600 text-[11px] sm:text-xs">{selectedCandidate.ats.educationMatch}</p>
                  </div>
                </div>

                <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-indigo-100/60 text-xs">
                  <span className="font-bold text-indigo-700 block mb-1 text-[11px] sm:text-xs">Recommendation Summary</span>
                  <p className="text-slate-600 leading-relaxed italic text-[11px] sm:text-xs">{selectedCandidate.ats.recommendation}</p>
                </div>
              </div>
            )}

            {/* Application Screening Questions */}
            {selectedCandidate.screeningAnswers && selectedCandidate.screeningAnswers.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6">
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm mb-3 flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <MessageSquare className="w-4 h-4 text-slate-500" /> Screening Questionnaire
                </h3>
                <div className="space-y-4">
                  {selectedCandidate.screeningAnswers.map((item, idx) => (
                    <div key={idx}>
                      <span className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Q: {item.question}
                      </span>
                      <p className="text-slate-700 text-xs sm:text-sm bg-white p-3 rounded-xl border border-slate-100 shadow-sm leading-relaxed whitespace-pre-wrap">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidate Resume Document Preview */}
            <div className="mb-4 sm:mb-6">
              <ResumePreviewer candidate={selectedCandidate} />
            </div>

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
      </div>
    );
  })()}

      {/* Job Details Modal */}
      {showJobDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-1 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[95vh] overflow-y-auto p-2.5 sm:p-8 shadow-2xl flex flex-col space-y-4 sm:space-y-6">
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
