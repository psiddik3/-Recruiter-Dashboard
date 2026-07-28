import React, { useState } from "react";
import { 
  Briefcase, MapPin, DollarSign, Calendar, Sparkles, 
  Trash2, Send, Share2, Clipboard, Loader2, ArrowRight,
  ArrowUp, ArrowDown, Plus, X, Check, Image as ImageIcon,
  Copy, Globe, Linkedin, MessageCircle, ExternalLink,
  ChevronDown, ChevronUp, Cpu, Brain, Laptop, Layers,
  Maximize2, Minimize2, AlertCircle } from "lucide-react";
import { Job, Candidate } from "../types";

interface JobsViewProps {
  jobs: Job[];
  candidates?: Candidate[];
  isAdminMode?: boolean;
  onAddJob: (newJob: Job) => void;
  onUpdateJobs: (updatedJobs: Job[]) => void;
  onDeleteJobs?: (jobIds: number[], deleteAssociatedCandidates: boolean) => void;
  onSelectJob: (jobId: number) => void;
  onOpenShareKit: (jobId: number) => void;
  companyLogo: string;
  setCompanyLogo: (logo: string) => void;
  logoPosition: "header" | "dashboard" | "cards";
  setLogoPosition: (pos: "header" | "dashboard" | "cards") => void;
  recruiterCompany?: string;
  recruiterName?: string;
}

