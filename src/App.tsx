import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Eye, EyeOff, 
  LayoutDashboard, Briefcase, Share2, Users, Settings, LogOut, Globe,
  Mail, X, Send, Check, Sparkles, UserCheck, AlertCircle, Shield, Lock, Unlock, User, RefreshCw, CheckCircle2
, PartyPopper, ArrowRight, UserPlus, Grid, PieChart, Bell, Clock, Menu, Rocket} from "lucide-react";
import { Job, Candidate, Recruiter, EmailTemplate, ViewType } from "./types";
import { INITIAL_JOBS, INITIAL_CANDIDATES, INITIAL_TEMPLATES } from "./data";
import { portalDb, applicantsDb } from "./lib/firebase";
import { configDb } from "./lib/configDb";
import { calculateAtsScore } from "./lib/atsScore";
import { formatTitleCase, getCandidateResponseTimestamp } from "./lib/formatUtils";

// Import modular layouts
import DashboardView from "./components/DashboardView";
import JobsView from "./components/JobsView";
import ATSWorkspace from "./components/ATSWorkspace";
import ShareKitView from "./components/ShareKitView";
import TalentPoolView from "./components/TalentPoolView";
import SettingsView from "./components/SettingsView";
import CandidateApplyView from "./components/CandidateApplyView";
import PortalJobsManager from "./components/PortalJobsManager";
import PublicHomepageView from "./components/PublicHomepageView";
import NotificationsModal from "./components/NotificationsModal";
import HomeFeedManager from "./components/HomeFeedManager";
import CommunityFeedManager from "./components/CommunityFeedManager";
import StartupFeedManager from "./components/StartupFeedManager";
import StartupCommunityManager from "./components/StartupCommunityManager";

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

