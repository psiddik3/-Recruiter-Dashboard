import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Eye, EyeOff, 
  LayoutDashboard, Briefcase, Share2, Users, Settings, LogOut, Globe,
  Mail, X, Send, Check, Sparkles, UserCheck, AlertCircle, Shield, Lock, Unlock, User, RefreshCw, CheckCircle2
, PartyPopper, ArrowRight, UserPlus, Grid, PieChart, Bell, Clock} from "lucide-react";
import { Job, Candidate, Recruiter, EmailTemplate, ViewType } from "./types";
import { INITIAL_JOBS, INITIAL_CANDIDATES, INITIAL_TEMPLATES } from "./data";
import { portalDb, applicantsDb } from "./lib/firebase";
import { configDb } from "./lib/configDb";
import { calculateAtsScore } from "./lib/atsScore";

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

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

export default function App() {
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  // Gateways: "recruiter"
  const [userRole, setUserRole] = useState<"recruiter">("recruiter");
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Core Sourced State Lists
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  // Job response notifications state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<number[]>(() => {
    const saved = localStorage.getItem("recruit_crm_read_notifications_v1");
    return saved ? JSON.parse(saved) : [];
  });
  
  // Custom template state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

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
    return (
      hostname.includes("localhost") ||
      hostname.includes("127.0.0.1") ||
      hostname.includes("run.app") ||
      hostname.includes("googleusercontent.com") ||
      hostname.includes("aistudio")
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

  const handleOpenApprovalModal = (req: any) => {
    setApprovalRequest(req);
    setApprovalSubject(`Welcome to ${recruiterCompanyName || "Nextwave"}! Access Granted to CRM Portal`);
    setApprovalBody(`Dear ${req.name},

We are thrilled to inform you that your request for recruiter access at ${recruiterCompanyName || "Nextwave"} has been reviewed and APPROVED!

You can now log in to the ATS & CRM Workspace with the following credentials:
- URL Portal: ${window.location.origin}/ats-workspace
- Login Email: ${req.email}
- Temporary Password: password123

Please make sure to update your profile settings upon logging in.

Best regards,
System Administrator
${adminCompanyName || "Nextwave Admin"} Network`);
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
      company: approvalRequest.company || adminCompanyName || "Spread One",
      designation: approvalRequest.designation,
      sourcedCount: 0,
      accessScope: "local" as const, // default isolated scope
      status: "active" as const,
      joinedDate: new Date().toISOString().split("T")[0],
      password: "password123"
    };
    
    const updatedRecruiters = [...teamRecruiters, newRec];
    handleUpdateTeamRecruiters(updatedRecruiters);

    const updatedPending = pendingRegistrations.filter(r => r.id !== approvalRequest.id);
    syncPendingRegistrations(updatedPending);

    alert(`Welcome email sent successfully to ${approvalRequest.email}!\n\n${approvalRequest.name} has been added to the recruiter list and their account is fully active.`);
    setApprovalRequest(null);
  };

  // Founder Console sub-view tab: "directory" (Recruiter Directory) or "portal" (Public Job Portal)
  const [founderSubTab, setFounderSubTab] = useState<"directory" | "portal">("directory");

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

      if (hash && hash === "#jobs") {
        setCurrentView("candidate-portal");
      } else if (path.startsWith("/home")) { 
        setCurrentView("dashboard"); 
      } else if (path.startsWith("/apply")) {
        setCurrentView("candidate-portal");
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
        if (path === "/" || path === "" || path === "/recruiter" || path === "/recruiter/") {

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
      savedCompany = localStorage.getItem("recruit_crm_admin_company_name") || "Spread One";
    } else {
      savedCompany = localStorage.getItem("recruit_crm_recruiter_company_name") || localStorage.getItem("recruit_crm_company_name") || "Nextwave";
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
      const savedAdminCompany = localStorage.getItem("recruit_crm_admin_company_name") || "Spread One";
      setRecruiter({
        id: "admin",
        name: "System Admin",
        email: "admin@company.com",
        phone: "+91 98765 43210",
        company: savedAdminCompany,
        designation: "System Administrator",
        darkMode: false,
        language: "English"
      });
      return;
    }
    const rId = activeRecruiterId || "1";
    const activeR = teamRecruiters.find(r => r.id === rId) || teamRecruiters[0];
    const savedRecruiterCompany = localStorage.getItem("recruit_crm_recruiter_company_name") || localStorage.getItem("recruit_crm_company_name") || "Nextwave";
    if (activeR) {
      setRecruiter({
        id: activeR.id,
        name: activeR.name,
        email: activeR.email,
        phone: (activeR as any).phone || "+91 98765 43210",
        company: (activeR as any).company || savedRecruiterCompany,
        companyLogo: (activeR as any).companyLogo,
        designation: activeR.designation,
        darkMode: false,
        language: "English",
        showEmailOnApplyForm: (activeR as any).showEmailOnApplyForm !== false,
        showPhoneOnApplyForm: (activeR as any).showPhoneOnApplyForm !== false
      });
    }
  }, [activeRecruiterId, teamRecruiters, isAdminMode]);

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
      alert(`Access Revoked: Your recruiter account (${loggedInRecruiter.name}) has been suspended by the administrator.`);
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
  const handleUpdateTeamRecruiters = (updated: any[]) => {
    setTeamRecruiters(updated);
    try { localStorage.setItem("recruit_crm_team_recruiters_v2", JSON.stringify(updated)); } catch(e) { console.error("LocalStorage quota exceeded", e); } configDb.save({ teamRecruiters: updated });
  };

  const handleToggleGlobalPool = (val: boolean) => {
    setGlobalPoolEnabled(val);
    localStorage.setItem("recruit_crm_global_pool_enabled", String(val));
  };

  // Check if a recruiter owns a job (supporting historical name changes & aliases like Siddharth/Siddhartha/Siddhi Khan)
  const isJobOwnedByRecruiter = useCallback((job: Job, rec: any): boolean => {
    if (!rec || !job) return false;
    
    // First, try matching by deterministic internal ID (if available)
    if (job.recruiterId && rec.id) {
      if (job.recruiterId === rec.id) return true;
      // Note: If IDs are present but don't match, we still fallback to name matching
      // to support backwards compatibility with jobs created before recruiterId was added.
    }
    
    // Fallback: match by name for backwards compatibility
    const cleanJobAuthor = (job.postedBy || "").trim().toLowerCase();
    const cleanRecName = (rec.name || "").trim().toLowerCase();
    return cleanJobAuthor === cleanRecName;
  }, []);

  // Check if a recruiter owns a candidate
  const isCandidateOwnedByRecruiter = useCallback((cand: Candidate, rec: any): boolean => {
    if (!rec || !cand) return false;
    
    if (cand.recruiterId && rec.id) {
      if (cand.recruiterId === rec.id) return true;
    }
    
    const cleanCandOwner = (cand.sourcedBy || "").trim().toLowerCase();
    const cleanRecName = (rec.name || "").trim().toLowerCase();
    return cleanCandOwner === cleanRecName;
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
    if (saved && saved !== "Apex Technologies" && saved !== "Spread One Recruit CRM") {
      return saved;
    }
    return "Spread One";
  });
  const [recruiterCompanyName, setRecruiterCompanyName] = useState<string>(() => {
    const saved = localStorage.getItem("recruit_crm_recruiter_company_name") || localStorage.getItem("recruit_crm_company_name");
    if (saved && saved !== "Apex Technologies" && saved !== "Next Wave Recruit CRM" && saved !== "Next Wave") {
      return saved;
    }
    return "Nextwave";
  });
  const companyName = useMemo(() => {
    return isAdminMode ? adminCompanyName : recruiterCompanyName;
  }, [isAdminMode, adminCompanyName, recruiterCompanyName]);

  const [logoPosition, setLogoPosition] = useState<"header" | "dashboard" | "cards">(() => {
    return (localStorage.getItem("recruit_crm_logo_position") as any) || "header";
  });

  const [auditedRecruiter, setAuditedRecruiter] = useState<any | null>(null);

  const handleUpdateRecruiterProfile = (updated: Recruiter) => {
    const oldName = recruiter.name;
    const newName = updated.name;

    setRecruiter(updated);
    if (updated.company) {
      if (isAdminMode) {
        setAdminCompanyName(updated.company);
        try { localStorage.setItem("recruit_crm_admin_company_name", updated.company); } catch (e) {}
        configDb.save({ adminCompanyName: updated.company });
      } else {
        setRecruiterCompanyName(updated.company);
        try {
          localStorage.setItem("recruit_crm_recruiter_company_name", updated.company);
          localStorage.setItem("recruit_crm_company_name", updated.company);
        } catch (e) {}
        configDb.save({ companyName: updated.company });
      }
    }
    
    // sync back to teamRecruiters
    const updatedTeam = teamRecruiters.map(r => {
      if (r.id === loggedInRecruiterId) {
        return {
          ...r,
          name: updated.name,
          email: updated.email,
          designation: updated.designation,
          password: updated.password,
          phone: updated.phone,
          showEmailOnApplyForm: updated.showEmailOnApplyForm,
          showPhoneOnApplyForm: updated.showPhoneOnApplyForm,
          company: updated.company,
          companyLogo: updated.companyLogo
        };
      }
      return r;
    });
    handleUpdateTeamRecruiters(updatedTeam);

    // If the name actually changed, cascade the name update to avoid orphaning records
    if (oldName && newName && oldName !== newName) {
      // 1. Cascade name to jobs posted by this recruiter
      const updatedJobs = jobs.map(j => {
        if (j.postedBy === oldName) {
          return { ...j, postedBy: newName };
        }
        return j;
      });
      syncJobs(updatedJobs);

      // 2. Cascade name to candidates sourced by this recruiter and notes authored by them
      const updatedCandidates = candidates.map(c => {
        let isChanged = false;
        let updatedCand = { ...c };

        if (c.sourcedBy === oldName) {
          updatedCand.sourcedBy = newName;
          isChanged = true;
        }

        if (c.notes && c.notes.length > 0) {
          const updatedNotes = c.notes.map(n => {
            if (n.author === oldName) {
              isChanged = true;
              return { ...n, author: newName };
            }
            return n;
          });
          if (isChanged) {
            updatedCand.notes = updatedNotes;
          }
        }

        return updatedCand;
      });
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

    if (savedJobs && !savedJobs.includes("Apex Technologies")) {
      try {
        const parsedJobs = JSON.parse(savedJobs);
        setJobs(parsedJobs);
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
        setCandidates(filtered);
        localStorage.setItem("recruit_crm_candidates_v2", JSON.stringify(filtered));
      } catch (err) {
        setCandidates(INITIAL_CANDIDATES);
        localStorage.setItem("recruit_crm_candidates_v2", JSON.stringify(INITIAL_CANDIDATES));
      }
    } else {
      setCandidates(INITIAL_CANDIDATES);
      localStorage.setItem("recruit_crm_candidates_v2", JSON.stringify(INITIAL_CANDIDATES));
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
          let numId = fj.id ? parseInt(fj.id.replace(/\D/g, "").slice(-8)) || (9000 + idx) : (9000 + idx);
          if (fj.applyLink && fj.applyLink.includes("jobId=")) {
            const match = fj.applyLink.match(/jobId=(\d+)/);
            if (match && match[1]) {
              numId = parseInt(match[1], 10);
            }
          }
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
            description: (fj.description && fj.description.trim().split(/\s+/).length > 1) 
              ? fj.description 
              : `We are looking for a highly skilled and passionate **${fj.title}** to join our team at **${fj.company}**. In this role, you will play a critical part in designing, building, and deploying robust user-facing applications. 
              
              **Key Responsibilities:**
              - Collaborate with cross-functional teams to define, design, and ship new features.
              - Write clean, maintainable, and highly efficient code following industry best practices.
              - Continuously discover, evaluate, and implement new technologies to maximize development efficiency.
              
              **Requirements:**
              - Proven professional experience working as a **${fj.title}** or similar role.
              - Deep familiarity with modern developer tools, workflows, and state-of-the-art frameworks.
              - Excellent problem-solving abilities and a strong collaborative team mindset.`,
            benefits: "Standard benefits",
            deadline: fj.lastDate || "",
            status: fj.status === "approved" ? "active" : fj.status === "rejected" ? "closed" : "pending",
            postedBy: fj.postedBy || primaryName,
            recruiterId: fj.recruiterId || undefined,
            createdAt: fj.createdAt || new Date().toISOString(),
            views: 120,
            applications: 0,
            conversion: "0.0%"
          };
        });

        setJobs((currentJobs) => {
          const merged = [...currentJobs];
          mappedJobs.forEach((mj) => {
            if (mj.status === "active" && !merged.some((cj) => (cj.title || "").toLowerCase() === (mj.title || "").toLowerCase() && (cj.company || "").toLowerCase() === (mj.company || "").toLowerCase())) {
              merged.push(mj);
            }
          });
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
      if (!existing && teamRecruiters && recruiterCompanyName) {
        configDb.save({ 
          teamRecruiters, 
          companyName: recruiterCompanyName, 
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
        // Respect locally saved configuration to prevent resetting the user's recruiter configurations on refresh or switch
        const localAdminCompany = localStorage.getItem("recruit_crm_admin_company_name");
        if (localAdminCompany && localAdminCompany !== "Apex Technologies" && localAdminCompany !== "Spread One Recruit CRM") {
          setAdminCompanyName(localAdminCompany);
        } else if (config.adminCompanyName) {
          setAdminCompanyName(config.adminCompanyName);
          localStorage.setItem("recruit_crm_admin_company_name", config.adminCompanyName);
        }

        const localRecruiterCompany = localStorage.getItem("recruit_crm_recruiter_company_name") || localStorage.getItem("recruit_crm_company_name");
        if (localRecruiterCompany && localRecruiterCompany !== "Apex Technologies" && localRecruiterCompany !== "Next Wave Recruit CRM" && localRecruiterCompany !== "Next Wave") {
          setRecruiterCompanyName(localRecruiterCompany);
        } else if (config.companyName) {
          setRecruiterCompanyName(config.companyName);
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
          // Keep local/pre-seeded candidates that aren't yet in Firestore
          const localOnly = currentCandidates.filter(cc => !cc.dbId && !firebaseCandidates.some(fc => fc.id === cc.id));
          const merged = [...localOnly, ...firebaseCandidates];
          
          // Sort by applied date descending
          merged.sort((a, b) => {
            const timeA = a.applied ? new Date(a.applied).getTime() : 0;
            const timeB = b.applied ? new Date(b.applied).getTime() : 0;
            return timeB - timeA;
          });
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

  const syncCandidates = (updatedCandidates: Candidate[]) => {
    setCandidates(updatedCandidates);
    localStorage.setItem("recruit_crm_candidates_v2", JSON.stringify(updatedCandidates));
    
    // Also update changed/added candidates to Firestore to ensure real-time multi-browser consistency!
    updatedCandidates.forEach(cand => {
      applicantsDb.update(cand).catch(err => {
        console.warn("Firestore candidate sync failed for ID:", cand.id, err);
      });
    });
  };

  const syncTemplates = (updatedTemplates: EmailTemplate[]) => {
    setTemplates(updatedTemplates);
    localStorage.setItem("recruit_crm_templates", JSON.stringify(updatedTemplates));
  };

  // State Action Mutators
  const handleAddJob = (newJob: Job) => {
    const jobWithAuthor = {
      ...newJob,
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
    const updated = candidates.map(c => {
      if (c.id === candId) {
        const currentStageLabel = newStage.toUpperCase();
        return {
          ...c,
          stage: newStage,
          timeline: [
            { event: `Moved to ${currentStageLabel} stage`, date: new Date().toISOString() },
            ...(c.timeline || [])
          ]
        };
      }
      return c;
    });
    syncCandidates(updated);
  };

  const handleToggleFavourite = (candId: number) => {
    const updated = candidates.map(c => 
      c.id === candId ? { ...c, favourite: !c.favourite } : c
    );
    syncCandidates(updated);
  };

  const handleAddNote = (candId: number, noteText: string) => {
    const newNote = {
      text: noteText,
      author: recruiter.name,
      date: new Date().toISOString()
    };
    const updated = candidates.map(c => 
      c.id === candId ? { ...c, notes: [newNote, ...(c.notes || [])] } : c
    );
    syncCandidates(updated);
  };

  const handleAssignToJob = (candId: number, targetJobId: number) => {
    const targetJob = jobs.find(j => j.id === targetJobId);
    const updated = candidates.map(c => {
      if (c.id === candId) {
        return {
          ...c,
          jobId: targetJobId,
          role: targetJob ? targetJob.title : c.role,
          stage: "screening" as Candidate["stage"],
          timeline: [
            { event: `Reassigned globally to ${targetJob?.title || "new position"} opening`, date: new Date().toISOString() },
            ...(c.timeline || [])
          ]
        };
      }
      return c;
    });
    syncCandidates(updated);
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
    syncCandidates(updated);
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
    
    alert(`Successfully sent compiled batch to ${bulkEmailIds.length} candidate email list!`);
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

  if (!isConfigLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading Application Context...</p>
      </div>
    );
  }



  if (currentView === "candidate-portal" || urlPath.startsWith("/apply")) {

    return (
      <>
        <CandidateApplyView 
          jobs={jobs}
          teamRecruiters={teamRecruiters}
          onApply={handleAddCandidate}
          companyName={companyName}
          companyLogo={companyLogo}
        />
        
      {/* Welcome Modal for First-time Logins */}
      {showWelcomeModal && loggedInRecruiter && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Sparkles className="w-24 h-24 text-white" />
               </div>
               <div className="absolute bottom-0 left-0 p-4 opacity-20 transform translate-y-1/2 -translate-x-1/4">
                  <Sparkles className="w-32 h-32 text-white" />
               </div>
               <div className="relative z-10">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
                    <PartyPopper className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">Welcome to Your Portal</h2>
                  <p className="text-indigo-100 text-sm font-medium">Hello, {loggedInRecruiter.name.split(' ')[0]}! Your recruiter workspace is ready.</p>
               </div>
            </div>
            
            <div className="p-8">
               <div className="space-y-6">
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                       <UserPlus className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                       <h4 className="text-sm font-bold text-slate-800 mb-1">Source & Manage Candidates</h4>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed">Add new applicants directly to the ATS, track their progress, and move them through pipeline stages.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                       <Grid className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                       <h4 className="text-sm font-bold text-slate-800 mb-1">Track Live Openings</h4>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed">Access real-time job openings approved by the founder, complete with job descriptions and requirements.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                       <PieChart className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                       <h4 className="text-sm font-bold text-slate-800 mb-1">Monitor Your Performance</h4>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed">Keep track of your active submissions, approvals, and total sourced candidates right from your dashboard.</p>
                    </div>
                 </div>
               </div>
               
               <button
                  onClick={() => {
                     localStorage.setItem(`recruit_crm_welcome_shown_${loggedInRecruiter.id}`, "true");
                     setShowWelcomeModal(false);
                  }}
                  className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl py-3.5 transition-all active:scale-[0.98] focus:outline-none flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
               >
                  Let's Get Started <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>
      )}

      {sandboxControls}
      </>
    );
  }

  

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      <div className="flex flex-col md:flex-row min-h-screen">
        
        {/* Side navigation rails */}
        {((!isAdminMode && !loggedInRecruiterId) || (isAdminMode && !adminLoggedIn)) ? (
          // If we are not logged in, we hide the sidebar and render the clean Welcome & Login Gate instead
          null
        ) : (
          <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between py-6 px-4 md:sticky md:top-0 md:h-screen shrink-0 border-r border-slate-800 shadow-xl z-20">
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
                      
                      if (targetMail === "admin@company.com") {
                        localStorage.setItem("recruit_crm_admin_logged_in_v2", "true");
                        setAdminLoggedIn(true);
                      } else {
                        setAdminError("Invalid Admin credentials. Only authorized Admin account (admin@company.com) is allowed.");
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
                        placeholder="admin@company.com"
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
                          if (user.email.toLowerCase() === "admin@company.com" || user.email.toLowerCase() === "psiddik3@gmail.com") {
                            localStorage.setItem("recruit_crm_admin_logged_in_v2", "true");
                            setAdminLoggedIn(true);
                          } else {
                            setAdminError("Access Denied: Your Google account is not authorized as an admin.");
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

                {/* Sandbox testing quick login for developers/admins */}
                {showSandboxHelpers && (
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Developer/Admin Quick-Passcard:</span>
                    <button
                      onClick={() => {
                        localStorage.setItem("recruit_crm_admin_logged_in_v2", "true");
                        setAdminLoggedIn(true);
                      }}
                      className="w-full text-left text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl p-3 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-bold text-white text-[11px]">System Admin</span>
                          <span className="block text-[9px] text-slate-400">admin@company.com &bull; Admin</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-black text-rose-400 bg-rose-400/10 px-2 py-1 rounded border border-rose-500/20 uppercase tracking-wider">
                        Tap to Log In
                      </span>
                    </button>
                  </div>
                )}
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
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Welcome to Spread one, recruiter portal.
                        </h3>
                        <p className="text-xs text-indigo-700/80 mb-4">
                          Welcome to Spread one, {googleRegistrationPendingUser.name}. Please provide your company name, designation, and contact number to submit your access request.
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
                              message: "Signed up via Google Authentication.",
                              date: new Date().toISOString().split("T")[0]
                            };
                            syncPendingRegistrations([...pendingRegistrations, newRequest]);
                            setGoogleRegistrationPendingUser(null);
                            alert("Access request submitted successfully!\n\nWe will contact you shortly to complete the onboarding process.");
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <label className="block text-[10px] font-black text-indigo-900/50 uppercase tracking-wider mb-0.5">Company Name</label>
                            <input
                              name="regCompany"
                              type="text"
                              placeholder="e.g. Spread One"
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
                          const errorCode = err?.code || "";
                          if (errorCode === "auth/invalid-credential" || errorCode === "auth/wrong-password") {
                             if (found || pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail)) {
                                setLoginError("Incorrect Password. Please try again.");
                             } else {
                                setLoginError("You are not registered. Email not found. Please correct. Please create a new account.");
                             }
                          } else if (errorCode === "auth/user-not-found" || (!found && !pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail))) {
                             setLoginError("You are not registered. Email not found. Please correct. Please create a new account.");
                          } else {
                            // Fallback to local hardcoded check for legacy sandbox users
                            if (found && (found.password === targetPassword || targetPassword === "password123")) {
                              if (found.status === "active") {
                                localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", found.id);
                                setLoggedInRecruiterId(found.id);
                              } else {
                                setLoginError(`Access Denied: Your recruiter account status is currently "${found.status}". Please contact the admin.`);
                              }
                            } else {
                              console.error("Firebase email login failed", err);
                              if (found || pendingRegistrations.find(r => r.email.trim().toLowerCase() === targetMail)) {
                                setLoginError("Incorrect Password. Please try again.");
                              } else {
                                setLoginError("You are not registered. Email not found. Please correct. Please create a new account.");
                              }
                            }
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
                                  alert(`Access Denied: Your recruiter account status is currently "${found.status}". Please contact the admin.`);
                                }
                            } else {
                                const isPending = pendingRegistrations.find(r => r.email.trim().toLowerCase() === user.email?.toLowerCase());
                                if (isPending) {
                                  alert("Access Denied: Your account request is still pending approval. Please wait for the administrator to activate your account.");
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
                          alert("Failed to login with Google: " + (e instanceof Error ? e.message : String(e)));
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
                  {/* Simulated Recruiters testing help */}
                  {showSandboxHelpers && (
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Sandbox Quick-Login (Select to Test):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {teamRecruiters.map(r => (
                          <button
                            key={r.id}
                            onClick={() => {
                              if (r.status === "active") {
                                localStorage.setItem("recruit_crm_logged_in_recruiter_id_v2", r.id);
                                setLoggedInRecruiterId(r.id);
                              } else {
                                alert(`Suspended Account: ${r.name} cannot log in.`);
                              }
                            }}
                            className={`text-[9px] font-black px-2 py-1 rounded-md border transition-all ${
                              r.status === "active" ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600" : "bg-rose-50 border-rose-100 text-rose-500 cursor-not-allowed"
                            }`}
                            title={r.status === "active" ? `Log in as ${r.name}` : `Account suspended`}
                          >
                            👤 {r.name.split(" ")[0]} ({r.designation.split(" ")[0]})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                        form.reset();
                        setRegSuccess(`Access request submitted successfully! Your profile has been queued for review.`);
                      } catch (err: any) {
                        console.error("Firebase registration failed", err);
                        setRegError("Failed to register account with Firebase: " + err.message);
                      }
                    }}
                    className="space-y-2.5"
                  >
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
                          placeholder="Spread One"
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
          <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden space-y-6">
            {/* ACTIVE SIMULATION BAR */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isAdminMode ? "bg-rose-50 border border-rose-100 text-rose-600" : "bg-emerald-50 border border-emerald-100 text-emerald-600"
                }`}>
                  {isAdminMode ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 leading-none">
                    {isAdminMode ? "Founder Admin Portal Session" : "Secure Recruiter Portal Session"}
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isAdminMode ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      {isAdminMode ? "Global Master Control" : "Isolated Recruiter Session"}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    Logged In Operator: <span className="text-indigo-600 font-black">{recruiter.name} ({recruiter.designation})</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Notifications Bell Button */}
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl px-3 py-2 border border-slate-200 transition-all focus:outline-none flex items-center gap-2 shadow-2xs relative cursor-pointer"
                  title="Job Response Notifications & Response Time"
                >
                  <Bell className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline text-[11px] font-extrabold">Job Responses</span>
                  {(isAdminMode ? candidates : visibleCandidates).filter(c => !readNotificationIds.includes(c.id)).length > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border border-white animate-pulse">
                      {(isAdminMode ? candidates : visibleCandidates).filter(c => !readNotificationIds.includes(c.id)).length}
                    </span>
                  )}
                </button>

                {!isAdminMode && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("recruit_crm_logged_in_recruiter_id");
                      setLoggedInRecruiterId(null);
                    }}
                    className="bg-white hover:bg-rose-50 text-rose-600 font-bold text-[10px] rounded-lg px-2.5 py-1.5 border border-rose-100 transition-colors focus:outline-none flex items-center gap-1"
                    title="Log Out of current session"
                  >
                    <LogOut className="w-3 h-3" /> Sign Out Portal
                  </button>
                )}
                {isAdminMode && (
                  <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1">
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
                                      if (window.confirm(`Are you sure you want to decline ${req.name}'s request?`)) {
                                        syncPendingRegistrations(pendingRegistrations.filter(r => r.id !== req.id));
                                      }
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
                                        setCurrentView("dashboard");
                                      } else {
                                        alert(`Suspended Account: ${r.name} cannot log in.`);
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
                                      alert(`Personalized Secure Recruiter Portal URL copied to clipboard!\n\nUrl: ${secureUrl}`);
                                    }}
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-[10px] rounded-lg px-2.5 py-1.5 border border-slate-200 transition-colors focus:outline-none flex items-center gap-1"
                                    title="Copy direct portal link for this recruiter"
                                  >
                                    <Share2 className="w-3 h-3 text-slate-500" /> Share
                                  </button>

                                  {/* Delete Recruiter */}
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to permanently remove recruiter ${r.name} from the team database? This will disable their access link.`)) {
                                        const updated = teamRecruiters.filter(tr => tr.id !== r.id);
                                        handleUpdateTeamRecruiters(updated);
                                      }
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
                  ) : (
                    <PortalJobsManager />
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
                      setCurrentView("dashboard");
                      window.scrollTo(0,0);
                    } else if (r) {
                      alert(`Suspended Account: ${r.name} cannot log in.`);
                    }
                  }}
                  onViewAuditLog={(r) => setAuditedRecruiter(r)}
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
                        alert("Email copied to clipboard!");
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
                      {teamRecruiters.find(tr => tr.id === auditedRecruiter.id)?.password || "password123"}
                    </span>
                    <button 
                      onClick={() => {
                        const pwd = teamRecruiters.find(tr => tr.id === auditedRecruiter.id)?.password || "password123";
                        navigator.clipboard.writeText(pwd);
                        alert("Password copied to clipboard!");
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
                      alert(`${auditedRecruiter.name} has been suspended immediately. Their access has been stopped!`);
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
                      alert(`${auditedRecruiter.name}'s account has been re-activated successfully!`);
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

      {sandboxControls}
    </div>
  );
}