const PRESET_LOGOS = [
  { name: "Corporate Teal", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%230f766e'><rect width='100' height='100' rx='20'/><circle cx='50' cy='50' r='25' fill='white'/><circle cx='50' cy='50' r='12' fill='%230f766e'/></svg>" },
  { name: "Apex Purple", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%236366f1'><rect width='100' height='100' rx='20'/><polygon points='50,20 80,75 20,75' fill='white'/></svg>" },
  { name: "AI Tech Coral", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23f43f5e'><rect width='100' height='100' rx='20'/><circle cx='35' cy='50' r='15' fill='white'/><circle cx='65' cy='50' r='15' fill='white'/><circle cx='50' cy='50' r='8' fill='%23f43f5e'/></svg>" },
  { name: "Pinnacle Amber", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23d97706'><rect width='100' height='100' rx='20'/><rect x='25' y='25' width='50' height='50' fill='white' rx='10'/></svg>" }
];

export default function JobsView({ 
  jobs, 
  candidates = [],
  isAdminMode = false,
  onAddJob, 
  onUpdateJobs, 
  onDeleteJobs,
  onSelectJob, 
  onOpenShareKit,
  companyLogo,
  setCompanyLogo,
  logoPosition,
  setLogoPosition,
  recruiterCompany,
  recruiterName
}: JobsViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardSize, setCardSize] = useState<"compact" | "cozy" | "spacious">("cozy");
  const [copiedJobId, setCopiedJobId] = useState<number | null>(null);

  // Batch Selection & Deletion States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [jobsToDelete, setJobsToDelete] = useState<Job[]>([]);
  const [deleteAssociatedApplicants, setDeleteAssociatedApplicants] = useState(false);
  
  // Direct share states
  const [sharingJob, setSharingJob] = useState<Job | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState(recruiterCompany || "Nextwave");
  const [dept, setDept] = useState("Engineering");
  const [employment, setEmployment] = useState<"Full-time" | "Part-time" | "Contract" | "Internship">("Full-time");
  const [location, setLocation] = useState("Remote");
  const [salary, setSalary] = useState("$120,000 - $145,000");
  const [experience, setExperience] = useState("3+ years");
  const [skillsString, setSkillsString] = useState("React, Node.js, TypeScript, Tailwind CSS");
  const [description, setDescription] = useState("");
  const [benefits, setBenefits] = useState("Health insurance, Unlimited PTO, Work stipend");
  const [durationDays, setDurationDays] = useState("15");
  const [deadline, setDeadline] = useState("");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Screening questions local builder state
  const [enableScreening, setEnableScreening] = useState(true);
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>([
    "Do you have 3+ years of professional experience in this specific field?",
    "Are you authorized to work in this location without sponsorship?"
  ]);
  const [newQuestion, setNewQuestion] = useState("");

  // AI tech logo tags state

  const [aiGenerateError, setAiGenerateError] = useState("");

  const handleAiGenerateJD = async () => {
    if (!title) {
      setAiGenerateError("Please enter a job title first so Gemini knows what to generate.");
      return;
    }
    setAiGenerateError("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/gemini/generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, department: dept, company }),
      });

      if (!response.ok) throw new Error("API failed");
      const data = await response.json();
      setDescription(data.jd);
    } catch (err) {
      console.error(err);
      setAiGenerateError("Could not connect to AI server. Please make sure GEMINI_API_KEY is configured.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setScreeningQuestions([...screeningQuestions, newQuestion.trim()]);
      setNewQuestion("");
    }
  };

  const applyBoldToTextarea = (elementId: string) => {
    const textarea = document.getElementById(elementId) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = description;

    if (start !== undefined && end !== undefined) {
      let wordStart = start;
      let wordEnd = end;

      // If selection is inside a word, expand start and end to the full word boundaries
      // Walk backwards to find the start of the word
      while (wordStart > 0 && /[\w\d]/.test(text[wordStart - 1])) {
        wordStart--;
      }

      // Walk forwards to find the end of the word
      while (wordEnd < text.length && /[\w\d]/.test(text[wordEnd])) {
        wordEnd++;
      }

      const selectedPart = text.substring(wordStart, wordEnd);
      
      if (selectedPart.trim()) {
        // Check if already bolded (i.e. surrounded by double asterisks)
        const isBolded = wordStart >= 2 && text.substring(wordStart - 2, wordStart) === "**" && text.substring(wordEnd, wordEnd + 2) === "**";
        
        if (isBolded) {
          // Unbold: remove the asterisks
          const newText = text.substring(0, wordStart - 2) + selectedPart + text.substring(wordEnd + 2);
          setDescription(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(wordStart - 2, wordEnd - 2);
          }, 0);
        } else {
          // Bold: add asterisks
          const newText = text.substring(0, wordStart) + "**" + selectedPart + "**" + text.substring(wordEnd);
          setDescription(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(wordStart, wordEnd + 4);
          }, 0);
        }
      } else {
        // If cursor is on empty space, insert standard "**bold text**"
        const newText = text.substring(0, start) + "**bold text**" + text.substring(start);
        setDescription(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 2, start + 11);
        }, 0);
      }
    } else {
      setDescription(description + "**bold text**");
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    setScreeningQuestions(screeningQuestions.filter((_, i) => i !== idx));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent, status: "active" | "draft") => {
    e.preventDefault();
    if (!title || !company) return;

    const skills = skillsString.split(",").map(s => s.trim()).filter(Boolean);

    const jobObj: Job = {
      id: Date.now(),
      title,
      company,
      dept,
      employment,
      location,
      salary,
      experience,
      skills,
      description: description || `We are seeking a talented ${title} to join our growing company.`,
      benefits,
      deadline,
      durationDays: parseInt(durationDays) || 15,
      expiresAt: new Date(Date.now() + (parseInt(durationDays) || 15) * 24 * 60 * 60 * 1000).toISOString(),
      status,
      postedBy: recruiterName || "Rahul Sharma",
      createdAt: new Date().toISOString().slice(0, 10),
      views: 0,
      applications: 0,
      conversion: "0.0%",
      screeningQuestions: enableScreening && screeningQuestions.length > 0 ? screeningQuestions : undefined,
      
    };

    onAddJob(jobObj);
    resetForm();
    setShowModal(false);
  };

  const resetForm = () => {
    setTitle("");
    setDept("Engineering");
    setEmployment("Full-time");
    setLocation("Remote");
    setSalary("$120,000 - $145,000");
    setExperience("3+ years");
    setSkillsString("React, Node.js, TypeScript, Tailwind CSS");
    setDescription("");
    setBenefits("Health insurance, Unlimited PTO, Work stipend");
    setDeadline("2026-08-30");
    setScreeningQuestions([
      "Do you have 3+ years of professional experience in this specific field?",
      "Are you authorized to work in this location without sponsorship?"
    ]);
  };

  // Reordering functions
  const handleMoveJob = (index: number, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= jobs.length) return;

    const updated = [...jobs];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onUpdateJobs(updated);
  };

  // Removal function
  const handleDeleteJob = (jobId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setJobsToDelete([job]);
      setDeleteAssociatedApplicants(false);
      setShowDeleteConfirmModal(true);
    }
  };

  const toggleJobSelection = (jobId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedJobIds(prev => 
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const handleCopyLink = (jobId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const job = jobs.find(j => j.id === jobId);
    const targetId = job?.firebaseId || jobId;
    const mockUrl = `${window.location.origin}/#${targetId}`;
    navigator.clipboard.writeText(mockUrl);
    setCopiedJobId(jobId);
    setTimeout(() => setCopiedJobId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Brand Header with dynamic Logo placement next to "Openings and Alerts" */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div className="flex items-center gap-4">
          {logoPosition === "header" && companyLogo && (
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center p-1 border border-slate-200 shadow-xs shrink-0 overflow-hidden animate-in zoom-in duration-300">
              <img src={companyLogo} alt="Corporate Logo Placement" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Openings & Alerts
            </h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Manage positions, customize company branding, reorder listings, and share candidate outreach
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Card size settings widget */}
          <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex items-center gap-1 shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase px-2">Box Density:</span>
            <button
              onClick={() => setCardSize("compact")}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
                cardSize === "compact" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Compact
            </button>
            <button
              onClick={() => setCardSize("cozy")}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
                cardSize === "cozy" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cozy
            </button>
            <button
              onClick={() => setCardSize("spacious")}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
                cardSize === "spacious" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Spacious
            </button>
          </div>

          {/* Delete Job(s) Selection Mode Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedJobIds([]);
            }}
            className={`font-bold text-xs rounded-xl px-3.5 py-2.5 transition-all focus:outline-none shadow-xs flex items-center gap-1.5 cursor-pointer border ${
              isSelectionMode 
                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 ring-2 ring-rose-500/20" 
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            {isSelectionMode ? "Exit Selection Mode" : "Delete Job(s)"}
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 transition-colors focus:outline-none shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create New Job
          </button>
        </div>
      </div>

      {/* Batch Selection Banner */}
      {isSelectionMode && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 border border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (selectedJobIds.length === jobs.length) {
                  setSelectedJobIds([]);
                } else {
                  setSelectedJobIds(jobs.map(j => j.id));
                }
              }}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedJobIds.length === jobs.length && jobs.length > 0 ? "bg-rose-600 border-rose-600" : "border-slate-500"}`}>
                {selectedJobIds.length === jobs.length && jobs.length > 0 && <Check className="w-3 h-3 text-white" />}
              </div>
              {selectedJobIds.length === jobs.length && jobs.length > 0 ? "Deselect All" : "Select All Jobs"}
            </button>
            <span className="text-xs font-extrabold text-slate-300">
              <span className="text-rose-400 font-black">{selectedJobIds.length}</span> of {jobs.length} job position(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedJobIds([]);
              }}
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedJobIds.length === 0}
              onClick={() => {
                const targetJobs = jobs.filter(j => selectedJobIds.includes(j.id));
                setJobsToDelete(targetJobs);
                setDeleteAssociatedApplicants(false);
                setShowDeleteConfirmModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedJobIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Jobs Grid layout dynamically adjusted by cardSize setting */}
      <div className={`grid gap-6 ${
        cardSize === "compact" 
          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
          : cardSize === "spacious" 
            ? "grid-cols-1 lg:grid-cols-2" 
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      }`}>
        {jobs.map((job, index) => {
          const isSelected = selectedJobIds.includes(job.id);
          return (
            <div 
              key={job.id} 
              onClick={(e) => {
                if (isSelectionMode) {
                  toggleJobSelection(job.id, e);
                } else {
                  onSelectJob(job.id);
                }
              }}
              className={`bg-white rounded-3xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group relative ${
                isSelectionMode && isSelected 
                  ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/10" 
                  : "border-slate-200/80 hover:border-slate-300 hover:scale-[1.01]"
              } ${
                cardSize === "compact" ? "p-4 space-y-3" : cardSize === "spacious" ? "p-7 space-y-6" : "p-5 space-y-5"
              }`}
            >
              {/* Checkbox overlay when in Selection Mode */}
              {isSelectionMode && (
                <div className="absolute top-4 left-4 z-10">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected 
                      ? "bg-rose-600 border-rose-600 text-white shadow-xs" 
                      : "bg-white border-slate-300 text-transparent hover:border-rose-400"
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              )}
              {/* Floating Reorder Controllers & Actions - top corner */}
              <div 
                className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-xl border border-slate-200/50 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  disabled={index === 0}
                  onClick={(e) => handleMoveJob(index, "up", e)}
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                  title="Move job up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={index === jobs.length - 1}
                  onClick={(e) => handleMoveJob(index, "down", e)}
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                  title="Move job down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-3.5 bg-slate-200 mx-1"></div>
                <button
                  onClick={(e) => handleDeleteJob(job.id, e)}
                  className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                  title="Remove Job Position"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Top Row branding */}
              <div className="space-y-3">
                <div className="flex items-start justify-between mr-20">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    job.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    job.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-slate-50 text-slate-600 border-slate-200"
                  }`}>
                    {job.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">{job.dept}</span>
                </div>

                {/* Optional company logo on top of title inside card if logoPosition is set to cards */}
                {logoPosition === "cards" && companyLogo && (
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 overflow-hidden shrink-0">
                    <img src={companyLogo} alt="Brand Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                
                
                )}

                <div>
                  <h3 className="font-extrabold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors text-base md:text-lg">
                    {job.title}
                  </h3>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-slate-500 font-semibold">{job.company}</p>
                    {job.postedBy && (
                      <span className="text-[9px] bg-slate-50 text-slate-500 font-black px-1.5 py-0.5 rounded-md border border-slate-200/60 uppercase tracking-wider" title={`Job opening managed by ${job.postedBy}`}>
                        👤 {job.postedBy.split(" ")[0]}
                      </span>
                    
                )}
                  </div>
                </div>

                {/* Selected AI Tech logos badges on Card */}
                {job.aiLogos && job.aiLogos.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {job.aiLogos.map((ai) => {
                      return (
                        <span 
                          key={ai} 
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider flex items-center gap-1 ${
                            ai === "gemini" ? "bg-purple-50 text-purple-700 border-purple-200" :
                            ai === "openai" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5" /> {ai} AI Verified
                        </span>
                      );
                    })}
                  </div>
                
                )}

                {/* Sub-details (hide in compact card size to preserve space) */}
                {cardSize !== "compact" && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{job.location} · {job.employment}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      <span>{job.salary || "Not specified"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Active for {job.durationDays || 15} Days</span>
                    </div>
                  </div>
                
                )}

                {/* Skills tags list (flexible rendering based on cardSize density) */}
                <div className="flex flex-wrap gap-1 pt-2">
                  {job.skills.slice(0, cardSize === "compact" ? 2 : cardSize === "spacious" ? 6 : 4).map((skill, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-600 border border-slate-200/40 text-[9px] font-extrabold px-2 py-0.5 rounded-md">
                      {skill}
                    </span>
                  ))}
                  {job.skills.length > (cardSize === "compact" ? 2 : cardSize === "spacious" ? 6 : 4) && (
                    <span className="text-slate-400 text-[9px] font-black self-center pl-1">
                      +{job.skills.length - (cardSize === "compact" ? 2 : cardSize === "spacious" ? 6 : 4)}
                    </span>
                  
                )}
                </div>

                {/* Rich screening questions overview in Spacious style */}
                {cardSize === "spacious" && job.screeningQuestions && (
                  <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-2xl p-4.5 space-y-2 mt-4 text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">Required Screening Questions ({job.screeningQuestions.length}):</span>
                    <ul className="space-y-1.5">
                      {job.screeningQuestions.map((q, qIdx) => (
                        <li key={qIdx} className="text-xs text-slate-600 font-semibold flex items-start gap-2">
                          <span className="text-indigo-500 font-black">?</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs font-bold text-slate-600 mt-4">
                <span className="text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1 transition-all">
                  ATS Board <ArrowRight className="w-3.5 h-3.5" />
                </span>
                
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => handleCopyLink(job.id, e)}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-1.5 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors"
                    title="Copy direct application link"
                  >
                    {copiedJobId === job.id ? (
                      <span className="text-[10px] font-black text-emerald-600 px-1">Copied!</span>
                    ) : (
                      <Clipboard className="w-3.5 h-3.5" />
                    
                )}
                  </button>

                  <button 
                    onClick={() => setSharingJob(job)} 
                    className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Direct Social Share Dialog Portal */}
      {sharingJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-indigo-600" /> Share Job Posting Direct
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Spread & market {sharingJob.title} immediately
                </p>
              </div>
              <button 
                onClick={() => setSharingJob(null)}
                className="text-slate-400 hover:text-slate-600 font-black text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Pre-packaged Social sharing cards */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Preconfigured Social Outreach Templates</span>
                
                <div className="border border-slate-200 rounded-2xl p-3.5 space-y-2 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                      <Linkedin className="w-3.5 h-3.5 text-blue-600" /> LinkedIn Professional Copy
                    </span>
                    <button
                      onClick={() => {
                        const post = `🚀 We're hiring a Senior ${sharingJob.title} at ${sharingJob.company}! Join our high-impact team. \n\n💼 Department: ${sharingJob.dept}\n📍 Location: ${sharingJob.location}\n💰 Salary expectation: ${sharingJob.salary}\n\n#hiring #recruiting`;
                        navigator.clipboard.writeText(post);
                        alert("LinkedIn prompt copy saved to clipboard!");
                      }}
                      className="text-[10px] font-black text-indigo-600 hover:underline"
                    >
                      Copy Entire Post
                    </button>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 font-mono leading-relaxed max-h-24 overflow-y-auto">
                    🚀 We're hiring a {sharingJob.title} at {sharingJob.company}! Join our team...
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-3.5 space-y-2 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Quick Invite
                    </span>
                    <button
                      onClick={() => {
                        const msg = `Hi! We are seeking a ${sharingJob.title} at ${sharingJob.company} (${sharingJob.location}).`;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`);
                      }}
                      className="text-[10px] font-black text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      Open WhatsApp <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 font-mono leading-relaxed">
                    Hi! We are seeking a {sharingJob.title} at {sharingJob.company} ({sharingJob.location}).
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSharingJob(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl px-4 py-2"
              >
                Dismiss Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Modal with interactive screening questions and AI Logos selection */}
      
      {isDescriptionExpanded && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Full Screen Description</h3>
                  <p className="text-xs text-slate-500 font-medium">Edit the description in expanded view with live formatted side-by-side preview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-50 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden">
              {/* Left Column: Editor */}
              <div className="flex-1 p-6 flex flex-col min-w-[320px]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    Text Editor
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">Select text to format:</span>
                    <button
                      type="button"
                      onClick={() => applyBoldToTextarea("fullscreen-job-desc-textarea")}
                      className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold border border-indigo-200 flex items-center gap-1 transition-colors focus:outline-none shadow-sm cursor-pointer"
                    >
                      <strong className="font-black text-xs leading-none">B</strong> Bold
                    </button>
                  </div>
                </div>
                <textarea autoCapitalize="sentences"
                  id="fullscreen-job-desc-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
                      e.preventDefault();
                      applyBoldToTextarea("fullscreen-job-desc-textarea");
                    }
                  }}
                  placeholder="Write a professional, attractive, and highly human-touch Job Description..."
                  className="w-full flex-1 border border-slate-200 rounded-2xl p-5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-mono text-slate-800 leading-relaxed shadow-sm resize-none capitalize"
                ></textarea>
              </div>

              {/* Right Column: Live Preview */}
              <div className="flex-1 p-6 flex flex-col min-w-[320px] overflow-y-auto bg-white">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                    ✨ Live Formatted Preview
                  </span>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Applicant View</span>
                </div>
                <div className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap py-2">
                  {description ? (
                    description.split(/\*\*(.*?)\*\*/g).map((part, i) => i % 2 === 1 ? <strong key={i} className="font-extrabold text-slate-950">{part}</strong> : part)
                  ) : (
                    <span className="text-slate-300 italic">Start typing on the left to see the formatted preview here...</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => setIsDescriptionExpanded(false)}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Done Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                  Create New Job Opening <Sparkles className="w-5 h-5 text-indigo-500" />
                </h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-black text-lg p-1"
                >
                  ✕
                </button>
              </div>

              {aiGenerateError && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 mb-4 font-bold">
                  {aiGenerateError}
                </div>
              )}

              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Job Title *
                    </label>
                    <input autoCapitalize="words"
                      required
                      placeholder="e.g. Senior Frontend Developer"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800 capitalize"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Company Name *
                    </label>
                    <input autoCapitalize="words"
                      required
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800 capitalize"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Department
                    </label>
                    <select
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Product Design">Product Design</option>
                      <option value="Product Management">Product Management</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="Human Resources">Human Resources</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Employment Type
                    </label>
                    <select
                      value={employment}
                      onChange={(e) => setEmployment(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Location
                    </label>
                    <input autoCapitalize="words"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800 capitalize"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Experience Target
                    </label>
                    <input autoCapitalize="words"
                      type="text"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800 capitalize"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Active Duration (Days)
                    </label>
                    <select
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800"
                    >
                      <option value="5">5 Days</option>
                      <option value="10">10 Days</option>
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                    </select>
                  </div>
                </div>

                
                {/* Screening Questions Toggle */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-tight">
                      Screening Questions
                    </label>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Filter candidates based on custom requirements</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableScreening(!enableScreening)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enableScreening ? "bg-indigo-600" : "bg-slate-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableScreening ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                
                {enableScreening && (<>
                  {/* Interactive screening questions manager */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Required Screening Questions
                    </label>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Formulated questions applicants must satisfy</p>
                  </div>

                  <div className="space-y-1.5">
                    {screeningQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200/60">
                        <span className="text-xs text-slate-700 font-semibold truncate flex-1 pr-4">
                          {qIdx + 1}. {q}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                          title="Remove Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input autoCapitalize="words"
                      type="text"
                      placeholder="Add custom question (e.g. Do you have experience with Drizzle ORM?)"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="flex-1 border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs focus:outline-none capitalize"
                    />
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl px-3 py-2 flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
                </>
                )}


                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Skills (Comma Separated)
                  </label>
                  <input autoCapitalize="words"
                    type="text"
                    value={skillsString}
                    onChange={(e) => setSkillsString(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800 capitalize"
                  />
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Job Description
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => applyBoldToTextarea("job-desc-textarea")}
                        className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg font-bold border border-indigo-200 flex items-center gap-1 transition-colors focus:outline-none cursor-pointer"
                      >
                        <strong className="font-extrabold text-sm leading-none">B</strong> Bold
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDescriptionExpanded(true)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg font-bold border border-slate-200 flex items-center gap-1 transition-colors focus:outline-none cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Full Screen
                      </button>
                    </div>
                  </div>
                  <textarea autoCapitalize="sentences"
                    id="job-desc-textarea"
                    rows={12}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
                        e.preventDefault();
                        applyBoldToTextarea("job-desc-textarea");
                      }
                    }}
                    placeholder="Provide a description of the responsibilities and requirements..."
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 font-mono text-slate-700 resize-y min-h-[160px] capitalize"
                  ></textarea>

                  {description && (
                    <div className="mt-2 bg-indigo-50/20 border border-indigo-100/50 rounded-xl p-3">
                      <span className="block text-[9px] font-black text-indigo-500 uppercase tracking-wider mb-1">
                        ✨ Live Formatted Preview (Candidate View)
                      </span>
                      <div className="text-[11px] text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap max-h-[150px] overflow-y-auto bg-white p-2 rounded-lg border border-slate-100">
                        {description.split(/\*\*(.*?)\*\*/g).map((part, i) => i % 2 === 1 ? <strong key={i} className="font-extrabold text-slate-950">{part}</strong> : part)}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Core Benefits
                  </label>
                  <input autoCapitalize="words"
                    type="text"
                    value={benefits}
                    onChange={(e) => setBenefits(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-800 capitalize"
                  />
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl px-4 py-2.5 transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, "draft")}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl px-4 py-2.5 transition-colors focus:outline-none shadow-sm"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, "active")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 transition-colors focus:outline-none shadow-sm"
              >
                Publish Opening
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Delete {jobsToDelete.length === 1 ? `"${jobsToDelete[0]?.title}"` : `${jobsToDelete.length} Job Openings`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Permanently remove position posting and applicant records</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* List of positions to be removed */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 max-h-36 overflow-y-auto space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Job Opening(s) Selected for Permanent Deletion ({jobsToDelete.length}):
                </span>
                {jobsToDelete.map(j => (
                  <div key={j.id} className="text-xs font-bold text-slate-800 flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                    <span className="truncate pr-2">{j.title}</span>
                    <span className="text-[10px] text-slate-500 font-semibold shrink-0">{j.dept} • {j.company}</span>
                  </div>
                ))}
              </div>

              {/* Delete Applicants Checkbox - ONLY FOR FOUNDER/ADMIN */}
              {isAdminMode ? (
                <>
                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={deleteAssociatedApplicants}
                      onChange={(e) => setDeleteAssociatedApplicants(e.target.checked)}
                      className="mt-0.5 w-4.5 h-4.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <div className="space-y-1 flex-1">
                      <span className="text-xs font-black text-slate-900 block">
                        Delete all applicants who applied for this job as well
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Check this option to also purge all candidate profiles, resumes, and ATS stage records for candidates who applied to {jobsToDelete.length === 1 ? "this position" : "these positions"}.
                      </p>
                      {(() => {
                        const jobIdsSet = new Set(jobsToDelete.map(j => j.id));
                        const jobTitlesSet = new Set(jobsToDelete.map(j => j.title.trim().toLowerCase()));
                        const matchingCandidatesCount = (candidates || []).filter(c => 
                          jobIdsSet.has(c.jobId) || (c.role && jobTitlesSet.has(c.role.trim().toLowerCase()))
                        ).length;
                        if (matchingCandidatesCount > 0) {
                          return (
                            <span className="inline-block mt-1 bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-rose-200">
                              🔥 {matchingCandidatesCount} applicant(s) in Central Talent Pool will be permanently deleted
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </label>

                  {/* Warning Box when Checkbox is Checked */}
                  {deleteAssociatedApplicants && (
                    <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex gap-3 text-amber-900 animate-in fade-in duration-200 shadow-xs">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px]">Warning: Central Talent Pool Data Deletion</p>
                        <p className="text-amber-800 leading-relaxed font-semibold">
                          If you select this option, candidate data will be permanently deleted from the central database for all candidates who applied to this/these job position(s).
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* RECRUITER MODE NOTICE */
                <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 flex gap-3 text-indigo-950 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-indigo-900 uppercase tracking-wider text-[10px]">
                      Recruiter Deletion Protection
                    </p>
                    <p className="text-indigo-800 leading-relaxed font-semibold">
                      Deleting this job position will remove the posting from the database and clear responses from your workspace. Candidate records remain safely preserved in the Founder's Central Talent Pool.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl px-4 py-2.5 border border-slate-200 transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const ids = jobsToDelete.map(j => j.id);
                  if (onDeleteJobs) {
                    onDeleteJobs(ids, isAdminMode ? deleteAssociatedApplicants : false);
                  } else {
                    onUpdateJobs(jobs.filter(j => !ids.includes(j.id)));
                  }
                  setShowDeleteConfirmModal(false);
                  setIsSelectionMode(false);
                  setSelectedJobIds([]);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl px-5 py-2.5 transition-colors focus:outline-none shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm & Delete Position(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
