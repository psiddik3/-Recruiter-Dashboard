import React, { useState } from "react";
import { 
  Settings, Mail, FileText, Check, Shield, User, Globe, AlertCircle, Plus, Trash2, Image as ImageIcon,
  Users, Lock, Unlock, ShieldAlert, UserCheck, Briefcase, Share2, Eye, EyeOff
} from "lucide-react";
import { Recruiter, EmailTemplate } from "../types";

const PRESET_LOGOS = [
  { name: "Teal Circle", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%230f766e'><rect width='100' height='100' rx='20'/><circle cx='50' cy='50' r='25' fill='white'/><circle cx='50' cy='50' r='12' fill='%230f766e'/></svg>" },
  { name: "Indigo Wave", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%234f46e5'><rect width='100' height='100' rx='20'/><path d='M30,50 Q40,30 50,50 T70,50' stroke='white' stroke-width='8' fill='none' stroke-linecap='round'/></svg>" },
  { name: "Emerald Square", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23059669'><rect width='100' height='100' rx='20'/><rect x='30' y='30' width='40' height='40' rx='8' fill='white'/><rect x='42' y='42' width='16' height='16' rx='3' fill='%23059669'/></svg>" },
  { name: "Rose Diamond", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23e11d48'><rect width='100' height='100' rx='20'/><path d='M50,25 L75,50 L50,75 L25,50 Z' fill='white'/></svg>" }
];

interface SettingsViewProps {
  recruiter: Recruiter;
  templates: EmailTemplate[];
  onUpdateRecruiter: (updated: Recruiter) => void;
  onUpdateTemplates: (updated: EmailTemplate[]) => void;
  companyLogo: string;
  setCompanyLogo: (logo: string) => void;
  logoPosition: "header" | "dashboard" | "cards";
  setLogoPosition: (position: "header" | "dashboard" | "cards") => void;
  teamRecruiters?: Array<{
    id: string;
    name: string;
    email: string;
    designation: string;
    sourcedCount: number;
    accessScope: "global" | "local";
    status: "active" | "restricted" | "disabled";
    joinedDate: string;
  }>;
  onUpdateTeamRecruiters?: (updated: any[]) => void;
  globalPoolEnabled?: boolean;
  onToggleGlobalPool?: (val: boolean) => void;
  isFounderMode?: boolean;
  onLoginAsRecruiter?: (id: string) => void;
  onViewAuditLog?: (recruiter: any) => void;
}

export default function SettingsView({ 
  recruiter, 
  templates, 
  onUpdateRecruiter, 
  onUpdateTemplates,
  companyLogo,
  setCompanyLogo,
  logoPosition,
  setLogoPosition,
  teamRecruiters: propTeamRecruiters,
  onUpdateTeamRecruiters,
  globalPoolEnabled: propGlobalPoolEnabled,
  onToggleGlobalPool: propOnToggleGlobalPool,
  isFounderMode = true,
  onLoginAsRecruiter,
  onViewAuditLog
}: SettingsViewProps) {
  const [name, setName] = useState(recruiter.name);
  const [email, setEmail] = useState(recruiter.email);
  const [phone, setPhone] = useState(recruiter.phone);
  const [company, setCompany] = useState(recruiter.company);
  const [designation, setDesignation] = useState(recruiter.designation);
  const [password, setPassword] = useState(recruiter.password || "password123");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showEmailOnApplyForm, setShowEmailOnApplyForm] = useState(recruiter.showEmailOnApplyForm !== false);
  const [showPhoneOnApplyForm, setShowPhoneOnApplyForm] = useState(recruiter.showPhoneOnApplyForm !== false);

  React.useEffect(() => {
    setName(recruiter.name);
    setEmail(recruiter.email);
    setPhone(recruiter.phone || "");
    setCompany(recruiter.company);
    setDesignation(recruiter.designation);
    setPassword(recruiter.password || "password123");
    setShowEmailOnApplyForm(recruiter.showEmailOnApplyForm !== false);
    setShowPhoneOnApplyForm(recruiter.showPhoneOnApplyForm !== false);
  }, [recruiter]);

  const [activeTab, setActiveTab] = useState<"profile" | "emails" | "admin">("profile");

  // Local fallback states if props are not supplied
  const [fallbackTeamRecruiters, setFallbackTeamRecruiters] = useState<Array<{
    id: string;
    name: string;
    email: string;
    designation: string;
    sourcedCount: number;
    accessScope: "global" | "local";
    status: "active" | "restricted" | "disabled";
    joinedDate: string;
  }>>(() => {
    const saved = localStorage.getItem("recruit_crm_team_recruiters");
    if (saved) return JSON.parse(saved);
    return [
      { id: "1", name: "Rahul Sharma", email: "rahul@company.com", designation: "Senior Recruiting Director", sourcedCount: 1542, accessScope: "global", status: "active", joinedDate: "2025-01-15" },
      { id: "2", name: "Sarah Jenkins", email: "sarah.j@company.com", designation: "Technical Sourcer", sourcedCount: 843, accessScope: "local", status: "active", joinedDate: "2025-06-10" },
      { id: "3", name: "David Miller", email: "david.m@company.com", designation: "HR Recruiter", sourcedCount: 254, accessScope: "local", status: "active", joinedDate: "2025-11-01" },
      { id: "4", name: "Amit Mishra", email: "amit.m@company.com", designation: "Campus Recruiting Lead", sourcedCount: 612, accessScope: "global", status: "active", joinedDate: "2025-03-22" },
      { id: "5", name: "Siddharth", email: "siddharth@company.com", designation: "Talent Acquisition Partner", sourcedCount: 389, accessScope: "local", status: "active", joinedDate: "2025-08-01" }
    ];
  });

  const [fallbackGlobalPoolEnabled, setFallbackGlobalPoolEnabled] = useState(() => {
    return localStorage.getItem("recruit_crm_global_pool_enabled") === "true";
  });

  // Unified binders
  const teamRecruiters = propTeamRecruiters !== undefined ? propTeamRecruiters : fallbackTeamRecruiters;
  const syncTeamRecruiters = (updated: any[]) => {
    if (onUpdateTeamRecruiters) {
      onUpdateTeamRecruiters(updated);
    } else {
      setFallbackTeamRecruiters(updated);
      localStorage.setItem("recruit_crm_team_recruiters", JSON.stringify(updated));
    }
  };

  const globalPoolEnabled = propGlobalPoolEnabled !== undefined ? propGlobalPoolEnabled : fallbackGlobalPoolEnabled;
  const handleToggleGlobalPool = (val: boolean) => {
    if (propOnToggleGlobalPool) {
      propOnToggleGlobalPool(val);
    } else {
      setFallbackGlobalPoolEnabled(val);
      localStorage.setItem("recruit_crm_global_pool_enabled", String(val));
    }
  };

  // Team invitation form states
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDesignation, setInviteDesignation] = useState("");
  const [inviteScope, setInviteScope] = useState<"global" | "local">("local");

  // Interactive removal modal state
  const [removingRecruiter, setRemovingRecruiter] = useState<any | null>(null);
  const [candidateHandling, setCandidateHandling] = useState<"merge" | "delete">("merge");

  // Email template composer states
  const [newTplName, setNewTplName] = useState("");
  const [newTplSubject, setNewTplSubject] = useState("");
  const [newTplBody, setNewTplBody] = useState("");

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRecruiter({
      ...recruiter,
      name,
      email,
      phone,
      company,
      designation,
      password,
      showEmailOnApplyForm,
      showPhoneOnApplyForm
    });
    alert("Profile settings saved successfully!");
  };

  const handleUpdateLogo = (url: string) => {
    if (isFounderMode) {
      setCompanyLogo(url);
    } else {
      onUpdateRecruiter({ ...recruiter, companyLogo: url });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const resizedLogo = canvas.toDataURL("image/png", 0.8);
            handleUpdateLogo(resizedLogo);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName || !newTplSubject || !newTplBody) return;

    const newTpl: EmailTemplate = {
      id: Date.now(),
      name: newTplName,
      subject: newTplSubject,
      body: newTplBody
    };

    onUpdateTemplates([...templates, newTpl]);
    setNewTplName("");
    setNewTplSubject("");
    setNewTplBody("");
    alert("Email template created successfully!");
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      onUpdateTemplates(templates.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            System Preferences <Settings className="w-5 h-5 text-indigo-500" />
          </h1>
          <p className="text-sm text-slate-500">
            Customize recruiter profiles, draft bulk email templates, and manage branding.
          </p>
        </div>
      </div>

      {/* Settings Sub-navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-sm overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-2 capitalize font-semibold transition-all cursor-pointer shrink-0 ${activeTab === "profile" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
        >
          My Profile
        </button>
        <button
          onClick={() => setActiveTab("emails")}
          className={`pb-2 capitalize font-semibold transition-all cursor-pointer shrink-0 ${activeTab === "emails" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
        >
          Email & Outreach Templates
        </button>
        {isFounderMode && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`pb-2 capitalize font-semibold transition-all cursor-pointer shrink-0 ${activeTab === "admin" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            Founder Console (Team Control)
          </button>
        )}
      </div>

      {/* Tab: Profile settings */}
      {activeTab === "profile" && (
        <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              {(isFounderMode ? companyLogo : recruiter.companyLogo) ? (
                <img 
                  src={isFounderMode ? companyLogo : recruiter.companyLogo} 
                  alt="Company Logo" 
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-2xl font-bold font-sans border border-indigo-100">
                  {name ? name.slice(0, 2).toUpperCase() : "RC"}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-slate-900">{name}</h2>
                <p className="text-xs text-slate-500">{designation} &bull; {company}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input autoCapitalize="words"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 capitalize"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <button
                    type="button"
                    onClick={() => setShowEmailOnApplyForm(!showEmailOnApplyForm)}
                    className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      showEmailOnApplyForm 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                    }`}
                    title={showEmailOnApplyForm ? "Visible on candidate apply page" : "Hidden from candidate apply page"}
                  >
                    {showEmailOnApplyForm ? <Eye className="w-3 h-3 text-indigo-600" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                    <span>{showEmailOnApplyForm ? "Show on Apply Form" : "Hide on Apply Form"}</span>
                  </button>
                </div>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30"
                  />
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Email address cannot be changed once registered.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Phone</label>
                  <button
                    type="button"
                    onClick={() => setShowPhoneOnApplyForm(!showPhoneOnApplyForm)}
                    className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      showPhoneOnApplyForm 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                    }`}
                    title={showPhoneOnApplyForm ? "Visible on candidate apply page" : "Hidden from candidate apply page"}
                  >
                    {showPhoneOnApplyForm ? <Eye className="w-3 h-3 text-indigo-600" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                    <span>{showPhoneOnApplyForm ? "Show on Apply Form" : "Hide on Apply Form"}</span>
                  </button>
                </div>
                <input autoCapitalize="words"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 capitalize"
                  />
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Recruiter phone number displayed to candidates if toggled on.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Company Name</label>
                <input autoCapitalize="words"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 capitalize"
                  />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Designation</label>
              <input autoCapitalize="words"
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 capitalize"
                />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Portal Password</label>
              {isFounderMode ? (
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    disabled
                    readOnly
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-100 text-slate-500 cursor-not-allowed font-semibold"
                  />
                  <span className="absolute right-3 top-2 text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100/60 px-1.5 py-0.5 rounded uppercase tracking-wider">Locked</span>
                </div>
              ) : (
                                <div className="space-y-2">
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 font-semibold"
                    placeholder="Enter old password"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 font-semibold"
                    placeholder="Enter new password"
                  />
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Keep this secure. Changing this password will update your portal logins in real time.</p>
            </div>

            {/* Brand Logo & Corporate Configuration */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Company Brand Logo & Corporate Configuration
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  Select a stylized vector preset or upload your company's transparent logo. This logo is synced globally across the Recruit CRM and appears directly on all ShareKit social posters.
                </p>

                {/* Preset Picker */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {PRESET_LOGOS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleUpdateLogo(preset.url)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        (isFounderMode ? companyLogo : recruiter.companyLogo) === preset.url
                          ? "border-indigo-600 bg-indigo-50/50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center p-0.5 border border-slate-100 bg-white">
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500">{preset.name}</span>
                    </button>
                  ))}
                </div>

                {/* File Upload for Custom Logo */}
                <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  <div className="flex-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Upload Custom Mark</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:text-[10px] file:font-bold file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
                    />
                  </div>
                  
                  {(isFounderMode ? companyLogo : recruiter.companyLogo) && (
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-xs">
                        <img src={isFounderMode ? companyLogo : recruiter.companyLogo} alt="Active Mark" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateLogo("")}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                      >
                        Remove Logo
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo Display Position Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Sidebar / Header Logo Display
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLogoPosition("header")}
                    className={`p-3 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                      logoPosition === "header"
                        ? "border-indigo-600 bg-indigo-50/30"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <span className="block text-xs font-bold text-slate-800">Show on CRM Header</span>
                    <span className="block text-[10px] text-slate-400 leading-tight">Displays the corporate logo at the top left of the main sidebar.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoPosition("dashboard")} // we use "dashboard" or other state as "hidden"
                    className={`p-3 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                      logoPosition === "dashboard"
                        ? "border-indigo-600 bg-indigo-50/30"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <span className="block text-xs font-bold text-slate-800">Only on ShareKit Graphics</span>
                    <span className="block text-[10px] text-slate-400 leading-tight">Hides logo from the main CRM panels. Only uses logo on posters.</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 transition-colors focus:outline-none cursor-pointer"
              >
                Save Profile Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Email templates */}
      {activeTab === "emails" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-fade-in">
          
          {/* Create template form (5 columns) */}
          <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm h-fit">
            <h2 className="font-bold text-slate-900 text-sm mb-4">Create Template</h2>
            <form onSubmit={handleAddTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Template Name</label>
                <input autoCapitalize="words"
                  required
                  placeholder="e.g. Schedule Panel Round"
                  type="text"
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50/30 capitalize"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Subject Line</label>
                <input autoCapitalize="words"
                  required
                  placeholder="Application Update: interview scheduled..."
                  type="text"
                  value={newTplSubject}
                  onChange={(e) => setNewTplSubject(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50/30 capitalize"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Message Body
                </label>
                <textarea autoCapitalize="sentences"
                  required
                  rows={6}
                  value={newTplBody}
                  onChange={(e) => setNewTplBody(e.target.value)}
                  placeholder="Dear {{candidate_name}}, ..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono bg-slate-50/30 capitalize"
                ></textarea>
                <span className="text-[10px] text-slate-400 block mt-1">Variables: `{"{{candidate_name}}"}` &bull; `{"{{job_title}}"}` &bull; `{"{{company_name}}"}`</span>
              </div>
              
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl py-2 px-4 transition-all cursor-pointer"
              >
                Add Template to CRM
              </button>
            </form>
          </div>

          {/* List of current templates (7 columns) */}
          <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Active Templates ({templates.length})</h2>
            
            <div className="space-y-3.5 divide-y divide-slate-100">
              {templates.map((tpl: EmailTemplate) => (
                <div key={tpl.id} className="pt-3.5 first:pt-0 flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 rounded">
                      {tpl.name}
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 pt-1">Subject: {tpl.subject}</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-200/50 max-h-36 overflow-y-auto">
                      {tpl.body}
                    </p>
                  </div>
                  {isFounderMode ? (
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span 
                      className="text-slate-300 p-1 cursor-not-allowed" 
                      title="Only Founder Admin has delete rights"
                    >
                      <Lock className="w-4 h-4 text-slate-300" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Tab: Founder Console Admin */}
      {activeTab === "admin" && (
        <div className="space-y-6 animate-fade-in">
          {/* Architectural Explanation Widget */}
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h2 className="font-extrabold text-sm text-white uppercase tracking-wider">
                How Central Pool & Multi-Recruiter Governance Works
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When scaling to 10, 100, or 10,000+ recruiters, a persistent central database (like <strong>Google Cloud SQL PostgreSQL</strong> or <strong>Firestore</strong>) acts as the single source of truth. Data isolation and access permissions are governed at the database level:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-1">
                <span className="font-bold text-indigo-300 block">1. Row-Level Security (RLS)</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  In PostgreSQL or Firestore Rules, data query filters are applied natively on queries. A junior recruiter's database query has an automatic <code>WHERE posted_by_id = current_user_id</code> filter, enforcing strict local access.
                </p>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-1">
                <span className="font-bold text-emerald-300 block">2. Shared Central Pool</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  When a recruiter is assigned <strong>Global Access</strong>, they query a unified view. All resumes processed by any recruiter are parsed and compiled into the central repository, enabling cross-opening talent sourcing.
                </p>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-1">
                <span className="font-bold text-rose-300 block">3. Recruiter Offboarding</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  If you remove a recruiter, their authentication is instantly revoked. Their sourced candidates are either merged into the global company pool (preserving historical pipeline records) or permanently scrubbed based on policy.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Team Roster List (8 columns) */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Manage Active Recruiters ({teamRecruiters.length})
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Control permissions, restrictions, and offboarding
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Central Pool Search:</span>
                  <button
                    onClick={() => handleToggleGlobalPool(!globalPoolEnabled)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      globalPoolEnabled ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        globalPoolEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Roster list */}
              <div className="divide-y divide-slate-100 space-y-3.5">
                {teamRecruiters.map((r) => (
                  <div key={r.id} className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center font-bold text-indigo-700 text-xs shrink-0">
                        {r.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800">{r.name}</h4>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                            r.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">{r.designation} &bull; {r.email}</p>
                        <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                          💼 Sourced Candidates: <strong>{r.sourcedCount}</strong> profile records
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Access Scope Button Toggle (Central Pool) */}
                      <button
                        onClick={() => {
                          const updated = teamRecruiters.map(tm => {
                            if (tm.id === r.id) {
                              const nextScope = tm.accessScope === "global" ? "local" : "global";
                              return { ...tm, accessScope: nextScope };
                            }
                            return tm;
                          });
                          syncTeamRecruiters(updated);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-all cursor-pointer ${
                          r.accessScope === "global"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/60"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                        title={r.accessScope === "global" ? "Can search all candidate pools globally via Central Pool" : "Restricted only to candidate profiles they created"}
                      >
                        {r.accessScope === "global" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>{r.accessScope === "global" ? "Central Pool: ON" : "Central Pool: OFF"}</span>
                      </button>

                      {/* Log in as this recruiter */}
                      {onLoginAsRecruiter && (
                        <button
                          onClick={() => onLoginAsRecruiter(r.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none flex items-center gap-1 cursor-pointer"
                          title="Log in directly as this recruiter"
                        >
                          <User className="w-3 h-3" /> Log In
                        </button>
                      )}

                      {/* View Logins & Audit */}
                      {onViewAuditLog && (
                        <button
                          onClick={() => onViewAuditLog(r)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded-lg px-2.5 py-1.5 border border-indigo-100 transition-colors focus:outline-none flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3 text-indigo-500" /> View Logins
                        </button>
                      )}

                      {/* Copy Access Link */}
                      <button
                        onClick={() => {
                          const customLink = `${window.location.origin}${window.location.pathname}?recruiterId=${r.id}`;
                          navigator.clipboard.writeText(customLink);
                          alert(`Custom Access Link copied to clipboard!\n\nSend this to ${r.name}:\n${customLink}\n\nWhen they open it on their browser (e.g. Netlify, local, or GitHub Pages), they will immediately log in to their personal isolated candidate workspace with Admin settings safely locked.`);
                        }}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/60 transition-all cursor-pointer flex items-center gap-1"
                        title="Copy direct custom access portal link for this recruiter"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </button>

                      {/* Suspension Toggle */}
                      <button
                        onClick={() => {
                          const updated = teamRecruiters.map(tm => {
                            if (tm.id === r.id) {
                              const nextStatus = tm.status === "active" ? "restricted" : "active";
                              return { ...tm, status: nextStatus as any };
                            }
                            return tm;
                          });
                          syncTeamRecruiters(updated);
                        }}
                        className={`text-[10px] font-bold px-2 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          r.status === "active"
                            ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            : "bg-amber-100 border-amber-300 text-amber-800"
                        }`}
                      >
                        {r.status === "active" ? "Suspend" : "Activate"}
                      </button>

                      {/* Remove Recruiter */}
                      <button
                        onClick={() => setRemovingRecruiter(r)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Remove recruiter from organization"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite Recruiter (4 columns) */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" /> Invite New Recruiter
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!inviteName || !inviteEmail || !inviteDesignation) return;

                  const newTM = {
                    id: String(Date.now()),
                    name: inviteName,
                    email: inviteEmail,
                    designation: inviteDesignation,
                    sourcedCount: 0,
                    accessScope: inviteScope,
                    status: "active" as const,
                    joinedDate: new Date().toISOString().split("T")[0]
                  };

                  syncTeamRecruiters([...teamRecruiters, newTM]);
                  setInviteName("");
                  setInviteEmail("");
                  setInviteDesignation("");
                  setInviteScope("local");
                  alert(`Successfully invited ${inviteName}! An email invitation with authentication credentials has been dispatched.`);
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input autoCapitalize="words"
                    required
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50/30 font-medium capitalize"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Work Email
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="ramesh@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50/30 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Designation / Title
                  </label>
                  <input autoCapitalize="words"
                    required
                    type="text"
                    placeholder="e.g. Junior Recruiter"
                    value={inviteDesignation}
                    onChange={(e) => setInviteDesignation(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50/30 font-medium capitalize"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Data Access Scope
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteScope("global")}
                      className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        inviteScope === "global"
                          ? "border-indigo-600 bg-indigo-50/40 text-indigo-700"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      Global Central Pool
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteScope("local")}
                      className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        inviteScope === "local"
                          ? "border-indigo-600 bg-indigo-50/40 text-indigo-700"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      Isolated (Own)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl py-2.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" /> Send Portal Invite
                </button>
              </form>
            </div>
          </div>

          {/* Recruiter Deletion and Data Preservation Simulator Modal */}
          {removingRecruiter && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 text-rose-600">
                    <ShieldAlert className="w-5 h-5" /> Offboard Recruiter Access
                  </h3>
                  <button
                    onClick={() => setRemovingRecruiter(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5">
                  <p className="text-xs text-slate-600">
                    You are removing <strong>{removingRecruiter.name}</strong> from the corporate recruitment organization. This action instantly revokes their CRM login credentials.
                  </p>

                  <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                      Preserve Sourced Pipeline
                    </span>
                    <p className="text-[11px] text-amber-700 leading-normal font-medium">
                      {removingRecruiter.name} personally sourced <strong>{removingRecruiter.sourcedCount} candidates</strong>. To ensure zero loss of high-quality profiles, select a handling policy below:
                    </p>
                  </div>

                  {/* Handling Selection Options */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setCandidateHandling("merge")}
                      className={`w-full p-3 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                        candidateHandling === "merge"
                          ? "border-indigo-600 bg-indigo-50/30"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          candidateHandling === "merge" ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                        }`}>
                          {candidateHandling === "merge" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="text-xs font-bold text-slate-800">Merge with Company Central Pool (Recommended)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 pl-5 leading-normal">
                        All {removingRecruiter.sourcedCount} candidate files are retained in the central database as unassigned talent, searchable by any remaining team recruiter.
                      </p>
                    </button>

                    <button
                      onClick={() => setCandidateHandling("delete")}
                      className={`w-full p-3 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                        candidateHandling === "delete"
                          ? "border-rose-600 bg-rose-50/30"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          candidateHandling === "delete" ? "border-rose-600 bg-rose-600" : "border-slate-300"
                        }`}>
                          {candidateHandling === "delete" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="text-xs font-bold text-slate-800 text-rose-700">Scrub & Delete Sourced Candidates</span>
                      </div>
                      <p className="text-[10px] text-slate-400 pl-5 leading-normal">
                        Permanently deletes all {removingRecruiter.sourcedCount} resume files, rating cards, and interview notes from our database records.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Modal actions */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setRemovingRecruiter(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl px-4 py-2 transition-colors focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const updated = teamRecruiters.filter(tm => tm.id !== removingRecruiter.id);
                      syncTeamRecruiters(updated);
                      setRemovingRecruiter(null);
                      alert(
                        candidateHandling === "merge"
                          ? `Access revoked! ${removingRecruiter.name} was successfully removed. All ${removingRecruiter.sourcedCount} sourced candidate profiles have been safely merged into the central company talent pool.`
                          : `Access revoked! ${removingRecruiter.name} was successfully removed. All associated candidates have been scrubbed from system records.`
                      );
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 transition-colors focus:outline-none shadow-sm"
                  >
                    Confirm Access Removal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