export default function App() {
  const [isConfigLoaded, setIsConfigLoaded] = useState(true);
  // Gateways: "recruiter"
  const [userRole, setUserRole] = useState<"recruiter">("recruiter");
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Core Sourced State Lists - Synchronously hydrated for instant zero-delay rendering
  const [jobs, setJobs] = useState<Job[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recruit_crm_jobs_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((j: Job) => ({
              ...j,
              title: formatTitleCase(j.title),
              company: formatTitleCase(j.company)
            }));
          }
        } catch (e) {}
      }
    }
    return INITIAL_JOBS;
  });

  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recruit_crm_candidates_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return [...parsed].sort((a, b) => getCandidateResponseTimestamp(b) - getCandidateResponseTimestamp(a));
          }
        } catch (e) {}
      }
    }
    return [...INITIAL_CANDIDATES].sort((a, b) => getCandidateResponseTimestamp(b) - getCandidateResponseTimestamp(a));
  });
  
  // Job response notifications state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<number[]>(() => {
    const saved = localStorage.getItem("recruit_crm_read_notifications_v1");
    return saved ? JSON.parse(saved) : [];
  });
  
  // Custom template state
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recruit_crm_templates_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return INITIAL_TEMPLATES;
  });

  // Team Recruiters list state (for persistent sandbox testing)
  const [teamRecruiters, setTeamRecruiters] = useState<Array<{
    id: string;
    name: string;
    email: string;
    designation: string;
    sourcedCount: number;
    accessScope: "global" | "local";
    status: "active" | "restricted" | "disabled" | "suspended";
    joinedDate: string;
    password?: string;
  }>>(() => {
    const saved = localStorage.getItem("recruit_crm_team_recruiters_v2");
    if (saved) return JSON.parse(saved);
    return [
      { id: "1", name: "Siddharth", email: "siddharth@company.com", designation: "Talent Acquisition Partner", sourcedCount: 0, accessScope: "local", status: "active", joinedDate: "2025-08-01", password: "password123" }
    ];
  });

  // HTML5 History-based routing path
  const [urlPath, setUrlPath] = useState<string>(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const roleParam = params.get("role");
    if (roleParam === "admin") {
      return "/admin";
    } else if (roleParam === "recruiter") {
      return "/recruiter";
    }
    return typeof window !== "undefined" ? window.location.pathname : "/";
  });

  const [loggedInRecruiterId, setLoggedInRecruiterId] = useState<string | null>(() => {
    return localStorage.getItem("recruit_crm_logged_in_recruiter_id_v2");
  });

  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const roleParam = params.get("role");
    if (roleParam === "admin") return true;
    return localStorage.getItem("recruit_crm_admin_logged_in_v2") === "true";
  });

  const isAdminMode = useMemo(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const roleParam = params.get("role");
    if (roleParam === "admin") return true;
    if (roleParam === "recruiter") return false;
    return urlPath.startsWith("/admin");
  }, [urlPath]);

  const activeRecruiterId = useMemo(() => {
    if (isAdminMode) return "admin";
    return loggedInRecruiterId;
  }, [isAdminMode, loggedInRecruiterId]);

  const showSandboxHelpers = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("sandbox") === "false") return false;
    const hostname = window.location.hostname;
    // Strictly local development only - never display on Netlify, GitHub, or custom domains
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    );
  }, [urlPath]);

  // Recruiter Access Request List
  const [googleRegistrationPendingUser, setGoogleRegistrationPendingUser] = useState<{name: string, email: string} | null>(null);

  const [pendingRegistrations, setPendingRegistrations] = useState<Array<{
    id: string;
    name: string;
    email: string;
    designation: string;
    message?: string;
    date: string;
  }>>(() => {
    const saved = localStorage.getItem("recruit_crm_pending_registrations");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.filter((req: any) => req.name !== "Ananya Iyer" && req.name !== "Vikram Malhotra");
    }
    return [];
  });

  const syncPendingRegistrations = (updated: any[]) => {
    setPendingRegistrations(updated);
    try {
      localStorage.setItem("recruit_crm_pending_registrations", JSON.stringify(updated));
    } catch (e) {}
    configDb.save({ pendingRegistrations: updated });
  };

  // Email Approval Modal states
    const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showRecruiterPassword, setShowRecruiterPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  
  const [globalMessage, setGlobalMessage] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{message: string; onConfirm: () => void} | null>(null);

  useEffect(() => {
    if (globalMessage) {
      const t = setTimeout(() => setGlobalMessage(""), 4000);
      return () => clearTimeout(t);
    }
  }, [globalMessage]);

  const [approvalRequest, setApprovalRequest] = useState<{
    id: string;
    name: string;
    email: string;
    designation: string;
    message?: string;
    phone?: string;
    company?: string;
    date: string;
  } | null>(null);
  const [approvalSubject, setApprovalSubject] = useState("");
  const [approvalBody, setApprovalBody] = useState("");

  const [generatedApprovalPassword, setGeneratedApprovalPassword] = useState("");
  const handleOpenApprovalModal = (req: any) => {
    setApprovalRequest(req);
    const pwd = Math.random().toString(36).slice(-8) + "!";
    setGeneratedApprovalPassword(pwd);
    setApprovalSubject(`Welcome to ${recruiter?.company || "Your Company"}! Access Granted to CRM Portal`);
    setApprovalBody(`Dear ${req.name},

We are thrilled to inform you that your request for recruiter access at ${recruiter?.company || "Your Company"} has been reviewed and APPROVED!

You can now log in to the ATS & CRM Workspace with the following credentials:
- URL Portal: ${window.location.origin}/ats-workspace
- Login Email: ${req.email}
- Temporary Password: ${pwd}

Please make sure to update your profile settings upon logging in.

Best regards,
System Administrator
${adminCompanyName || "Your Company Admin"} Network`);
  };

  const handleConfirmApproval = () => {
    if (!approvalRequest) return;
    
    // Create new active recruiter
    const newRecId = String(teamRecruiters.length + 1);
    const newRec = {
      id: newRecId,
      name: approvalRequest.name,
      email: approvalRequest.email,
      phone: approvalRequest.phone || "",
      company: approvalRequest.company || adminCompanyName || "Your Company",
      designation: approvalRequest.designation,
      sourcedCount: 0,
      accessScope: "local" as const, // default isolated scope
      status: "active" as const,
      joinedDate: new Date().toISOString().split("T")[0],
      password: generatedApprovalPassword || "Temp123!"
    };
    
    const updatedRecruiters = [...teamRecruiters, newRec];
    handleUpdateTeamRecruiters(updatedRecruiters);

    const updatedPending = pendingRegistrations.filter(r => r.id !== approvalRequest.id);
    syncPendingRegistrations(updatedPending);

    setGlobalMessage(`Welcome email sent successfully to ${approvalRequest.email}!`);
    setApprovalRequest(null);
  };

  // Mobile Navigation Drawer Toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Founder Console sub-view tab: "directory" (Recruiter Directory), "portal" (Public Job Portal), "home-feed" (Home Feed Moderation), "community-feed" (Community Feed Moderation), "startup-feed" (Spread One Startup Feed)
  const [founderSubTab, setFounderSubTab] = useState<"directory" | "portal" | "home-feed" | "community-feed" | "startup-feed" | "startup-communities">("directory");

  // Listen to popstate for single page routing behavior
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const urlRecruiterId = params.get("recruiterId");
      const urlJobId = params.get("jobId");

      setUrlPath(path);

      const segments = path.split("/").filter(Boolean);
      const openingsIdx = segments.indexOf("openings");
      let foundJobId: number | null = null;
      if (openingsIdx !== -1) {
        const remaining = segments.slice(openingsIdx + 1);
        const numSeg = remaining.find(s => /^\d+$/.test(s));
        if (numSeg) {
          foundJobId = Number(numSeg);
        }
      }

      const hash = window.location.hash;

      if (
        urlJobId ||
        path.startsWith("/apply") ||
        path.includes("/apply") ||
        (hash && (hash === "#jobs" || hash.startsWith("#job-") || hash.startsWith("#apply") || (hash.startsWith("#") && hash.length > 1)))
      ) {
        setCurrentView("candidate-portal");
        if (urlJobId) {
          setSelectedJobId(Number(urlJobId));
        }
      } else if (path.startsWith("/home")) { 
        setCurrentView("dashboard"); 
      } else if (path.includes("/ats-workspace")) {
        setCurrentView("ats-workspace");
        if (urlJobId) {
          setSelectedJobId(Number(urlJobId));
        }
      } else if (path.includes("/openings")) {
        if (foundJobId !== null) {
          setCurrentView("ats-workspace");
          setSelectedJobId(foundJobId);
        } else {
          setCurrentView("jobs");
          setSelectedJobId(null);
        }
      } else if (path.includes("/sharekit")) {
        setCurrentView("sharekit");
        if (urlJobId) {
          setSelectedJobId(Number(urlJobId));
        }
      } else if (path.includes("/centralpool") || path.includes("/central-pool")) {
        setCurrentView("central-pool");
      } else if (path.includes("/founder-console") || path.includes("/recruiters")) {
        setCurrentView("founder-console");
      } else if (path.includes("/configuration") || path.includes("/settings")) {
        setCurrentView("settings");
      } else if (path.includes("/dashboard")) {
        setCurrentView("dashboard");
      } else {
        // Simple directory parsing fallback
        if ((path === "/" || path === "" || path === "/recruiter" || path === "/recruiter/") && !urlJobId) {

          const savedRecruiterId = localStorage.getItem("recruit_crm_logged_in_recruiter_id_v2");
          const savedAdmin = localStorage.getItem("recruit_crm_admin_logged_in_v2");
          if (savedAdmin === "true") {
            window.history.replaceState({}, "", "/admin/dashboard");
            setUrlPath("/admin/dashboard");
            setCurrentView("dashboard");
          } else if (savedRecruiterId || urlRecruiterId) {
            window.history.replaceState({}, "", "/recruiter/dashboard");
            setUrlPath("/recruiter/dashboard");
            setCurrentView("dashboard");
          } else {
            window.history.replaceState({}, "", "/recruiter");
            setUrlPath("/recruiter");
            setCurrentView("dashboard");
          }
        } else if (path === "/admin" || path === "/admin/") {
          window.history.replaceState({}, "", "/admin/dashboard");
          setUrlPath("/admin/dashboard");
          setCurrentView("dashboard");
        } else {
          setCurrentView("dashboard");
        }
      }

      if (urlRecruiterId) {
        localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", urlRecruiterId);
        setLoggedInRecruiterId(urlRecruiterId);
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    handleLocationChange();

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, [jobs]);

  const handleNavigatePath = (path: string) => {
    setIsMobileMenuOpen(false);
    window.history.pushState({}, "", path);
    setUrlPath(path);
    
    const segments = path.split("/").filter(Boolean);
    const openingsIdx = segments.indexOf("openings");
    let foundJobId: number | null = null;
    if (openingsIdx !== -1) {
      const remaining = segments.slice(openingsIdx + 1);
      const numSeg = remaining.find(s => /^\d+$/.test(s));
      if (numSeg) {
        foundJobId = Number(numSeg);
      }
    }

    // Parse current view from path instantly
    if (path.startsWith("/home")) { setCurrentView("dashboard"); } else if (path.startsWith("/apply")) {
      setCurrentView("candidate-portal");
    } else if (path.includes("/ats-workspace")) {
      setCurrentView("ats-workspace");
    } else if (path.includes("/openings")) {
      if (foundJobId !== null) {
        setCurrentView("ats-workspace");
        setSelectedJobId(foundJobId);
      } else {
        setCurrentView("jobs");
        setSelectedJobId(null);
      }
    } else if (path.includes("/sharekit")) {
      setCurrentView("sharekit");
      if (!selectedJobId && jobs.length > 0) {
        setSelectedJobId(jobs[0].id);
      }
    } else if (path.includes("/centralpool") || path.includes("/central-pool")) {
      setCurrentView("central-pool");
      setSelectedJobId(null);
    } else if (path.includes("/talentpool")) {
      setCurrentView("talentpool");
      setSelectedJobId(null);
    } else if (path.includes("/founder-console") || path.includes("/recruiters")) {
      setCurrentView("founder-console");
      setSelectedJobId(null);
    } else if (path.includes("/configuration") || path.includes("/settings")) {
      setCurrentView("settings");
      setSelectedJobId(null);
    } else {
      setCurrentView("dashboard");
      setSelectedJobId(null);
    }
  };

  const [globalPoolEnabled, setGlobalPoolEnabled] = useState<boolean>(() => {
    return localStorage.getItem("recruit_crm_global_pool_enabled") === "true";
  });

  // Recruiter Profile preferences
  const [recruiter, setRecruiter] = useState<Recruiter>(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const roleParam = params.get("role");
    const isCurrentlyAdmin = (roleParam === "admin" || (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")));
    
    let savedCompany;
    if (isCurrentlyAdmin) {
      savedCompany = localStorage.getItem("recruit_crm_admin_company_name") || "Your Company";
    } else {
      savedCompany = "Your Company";
    }
    
    return {
      name: "Siddharth",
      email: "siddharth@company.com",
      phone: "+91 98765 43210",
      company: savedCompany,
      designation: "Talent Acquisition Partner",
      darkMode: false,
      language: "English"
    };
  });

  // Synchronize the current recruiter profile context when session switches
  useEffect(() => {
    if (isAdminMode) {
      const savedAdminCompany = localStorage.getItem("recruit_crm_admin_company_name") || "Your Company";
      let adminProfileStr = localStorage.getItem("recruit_crm_admin_profile");
      let adminProfile = adminProfileStr ? JSON.parse(adminProfileStr) : {};
      
      setRecruiter({
        id: "admin",
        name: adminProfile.name || "System Admin",
        email: adminProfile.email || "admin@spredone.in",
        phone: adminProfile.phone || "+91 98765 43210",
        company: adminProfile.company || savedAdminCompany,
        designation: adminProfile.designation || "System Administrator",
        darkMode: false,
        language: "English"
      });
      return;
    }
    const rId = loggedInRecruiterId || activeRecruiterId || "1";
    const activeR = teamRecruiters.find(r => r.id === rId) || teamRecruiters.find(r => r.email === recruiter.email) || teamRecruiters[0];
    if (activeR) {
      setRecruiter(prev => ({
        ...prev,
        id: activeR.id,
        name: activeR.name || prev.name,
        email: activeR.email || prev.email,
        phone: (activeR as any).phone || prev.phone || "+91 98765 43210",
        company: (activeR as any).company || prev.company || "Your Company",
        companyLogo: (activeR as any).companyLogo || prev.companyLogo,
        designation: activeR.designation || prev.designation,
        darkMode: false,
        language: "English",
        showEmailOnApplyForm: (activeR as any).showEmailOnApplyForm !== false,
        showPhoneOnApplyForm: (activeR as any).showPhoneOnApplyForm !== false
      }));
    }
  }, [activeRecruiterId, loggedInRecruiterId, isAdminMode]);

  // Locked out suspended recruiters watch
  const loggedInRecruiter = useMemo(() => {
    if (!loggedInRecruiterId) return null;
    return teamRecruiters.find(r => r.id === loggedInRecruiterId);
  }, [loggedInRecruiterId, teamRecruiters]);

  useEffect(() => {
    if (!isAdminMode && loggedInRecruiter && loggedInRecruiter.status === "active") {
      const welcomeKey = `recruit_crm_welcome_shown_${loggedInRecruiter.id}`;
      const hasSeenWelcome = localStorage.getItem(welcomeKey);
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true);
      }
    }
  }, [loggedInRecruiter, isAdminMode]);

  useEffect(() => {
    if (!isAdminMode && loggedInRecruiter && loggedInRecruiter.status !== "active") {
      setGlobalMessage(`Access Revoked: Your recruiter account (${loggedInRecruiter.name}) has been suspended by the administrator.`);
      localStorage.removeItem("recruit_crm_logged_in_recruiter_id_v2");
      setLoggedInRecruiterId(null);
      handleNavigatePath("/recruiter");
    }
  }, [loggedInRecruiter, isAdminMode]);

  // Direct flow applicant handler
  const handleAddCandidate = (newCand: Candidate) => {
    // 1. Add to central candidate state
    const updated = [newCand, ...candidates];
    syncCandidates(updated);

    // 2. Increment recruiter sourced count
    const sourcingRecruiter = teamRecruiters.find(tr => tr.name.toLowerCase() === newCand.sourcedBy?.toLowerCase());
    if (sourcingRecruiter) {
      const updatedRecruiters = teamRecruiters.map(tr => 
        tr.id === sourcingRecruiter.id ? { ...tr, sourcedCount: tr.sourcedCount + 1 } : tr
      );
      handleUpdateTeamRecruiters(updatedRecruiters);
    }
  };

  // Sync handers passed to settings
  const handleUpdateTeamRecruiters = (updated: any[] | ((prev: any[]) => any[])) => {
    setTeamRecruiters((prev) => {
      const nextState = typeof updated === 'function' ? updated(prev) : updated;
      try { localStorage.setItem("recruit_crm_team_recruiters_v2", JSON.stringify(nextState)); } catch(e) { console.error("LocalStorage quota exceeded", e); } 
      configDb.save({ teamRecruiters: nextState });
      return nextState;
    });
  };

  const handleToggleGlobalPool = (val: boolean) => {
    setGlobalPoolEnabled(val);
    localStorage.setItem("recruit_crm_global_pool_enabled", String(val));
  };

  // Check if a recruiter owns a job
  const isJobOwnedByRecruiter = useCallback((job: Job, rec: any): boolean => {
    if (!rec || !job) return false;
    
    // First, try matching by deterministic internal ID
    if (job.recruiterId && rec.id && String(job.recruiterId) === String(rec.id)) {
      return true;
    }
    
    // Fallback: match by name or email for backwards compatibility
    const cleanJobAuthor = (job.postedBy || "").trim().toLowerCase();
    const cleanRecName = (rec.name || "").trim().toLowerCase();
    const cleanRecEmail = (rec.email || "").trim().toLowerCase();

    if (cleanJobAuthor && cleanRecName) {
      if (cleanJobAuthor === cleanRecName) return true;
      if (cleanRecName.startsWith(cleanJobAuthor) || cleanJobAuthor.startsWith(cleanRecName)) return true;
    }

    if (cleanJobAuthor && cleanRecEmail && cleanJobAuthor === cleanRecEmail) {
      return true;
    }

    return false;
  }, []);

  // Check if a recruiter owns a candidate
  const isCandidateOwnedByRecruiter = useCallback((cand: Candidate, rec: any): boolean => {
    if (!rec || !cand) return false;
    
    if (cand.recruiterId && rec.id && String(cand.recruiterId) === String(rec.id)) {
      return true;
    }
    
    const cleanCandOwner = (cand.sourcedBy || "").trim().toLowerCase();
    const cleanRecName = (rec.name || "").trim().toLowerCase();
    const cleanRecEmail = (rec.email || "").trim().toLowerCase();

    if (cleanCandOwner && cleanRecName) {
      if (cleanCandOwner === cleanRecName) return true;
      if (cleanRecName.startsWith(cleanCandOwner) || cleanCandOwner.startsWith(cleanRecName)) return true;
    }

    if (cleanCandOwner && cleanRecEmail && cleanCandOwner === cleanRecEmail) {
      return true;
    }

    return false;
  }, []);

  // Simple deterministic candidate sourcer assignment for local testing
  const getCandidateSourcedBy = (cand: Candidate): string => {
    return cand.sourcedBy || recruiter.name || "Siddharth";
  };

  // Dynamically enrich and calibrate candidates with the latest ATS scoring algorithm
  const enrichedCandidates = useMemo(() => {
    return candidates.map(c => {
      if (c.jobId) {
        const targetJob = jobs.find(j => String(j.id) === String(c.jobId));
        if (targetJob) {
          return {
            ...c,
            ats: calculateAtsScore(c, targetJob)
          };
        }
      }
      return c;
    });
  }, [candidates, jobs]);

  // Filtered candidate list based on active recruiter and Global Pool policy
  const visibleCandidates = useMemo(() => {
    if (isAdminMode) {
      return enrichedCandidates;
    }

    if (!activeRecruiterId) return [];

    const activeR = teamRecruiters.find(r => r.id === activeRecruiterId);
      
    if (!activeR || activeR.status !== "active") {
      return [];
    }

    // Isolated View: Only candidates applied to jobs posted by this recruiter OR sourced by them
    const recruiterJobs = jobs.filter(j => isJobOwnedByRecruiter(j, activeR));
    const recruiterJobIds = recruiterJobs.map(j => j.id);

    return enrichedCandidates.filter(c => {
      const isOwner = isCandidateOwnedByRecruiter(c, activeR);
      const isJobMatch = recruiterJobIds.includes(c.jobId);
      return isOwner || isJobMatch;
    });
  }, [enrichedCandidates, jobs, activeRecruiterId, teamRecruiters, isAdminMode, isJobOwnedByRecruiter, isCandidateOwnedByRecruiter]);

  // Logo brand identity state and local persistent handlers
  const [adminCompanyLogo, setAdminCompanyLogo] = useState<string>(() => {
    return localStorage.getItem("recruit_crm_admin_company_logo") || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%230f766e'><rect width='100' height='100' rx='20'/><circle cx='50' cy='50' r='25' fill='white'/><circle cx='50' cy='50' r='12' fill='%230f766e'/></svg>";
  });
  const [recruiterCompanyLogo, setRecruiterCompanyLogo] = useState<string>(() => {
    return localStorage.getItem("recruit_crm_recruiter_company_logo") || localStorage.getItem("recruit_crm_company_logo") || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%230f766e'><rect width='100' height='100' rx='20'/><circle cx='50' cy='50' r='25' fill='white'/><circle cx='50' cy='50' r='12' fill='%230f766e'/></svg>";
  });
  const companyLogo = useMemo(() => {
    return isAdminMode ? adminCompanyLogo : recruiterCompanyLogo;
  }, [isAdminMode, adminCompanyLogo, recruiterCompanyLogo]);

  const [adminCompanyName, setAdminCompanyName] = useState<string>(() => {
    const saved = localStorage.getItem("recruit_crm_admin_company_name");
    if (saved && saved !== "Apex Technologies" && saved !== "Your Company Recruit CRM") {
      return saved;
    }
    return "Your Company";
  });
  const companyName = useMemo(() => {
    return isAdminMode ? adminCompanyName : (recruiter?.company || "Your Company");
  }, [isAdminMode, adminCompanyName, recruiter?.company]);

  const [logoPosition, setLogoPosition] = useState<"header" | "dashboard" | "cards">(() => {
    return (localStorage.getItem("recruit_crm_logo_position") as any) || "header";
  });

  const [auditedRecruiter, setAuditedRecruiter] = useState<any | null>(null);

  const handleUpdateRecruiterProfile = (updated: Recruiter) => {
    const oldName = recruiter.name;
    const newName = updated.name;
    const oldCompany = recruiter.company;
    const newCompany = updated.company;

    setRecruiter(updated);
    if (updated.company) {
      if (isAdminMode) {
        setAdminCompanyName(updated.company);
        try { 
          localStorage.setItem("recruit_crm_admin_company_name", updated.company);
          localStorage.setItem("recruit_crm_admin_profile", JSON.stringify(updated));
        } catch (e) {}
        configDb.save({ adminCompanyName: updated.company, adminProfile: updated });
      } else {
        try {
          localStorage.setItem("recruit_crm_recruiter_company_name", updated.company); // Keep this for legacy fallback if needed, but not state
        } catch (e) {}
      }
    }
    
    if (!isAdminMode) {
      const targetId = updated.id || recruiter.id || loggedInRecruiterId || activeRecruiterId;
      const oldEmail = (recruiter.email || "").trim().toLowerCase();
      const newEmail = (updated.email || "").trim().toLowerCase();
      const oldName = (recruiter.name || "").trim().toLowerCase();

      let matchedAny = false;
      let updatedTeam = teamRecruiters.map(r => {
        const isMatchById = Boolean(targetId && r.id === targetId);
        const isLoggedInMatch = Boolean(loggedInRecruiterId && r.id === loggedInRecruiterId);
        const isOldEmailMatch = Boolean(oldEmail && r.email && r.email.trim().toLowerCase() === oldEmail);
        const isNewEmailMatch = Boolean(newEmail && r.email && r.email.trim().toLowerCase() === newEmail);
        const isOldNameMatch = Boolean(oldName && r.name && r.name.trim().toLowerCase() === oldName);

        if (isMatchById || isLoggedInMatch || isOldEmailMatch || isNewEmailMatch || isOldNameMatch) {
          matchedAny = true;
          return {
            ...r,
            id: updated.id || r.id,
            name: updated.name,
            email: updated.email,
            designation: updated.designation,
            password: updated.password,
            phone: updated.phone,
            company: updated.company,
            companyLogo: updated.companyLogo
          };
        }
        return r;
      });

      if (!matchedAny && teamRecruiters.length > 0) {
        const activeIdx = teamRecruiters.findIndex(r => r.id === activeRecruiterId) >= 0 
          ? teamRecruiters.findIndex(r => r.id === activeRecruiterId) 
          : 0;
        updatedTeam = teamRecruiters.map((r, idx) => {
          if (idx === activeIdx) {
            return {
              ...r,
              id: updated.id || r.id,
              name: updated.name,
              email: updated.email,
              designation: updated.designation,
              password: updated.password,
              phone: updated.phone,
              company: updated.company,
              companyLogo: updated.companyLogo
            };
          }
          return r;
        });
      }

      handleUpdateTeamRecruiters(updatedTeam);
    }

    const targetId = updated.id || recruiter.id || loggedInRecruiterId || activeRecruiterId;
    const oldNameClean = (oldName || "").trim().toLowerCase();
    const newNameClean = (newName || "").trim().toLowerCase();

    let jobsChanged = false;
    const updatedJobs = jobs.map(j => {
      let jb = { ...j };
      let changedLocally = false;

      // Check if job belongs to this recruiter (by recruiterId, old name, new name, or ownership helper)
      const isOwner = 
        Boolean(targetId && jb.recruiterId && String(jb.recruiterId) === String(targetId)) ||
        Boolean(recruiter.id && jb.recruiterId && String(jb.recruiterId) === String(recruiter.id)) ||
        Boolean(oldNameClean && jb.postedBy && jb.postedBy.trim().toLowerCase() === oldNameClean) ||
        isJobOwnedByRecruiter(j, recruiter) ||
        isJobOwnedByRecruiter(j, updated);

      if (isOwner) {
        if (targetId && jb.recruiterId !== targetId) {
          jb.recruiterId = targetId;
          jobsChanged = true;
          changedLocally = true;
        }
        if (newName && jb.postedBy !== newName) {
          jb.postedBy = newName;
          jobsChanged = true;
          changedLocally = true;
        }
        if (newCompany && jb.company !== newCompany) {
          jb.company = newCompany;
          jobsChanged = true;
          changedLocally = true;
        }
      }

      if (changedLocally && jb.firebaseId) {
        // Sync to firebase portal
        portalDb.updateJob(jb.firebaseId, { company: jb.company, postedBy: jb.postedBy });
      }

      return jb;
    });

    if (jobsChanged) {
      syncJobs(updatedJobs);
    }

    // Cascade name & ID update to candidates sourced by this recruiter and notes authored by them
    let candidatesChanged = false;
    const updatedCandidates = candidates.map(c => {
      let isChanged = false;
      let updatedCand = { ...c };

      const isCandOwner = 
        Boolean(targetId && updatedCand.recruiterId && String(updatedCand.recruiterId) === String(targetId)) ||
        Boolean(recruiter.id && updatedCand.recruiterId && String(updatedCand.recruiterId) === String(recruiter.id)) ||
        Boolean(oldNameClean && updatedCand.sourcedBy && updatedCand.sourcedBy.trim().toLowerCase() === oldNameClean) ||
        isCandidateOwnedByRecruiter(c, recruiter) ||
        isCandidateOwnedByRecruiter(c, updated);

      if (isCandOwner) {
        if (targetId && updatedCand.recruiterId !== targetId) {
          updatedCand.recruiterId = targetId;
          isChanged = true;
        }
        if (newName && updatedCand.sourcedBy !== newName) {
          updatedCand.sourcedBy = newName;
          isChanged = true;
        }
      }

      if (updatedCand.notes && updatedCand.notes.length > 0) {
        const updatedNotes = updatedCand.notes.map(n => {
          const authorClean = (n.author || "").trim().toLowerCase();
          if (oldNameClean && authorClean === oldNameClean) {
            isChanged = true;
            return { ...n, author: newName };
          }
          return n;
        });
        if (isChanged) {
          updatedCand.notes = updatedNotes;
        }
      }

      if (isChanged) {
        candidatesChanged = true;
      }

      return updatedCand;
    });

    if (candidatesChanged) {
      syncCandidates(updatedCandidates);
    }
  };

  const handleUpdateCompanyLogo = (logo: string) => {
    if (isAdminMode) {
      setAdminCompanyLogo(logo);
      try { localStorage.setItem("recruit_crm_admin_company_logo", logo); } catch (e) {}
      configDb.save({ adminCompanyLogo: logo });
    } else {
      setRecruiterCompanyLogo(logo);
      try {
        localStorage.setItem("recruit_crm_recruiter_company_logo", logo);
        localStorage.setItem("recruit_crm_company_logo", logo);
      } catch (e) {}
      configDb.save({ companyLogo: logo });
    }
  };

  const handleUpdateLogoPosition = (position: "header" | "dashboard" | "cards") => {
    setLogoPosition(position);
    localStorage.setItem("recruit_crm_logo_position", position);
  };

  // Bulk Email Overlay controls
  const [bulkEmailIds, setBulkEmailIds] = useState<number[] | null>(null);
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");

  // Initialize data with local storage persistence
  useEffect(() => {
    const savedJobs = localStorage.getItem("recruit_crm_jobs_v2");
    const savedCandidates = localStorage.getItem("recruit_crm_candidates_v2");
    const savedTemplates = localStorage.getItem("recruit_crm_templates");

    if (savedJobs) {
      try {
        const parsedJobs = JSON.parse(savedJobs);
        if (Array.isArray(parsedJobs) && parsedJobs.length > 0) {
          setJobs(parsedJobs);
        } else {
          setJobs(INITIAL_JOBS);
          localStorage.setItem("recruit_crm_jobs_v2", JSON.stringify(INITIAL_JOBS));
        }
      } catch (err) {
        setJobs(INITIAL_JOBS);
        localStorage.setItem("recruit_crm_jobs_v2", JSON.stringify(INITIAL_JOBS));
      }
    } else {
      setJobs(INITIAL_JOBS);
      localStorage.setItem("recruit_crm_jobs_v2", JSON.stringify(INITIAL_JOBS));
    }

    if (savedCandidates) {
      try {
        const parsed = JSON.parse(savedCandidates);
        const filtered = parsed.filter((c: any) => c.name !== "Ananya Iyer" && c.name !== "Vikram Malhotra");
        const sorted = [...filtered].sort((a, b) => getCandidateResponseTimestamp(b) - getCandidateResponseTimestamp(a));
        setCandidates(sorted);
        localStorage.setItem("recruit_crm_candidates_v2", JSON.stringify(sorted));
      } catch (err) {
        const sortedInit = [...INITIAL_CANDIDATES].sort((a, b) => getCandidateResponseTimestamp(b) - getCandidateResponseTimestamp(a));
        setCandidates(sortedInit);
        localStorage.setItem("recruit_crm_candidates_v2", JSON.stringify(sortedInit));
      }
    } else {
      const sortedInit = [...INITIAL_CANDIDATES].sort((a, b) => getCandidateResponseTimestamp(b) - getCandidateResponseTimestamp(a));
      setCandidates(sortedInit);
      localStorage.setItem("recruit_crm_candidates_v2", JSON.stringify(sortedInit));
    }

    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      setTemplates(INITIAL_TEMPLATES);
      localStorage.setItem("recruit_crm_templates", JSON.stringify(INITIAL_TEMPLATES));
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "recruit_crm_candidates_v2" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setCandidates(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Load real-time jobs from Firestore to ensure the main job portal is always perfectly in sync
  useEffect(() => {
    portalDb.loadAll().then((firebaseJobs) => {
      if (firebaseJobs && firebaseJobs.length > 0) {
        // Find current name of primary recruiter (ID "1")
        const primaryRecruiter = teamRecruiters.find(r => r.id === "1");
        const primaryName = primaryRecruiter ? primaryRecruiter.name : "Siddharth";

        const mappedJobs: Job[] = firebaseJobs.map((fj: any, idx: number) => {
          let numId = fj.crmJobId ? Number(fj.crmJobId) : (fj.id ? parseInt(fj.id.replace(/\D/g, "").slice(-8)) || (9000 + idx) : (9000 + idx));
          if (fj.applyLink && fj.applyLink.includes("jobId=")) {
            const match = fj.applyLink.match(/jobId=(\d+)/);
            if (match && match[1]) {
              numId = parseInt(match[1], 10);
            }
          }
          const recoveredExternalUrl = fj.externalApplyUrl || 
            (fj.applyLink && !fj.applyLink.includes("recruiter.spredone.in") && !fj.applyLink.includes("jobId=") && fj.applyLink.startsWith("http") ? fj.applyLink : undefined);
          return {
            id: numId,
            firebaseId: fj.id,
            title: fj.title,
            company: fj.company,
            dept: fj.industry || "Engineering",
            employment: (fj.jobType === "Part Time" ? "Part-time" : fj.jobType === "Contract" ? "Contract" : fj.jobType === "Internship" ? "Internship" : "Full-time") as any,
            location: fj.location || "Remote",
            salary: fj.salary || "Not Disclosed",
            experience: fj.experience || "0-1 yr",
            skills: typeof fj.skills === "string" ? fj.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : (fj.skills || []),
            description: fj.description !== undefined ? fj.description : "",
            benefits: fj.benefits || "Standard benefits",
            deadline: fj.lastDate || "",
            status: fj.status === "approved" ? "active" : fj.status === "rejected" ? "closed" : "pending",
            postedBy: fj.postedBy || primaryName,
            recruiterId: fj.recruiterId || undefined,
            createdAt: fj.createdAt || new Date().toISOString(),
            expiresAt: fj.expiresAt,
            durationDays: fj.durationDays || 15,
            screeningQuestions: fj.screeningQuestions,
            views: 120,
            applications: 0,
            conversion: "0.0%",
            externalApplyUrl: recoveredExternalUrl
          };
        });

        setJobs((currentJobs) => {
          const merged = [...currentJobs];
          mappedJobs.forEach((mj) => {
            const existingIndex = merged.findIndex((cj) => 
              (cj.firebaseId && cj.firebaseId === mj.firebaseId) ||
              (cj.id && mj.id && cj.id === mj.id) ||
              ((cj.title || "").toLowerCase() === (mj.title || "").toLowerCase() && (cj.company || "").toLowerCase() === (mj.company || "").toLowerCase())
            );
            if (existingIndex >= 0) {
              const currentJob = merged[existingIndex];
              merged[existingIndex] = {
                ...mj,
                ...currentJob,
                firebaseId: mj.firebaseId || currentJob.firebaseId,
                title: formatTitleCase(currentJob.title || mj.title),
                company: formatTitleCase(currentJob.company || mj.company),
                experience: currentJob.experience || mj.experience,
                status: currentJob.status || mj.status,
                expiresAt: mj.expiresAt || currentJob.expiresAt,
                durationDays: mj.durationDays || currentJob.durationDays,
                screeningQuestions: currentJob.screeningQuestions || mj.screeningQuestions,
                createdAt: currentJob.createdAt || mj.createdAt,
                externalApplyUrl: currentJob.externalApplyUrl || mj.externalApplyUrl
              };
            } else if (mj.status === "active") {
              merged.push({
                ...mj,
                title: formatTitleCase(mj.title),
                company: formatTitleCase(mj.company)
              });
            }
          });
          try {
            localStorage.setItem("recruit_crm_jobs_v2", JSON.stringify(merged));
          } catch(e) {}
          return merged;
        });
      }
    }).catch(err => {
      console.warn("Could not load public portal jobs into CRM:", err);
    });
  }, [teamRecruiters]);

  // Load real-time global configuration from Firestore
  useEffect(() => {
    configDb.load().then(existing => {
      if (!existing && teamRecruiters && recruiter?.company) {
        configDb.save({ 
          teamRecruiters, 
          companyName: recruiter.company, 
          adminCompanyName, 
          companyLogo: recruiterCompanyLogo, 
          adminCompanyLogo,
          pendingRegistrations
        });
      } else if (existing) {
        if (existing.pendingRegistrations) {
          setPendingRegistrations(existing.pendingRegistrations);
        }
      }
      setIsConfigLoaded(true);
    });

    const unsubscribe = configDb.subscribe((config) => {
      if (config) {
        if (config.adminProfile) {
          localStorage.setItem("recruit_crm_admin_profile", JSON.stringify(config.adminProfile));
        }

        // Respect locally saved configuration to prevent resetting the user's recruiter configurations on refresh or switch
        const localAdminCompany = localStorage.getItem("recruit_crm_admin_company_name");
        if (localAdminCompany && localAdminCompany !== "Apex Technologies" && localAdminCompany !== "Your Company Recruit CRM") {
          setAdminCompanyName(localAdminCompany);
        } else if (config.adminCompanyName) {
          setAdminCompanyName(config.adminCompanyName);
          localStorage.setItem("recruit_crm_admin_company_name", config.adminCompanyName);
        }

        const localRecruiterCompany = localStorage.getItem("recruit_crm_recruiter_company_name") || localStorage.getItem("recruit_crm_company_name");
        if (localRecruiterCompany && localRecruiterCompany !== "Apex Technologies" && localRecruiterCompany !== "Next Wave Recruit CRM" && localRecruiterCompany !== "Next Wave") {
          setRecruiter(prev => ({ ...prev, company: localRecruiterCompany }));
        } else if (config.companyName) {
          setRecruiter(prev => ({ ...prev, company: config.companyName }));
          localStorage.setItem("recruit_crm_recruiter_company_name", config.companyName);
          localStorage.setItem("recruit_crm_company_name", config.companyName);
        }

        // Admin logo
        const localAdminLogo = localStorage.getItem("recruit_crm_admin_company_logo");
        if (localAdminLogo) {
          setAdminCompanyLogo(localAdminLogo);
        } else if (config.adminCompanyLogo) {
          setAdminCompanyLogo(config.adminCompanyLogo);
          localStorage.setItem("recruit_crm_admin_company_logo", config.adminCompanyLogo);
        }

        // Recruiter logo
        const localRecruiterLogo = localStorage.getItem("recruit_crm_recruiter_company_logo") || localStorage.getItem("recruit_crm_company_logo");
        if (localRecruiterLogo) {
          setRecruiterCompanyLogo(localRecruiterLogo);
        } else if (config.companyLogo) {
          setRecruiterCompanyLogo(config.companyLogo);
          localStorage.setItem("recruit_crm_recruiter_company_logo", config.companyLogo);
          localStorage.setItem("recruit_crm_company_logo", config.companyLogo);
        }

        if (config.teamRecruiters) {
          setTeamRecruiters(config.teamRecruiters);
          try {
            localStorage.setItem("recruit_crm_team_recruiters_v2", JSON.stringify(config.teamRecruiters));
          } catch (e) {}
        } else {
          const localRecruiters = localStorage.getItem("recruit_crm_team_recruiters_v2");
          if (localRecruiters) {
            try {
              setTeamRecruiters(JSON.parse(localRecruiters));
            } catch (e) {}
          }
        }

        if (config.pendingRegistrations) {
          setPendingRegistrations(config.pendingRegistrations);
          try {
            localStorage.setItem("recruit_crm_pending_registrations", JSON.stringify(config.pendingRegistrations));
          } catch (e) {}
        } else {
          const localPending = localStorage.getItem("recruit_crm_pending_registrations");
          if (localPending) {
            try {
              setPendingRegistrations(JSON.parse(localPending).filter((req: any) => req.name !== "Ananya Iyer" && req.name !== "Vikram Malhotra"));
            } catch (e) {}
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Load real-time candidates from Firestore
  useEffect(() => {
    const unsubscribe = applicantsDb.subscribeAll((firebaseCandidates) => {
      if (firebaseCandidates) {
        setCandidates((currentCandidates) => {
          const merged = [...currentCandidates];
          firebaseCandidates.forEach((fc) => {
            const idx = merged.findIndex(c => (c.dbId && c.dbId === fc.dbId) || c.id === fc.id || (c.email && c.email.toLowerCase() === (fc.email || "").toLowerCase()));
            if (idx >= 0) {
              const currentCand = merged[idx];
              const existingNotes = currentCand.notes || [];
              const remoteNotes = fc.notes || [];
              const combinedNotes = [
                ...existingNotes,
                ...remoteNotes.filter((rn: any) => !existingNotes.some(en => en.text === rn.text && en.date === rn.date))
              ];
              const existingTimeline = currentCand.timeline || [];
              const remoteTimeline = fc.timeline || [];
              const combinedTimeline = [
                ...existingTimeline,
                ...remoteTimeline.filter((rt: any) => !existingTimeline.some(et => et.event === rt.event && et.date === rt.date))
              ];
              merged[idx] = {
                ...fc,
                ...currentCand,
                dbId: fc.dbId || currentCand.dbId,
                stage: currentCand.stage || fc.stage,
                notes: combinedNotes,
                timeline: combinedTimeline
              };
            } else {
              merged.push(fc);
            }
          });
          
          // Sort by response timestamp descending (newest first)
          merged.sort((a, b) => {
            return getCandidateResponseTimestamp(b) - getCandidateResponseTimestamp(a);
          });
          try {
            localStorage.setItem("recruit_crm_candidates_v2", JSON.stringify(merged));
          } catch(e) {}
          return merged;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync state helpers
  const syncJobs = (updatedJobs: Job[]) => {
    setJobs(updatedJobs);
    localStorage.setItem("recruit_crm_jobs_v2", JSON.stringify(updatedJobs));
  };

  const handleDeleteJobs = (jobIdsToDelete: number[], deleteAssociatedApplicants: boolean) => {
    // 1. Delete jobs from job list
    const updatedJobs = jobs.filter(j => !jobIdsToDelete.includes(j.id));
    syncJobs(updatedJobs);

    // Also remove from portalDb if firebaseId exists
    const jobsBeingDeleted = jobs.filter(j => jobIdsToDelete.includes(j.id));
    jobsBeingDeleted.forEach(j => {
      if (j.firebaseId) {
        portalDb.remove(j.firebaseId).catch(err => console.warn("Failed to remove portal job:", err));
      }
    });

    // 2. Candidate deletion from central pool is strictly restricted to Founder/Admin
    const canDeleteFromCentralPool = isAdminMode && deleteAssociatedApplicants;

    if (canDeleteFromCentralPool) {
      const deletedJobIdsSet = new Set(jobIdsToDelete);
      const deletedJobTitlesSet = new Set(
        jobsBeingDeleted.map(j => j.title.trim().toLowerCase()).filter(Boolean)
      );

      const candidatesToRemove = candidates.filter(cand => {
        const matchByJobId = deletedJobIdsSet.has(cand.jobId);
        const matchByRole = cand.role ? deletedJobTitlesSet.has(cand.role.trim().toLowerCase()) : false;
        return matchByJobId || matchByRole;
      });

      const updatedCandidates = candidates.filter(cand => {
        const matchByJobId = deletedJobIdsSet.has(cand.jobId);
        const matchByRole = cand.role ? deletedJobTitlesSet.has(cand.role.trim().toLowerCase()) : false;
        return !matchByJobId && !matchByRole;
      });

      // Remove from Firebase applicantsDb
      candidatesToRemove.forEach(cand => {
        applicantsDb.remove(cand).catch(err => console.warn("Error removing candidate from Firebase:", err));
      });

      syncCandidates(updatedCandidates);
    }
  };

  const syncCandidates = (updatedCandidates: Candidate[], specificUpdatedCandidate?: Candidate) => {
    setCandidates(updatedCandidates);
    try {
      localStorage.setItem("recruit_crm_candidates_v2", JSON.stringify(updatedCandidates));
    } catch (e) {}
    
    // If a specific candidate was updated, persist immediately to Firestore
    if (specificUpdatedCandidate) {
      applicantsDb.update(specificUpdatedCandidate).then(syncedDbId => {
        if (syncedDbId && !specificUpdatedCandidate.dbId) {
          setCandidates(curr => {
            const patched = curr.map(c => c.id === specificUpdatedCandidate.id ? { ...c, dbId: syncedDbId } : c);
            try { localStorage.setItem("recruit_crm_candidates_v2", JSON.stringify(patched)); } catch(e) {}
            return patched;
          });
        }
      }).catch(err => {
        console.warn("Firestore candidate sync failed for ID:", specificUpdatedCandidate.id, err);
      });
    }
  };

  const syncTemplates = (updatedTemplates: EmailTemplate[]) => {
    setTemplates(updatedTemplates);
    localStorage.setItem("recruit_crm_templates", JSON.stringify(updatedTemplates));
  };

  // State Action Mutators
  const handleAddJob = (newJob: Job) => {
    const jobWithAuthor = {
      ...newJob,
      title: formatTitleCase(newJob.title),
      company: formatTitleCase(newJob.company),
      postedBy: recruiter.name,
      recruiterId: recruiter.id
    };
    syncJobs([jobWithAuthor, ...jobs]);
    
    // Automatically mirror newly posted jobs to the public Firebase Job Portal
    portalDb.postFromCRM(jobWithAuthor).then(firebaseId => {
      if (firebaseId) {
        setJobs(currentJobs => {
          const updated = currentJobs.map(j => 
            j.id === jobWithAuthor.id ? { ...j, firebaseId } : j
          );
          localStorage.setItem("recruit_crm_jobs_v2", JSON.stringify(updated));
          return updated;
        });
      }
    }).catch(err => {
      console.warn("Failed to automatically mirror job to public portal:", err);
    });
  };

  const handleUpdateCandidateStage = (candId: number, newStage: Candidate["stage"]) => {
    let targetCand: Candidate | undefined;
    const updated = candidates.map(c => {
      if (c.id === candId) {
        const currentStageLabel = newStage.toUpperCase();
        targetCand = {
          ...c,
          stage: newStage,
          timeline: [
            { event: `Moved to ${currentStageLabel} stage`, date: new Date().toISOString() },
            ...(c.timeline || [])
          ]
        };
        return targetCand;
      }
      return c;
    });
    if (targetCand) {
      applicantsDb.updateStage((targetCand as Candidate).dbId || (targetCand as Candidate).id, newStage);
      syncCandidates(updated, targetCand);
    } else {
      syncCandidates(updated);
    }
  };

  const handleToggleFavourite = (candId: number) => {
    const updated = candidates.map(c => 
      c.id === candId ? { ...c, favourite: !c.favourite } : c
    );
    syncCandidates(updated);
  };

  const handleRestoreDefaultData = () => {
    setConfirmDialog({
      message: "Are you sure you want to restore default sample data? This will reset job openings, candidates, and templates to initial default state.",
      onConfirm: () => {
        localStorage.removeItem("recruit_crm_jobs_v2");
        localStorage.removeItem("recruit_crm_candidates_v2");
        localStorage.removeItem("recruit_crm_templates");

        const defaultJobs: Job[] = [
          {
            id: 101,
            title: "Senior Full Stack Engineer",
            company: recruiter.company || "Acme Corp",
            dept: "Engineering",
            employment: "Full-time",
            location: "Remote",
            salary: "$130,000 - $160,000",
            experience: "3-5 yrs",
            skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
            description: "Looking for an experienced full stack engineer to build robust multi-tenant web applications.",
            benefits: "Health insurance, 401(k), Unlimited PTO",
            deadline: "2026-09-30",
            status: "active",
            postedBy: recruiter.name,
            recruiterId: recruiter.id,
            createdAt: new Date().toISOString(),
            views: 142,
            applications: 5,
            conversion: "3.5%"
          },
          {
            id: 102,
            title: "Product Marketing Manager",
            company: recruiter.company || "Acme Corp",
            dept: "Marketing",
            employment: "Full-time",
            location: "Hybrid (New York)",
            salary: "$110,000 - $135,000",
            experience: "2-4 yrs",
            skills: ["GTM Strategy", "Content Marketing", "Analytics"],
            description: "Lead product marketing campaigns and go-to-market launches across channels.",
            benefits: "Stock options, Flexible hours",
            deadline: "2026-10-15",
            status: "active",
            postedBy: recruiter.name,
            recruiterId: recruiter.id,
            createdAt: new Date().toISOString(),
            views: 89,
            applications: 3,
            conversion: "3.3%"
          }
        ];

        const defaultCandidates: Candidate[] = [
          {
            id: 201,
            jobId: 101,
            name: "Rahul Sharma",
            email: "rahul.sharma@example.com",
            phone: "+91 98765 11223",
            role: "Senior Full Stack Engineer",
            applied: "2026-07-28",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
            resumeText: "Senior Full Stack Developer with experience in React, TypeScript, and Node.js.",
            experience: "4 yrs",
            education: "B.Tech Computer Science",
            expectedSalary: "$140,000",
            noticePeriod: "15 days",
            location: "Remote",
            source: "Direct Application",
            favourite: false,
            timeline: [],
            rating: 4.5,
            skills: ["React", "TypeScript", "Node.js"],
            stage: "shortlist",
            sourcedBy: recruiter.name,
            recruiterId: recruiter.id,
            notes: [{ text: "Strong React background. Scheduled screening call.", author: recruiter.name, date: "2026-07-29" }]
          }
        ];

        syncJobs(defaultJobs);
        syncCandidates(defaultCandidates);
        syncTemplates(INITIAL_TEMPLATES);
        setGlobalMessage("System data restored to default sample state successfully!");
      }
    });
  };

  const handleExportBackupData = () => {
    const backupObj = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      jobs,
      candidates,
      templates,
      teamRecruiters
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recruit_crm_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackupData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.jobs && Array.isArray(parsed.jobs)) {
          syncJobs(parsed.jobs);
        }
        if (parsed.candidates && Array.isArray(parsed.candidates)) {
          syncCandidates(parsed.candidates);
        }
        if (parsed.templates && Array.isArray(parsed.templates)) {
          syncTemplates(parsed.templates);
        }
        if (parsed.teamRecruiters && Array.isArray(parsed.teamRecruiters)) {
          handleUpdateTeamRecruiters(parsed.teamRecruiters);
        }
        setGlobalMessage("Backup data imported and restored successfully!");
      } catch (err) {
        setGlobalMessage("Invalid backup file format. Please upload a valid JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleAddNote = (candId: number, noteText: string) => {
    const newNote = {
      text: noteText,
      author: recruiter.name,
      date: new Date().toISOString()
    };
    let targetCand: Candidate | undefined;
    const updated = candidates.map(c => {
      if (c.id === candId) {
        targetCand = { ...c, notes: [newNote, ...(c.notes || [])] };
        return targetCand;
      }
      return c;
    });
    syncCandidates(updated, targetCand);
  };

  const handleAssignToJob = (candId: number, targetJobId: number) => {
    const targetJob = jobs.find(j => j.id === targetJobId);
    let targetCand: Candidate | undefined;
    const updated = candidates.map(c => {
      if (c.id === candId) {
        targetCand = {
          ...c,
          jobId: targetJobId,
          role: targetJob ? targetJob.title : c.role,
          stage: "screening" as Candidate["stage"],
          timeline: [
            { event: `Reassigned globally to ${targetJob?.title || "new position"} opening`, date: new Date().toISOString() },
            ...(c.timeline || [])
          ]
        };
        return targetCand;
      }
      return c;
    });
    syncCandidates(updated, targetCand);
  };

  const handleRemoveCandidate = (candId: number) => {
    const candToDelete = candidates.find(c => c.id === candId);
    if (candToDelete) {
      applicantsDb.remove(candToDelete).catch(err => {
        console.warn("Firestore delete failed for candidate:", candId, err);
      });
    }
    syncCandidates(candidates.filter(c => c.id !== candId));
  };

  const handleUpdateCandidate = (updatedCand: Candidate) => {
    const updated = candidates.map(c => c.id === updatedCand.id ? updatedCand : c);
    syncCandidates(updated, updatedCand);
  };

  // Bulk Email Compiler
  const handleOpenBulkEmail = (candIds: number[]) => {
    setBulkEmailIds(candIds);
    // Set first template as default if available
    if (templates.length > 0) {
      handleSelectTemplate(templates[0].id, candIds);
    } else {
      setCustomSubject("Recruitment Update");
      setCustomBody("Dear {{candidate_name}},\n\nThank you for applying...");
    }
  };

  const handleSelectTemplate = (tplId: number, currentIds?: number[]) => {
    setSelectedTplId(tplId);
    const tpl = templates.find(t => t.id === tplId);
    const targetIds = currentIds || bulkEmailIds || [];
    if (tpl && targetIds.length > 0) {
      // Find primary sample candidate for visual placeholder compilation
      const firstCand = candidates.find(c => c.id === targetIds[0]);
      const targetJob = jobs.find(j => j.id === firstCand?.jobId);
      
      let compiledSubject = tpl.subject
        .replace(/{{candidate_name}}/g, firstCand?.name || "Candidate")
        .replace(/{{job_title}}/g, targetJob?.title || "Role")
        .replace(/{{company_name}}/g, recruiter.company);

      let compiledBody = tpl.body
        .replace(/{{candidate_name}}/g, firstCand?.name || "Candidate")
        .replace(/{{job_title}}/g, targetJob?.title || "Role")
        .replace(/{{company_name}}/g, recruiter.company)
        .replace(/{{recruiter_name}}/g, recruiter.name);

      setCustomSubject(compiledSubject);
      setCustomBody(compiledBody);
    }
  };

  const handleSendBulkEmailConfirm = () => {
    if (!bulkEmailIds) return;
    
    // Add communication history event to all selected candidate timelines
    const updated = candidates.map(c => {
      if (bulkEmailIds.includes(c.id)) {
        return {
          ...c,
          timeline: [
            { event: `Bulk Outreach Email Sent: "${customSubject}"`, date: new Date().toISOString() },
            ...(c.timeline || [])
          ]
        };
      }
      return c;
    });
    syncCandidates(updated);
    
    setGlobalMessage(`Successfully sent compiled batch to ${bulkEmailIds.length} candidate email list!`);
    setBulkEmailIds(null);
    setSelectedTplId(null);
  };

  const handleWidgetFilter = (filterName: string) => {
    if (filterName === "active") {
      handleNavigatePath(isAdminMode ? "/admin/openings" : "/recruiter/openings");
    } else if (filterName === "all" || filterName === "screening") {
      const activeJob = jobs.find(j => j.status === "active");
      if (activeJob) {
        setSelectedJobId(activeJob.id);
        const slug = slugify(activeJob.title);
        handleNavigatePath(isAdminMode ? `/admin/openings/${slug}/${activeJob.id}` : `/recruiter/openings/${slug}/${activeJob.id}`);
      }
    } else if (filterName === "hired") {
      handleNavigatePath(isAdminMode ? "/admin/centralpool" : ((globalPoolEnabled || teamRecruiters.find(tr => tr.id === loggedInRecruiterId)?.accessScope === "global") ? "/recruiter/centralpool" : "/recruiter/talentpool"));
    }
  };

  
  const sandboxControls = showSandboxHelpers ? (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-900/95 text-slate-100 p-3.5 rounded-2xl border border-slate-800 shadow-xl max-w-xs space-y-2.5 backdrop-blur-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">🧪 Sandbox Tester Controls</span>
        <span className={`w-2 h-2 rounded-full ${isAdminMode ? "bg-rose-500" : "bg-emerald-500"} animate-pulse`}></span>
      </div>
      <div className="space-y-1.5 text-left">
        <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">
          Testing Mode: <span className="font-mono text-indigo-300">{isAdminMode ? "Admin Panel" : "Recruiter CRM"}</span>
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => {
              handleNavigatePath("/recruiter");
              setCurrentView("dashboard");
            }}
            className={`text-[9px] font-black p-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${
              !isAdminMode ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title="Go to Recruiter CRM portal screen"
          >
            🔓 Recruiter
          </button>
          <button
            onClick={() => {
              handleNavigatePath("/admin");
              setCurrentView("dashboard");
            }}
            className={`text-[9px] font-black p-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${
              isAdminMode ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title="Go to Founder Admin master portal"
          >
            🛡️ Admin
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const currentSearchJobId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("jobId") : null;
  if (currentView === "candidate-portal" || urlPath.startsWith("/apply") || urlPath.includes("/apply") || currentSearchJobId) {
    
    // Inject admin profile to team recruiters for the candidate portal context
    const parsedAdminStr = localStorage.getItem("recruit_crm_admin_profile");
    const parsedAdmin = parsedAdminStr ? JSON.parse(parsedAdminStr) : {};
    const portalRecruiters = [
      ...teamRecruiters,
      {
        id: "admin",
        name: parsedAdmin.name || "System Admin",
        email: parsedAdmin.email || "admin@spredone.in",
        phone: parsedAdmin.phone || "",
        company: parsedAdmin.company || localStorage.getItem("recruit_crm_admin_company_name") || "Your Company",
        designation: parsedAdmin.designation || "System Administrator",
        showEmailOnApplyForm: parsedAdmin.showEmailOnApplyForm,
        showPhoneOnApplyForm: parsedAdmin.showPhoneOnApplyForm,
        companyLogo: adminCompanyLogo,
        status: "active"
      }
    ];

    return (
      <>
        <CandidateApplyView 
          jobs={jobs}
          teamRecruiters={portalRecruiters}
          onApply={handleAddCandidate}
          companyName={companyName}
          companyLogo={companyLogo}
        />
        
      {/* Welcome Modal for First-time Logins */}
      {showWelcomeModal && loggedInRecruiter && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="font-extrabold text-slate-900 text-lg">Welcome to Recruit CRM</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                You are logged in as <strong className="text-indigo-600">{loggedInRecruiter.name}</strong>.
              </p>
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
      {sandboxControls}
      </>
    );
  }

  if (!isConfigLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading Application Context...</p>
      </div>
    );
  }

  

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      <div className="flex flex-col md:flex-row min-h-screen">
        
        {/* Side navigation rails & Mobile Sticky Header */}
        {((!isAdminMode && !loggedInRecruiterId) || (isAdminMode && !adminLoggedIn)) ? (
          // If we are not logged in, we hide the sidebar and render the clean Welcome & Login Gate instead
          null
        ) : (
          <>
            {/* MOBILE STICKY TOP HEADER WITH 3-LINE HAMBURGER MENU */}
            <header className="md:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white px-3 py-2.5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                {(isAdminMode ? companyLogo : recruiter.companyLogo) ? (
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-0.5 shadow-xs overflow-hidden shrink-0">
                    <img src={isAdminMode ? companyLogo : recruiter.companyLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs shrink-0">
                    <Briefcase className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="truncate">
                  <span className="text-xs font-black tracking-tight text-white block leading-none uppercase truncate">
                    {isAdminMode ? companyName : recruiter.company}
                  </span>
                  <span className="text-[9px] font-bold text-indigo-400 block tracking-wider uppercase mt-0.5">
                    Recruit CRM
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors focus:outline-none border border-slate-700 active:scale-95 cursor-pointer"
                  title="Toggle Mobile Menu"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5 text-indigo-400" />}
                </button>
              </div>
            </header>

            {/* MOBILE DRAWER OVERLAY (Triggers when 3-line hamburger menu clicked) */}
            {isMobileMenuOpen && (
              <div className="md:hidden fixed inset-x-0 top-[52px] bottom-0 bg-slate-900/98 backdrop-blur-md text-slate-300 z-50 overflow-y-auto p-4 flex flex-col justify-between border-t border-slate-800 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-4">
                  <div className="px-1 py-1 border-b border-slate-800 pb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Navigation Menu</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 uppercase">
                      {isAdminMode ? "Founder Mode" : "Recruiter Portal"}
                    </span>
                  </div>

                  <nav className="space-y-1">
                    <button
                      onClick={() => handleNavigatePath(isAdminMode ? "/admin/dashboard" : "/recruiter/dashboard")}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                        currentView === "dashboard" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 text-indigo-300" /> Dashboard
                    </button>

                    <button
                      onClick={() => handleNavigatePath(isAdminMode ? "/admin/openings" : "/recruiter/openings")}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                        currentView === "jobs" || currentView === "ats-workspace" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <Briefcase className="w-4 h-4 text-indigo-300" /> Openings & ATS
                    </button>

                    {!isAdminMode && (
                      <button
                        onClick={() => handleNavigatePath("/recruiter/talentpool")}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-3 transition-colors ${
                          currentView === "talentpool" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-indigo-300" /> Talent Pool
                        </div>
                        <span className="bg-indigo-500/30 text-indigo-100 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-400/30">
                          {visibleCandidates.length}
                        </span>
                      </button>
                    )}

                    {(isAdminMode || globalPoolEnabled || teamRecruiters.find(tr => tr.id === loggedInRecruiterId)?.accessScope === "global") && (
                      <button
                        onClick={() => handleNavigatePath(isAdminMode ? "/admin/centralpool" : "/recruiter/centralpool")}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-3 transition-colors ${
                          currentView === "central-pool" ? "bg-emerald-600 text-white shadow" : "hover:bg-slate-800 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-emerald-400" /> Central Pool
                        </div>
                        <span className="bg-emerald-500/30 text-emerald-100 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-400/30">
                          {enrichedCandidates.length}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => handleNavigatePath(isAdminMode ? "/admin/sharekit" : "/recruiter/sharekit")}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                        currentView === "sharekit" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <Share2 className="w-4 h-4 text-indigo-300" /> ShareKit
                    </button>

                    <button
                      onClick={() => {
                        setCurrentView("public-home");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                        currentView === "public-home" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <Globe className="w-4 h-4 text-sky-400" /> Public Portal & Feeds
                    </button>

                    {isAdminMode && (
                      <button
                        onClick={() => handleNavigatePath("/admin/founder-console")}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                          currentView === "founder-console" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-300"
                        }`}
                      >
                        <Shield className="w-4 h-4 text-rose-400" /> Founder Console
                      </button>
                    )}

                    <button
                      onClick={() => handleNavigatePath(isAdminMode ? "/admin/configuration" : "/recruiter/configuration")}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                        currentView === "settings" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <Settings className="w-4 h-4 text-indigo-300" /> Configuration
                    </button>
                  </nav>
                </div>

                <div className="border-t border-slate-800 pt-4 mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-2 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                        {recruiter.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-none">{recruiter.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{recruiter.designation}</p>
                      </div>
                    </div>

                    {isAdminMode ? (
                      <button
                        onClick={async () => {
                          setIsMobileMenuOpen(false);
                          localStorage.removeItem("recruit_crm_admin_logged_in_v2");
                          setAdminLoggedIn(false);
                          try {
                            const { logout } = await import("./lib/firebase");
                            await logout();
                          } catch (e) {}
                          handleNavigatePath("/admin");
                        }}
                        className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          setIsMobileMenuOpen(false);
                          localStorage.removeItem("recruit_crm_logged_in_recruiter_id_v2");
                          setLoggedInRecruiterId(null);
                          try {
                            const { logout } = await import("./lib/firebase");
                            await logout();
                          } catch (e) {}
                          handleNavigatePath("/recruiter");
                        }}
                        className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* DESKTOP SIDEBAR (Hidden on mobile) */}
            <aside className="hidden md:flex md:w-64 bg-slate-900 text-slate-300 flex-col justify-between py-6 px-4 md:sticky md:top-0 md:h-screen shrink-0 border-r border-slate-800 shadow-xl z-20">
              <div>
                {/* Brand Logo Header */}
                <div className="flex items-center gap-3 px-3 mb-8">
                  {(isAdminMode ? companyLogo : recruiter.companyLogo) ? (
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-0.5 shadow-md overflow-hidden shrink-0">
                      <img src={isAdminMode ? companyLogo : recruiter.companyLogo} alt="Corporate Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-black tracking-tight text-white block leading-none uppercase">
                      {isAdminMode ? companyName : recruiter.company}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-400 block tracking-wider uppercase">
                      Recruit CRM
                    </span>
                  </div>
                </div>

                {/* Rails links */}
                <nav className="space-y-1">
                  <button
                    onClick={() => {
                      handleNavigatePath(isAdminMode ? "/admin/dashboard" : "/recruiter/dashboard");
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                      currentView === "dashboard" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </button>

                  <button
                    onClick={() => {
                      handleNavigatePath(isAdminMode ? "/admin/openings" : "/recruiter/openings");
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                      currentView === "jobs" || currentView === "ats-workspace" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Briefcase className="w-4 h-4" /> Openings & ATS
                  </button>

                  {/* Talent Pool button (Hidden for Admin, as Admin only uses Central Pool) */}
                  {!isAdminMode && (
                    <button
                      onClick={() => {
                        handleNavigatePath("/recruiter/talentpool");
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-3 transition-colors ${
                        currentView === "talentpool" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4" /> Talent Pool
                      </div>
                      <span className="bg-indigo-500/30 text-indigo-100 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-400/30">
                        {visibleCandidates.length}
                      </span>
                    </button>
                  )}

                  {/* Central Pool button: Shows for Admin always, and for Recruiter if master switch ON or they have global access */}
                  {(isAdminMode || globalPoolEnabled || teamRecruiters.find(tr => tr.id === loggedInRecruiterId)?.accessScope === "global") && (
                    <button
                      onClick={() => {
                        handleNavigatePath(isAdminMode ? "/admin/centralpool" : "/recruiter/centralpool");
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-3 transition-colors ${
                        currentView === "central-pool" ? "bg-emerald-600 text-white shadow" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4" /> Central Pool
                      </div>
                      <span className="bg-emerald-500/30 text-emerald-100 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-400/30">
                        {enrichedCandidates.length}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleNavigatePath(isAdminMode ? "/admin/sharekit" : "/recruiter/sharekit");
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                      currentView === "sharekit" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Share2 className="w-4 h-4" /> ShareKit
                  </button>

                  {isAdminMode && (
                    <button
                      onClick={() => {
                        handleNavigatePath("/admin/founder-console");
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                        currentView === "founder-console" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Shield className="w-4 h-4" /> Founder Console
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleNavigatePath(isAdminMode ? "/admin/configuration" : "/recruiter/configuration");
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${
                      currentView === "settings" ? "bg-indigo-600 text-white shadow" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Settings className="w-4 h-4" /> Configuration
                  </button>
                </nav>
              </div>

              {/* Recruiter Footnotes profile info */}
              <div className="border-t border-slate-800 pt-4 mt-6">
                <div className="flex items-center justify-between gap-2 px-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                      {recruiter.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-none">{recruiter.name}</p>
                      <p className="text-[10px] text-slate-500">{recruiter.designation}</p>
                    </div>
                  </div>

                  {isAdminMode ? (
                    <button
                      onClick={async () => {
                        localStorage.removeItem("recruit_crm_admin_logged_in_v2");
                        setAdminLoggedIn(false);
                        try {
                          const { logout } = await import("./lib/firebase");
                          await logout();
                        } catch (e) {}
                        handleNavigatePath("/admin");
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800/80 rounded-xl transition-all"
                      title="Sign Out of Admin Workspace"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        localStorage.removeItem("recruit_crm_logged_in_recruiter_id_v2");
                        setLoggedInRecruiterId(null);
                        try {
                          const { logout } = await import("./lib/firebase");
                          await logout();
                        } catch (e) {}
                        handleNavigatePath("/recruiter");
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800/80 rounded-xl transition-all"
                      title="Sign Out of Recruiter Workspace"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="px-3 py-2 bg-slate-800/50 rounded-xl text-center border border-slate-800">
                  {isAdminMode ? (
                    <span className="text-[10px] font-extrabold tracking-wider text-rose-400 uppercase flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> Founder Admin Control
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold tracking-wider text-emerald-400 uppercase flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Recruiter Portal
                    </span>
                  )}
                </div>
              </div>
            </aside>
          </>
        )}

        {/* Main Display screen context */}
        {((!isAdminMode && !loggedInRecruiterId) || (isAdminMode && !adminLoggedIn)) ? (
          isAdminMode ? (
            // ================= FOUNDER ADMIN LOGIN GATE =================
            <main className="flex-1 min-h-screen p-6 md:p-12 max-w-lg mx-auto w-full flex flex-col justify-center space-y-8">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-rose-500 flex items-center justify-center shadow-lg mx-auto mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{companyName}</h1>
                <p className="text-sm font-bold text-rose-600 uppercase tracking-widest">🛡️ Founder Admin Console</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Enterprise-grade authentication required to access the central team directories, recruiter rosters, and global database overrides.
                </p>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                      <Lock className="w-4.5 h-4.5 text-rose-500" /> Secure Admin Authentication
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Enter authorized Founder credentials to unlock master controls
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setAdminError("");
                      const targetMail = (e.currentTarget.elements.namedItem("adminEmail") as HTMLInputElement).value.trim().toLowerCase();
                      const targetPassword = (e.currentTarget.elements.namedItem("adminPassword") as HTMLInputElement).value.trim();
                      
                      if (targetMail === "admin@spredone.in" && targetPassword === "siddik786boat") {
                        localStorage.setItem("recruit_crm_admin_logged_in_v2", "true");
                        setAdminLoggedIn(true);
                      } else {
                        setAdminError("Invalid admin credentials. Access Denied.");
                      }
                    }}
                    className="space-y-3"
                  >
                    {adminError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] px-3 py-2.5 rounded-xl text-center font-medium leading-relaxed">
                        {adminError}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Admin Email ID</label>
                      <input
                        name="adminEmail"
                        type="email"
                        placeholder="admin@spredone.in"
                        required
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Access Passkey</label>
                      <div className="relative">
                        <input
                          name="adminPassword"
                          type={showAdminPassword ? "text" : "password"}
                          placeholder={showAdminPassword ? "Enter password" : "••••••••"}
                          required
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 pr-10 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                        <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-300">
                          {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none flex items-center justify-center gap-1.5"
                    >
                      Authenticate <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-[10px] font-bold uppercase tracking-wider">Or</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { loginWithGoogle } = await import("./lib/firebase");
                        const user = await loginWithGoogle();
                        if (user && user.email) {
                          if (user.email.toLowerCase() === "admin@spredone.in" || user.email.toLowerCase() === "psiddik3@gmail.com") {
                            localStorage.setItem("recruit_crm_admin_logged_in_v2", "true");
                            setAdminLoggedIn(true);
                          } else {
                            setAdminError("Access Denied. Your Google account is not an authorized Founder/Admin.");
                            // Sign out the unauthorized user
                            const { logout } = await import("./lib/firebase");
                            await logout();
                          }
                        }
                      } catch (e) {
                        console.error(e);
                        setAdminError("Failed to login with Google: " + (e instanceof Error ? e.message : String(e)));
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none cursor-pointer flex items-center justify-center gap-2"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                    Continue with Google
                  </button>
                </div>
              </div>
            </main>
          ) : (
            // ================= RECRUITER PORTAL WELCOME / REGISTRY GATE =================
            <main className="flex-1 min-h-screen p-6 md:p-12 max-w-4xl mx-auto w-full flex flex-col justify-center space-y-8">
              <div className="text-center space-y-2 flex flex-col items-center">
                {adminCompanyLogo ? (
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-1 shadow-md overflow-hidden mb-4 border border-slate-100">
                    <img src={adminCompanyLogo} alt="Corporate Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg mb-4">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                )}
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{adminCompanyName}</h1>
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{adminCompanyName} Recruiter Portal</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Connect your talent pipeline directly to our centralized pools and AI screening systems.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                {/* Sign In panel */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    {googleRegistrationPendingUser ? (
                      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-4 animate-in fade-in zoom-in duration-300">
                        <h3 className="text-sm font-extrabold text-indigo-900 mb-1 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Welcome to Recruiter Portal
                        </h3>
                        <p className="text-xs text-indigo-700/80 mb-4">
                          Welcome, {googleRegistrationPendingUser.name}. Please provide your company name, designation, and contact number to submit your access request.
                        </p>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const phone = (form.elements.namedItem("regPhone") as HTMLInputElement).value.trim();
                            const designation = (form.elements.namedItem("regRole") as HTMLInputElement).value.trim();
                            const company = (form.elements.namedItem("regCompany") as HTMLInputElement).value.trim();
                            
                            const newRequest = {
                              id: `req-${Date.now()}`,
                              name: googleRegistrationPendingUser.name,
                              email: googleRegistrationPendingUser.email,
                              company,
                              designation,
                              phone,
                              date: new Date().toISOString().split("T")[0]
                            };
                            syncPendingRegistrations([...pendingRegistrations, newRequest]);
                            import('./lib/firebase').then(({ saveAccessRequest }) => saveAccessRequest(newRequest));
                            setGoogleRegistrationPendingUser(null);
                            setLoginSuccess("Access request submitted successfully! We will contact you shortly to complete the onboarding process.");
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Company Name</label>
                            <input
                              name="regCompany"
                              type="text"
                              placeholder="e.g. Your Company"
                              required
                              autoCapitalize="words" className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 capitalize"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Phone Number</label>
                            <input autoCapitalize="words"
                              name="regPhone"
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              required
                              className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 capitalize"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Designation</label>
                            <input
                              name="regRole"
                              type="text"
                              placeholder="e.g. Talent Sourcer"
                              required
                              autoCapitalize="words" className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 capitalize"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setGoogleRegistrationPendingUser(null)}
                              className="flex-1 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl py-2 transition-colors focus:outline-none"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl py-2 transition-colors focus:outline-none"
                            >
                              Submit Request
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <Unlock className="w-4.5 h-4.5 text-indigo-600" /> Sign In with Registered Email
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Enter your authorized corporate email ID to access your workspace CRM
                      </p>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setLoginError("");
                        setLoginSuccess("");
                        const targetMail = (e.currentTarget.elements.namedItem("loginEmail") as HTMLInputElement).value.trim().toLowerCase();
                        const targetPassword = (e.currentTarget.elements.namedItem("loginPassword") as HTMLInputElement).value.trim();

                        const found = teamRecruiters.find(r => r.email.trim().toLowerCase() === targetMail);

                        try {
                          const { loginWithEmail } = await import("./lib/firebase");
                          const user = await loginWithEmail(targetMail, targetPassword);
                          if (user && user.email) {
                            if (found) {
                              if (found.status === "active") {
                                localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", found.id);
                                setLoggedInRecruiterId(found.id);
                              } else {
                                setLoginError(`Access Denied: Your recruiter account status is currently "${found.status}". Please contact the admin.`);
                              }
                            } else {
                                const isPending = pendingRegistrations.find(r => r.email.trim().toLowerCase() === user.email?.toLowerCase());
                                if (isPending) {
                                  setLoginError("Access Denied: Your account request is still pending approval. Please wait for the administrator to activate your account.");
                                } else {
                                  setLoginError("Your account is registered but you don't have access. Please request access from the admin.");
                                }
                            }
                          }
                        } catch (err: any) {
                          // Allow local dummy/team recruiters to log in with their SPECIFIC password only
                          if (found) {
                            if (found.password && targetPassword === found.password) {
                              if (found.status === "active") {
                                localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", found.id);
                                setLoggedInRecruiterId(found.id);
                                return;
                              } else {
                                setLoginError(`Access Denied: Your recruiter account status is currently "${found.status}". Please contact the admin.`);
                                return;
                              }
                            } else {
                              setLoginError("Incorrect Password. Please try again.");
                              return;
                            }
                          }

                          const errorCode = err?.code || "";
                          if (errorCode === "auth/invalid-credential" || errorCode === "auth/wrong-password") {
                             if (pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail)) {
                                setLoginError("Incorrect Password. Please try again.");
                             } else {
                                setLoginError("You are not registered. Email not found. Please correct. Please create a new account.");
                             }
                          } else if (errorCode === "auth/user-not-found" || !pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail)) {
                             setLoginError("You are not registered. Email not found. Please correct. Please create a new account.");
                          } else {
                             setLoginError("Login failed: " + (err?.message || "Invalid credentials"));
                          }
                        }
                      }}
                      className="space-y-3"
                    >
                      {loginError && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] px-3 py-2.5 rounded-xl text-center font-medium leading-relaxed">
                          {loginError}
                        </div>
                      )}
                      {loginSuccess && (
                        <div className="bg-green-50 border border-green-100 text-green-600 text-[11px] px-3 py-2.5 rounded-xl text-center font-medium leading-relaxed">
                          {loginSuccess}
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Corporate Email</label>
                        <input
                          name="loginEmail"
                          type="email"
                          placeholder="yourname@company.com"
                          required
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Portal Password</label>
                          <button type="button" onClick={() => {
                            const emailInput = document.querySelector('input[name="loginEmail"]') as HTMLInputElement | null;
                            const email = emailInput ? emailInput.value.trim() : "";
                            if (!email) {
                              setLoginError("Please enter your email address first to reset your password.");
                            } else {
                              import("./lib/firebase").then(({ resetPassword }) => {
                                if (resetPassword) {
                                  resetPassword(email).then(() => { setLoginError(""); setLoginSuccess("Password reset email sent! Please check your inbox."); }).catch(e => setLoginError("Error resetting password: " + e.message));
                                } else {
                                  setLoginError("Password reset feature requires Firebase authentication.");
                                }
                              }).catch(() => setLoginError("Please contact the administrator to reset your password."));
                            }
                          }} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Forgot Password?</button>
                        </div>
                        <div className="relative">
                        <input
                          name="loginPassword"
                          type={showRecruiterPassword ? "text" : "password"}
                          placeholder={showRecruiterPassword ? "Enter password" : "••••••••"}
                          required
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 pr-10 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                        <button type="button" onClick={() => setShowRecruiterPassword(!showRecruiterPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                          {showRecruiterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none cursor-pointer"
                      >
                        Enter Portal Workspace
                      </button>
                    </form>
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Or</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { loginWithGoogle } = await import("./lib/firebase");
                          const user = await loginWithGoogle();
                          if (user && user.email) {
                            const found = teamRecruiters.find(r => r.email.trim().toLowerCase() === user.email?.toLowerCase());
                            if (found) {
                                if (found.status === "active") {
                                  localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", found.id);
                                  setLoggedInRecruiterId(found.id);
                                } else {
                                  setLoginError(`Access Denied: Your recruiter account status is currently "${found.status}". Please contact the admin.`);
                                }
                            } else {
                                const isPending = pendingRegistrations.find(r => r.email.trim().toLowerCase() === user.email?.toLowerCase());
                                if (isPending) {
                                  setLoginError("Access Denied: Your account request is still pending approval. Please wait for the administrator to activate your account.");
                                } else {
                                  setGoogleRegistrationPendingUser({
                                    name: user.displayName || user.email.split("@")[0],
                                    email: user.email
                                  });
                                }
                            }
                          }
                        } catch (e) {
                          console.error(e);
                          setLoginError("Failed to login with Google: " + (e instanceof Error ? e.message : String(e)));
                        }
                      }}
                      className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none cursor-pointer flex items-center justify-center gap-2"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                      Continue with Google
                    </button>
                  </>
                  )}
                  </div>
                </div>

                {/* Registration Request panel */}
                <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-indigo-900 text-sm flex items-center gap-1.5">
                      <User className="w-4.5 h-4.5 text-indigo-600" /> Request Recruiter Access
                    </h3>
                    <p className="text-[10px] text-indigo-900/60 font-bold uppercase tracking-wider mt-0.5">
                      Don't have an account? Submit a registration message for review and approval
                    </p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setRegError("");
                      setRegSuccess("");
                      const form = e.currentTarget;
                      const name = (form.elements.namedItem("regName") as HTMLInputElement).value.trim();
                      const email = (form.elements.namedItem("regEmail") as HTMLInputElement).value.trim();
                      const phone = (form.elements.namedItem("regPhone") as HTMLInputElement)?.value.trim() || "";
                      const company = (form.elements.namedItem("regCompany") as HTMLInputElement)?.value.trim() || "";
                      const designation = (form.elements.namedItem("regRole") as HTMLInputElement).value.trim();
                      const message = "Requested via manual registration form";
                      const password = (form.elements.namedItem("regPassword") as HTMLInputElement)?.value.trim();

                      // Duplicate check
                      if (teamRecruiters.some(tr => tr.email.toLowerCase() === email.toLowerCase()) || pendingRegistrations.some(pr => pr.email.toLowerCase() === email.toLowerCase())) {
                        setRegError("This email is already registered or has a pending request.");
                        return;
                      }

                      if (!password) {
                        setRegError("Please enter a password.");
                        return;
                      }

                      try {
                        const { registerWithEmail } = await import("./lib/firebase");
                        await registerWithEmail(email, password);
                        
                        const newRequest = {
                          id: `req-${Date.now()}`,
                          name,
                          email,
                          phone,
                          company,
                          designation,
                          message,
                          date: new Date().toISOString().split("T")[0]
                        };

                        syncPendingRegistrations([...pendingRegistrations, newRequest]);
                        import('./lib/firebase').then(({ saveAccessRequest }) => { saveAccessRequest(newRequest); });
                        form.reset();
                        setRegSuccess(`Access request submitted successfully! Your profile has been queued for review.`);
                      } catch (err: any) {
                        console.error("Firebase registration failed", err);
                        
                        if (err.code === 'auth/email-already-in-use' || err.message.includes('email-already-in-use')) {
                          // Submit access request anyway if the email is already in the system
                          const newRequest = {
                            id: `req-${Date.now()}`,
                            name,
                            email,
                            phone,
                            company,
                            designation,
                            message,
                            date: new Date().toISOString().split("T")[0]
                          };
                          syncPendingRegistrations([...pendingRegistrations, newRequest]);
                          import('./lib/firebase').then(({ saveAccessRequest }) => saveAccessRequest(newRequest));
                          form.reset();
                          setRegSuccess(`Account exists! Your access request has been submitted. Once approved, you can log in with your existing password.`);
                        } else {
                          setRegError("Failed to register account with Firebase: " + err.message);
                        }
                      }
                    }}
                    className="space-y-2.5"
                  >
                    {regError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] px-3 py-2 rounded-xl text-center font-medium">
                        {regError}
                      </div>
                    )}
                    {regSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px] px-3 py-2 rounded-xl text-center font-medium">
                        {regSuccess}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Full Name</label>
                      <input
                        name="regName"
                        type="text"
                        placeholder="Ananya Iyer"
                        required
                        autoCapitalize="words" className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 capitalize"
                      />
                    </div>

                                        <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Corporate Email</label>
                        <input
                          name="regEmail"
                          type="email"
                          placeholder="ananya@company.com"
                          required
                          className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Phone Number</label>
                        <input
                          name="regPhone"
                          type="text"
                          placeholder="+1 234 567 8900"
                          autoCapitalize="words" className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 capitalize"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Company Name</label>
                        <input
                          name="regCompany"
                          type="text"
                          placeholder="Your Company"
                          required
                          autoCapitalize="words" className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 capitalize"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Your Role</label>
                        <input
                          name="regRole"
                          type="text"
                          placeholder="UX Sourcer"
                          required
                          autoCapitalize="words" className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 capitalize"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Password</label>
                        <div className="relative">
                        <input
                          name="regPassword"
                          type={showRegPassword ? "text" : "password"}
                          placeholder={showRegPassword ? "Enter password" : "••••••••"}
                          required
                          className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-1.5 pr-10 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                        <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-2 top-2 text-indigo-900/40 hover:text-indigo-900/60">
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      </div>
                    </div>

                    

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none flex items-center justify-center gap-1.5"
                    >
                      Submit Access Registration <Send className="w-3 h-3" />
                    </button>
                  </form>
                </div>
              </div>
            </main>
          )
        ) : (
          <main className="flex-1 p-1.5 sm:p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden space-y-2.5 sm:space-y-6">
            {/* ACTIVE SIMULATION BAR */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isAdminMode ? "bg-rose-50 border border-rose-100 text-rose-600" : "bg-emerald-50 border border-emerald-100 text-emerald-600"
                }`}>
                  {isAdminMode ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold text-slate-900 flex flex-wrap items-center gap-1.5 leading-tight">
                    <span className="truncate">{isAdminMode ? "Founder Admin Portal Session" : "Secure Recruiter Portal Session"}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 whitespace-nowrap ${
                      isAdminMode ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      {isAdminMode ? "Global Master Control" : "Isolated Recruiter Session"}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">
                    Logged In Operator: <span className="text-indigo-600 font-black">{recruiter.name} ({recruiter.designation})</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {/* Notifications Bell Button */}
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 border border-slate-200 transition-all focus:outline-none flex items-center gap-1.5 shadow-2xs relative cursor-pointer"
                  title="Job Response Notifications & Response Time"
                >
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                  <span className="text-[10px] sm:text-[11px] font-extrabold">Job Responses</span>
                  {(isAdminMode ? candidates : visibleCandidates).filter(c => !readNotificationIds.includes(c.id)).length > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border border-white animate-pulse">
                      {(isAdminMode ? candidates : visibleCandidates).filter(c => !readNotificationIds.includes(c.id)).length}
                    </span>
                  )}
                </button>

                {!isAdminMode && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("recruit_crm_logged_in_recruiter_id_v2");
                      setLoggedInRecruiterId(null);
                    }}
                    className="bg-white hover:bg-rose-50 text-rose-600 font-bold text-[10px] rounded-xl px-2.5 py-1.5 border border-rose-100 transition-colors focus:outline-none flex items-center gap-1"
                    title="Log Out of current session"
                  >
                    <LogOut className="w-3 h-3" /> Sign Out Portal
                  </button>
                )}
                {isAdminMode && (
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                    🟢 Systems Operational
                  </span>
                )}
              </div>
            </div>

            <>
              {currentView === "dashboard" && (
                <DashboardView 
                  jobs={isAdminMode ? jobs : jobs.filter(j => isJobOwnedByRecruiter(j, recruiter))}
                  candidates={visibleCandidates}
                  onNavigateToJobs={() => handleNavigatePath(isAdminMode ? "/admin/openings" : "/recruiter/openings")}
                  onNavigateToTalentPool={() => handleNavigatePath(isAdminMode ? "/admin/centralpool" : ((globalPoolEnabled || teamRecruiters.find(tr => tr.id === loggedInRecruiterId)?.accessScope === "global") ? "/recruiter/centralpool" : "/recruiter/talentpool"))}
                  onSelectWidgetFilter={handleWidgetFilter}
                  companyLogo={isAdminMode ? companyLogo : recruiter.companyLogo}
                  logoPosition={logoPosition}
                  hasCentralPoolAccess={!isAdminMode && (globalPoolEnabled || teamRecruiters.find(tr => tr.id === loggedInRecruiterId)?.accessScope === "global")}
                  isFounderMode={isAdminMode}
                  globalPoolEnabled={globalPoolEnabled}
                  onToggleGlobalPool={() => handleToggleGlobalPool(!globalPoolEnabled)}
                />
              )}

              {currentView === "jobs" && (
                <JobsView 
                  jobs={isAdminMode ? jobs : jobs.filter(j => isJobOwnedByRecruiter(j, recruiter))}
                  candidates={candidates}
                  isAdminMode={isAdminMode}
                  onAddJob={handleAddJob}
                  onUpdateJobs={syncJobs}
                  onDeleteJobs={handleDeleteJobs}
                  onSelectJob={(jobId) => {
                    const job = jobs.find(j => j.id === jobId);
                    const slug = job ? slugify(job.title) : "job";
                    setSelectedJobId(jobId);
                    handleNavigatePath(isAdminMode ? `/admin/openings/${slug}/${jobId}` : `/recruiter/openings/${slug}/${jobId}`);
                  }}
                  onOpenShareKit={(jobId) => {
                    setSelectedJobId(jobId);
                    handleNavigatePath(isAdminMode ? `/admin/sharekit?jobId=${jobId}` : `/recruiter/sharekit?jobId=${jobId}`);
                  }}
                  companyLogo={isAdminMode ? companyLogo : recruiter.companyLogo}
                  setCompanyLogo={handleUpdateCompanyLogo}
                  logoPosition={logoPosition}
                  setLogoPosition={handleUpdateLogoPosition}
                  recruiterCompany={isAdminMode ? companyName : recruiter.company}
                  recruiterName={recruiter.name}
                />
              )}

              {currentView === "ats-workspace" && selectedJobId !== null && (
                <ATSWorkspace 
                  job={jobs.find(j => j.id === selectedJobId) || jobs[0]}
                  candidates={visibleCandidates}
                  onBack={() => handleNavigatePath(isAdminMode ? "/admin/openings" : "/recruiter/openings")}
                  onUpdateCandidateStage={handleUpdateCandidateStage}
                  onToggleFavourite={handleToggleFavourite}
                  onAddNote={handleAddNote}
                  onSendBulkEmails={handleOpenBulkEmail}
                  onRemoveCandidate={handleRemoveCandidate}
                  onUpdateCandidate={handleUpdateCandidate}
                />
              )}

              {currentView === "sharekit" && (
                <ShareKitView 
                  jobs={isAdminMode ? jobs : jobs.filter(j => isJobOwnedByRecruiter(j, recruiter))}
                  selectedJobId={selectedJobId}
                  onSelectJob={setSelectedJobId}
                  recruiter={recruiter}
                  companyLogo={isAdminMode ? companyLogo : recruiter.companyLogo}
                />
              )}

              {(currentView === "talentpool" || currentView === "central-pool") && (
                <TalentPoolView 
                  candidates={currentView === "central-pool" ? enrichedCandidates : visibleCandidates}
                  jobs={isAdminMode ? jobs : jobs.filter(j => isJobOwnedByRecruiter(j, recruiter))}
                  onToggleFavourite={handleToggleFavourite}
                  onAssignToJob={handleAssignToJob}
                  onRemoveCandidate={handleRemoveCandidate}
                  onUpdateCandidateStage={handleUpdateCandidateStage}
                  onOpenBulkEmail={handleOpenBulkEmail}
                  isCentralPoolView={currentView === "central-pool"}
                />
              )}

              {currentView === "founder-console" && isAdminMode && (
                <div className="space-y-8">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        🛡️ Founder Console
                      </h1>
                      <p className="text-sm text-slate-500">
                        Manage recruiter access, approve new registrations, and toggle global talent database permissions.
                      </p>
                    </div>
                  </div>

                  {/* System Overview Widgets */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3.5 rounded-xl bg-indigo-50 text-indigo-600">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Recruiter Directory</span>
                        <span className="text-xl font-extrabold text-slate-900">{teamRecruiters.length} Registered</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600">
                        <AlertCircle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Access Requests</span>
                        <span className="text-xl font-extrabold text-slate-900">{pendingRegistrations.length} Pending Approval</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Central Pool Status</span>
                        <span className="text-xl font-extrabold text-emerald-700">{globalPoolEnabled ? "Open Search Enabled" : "Isolated Recruiter Views"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-navigation tabs inside Founder Console */}
                  <div className="flex border-b border-slate-200 gap-6 text-sm overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
                    <button
                      onClick={() => setFounderSubTab("directory")}
                      className={`pb-2 capitalize font-bold transition-all cursor-pointer shrink-0 ${founderSubTab === "directory" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      🛡️ Recruiter Directory & Credentials Control
                    </button>
                    <button
                      onClick={() => setFounderSubTab("portal")}
                      className={`pb-2 capitalize font-bold transition-all cursor-pointer shrink-0 ${founderSubTab === "portal" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      🌐 Public Job Portal (Real-time Firestore)
                    </button>
                    <button
                      onClick={() => setFounderSubTab("home-feed")}
                      className={`pb-2 capitalize font-bold transition-all cursor-pointer shrink-0 ${founderSubTab === "home-feed" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      📰 Home Feed Moderation
                    </button>
                    <button
                      onClick={() => setFounderSubTab("community-feed")}
                      className={`pb-2 capitalize font-bold transition-all cursor-pointer shrink-0 ${founderSubTab === "community-feed" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      💬 Community Feed Moderation
                    </button>
                    <button
                      onClick={() => setFounderSubTab("startup-feed")}
                      className={`pb-2 capitalize font-bold transition-all cursor-pointer shrink-0 ${founderSubTab === "startup-feed" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      🚀 Startup Feed (Spread One)
                    </button>
                    <button
                      onClick={() => setFounderSubTab("startup-communities")}
                      className={`pb-2 capitalize font-bold transition-all cursor-pointer shrink-0 ${founderSubTab === "startup-communities" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      🏢 Startup Communities
                    </button>
                  </div>

                  {founderSubTab === "directory" ? (
                    <>
                      {/* Settings Toggle Card */}
                      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Database Search Policies</span>
                          <h3 className="text-base font-extrabold">Company-Wide Central Pool Search</h3>
                          <p className="text-xs text-slate-400 max-w-xl">
                            When enabled, all active recruiters can search the complete candidate talent pool. When disabled, recruiters with "Isolated" access scope are strictly locked to seeing candidates who applied specifically to their job postings or were sourced by them.
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-3 bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-700">
                          <span className="text-xs font-bold text-slate-300">{globalPoolEnabled ? "🔓 Central Search Active" : "🔒 Isolated Search Enforced"}</span>
                          <button
                            onClick={() => handleToggleGlobalPool(!globalPoolEnabled)}
                            className={`w-12 h-6.5 rounded-full p-1 transition-colors focus:outline-none ${globalPoolEnabled ? "bg-indigo-600" : "bg-slate-600"}`}
                          >
                            <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transform transition-transform ${globalPoolEnabled ? "translate-x-5.5" : "translate-x-0"}`}></div>
                          </button>
                        </div>
                      </div>

                      {/* Pending Registrations Board */}
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 p-5 bg-slate-50/50 flex items-center justify-between">
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              <UserCheck className="w-4.5 h-4.5 text-indigo-600" /> Pending Recruiter Registration Approvals ({pendingRegistrations.length})
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Review and accept or decline incoming recruiter account access requests
                            </p>
                          </div>
                        </div>

                        {pendingRegistrations.length === 0 ? (
                          <div className="p-10 text-center space-y-2">
                            <span className="text-3xl block">🎉</span>
                            <h4 className="text-xs font-black text-slate-800 uppercase">Queue Clear</h4>
                            <p className="text-xs text-slate-400">There are no pending recruiter registration requests at this time.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {pendingRegistrations.map((req) => (
                              <div key={req.id} className="p-5 flex flex-col md:flex-row items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                                <div className="space-y-1.5 max-w-xl">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900 text-xs">{req.name}</span>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">{req.designation}</span>
                                    {req.company && <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">{req.company}</span>}
                                    <span className="text-[9px] text-slate-400 font-bold">{req.date}</span>
                                  </div>
                                  <p className="text-xs text-indigo-600 font-semibold">{req.email} {req.phone && `• ${req.phone}`}</p>
                                  {req.message && (
                                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic leading-relaxed">
                                      "{req.message}"
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 self-end md:self-center">
                                  <button
                                    onClick={() => handleOpenApprovalModal(req)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-3 py-1.5 transition-colors focus:outline-none shadow-sm flex items-center gap-1"
                                  >
                                    Approve & Grant Access
                                  </button>
                                  <button
                                    onClick={() => {
                                      setConfirmDialog({
                                        message: `Are you sure you want to decline ${req.name}'s request?`,
                                        onConfirm: () => {
                                          syncPendingRegistrations(pendingRegistrations.filter(r => r.id !== req.id));
                                          setGlobalMessage(`Request from ${req.name} has been declined.`);
                                        }
                                      });
                                    }}
                                    className="bg-white hover:bg-slate-100 text-slate-500 font-bold text-xs rounded-xl px-3 py-1.5 border border-slate-200 transition-colors focus:outline-none"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Team Directory Board */}
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 p-5 bg-slate-50/50 flex items-center justify-between">
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              <Users className="w-4.5 h-4.5 text-indigo-600" /> Active Recruiter Directory & Access Control ({teamRecruiters.length})
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Suspend accounts, toggle isolated database views, and distribute portal workspace credentials
                            </p>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {teamRecruiters.map((r) => {
                            return (
                              <div key={r.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-inner ${
                                    r.status === "active" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                                  }`}>
                                    {r.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-slate-900 text-xs">{r.name}</span>
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                        r.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                      }`}>{r.status}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-semibold">{r.designation} · <span className="text-indigo-600">{r.email}</span></p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Joined: {r.joinedDate || "Pre-installed"}</p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 self-end md:self-center">
                                  {/* Central Pool Button Toggle */}
                                  <button
                                    onClick={() => {
                                      const updated = teamRecruiters.map(tr => tr.id === r.id ? { ...tr, accessScope: tr.accessScope === "global" ? "local" : "global" as any } : tr);
                                      handleUpdateTeamRecruiters(updated);
                                    }}
                                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-all cursor-pointer ${
                                      r.accessScope === "global"
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                    }`}
                                  >
                                    <Globe className="w-3 h-3" />
                                    {r.accessScope === "global" ? "Central Pool: ON" : "Central Pool: OFF"}
                                  </button>

                                  {/* Status Control Switcher */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                                    <select
                                      value={r.status}
                                      onChange={(e) => {
                                        const updated = teamRecruiters.map(tr => tr.id === r.id ? { ...tr, status: e.target.value as any } : tr);
                                        handleUpdateTeamRecruiters(updated);
                                      }}
                                      className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold bg-white focus:outline-none"
                                    >
                                      <option value="active">Active</option>
                                      <option value="suspended">Suspended</option>
                                    </select>
                                  </div>

                                  {/* Log in as this recruiter */}
                                  <button
                                    onClick={() => {
                                      if (r.status === "active") {
                                        localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", r.id);
                                        setLoggedInRecruiterId(r.id);
                                        handleNavigatePath("/recruiter/dashboard");
                                        setCurrentView("dashboard");
                                        window.scrollTo(0, 0);
                                      } else {
                                        setGlobalMessage(`Suspended Account: ${r.name} cannot log in.`);
                                      }
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none flex items-center gap-1 cursor-pointer"
                                    title="Log in directly as this recruiter"
                                  >
                                    <User className="w-3 h-3" /> Log In
                                  </button>

                                  {/* View Logins & Audit */}
                                  <button
                                    onClick={() => setAuditedRecruiter(r)}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded-lg px-2.5 py-1.5 border border-indigo-100 transition-colors focus:outline-none flex items-center gap-1"
                                  >
                                    <Lock className="w-3 h-3 text-indigo-500" /> View Logins
                                  </button>

                                  {/* Copy Secure Link to Clipboard */}
                                  <button
                                    onClick={() => {
                                      const secureUrl = `${window.location.origin}/recruiter?recruiterId=${r.id}`;
                                      navigator.clipboard.writeText(secureUrl);
                                      setGlobalMessage('Secure Recruiter Portal URL copied to clipboard!');
                                    }}
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-[10px] rounded-lg px-2.5 py-1.5 border border-slate-200 transition-colors focus:outline-none flex items-center gap-1"
                                    title="Copy direct portal link for this recruiter"
                                  >
                                    <Share2 className="w-3 h-3 text-slate-500" /> Share
                                  </button>

                                  {/* Delete Recruiter */}
                                  <button
                                    onClick={() => {
                                      setConfirmDialog({
                                          message: `Are you sure you want to permanently remove recruiter ${r.name} from the team database? This will disable their access link.`,
                                          onConfirm: () => {
                                            handleUpdateTeamRecruiters(prev => prev.filter(tr => tr.id !== r.id));
                                            
                                            // Ensure their candidates remain in the central pool and are detached from the deleted recruiter
                                            const candidatesToUpdate = candidates.filter(c => c.recruiterId === r.id || c.sourcedBy === r.name);
                                            if (candidatesToUpdate.length > 0) {
                                               const updatedCandidates = candidates.map(c => {
                                                  if (c.recruiterId === r.id || c.sourcedBy === r.name) {
                                                      const updatedCand = { ...c, recruiterId: "central", sourcedBy: "Central Pool" };
                                                      import("./lib/firebase").then(({ applicantsDb }) => {
                                                          if (updatedCand.dbId) applicantsDb.update(updatedCand);
                                                      });
                                                      return updatedCand;
                                                  }
                                                  return c;
                                               });
                                               setCandidates(updatedCandidates);
                                            }

                                            setGlobalMessage(`${r.name} has been permanently deleted. Their candidates have been preserved in the central pool.`);
                                          }
                                        });
                                    }}
                                    className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-transparent font-bold text-[10px] rounded-lg px-2 py-1.5 transition-all"
                                    title="Delete Recruiter"
                                  >
                                    Delete Account
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : founderSubTab === "portal" ? (
                    <PortalJobsManager />
                  ) : founderSubTab === "home-feed" ? (
                    <HomeFeedManager />
                  ) : founderSubTab === "community-feed" ? (
                    <CommunityFeedManager />
                  ) : founderSubTab === "startup-feed" ? (
                    <StartupFeedManager />
                  ) : (
                    <StartupCommunityManager />
                  )}
                </div>
              )}

              {currentView === "settings" && (
                <SettingsView 
                  recruiter={recruiter}
                  templates={templates}
                  onUpdateRecruiter={handleUpdateRecruiterProfile}
                  onUpdateTemplates={syncTemplates}
                  companyLogo={companyLogo}
                  setCompanyLogo={handleUpdateCompanyLogo}
                  logoPosition={logoPosition}
                  setLogoPosition={handleUpdateLogoPosition}
                  teamRecruiters={teamRecruiters}
                  onUpdateTeamRecruiters={handleUpdateTeamRecruiters}
                  globalPoolEnabled={globalPoolEnabled}
                  onToggleGlobalPool={handleToggleGlobalPool}
                  isFounderMode={isAdminMode}
                  onLoginAsRecruiter={(id) => {
                    const r = teamRecruiters.find(tr => tr.id === id);
                    if (r && r.status === "active") {
                      localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", id);
                      setLoggedInRecruiterId(id);
                      handleNavigatePath("/recruiter/dashboard");
                      setCurrentView("dashboard");
                      window.scrollTo(0, 0);
                    } else if (r) {
                      setGlobalMessage(`Suspended Account: ${r.name} cannot log in.`);
                    }
                  }}
                  onViewAuditLog={(r) => setAuditedRecruiter(r)}
                  onRestoreDefaultData={handleRestoreDefaultData}
                  onExportBackupData={handleExportBackupData}
                  onImportBackupData={handleImportBackupData}
                />
              )}
            </>
          </main>
        )}
      </div>

      {/* FOUNDER SECURITY AUDIT GATE MODAL */}
      {auditedRecruiter && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-rose-500 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight text-white">Founder Security Audit Gate</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Investigate Recruiter Credentials & Integrity</p>
                </div>
              </div>
              <button 
                onClick={() => setAuditedRecruiter(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm">
                  {auditedRecruiter.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{auditedRecruiter.name}</h4>
                  <p className="text-xs text-slate-500 font-semibold">{auditedRecruiter.designation}</p>
                </div>
              </div>

              {/* Credentials Box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Authorized Logins Details</span>
                
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Login Email ID</label>
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>{auditedRecruiter.email}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(auditedRecruiter.email);
                        setGlobalMessage("Email copied to clipboard!");
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-black text-[10px] uppercase tracking-wider cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Account Passkey / Password</label>
                  <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span className="font-mono text-indigo-600 text-xs bg-indigo-50/50 px-1.5 py-0.5 rounded">
                      {teamRecruiters.find(tr => tr.id === auditedRecruiter.id)?.password || "••••••••"}
                    </span>
                    <button 
                      onClick={() => {
                        const pwd = teamRecruiters.find(tr => tr.id === auditedRecruiter.id)?.password || "";
                        if (!pwd) return;
                        navigator.clipboard.writeText(pwd);
                        setGlobalMessage("Password copied to clipboard!");
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-black text-[10px] uppercase tracking-wider cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Audit Status / Illegal Activity Tracker */}
              <div className="border border-amber-200 bg-amber-50/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Integrity Audit Status</span>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                  Audit logs show normal corporate activity. To check for any unauthorized or illegal activity, you can copy their credentials above and log in using their email and password from the login gate.
                </p>
                <div className="pt-1.5 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${auditedRecruiter.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-pulse"}`}></span>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${auditedRecruiter.status === "active" ? "text-emerald-700" : "text-rose-700"}`}>
                    {auditedRecruiter.status === "active" ? "Activity: Clean / Active" : "Status: Suspended / Stopped"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                {auditedRecruiter.status === "active" ? (
                  <button
                    onClick={() => {
                      const updated = teamRecruiters.map(tr => tr.id === auditedRecruiter.id ? { ...tr, status: "suspended" as const } : tr);
                      handleUpdateTeamRecruiters(updated);
                      setAuditedRecruiter({ ...auditedRecruiter, status: "suspended" });
                      setGlobalMessage(`${auditedRecruiter.name} has been suspended immediately. Their access has been stopped!`);
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none cursor-pointer shadow-sm"
                  >
                    Suspend Recruiter
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const updated = teamRecruiters.map(tr => tr.id === auditedRecruiter.id ? { ...tr, status: "active" as const } : tr);
                      handleUpdateTeamRecruiters(updated);
                      setAuditedRecruiter({ ...auditedRecruiter, status: "active" });
                      setGlobalMessage(`${auditedRecruiter.name}'s account has been re-activated successfully!`);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl py-2.5 transition-colors focus:outline-none cursor-pointer shadow-sm"
                  >
                    Restore Account
                  </button>
                )}
                <button
                  onClick={() => setAuditedRecruiter(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl px-4 py-2.5 transition-colors focus:outline-none cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SANDBOX WORKSPACE ROUTER SWITCHER (FOR PREVIEW NAVIGATION) */}
      {showSandboxHelpers && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900/95 text-slate-100 p-3.5 rounded-2xl border border-slate-800 shadow-xl max-w-xs space-y-2.5 backdrop-blur-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">🧪 Sandbox Tester Controls</span>
            <span className={`w-2 h-2 rounded-full ${isAdminMode ? "bg-rose-500" : "bg-emerald-500"} animate-pulse`}></span>
          </div>
          <div className="space-y-1.5 text-left">
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">
              Testing Mode: <span className="font-mono text-indigo-300">{isAdminMode ? "Admin Panel" : "Recruiter CRM"}</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  handleNavigatePath("/recruiter");
                  setCurrentView("dashboard");
                }}
                className={`text-[9px] font-black p-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  !isAdminMode ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                title="Go to Recruiter CRM portal screen"
              >
                🔓 Recruiter
              </button>
              <button
                onClick={() => {
                  handleNavigatePath("/admin");
                  setCurrentView("dashboard");
                }}
                className={`text-[9px] font-black p-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  isAdminMode ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                title="Go to Founder Admin master portal"
              >
                🛡️ Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Email Composer Modal overlay */}
      {bulkEmailIds !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" /> Compiled Bulk Outreach Email Draft ({bulkEmailIds.length} Recipient List)
              </h3>
              <button 
                onClick={() => {
                  setBulkEmailIds(null);
                  setSelectedTplId(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Template Selector dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Outreach Templates Match
              </label>
              <select
                value={selectedTplId || ""}
                onChange={(e) => handleSelectTemplate(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="" disabled>Select template drafts...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Subject Line</label>
                <input autoCapitalize="words"
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50/50 capitalize"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Content Message</label>
                <textarea autoCapitalize="sentences"
                  rows={8}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-slate-50/50 leading-relaxed capitalize"
                ></textarea>
                <span className="text-[9px] text-slate-400 leading-none">Note: Variables are auto-substituted using batch recipient credentials.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setBulkEmailIds(null);
                  setSelectedTplId(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl px-4 py-2 transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBulkEmailConfirm}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-5 py-2.5 transition-colors focus:outline-none flex items-center gap-1.5 shadow-sm"
              >
                Batch Dispatch Mail <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recruiter Approval & Welcome Email Modal overlay */}
      {approvalRequest !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" /> Compose Welcome Email & Grant Access
              </h3>
              <button 
                onClick={() => setApprovalRequest(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
                                <div><span className="font-bold text-slate-700">Name:</span> {approvalRequest.name}</div>
                <div><span className="font-bold text-slate-700">Email:</span> {approvalRequest.email}</div>
                {approvalRequest.phone && <div><span className="font-bold text-slate-700">Phone:</span> {approvalRequest.phone}</div>}
                {approvalRequest.company && <div><span className="font-bold text-slate-700">Company:</span> {approvalRequest.company}</div>}
                <div><span className="font-bold text-slate-700">Designation:</span> {approvalRequest.designation}</div>
                {approvalRequest.message && (
                  <div><span className="font-bold text-slate-700">Registration Note:</span> "{approvalRequest.message}"</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Subject Line</label>
                <input autoCapitalize="words"
                  type="text"
                  value={approvalSubject}
                  onChange={(e) => setApprovalSubject(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50/50 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600 capitalize"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email Content Message</label>
                <textarea autoCapitalize="sentences"
                  rows={8}
                  value={approvalBody}
                  onChange={(e) => setApprovalBody(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-slate-50/50 leading-relaxed text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 capitalize"
                ></textarea>
                <span className="text-[9px] text-slate-400 leading-none">The recruiter will be registered in the database upon sending the welcome email.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setApprovalRequest(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl px-4 py-2 transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-5 py-2.5 transition-colors focus:outline-none flex items-center gap-1.5 shadow-sm"
              >
                Send Welcome Mail & Activate Account <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        candidates={isAdminMode ? candidates : visibleCandidates}
        jobs={isAdminMode ? jobs : jobs.filter(j => isJobOwnedByRecruiter(j, recruiter))}
        readNotificationIds={readNotificationIds}
        onMarkRead={(candId) => {
          setReadNotificationIds(prev => {
            if (prev.includes(candId)) return prev;
            const updated = [...prev, candId];
            localStorage.setItem("recruit_crm_read_notifications_v1", JSON.stringify(updated));
            return updated;
          });
        }}
        onMarkAllRead={() => {
          const allIds = (isAdminMode ? candidates : visibleCandidates).map(c => c.id);
          setReadNotificationIds(allIds);
          localStorage.setItem("recruit_crm_read_notifications_v1", JSON.stringify(allIds));
        }}
        onSelectCandidate={(cand) => {
          if (cand.jobId) {
            const targetJob = jobs.find(j => j.id === cand.jobId);
            if (targetJob) {
              setSelectedJobId(targetJob.id);
              const slug = slugify(targetJob.title);
              handleNavigatePath(isAdminMode ? `/admin/openings/${slug}/${targetJob.id}` : `/recruiter/openings/${slug}/${targetJob.id}`);
            } else {
              handleNavigatePath(isAdminMode ? "/admin/centralpool" : "/recruiter/talentpool");
            }
          } else {
            handleNavigatePath(isAdminMode ? "/admin/centralpool" : "/recruiter/talentpool");
          }
        }}
      />

      {/* Global Message Toast */}
      {globalMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{globalMessage}</span>
        </div>
      )}

      {/* Global Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Are you sure?</h3>
              <p className="text-sm text-slate-500 font-medium">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-sm shadow-rose-600/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {sandboxControls}
    </div>
  );
}
