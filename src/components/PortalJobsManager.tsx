import React, { useState, useEffect } from "react";
import { 
  Briefcase, CheckCircle2, AlertCircle, XCircle, Trash2, Globe, Search, Plus, 
  MapPin, Clock, DollarSign, Mail, Link, Star, FileText, Send, Sparkles, RefreshCw,
  Maximize2, Minimize2, Check, X } from "lucide-react";
import { portalDb, applicantsDb, FirebaseJob } from "../lib/firebase";

export default function PortalJobsManager() {
  const [jobs, setJobs] = useState<FirebaseJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"moderation" | "post">("moderation");

  // Batch selection and deletion states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [jobsToDelete, setJobsToDelete] = useState<FirebaseJob[]>([]);
  const [deleteAssociatedApplicants, setDeleteAssociatedApplicants] = useState(false);

  // Form states for Direct Post to Portal
  const [formCompany, setFormCompany] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formJobType, setFormJobType] = useState("Full Time");
  const [formLocation, setFormLocation] = useState("");
  const [formExperience, setFormExperience] = useState("");
  const [formSalary, setFormSalary] = useState("");
  const [formOpenings, setFormOpenings] = useState("1");
  const [formSkills, setFormSkills] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formApplyLink, setFormApplyLink] = useState("");
  const [formDurationDays, setFormDurationDays] = useState("15");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Fetch jobs from firebase
  const fetchPortalJobs = async () => {
    setLoading(true);
    try {
      const data = await portalDb.loadAll();
      setJobs(data);
    } catch (e) {
      console.error("Error loading portal jobs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalJobs();
  }, []);

  // Action Handlers
  const handleApprove = async (id: string, title: string) => {
    try {
      await portalDb.approve(id);
      alert(`Job opening "${title}" approved successfully! It is now live on the public portal.`);
      fetchPortalJobs();
    } catch (e) {
      alert("Error approving job post. Please try again.");
    }
  };

  const handleReject = async (id: string, title: string) => {
    try {
      await portalDb.reject(id);
      alert(`Job opening "${title}" marked as rejected.`);
      fetchPortalJobs();
    } catch (e) {
      alert("Error rejecting job post.");
    }
  };

  const handleRemove = (job: FirebaseJob) => {
    setJobsToDelete([job]);
    setDeleteAssociatedApplicants(false);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      for (const job of jobsToDelete) {
        if (job.id) {
          await portalDb.remove(job.id);
        }
      }

      if (deleteAssociatedApplicants) {
        const deletedTitles = jobsToDelete.map(j => j.title.trim().toLowerCase()).filter(Boolean);
        const candidates = await applicantsDb.loadAll();
        const toDelete = candidates.filter(c => 
          deletedTitles.includes((c.role || "").trim().toLowerCase()) ||
          jobsToDelete.some(j => j.id === c.jobId || (j.applyLink && j.applyLink.includes(`jobId=${c.jobId}`)))
        );

        for (const cand of toDelete) {
          await applicantsDb.remove(cand);
        }
      }

      setShowDeleteConfirmModal(false);
      setIsSelectionMode(false);
      setSelectedJobIds([]);
      fetchPortalJobs();
    } catch (e) {
      alert("Error removing job post(s). Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const handleDirectPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany || !formTitle || !formEmail || !formLocation || !formDescription) {
      alert("Please fill out all required fields marked with *");
      return;
    }

    setSubmitting(true);
    try {
      await portalDb.postDirect({
        company: formCompany,
        industry: formIndustry || "IT / Software",
        email: formEmail,
        website: formWebsite || "",
        title: formTitle,
        jobType: formJobType,
        location: formLocation,
        experience: formExperience || "1-3 years",
        salary: formSalary || "Not disclosed",
        openings: formOpenings,
        skills: formSkills,
        description: formDescription,
        applyLink: formApplyLink || `mailto:${formEmail}?subject=Application for ${encodeURIComponent(formTitle)}`,
        durationDays: parseInt(formDurationDays) || 15,
        expiresAt: new Date(Date.now() + (parseInt(formDurationDays) || 15) * 24 * 60 * 60 * 1000).toISOString(),
        postedByFounder: true
      });

      alert(`Job "${formTitle}" posted successfully directly to the public portal with status: APPROVED!`);
      
      // Reset form fields
      setFormCompany("");
      setFormIndustry("");
      setFormEmail("");
      setFormWebsite("");
      setFormTitle("");
      setFormLocation("");
      setFormExperience("");
      setFormSalary("");
      setFormOpenings("1");
      setFormSkills("");
      setFormDescription("");
      setFormApplyLink("");
      setFormDurationDays("15");

      setActiveTab("moderation");
      fetchPortalJobs();
    } catch (e) {
      alert("Failed to submit job post. Please verify configuration.");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalCount = jobs.length;
  const pendingCount = jobs.filter(j => j.status === "pending").length;
  const approvedCount = jobs.filter(j => j.status === "approved").length;
  const rejectedCount = jobs.filter(j => j.status === "rejected").length;

  // Filter & Search Logic
  const filteredJobs = jobs.filter(j => {
    const matchesSearch = 
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.skills && j.skills.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterStatus === "all") return matchesSearch;
    return j.status === filterStatus && matchesSearch;
  });

  return (
    <>
    <div className="space-y-6">
      {/* Metrics Header Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Portal Jobs</span>
            <Globe className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{loading ? "..." : totalCount}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Posts</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
            <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700">{loading ? "..." : pendingCount}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Needs Review</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live & Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">{loading ? "..." : approvedCount}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Active Public</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected Posts</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-700">{loading ? "..." : rejectedCount}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Declined</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation and Quick Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-0.5">
        <div className="flex gap-4 text-sm overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab("moderation")}
            className={`pb-2 font-bold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === "moderation" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Briefcase className="w-4 h-4" /> Public Portal Board & Moderation
          </button>
          <button
            onClick={() => setActiveTab("post")}
            className={`pb-2 font-bold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === "post" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Plus className="w-4 h-4" /> Post Direct to Portal
          </button>
        </div>

        <button
          onClick={fetchPortalJobs}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors focus:outline-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Board
        </button>
      </div>

      {/* Tab Content: Moderation & List Board */}
      {activeTab === "moderation" && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
              <input autoCapitalize="words"
                type="text"
                placeholder="Search portal jobs by title, company, location, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 capitalize"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize cursor-pointer transition-all border ${
                    filterStatus === status 
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {status === "all" ? "Show All" : status}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedJobIds([]);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all border flex items-center gap-1.5 ${
                  isSelectionMode
                    ? "bg-rose-50 text-rose-700 border-rose-200 ring-2 ring-rose-500/20"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                {isSelectionMode ? "Exit Selection" : "Delete Job(s)"}
              </button>
            </div>
          </div>

          {/* Batch Selection Banner */}
          {isSelectionMode && (
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const validIds = filteredJobs.map(j => j.id).filter(Boolean) as string[];
                    if (selectedJobIds.length === validIds.length) {
                      setSelectedJobIds([]);
                    } else {
                      setSelectedJobIds(validIds);
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedJobIds.length === filteredJobs.length && filteredJobs.length > 0 ? "bg-rose-600 border-rose-600" : "border-slate-500"}`}>
                    {selectedJobIds.length === filteredJobs.length && filteredJobs.length > 0 && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {selectedJobIds.length === filteredJobs.length && filteredJobs.length > 0 ? "Deselect All" : "Select All Visible Jobs"}
                </button>
                <span className="text-xs font-extrabold text-slate-300">
                  <span className="text-rose-400 font-black">{selectedJobIds.length}</span> of {filteredJobs.length} portal job(s) selected
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
                    const targets = jobs.filter(j => j.id && selectedJobIds.includes(j.id));
                    setJobsToDelete(targets);
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

          {/* Job Listings Board */}
          {loading ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Synchronizing with public database portal...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <span className="text-3xl block">🔍</span>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">No Matching Portal Jobs</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No job postings match your filters or search criteria. Change filters or post a new job to update the feed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.map((j) => {
                const isSelected = j.id ? selectedJobIds.includes(j.id) : false;
                return (
                  <div 
                    key={j.id} 
                    onClick={() => {
                      if (isSelectionMode && j.id) {
                        toggleJobSelection(j.id);
                      }
                    }}
                    className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden ${
                      isSelectionMode ? "cursor-pointer" : ""
                    } ${
                      isSelectionMode && isSelected 
                        ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/10" 
                        : "border-slate-200"
                    } ${
                      j.status === "pending" ? "border-l-4 border-l-amber-500" : (j.status === "approved" ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-500")
                    }`}
                  >
                    {/* Checkbox overlay when in Selection Mode */}
                    {isSelectionMode && j.id && (
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

                    {/* Job Details Block */}
                    <div className={`space-y-3 flex-1 ${isSelectionMode ? "pl-7" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm">{j.title}</h3>
                        <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-md">
                          {j.industry}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded border ${
                          j.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          j.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse" :
                          "bg-rose-50 text-rose-700 border-rose-100"
                        }`}>
                          {j.status}
                        </span>
                        {j.postedByFounder && (
                          <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded">
                            ★ Founder Direct Post
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-800">{j.company}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{j.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{j.jobType}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{j.salary}</span>
                        </div>
                      </div>

                      {/* Description excerpt */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                        "{j.description}"
                      </p>

                      {/* Skill tags */}
                      {j.skills && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {j.skills.split(",").map((s, idx) => (
                            <span key={idx} className="text-[9px] bg-indigo-50/50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Metadata contact */}
                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {j.email}
                        </span>
                        {j.website && (
                          <span className="flex items-center gap-1">
                            <Link className="w-3 h-3 text-slate-400" /> {j.website}
                          </span>
                        )}
                        <span>Posted: {j.createdAt ? new Date(j.createdAt).toLocaleDateString() : "Just now"}</span>
                      </div>
                    </div>

                    {/* Operational Controls for Founder */}
                    <div className="flex lg:flex-col items-center gap-2 self-end lg:self-center shrink-0">
                      {j.status === "pending" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(j.id!, j.title); }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-sm transition-colors flex items-center gap-1 cursor-pointer w-full justify-center"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve Posting
                        </button>
                      )}

                      {j.status === "approved" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(j.id!, j.title); }}
                          className="bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl px-4 py-2 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer w-full justify-center"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" /> Revoke / Reject
                        </button>
                      )}

                      {j.status === "rejected" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(j.id!, j.title); }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-sm transition-colors flex items-center gap-1 cursor-pointer w-full justify-center"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Reactivate Post
                        </button>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(j); }}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all border border-transparent hover:border-rose-100 cursor-pointer w-full justify-center flex items-center gap-1 text-xs font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Direct Post Form */}
      {activeTab === "post" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Plus className="w-4.5 h-4.5 text-indigo-600 animate-pulse" /> Dispatch Direct Public Portal Job Posting
            </h3>
            <p className="text-xs text-slate-400">
              Post directly into the company public recruitment portal database bypasses moderation and goes live instantly.
            </p>
          </div>

          <form onSubmit={handleDirectPostSubmit} className="space-y-4 text-xs font-bold text-slate-700 uppercase">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Company Name *</label>
                <input autoCapitalize="words"
                  required
                  type="text"
                  placeholder="e.g. Acme Industries"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20 capitalize"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Industry / Department</label>
                <input autoCapitalize="words"
                  type="text"
                  placeholder="e.g. IT, Sales, Human Resources"
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20 capitalize"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Contact Email *</label>
                <input
                  required
                  type="email"
                  placeholder="hr@acme.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Company Website</label>
                <input
                  type="url"
                  placeholder="https://acme.com"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Job Title *</label>
                <input autoCapitalize="words"
                  required
                  type="text"
                  placeholder="e.g. Senior Frontend Architect"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20 capitalize"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Job Type</label>
                <select
                  value={formJobType}
                  onChange={(e) => setFormJobType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white"
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Location *</label>
                <input autoCapitalize="words"
                  required
                  type="text"
                  placeholder="e.g. Bangalore, India"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20 capitalize"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Experience Required</label>
                <input autoCapitalize="words"
                  type="text"
                  placeholder="e.g. 3-5 Years"
                  value={formExperience}
                  onChange={(e) => setFormExperience(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20 capitalize"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Salary Package</label>
                <input autoCapitalize="words"
                  type="text"
                  placeholder="e.g. $120k - $150k"
                  value={formSalary}
                  onChange={(e) => setFormSalary(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20 capitalize"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">No. of Openings</label>
                <input
                  type="number"
                  min="1"
                  value={formOpenings}
                  onChange={(e) => setFormOpenings(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Required Skills (Comma-separated Tags)</label>
              <input autoCapitalize="words"
                type="text"
                placeholder="React, TypeScript, Tailwind CSS, Node.js"
                value={formSkills}
                onChange={(e) => setFormSkills(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20 capitalize"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Job Description *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                        const textarea = document.getElementById("portal-desc-textarea") as HTMLTextAreaElement;
                        if(textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = formDescription;
                            if(start !== undefined && end !== undefined && start !== end) {
                                setFormDescription(text.substring(0, start) + "**" + text.substring(start, end) + "**" + text.substring(end));
                            } else {
                                setFormDescription(formDescription + "**bold text**");
                            }
                        } else {
                            setFormDescription(formDescription + "**bold text**");
                        }
                    }}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg font-bold border border-slate-200 flex items-center gap-1 transition-colors focus:outline-none"
                  >
                    <strong className="font-extrabold text-sm leading-none">B</strong> Bold
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(true)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg font-bold border border-slate-200 flex items-center gap-1 transition-colors focus:outline-none"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Full Screen
                  </button>
                </div>
              </div>
              <textarea autoCapitalize="sentences"
                id="portal-desc-textarea"
                required
                rows={12}
                placeholder="Outline roles, responsibilities, culture, benefits, and qualification criteria..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20 normal-case resize-y min-h-[160px] capitalize"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">External Apply Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://acme.com/careers/senior-frontend"
                  value={formApplyLink}
                  onChange={(e) => setFormApplyLink(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Active Duration (Days)</label>
                <select
                  value={formDurationDays}
                  onChange={(e) => setFormDurationDays(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/20"
                >
                  <option value="5">5 Days</option>
                  <option value="10">10 Days</option>
                  <option value="15">15 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-extrabold text-xs rounded-xl py-3.5 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching post...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Publish Active Opening Direct to Portal
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>

      {isDescriptionExpanded && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Full Screen Description</h3>
                  <p className="text-xs text-slate-500 font-medium">Edit the public job description in expanded view</p>
                </div>
              </div>
              <button
                onClick={() => setIsDescriptionExpanded(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 p-6 bg-slate-50 flex flex-col">
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Write a professional, attractive, and highly human-touch Job Description..."
                className="w-full flex-1 border border-slate-200 rounded-2xl p-6 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-mono text-slate-800 leading-relaxed shadow-sm resize-none normal-case"
              ></textarea>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => setIsDescriptionExpanded(false)}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
              >
                Done Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Portal Manager */}
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
                    Delete {jobsToDelete.length === 1 ? `"${jobsToDelete[0]?.title}"` : `${jobsToDelete.length} Portal Job Openings`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Permanently purge public posting and applicant data</p>
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
              {/* Selected jobs summary */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 max-h-36 overflow-y-auto space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Portal Opening(s) Selected for Permanent Deletion ({jobsToDelete.length}):
                </span>
                {jobsToDelete.map((j, idx) => (
                  <div key={j.id || idx} className="text-xs font-bold text-slate-800 flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                    <span className="truncate pr-2">{j.title}</span>
                    <span className="text-[10px] text-slate-500 font-semibold shrink-0">{j.company}</span>
                  </div>
                ))}
              </div>

              {/* Option to delete applicants as well */}
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
                    Check this option to also delete all applicants in your talent pool who submitted applications for {jobsToDelete.length === 1 ? "this job post" : "these job posts"}.
                  </p>
                </div>
              </label>

              {/* Warning Box when Option is Selected */}
              {deleteAssociatedApplicants && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex gap-3 text-amber-900 animate-in fade-in duration-200 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px]">Warning: Talent Pool Data Deletion</p>
                    <p className="text-amber-800 leading-relaxed font-semibold">
                      If you select this option, your talent pool candidate data will also be deleted for all candidates who applied to this/these job position(s).
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
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl px-5 py-2.5 transition-colors focus:outline-none shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm & Delete Position(s)
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
