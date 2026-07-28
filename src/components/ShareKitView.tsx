import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Download, Copy, RefreshCw, Loader2, Image as ImageIcon, 
  Linkedin, Instagram, HelpCircle, FileText, Check, Settings, Mail, Phone
} from "lucide-react";
import { Job, Recruiter } from "../types";

interface ShareKitViewProps {
  jobs: Job[];
  selectedJobId: number | null;
  onSelectJob: (id: number) => void;
  recruiter?: Recruiter;
  companyLogo?: string;
}

type SizeType = "instagram" | "linkedin";

interface PostTheme {
  name: string;
  gradientStart: string;
  gradientEnd: string;
  textColor: string;
  accentColor: string;
  logoBg: string;
}

const THEMES: PostTheme[] = [
  {
    name: "Indigo Horizon",
    gradientStart: "#3b82f6",
    gradientEnd: "#1d4ed8",
    textColor: "#ffffff",
    accentColor: "#fcd34d",
    logoBg: "rgba(255, 255, 255, 0.2)",
  },
  {
    name: "Sunset Coral",
    gradientStart: "#f97316",
    gradientEnd: "#be123c",
    textColor: "#ffffff",
    accentColor: "#fef08a",
    logoBg: "rgba(255, 255, 255, 0.2)",
  },
  {
    name: "Emerald Mint",
    gradientStart: "#10b981",
    gradientEnd: "#065f46",
    textColor: "#ffffff",
    accentColor: "#a7f3d0",
    logoBg: "rgba(255, 255, 255, 0.2)",
  },
  {
    name: "Deep Obsidian",
    gradientStart: "#1e293b",
    gradientEnd: "#0f172a",
    textColor: "#ffffff",
    accentColor: "#38bdf8",
    logoBg: "rgba(255, 255, 255, 0.12)",
  },
  {
    name: "Soft Cream (Light)",
    gradientStart: "#f8fafc",
    gradientEnd: "#e2e8f0",
    textColor: "#0f172a",
    accentColor: "#4f46e5",
    logoBg: "rgba(15, 23, 42, 0.08)",
  }
];

export default function ShareKitView({ jobs, selectedJobId, onSelectJob, recruiter, companyLogo }: ShareKitViewProps) {
  const [jobId, setJobId] = useState<number>(selectedJobId || (jobs[0]?.id || 0));
  const [size, setSize] = useState<SizeType>("instagram");
  const [activeThemeIdx, setActiveThemeIdx] = useState<number>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("modern_bold");
  const [activeTab, setActiveTab] = useState<"content" | "styles" | "layout">("content");
  const [logoScale, setLogoScale] = useState<number>(1.0);
  const [hiringScale, setHiringScale] = useState<number>(1.0);
  const [companyScale, setCompanyScale] = useState<number>(1.0);
  const [titleScale, setTitleScale] = useState<number>(1.0);
  const [badgesScale, setBadgesScale] = useState<number>(1.0);
  const [bulletsScale, setBulletsScale] = useState<number>(1.0);
  const [recruiterScale, setRecruiterScale] = useState<number>(1.0);

  interface BoundingBox {
    id: "logo" | "hiring" | "company" | "title" | "badges" | "bullets" | "footer";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  const boundingBoxesRef = useRef<BoundingBox[]>([]);

  // Helper to dynamically calculate currently active/effective color for each poster element.
  // This removes confusion about what default colors are currently rendered on screen.
  const getEffectiveColors = () => {
    const theme = THEMES[activeThemeIdx];
    
    const hiringColor = customHiringColor || (
      selectedTemplate === "minimalist_editorial" ? "#1e293b" :
      selectedTemplate === "retro_mono" ? "#10b981" :
      selectedTemplate === "neon_tech" ? "#f43f5e" :
      selectedTemplate === "gradient_wave" ? theme.accentColor :
      selectedTemplate === "executive_classic" ? "#fbbf24" :
      "#ffffff"
    );

    const companyColor = customCompanyColor || (
      selectedTemplate === "minimalist_editorial" ? "#475569" :
      selectedTemplate === "retro_mono" ? "#34d399" :
      selectedTemplate === "neon_tech" ? "#38bdf8" :
      selectedTemplate === "executive_classic" ? "#e2e8f0" :
      theme.textColor
    );

    const titleColor = customTitleColor || (
      selectedTemplate === "minimalist_editorial" ? "#0f172a" :
      selectedTemplate === "retro_mono" ? "#ffffff" :
      theme.textColor
    );

    const badgesColor = customBadgesColor || (
      selectedTemplate === "retro_mono" ? "#10b981" :
      selectedTemplate === "minimalist_editorial" ? "#1e293b" :
      theme.textColor
    );

    const badgesBg = customBadgesBg || (
      selectedTemplate === "retro_mono" ? "transparent" :
      selectedTemplate === "minimalist_editorial" ? "rgba(30, 41, 59, 0.08)" :
      "rgba(255, 255, 255, 0.16)"
    );

    const bulletsColor = customBulletsColor || (
      selectedTemplate === "minimalist_editorial" ? "#0f172a" :
      selectedTemplate === "retro_mono" ? "#10b981" :
      theme.textColor
    );

    const bulletsIconColor = customBulletsIconColor || (
      selectedTemplate === "retro_mono" ? "#10b981" :
      selectedTemplate === "minimalist_editorial" ? "#d97706" :
      theme.accentColor
    );

    const footerColor = customFooterColor || (
      selectedTemplate === "retro_mono" ? "#10b981" :
      selectedTemplate === "minimalist_editorial" ? "#1e293b" :
      selectedTemplate === "executive_classic" ? "#fbbf24" :
      theme.accentColor || "#ffffff"
    );

    return {
      hiringColor,
      companyColor,
      titleColor,
      badgesColor,
      badgesBg,
      bulletsColor,
      bulletsIconColor,
      footerColor
    };
  };

  const renderColorPicker = (
    label: string,
    desc: string,
    value: string,
    effectiveValue: string,
    onChange: (val: string) => void
  ) => {
    // Solid fallback if value is empty or transparent/rgba (to render properly in HTML color picker dialog)
    let hexValueForInput = effectiveValue;
    if (!effectiveValue || effectiveValue.startsWith("rgba") || effectiveValue === "transparent") {
      hexValueForInput = "#ffffff";
    }

    return (
      <div className="flex items-center justify-between border border-slate-100 p-2.5 rounded-xl bg-slate-50/40 hover:bg-slate-50 transition-all">
        <div className="flex items-center gap-2.5">
          {/* Unified circular indicator & click trigger */}
          <div 
            className="relative w-8 h-8 rounded-full border border-slate-300 shadow-sm flex-shrink-0 cursor-pointer overflow-hidden transition-all hover:scale-110 active:scale-95"
            style={{ backgroundColor: effectiveValue }}
            title={`Click to pick color for ${label}`}
          >
            <input 
              type="color" 
              value={hexValueForInput} 
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
          <div className="text-left leading-tight">
            <span className="block font-bold text-slate-800 text-[10px] tracking-wider uppercase">{label}</span>
            <span className="text-[9px] text-slate-400 block">{desc}</span>
          </div>
        </div>
        
        {/* State indicator & Reset action */}
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-[9px] bg-white border border-slate-200 shadow-3xs px-1.5 py-0.5 rounded-md text-slate-500 font-bold uppercase tracking-tight">
            {value ? value : "Default"}
          </span>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[9px] text-indigo-600 hover:underline font-bold"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    );
  };
  
  // Customizable Form fields
  const [customTitle, setCustomTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [customSalary, setCustomSalary] = useState("");
  const [customBenefits, setCustomBenefits] = useState("");
  const [bullets, setBullets] = useState("React & TypeScript expertise\nFlexible hours & remote culture\nFull health benefits & bonus");

  // Custom texts for hiring, bullet headers, and footer
  const [customHiringText, setCustomHiringText] = useState("");
  const [customBulletsHeader, setCustomBulletsHeader] = useState("OPPORTUNITY HIGHLIGHTS:");
  const [customBulletsIcon, setCustomBulletsIcon] = useState("");
  const [customFooterText, setCustomFooterText] = useState("APPLY DIRECTLY WITH RECRUITER");

  // Custom colors
  const [customHiringColor, setCustomHiringColor] = useState("");
  const [customCompanyColor, setCustomCompanyColor] = useState("");
  const [customTitleColor, setCustomTitleColor] = useState("");
  const [customBadgesColor, setCustomBadgesColor] = useState("");
  const [customBadgesBg, setCustomBadgesBg] = useState("");
  const [customBulletsColor, setCustomBulletsColor] = useState("");
  const [customBulletsIconColor, setCustomBulletsIconColor] = useState("");
  const [customFooterColor, setCustomFooterColor] = useState("");
  const [customFooterBg, setCustomFooterBg] = useState("");
  
  // Custom contact details to show on the banner
  const [contactEmail, setContactEmail] = useState(recruiter?.email || "");
  const [contactPhone, setContactPhone] = useState(recruiter?.phone || "");

  // Logo selection
  const [logoPreset, setLogoPreset] = useState<string>("recruiter");
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);

  // Drag and drop custom positioning coordinates (normalized 0 to 1)
  const [logoXPercent, setLogoXPercent] = useState<number>(0.85);
  const [logoYPercent, setLogoYPercent] = useState<number>(0.15);
  const [hiringXPercent, setHiringXPercent] = useState<number>(0.08);
  const [hiringYPercent, setHiringYPercent] = useState<number>(0.15);
  const [companyXPercent, setCompanyXPercent] = useState<number>(0.08);
  const [companyYPercent, setCompanyYPercent] = useState<number>(0.26);
  const [titleXPercent, setTitleXPercent] = useState<number>(0.08);
  const [titleYPercent, setTitleYPercent] = useState<number>(0.38);
  const [badgesXPercent, setBadgesXPercent] = useState<number>(0.08);
  const [badgesYPercent, setBadgesYPercent] = useState<number>(0.50);
  const [bulletsXPercent, setBulletsXPercent] = useState<number>(0.08);
  const [bulletsYPercent, setBulletsYPercent] = useState<number>(0.64);
  const [footerXPercent, setFooterXPercent] = useState<number>(0.5);
  const [footerYPercent, setFooterYPercent] = useState<number>(0.93);

  const [dragging, setDragging] = useState<"logo" | "hiring" | "company" | "title" | "badges" | "bullets" | "footer" | null>(null);
  const [isHovered, setIsHovered] = useState<"logo" | "hiring" | "company" | "title" | "badges" | "bullets" | "footer" | null>(null);

  // Image preloading state to ensure synchronous canvas renders
  const [loadedLogo, setLoadedLogo] = useState<HTMLImageElement | null>(null);
  const [loadedLogoUrl, setLoadedLogoUrl] = useState<string>("");

  // Gemini caption generator states
  const [caption, setCaption] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [errorText, setErrorText] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedJob = jobs.find(j => j.id === jobId) || jobs[0];

  // Sync fields when selectedJob changes
  useEffect(() => {
    if (selectedJob) {
      setCustomTitle(selectedJob.title);
      setCustomCompany(recruiter?.company || selectedJob.company || "Nextwave");
      setCustomLocation(selectedJob.location);
      setCustomSalary(selectedJob.salary || "Competitive");
      setCustomBenefits(selectedJob.benefits || "Great Benefits");
    }
  }, [selectedJob, recruiter]);

  // Sync contact fields when recruiter changes
  useEffect(() => {
    if (recruiter) {
      setContactEmail(recruiter.email);
      setContactPhone(recruiter.phone);
    }
  }, [recruiter]);

  // Load and cache company branding logo asynchronously
  useEffect(() => {
    const activeUrl = logoPreset === "recruiter" ? (recruiter?.companyLogo || companyLogo) : uploadedLogoUrl;
    if (!activeUrl) {
      setLoadedLogo(null);
      setLoadedLogoUrl("");
      return;
    }
    if (activeUrl === loadedLogoUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = activeUrl;
    img.onload = () => {
      setLoadedLogo(img);
      setLoadedLogoUrl(activeUrl);
    };
    img.onerror = () => {
      setLoadedLogo(null);
      setLoadedLogoUrl("");
    };
  }, [logoPreset, companyLogo, recruiter?.companyLogo, uploadedLogoUrl, loadedLogoUrl]);

  // Redraw canvas on any customization update
  useEffect(() => {
    drawBanner();
  }, [
    size, activeThemeIdx, selectedTemplate, customTitle, customCompany, customLocation, 
    customSalary, customBenefits, bullets, logoPreset, uploadedLogoUrl, loadedLogo,
    contactEmail, contactPhone, logoXPercent, logoYPercent,
    hiringXPercent, hiringYPercent, companyXPercent, companyYPercent,
    titleXPercent, titleYPercent, badgesXPercent, badgesYPercent,
    bulletsXPercent, bulletsYPercent, footerXPercent, footerYPercent,
    dragging, isHovered,
    customHiringText, customBulletsHeader, customBulletsIcon, customFooterText,
    customHiringColor, customCompanyColor, customTitleColor, customBadgesColor,
    customBadgesBg, customBulletsColor, customBulletsIconColor, customFooterColor,
    customFooterBg, logoScale, hiringScale, companyScale, titleScale, badgesScale, bulletsScale, recruiterScale
  ]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedLogoUrl(url);
      setLogoPreset("custom");
    }
  };

  const getCanvasMouseCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  // Window-level event listeners for smooth/fluent dragging
  useEffect(() => {
    if (!dragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      
      const width = canvas.width;
      const height = canvas.height;

      const newX = Math.max(0.01, Math.min(0.99, x / width));
      const newY = Math.max(0.01, Math.min(0.99, y / height));

      if (dragging === "logo") {
        setLogoXPercent(newX);
        setLogoYPercent(newY);
      } else if (dragging === "hiring") {
        setHiringXPercent(newX);
        setHiringYPercent(newY);
      } else if (dragging === "company") {
        setCompanyXPercent(newX);
        setCompanyYPercent(newY);
      } else if (dragging === "title") {
        setTitleXPercent(newX);
        setTitleYPercent(newY);
      } else if (dragging === "badges") {
        setBadgesXPercent(newX);
        setBadgesYPercent(newY);
      } else if (dragging === "bullets") {
        setBulletsXPercent(newX);
        setBulletsYPercent(newY);
      } else if (dragging === "footer") {
        setFooterXPercent(newX);
        setFooterYPercent(newY);
      }
    };

    const handleWindowMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [dragging]);

  // Mobile touch listeners for fluent dragging on phone/tablet
  useEffect(() => {
    if (!dragging) return;

    const handleWindowTouchMove = (e: TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((touch.clientY - rect.top) / rect.height) * canvas.height;

      const width = canvas.width;
      const height = canvas.height;

      const newX = Math.max(0.01, Math.min(0.99, x / width));
      const newY = Math.max(0.01, Math.min(0.99, y / height));

      if (dragging === "logo") {
        setLogoXPercent(newX);
        setLogoYPercent(newY);
      } else if (dragging === "hiring") {
        setHiringXPercent(newX);
        setHiringYPercent(newY);
      } else if (dragging === "company") {
        setCompanyXPercent(newX);
        setCompanyYPercent(newY);
      } else if (dragging === "title") {
        setTitleXPercent(newX);
        setTitleYPercent(newY);
      } else if (dragging === "badges") {
        setBadgesXPercent(newX);
        setBadgesYPercent(newY);
      } else if (dragging === "bullets") {
        setBulletsXPercent(newX);
        setBulletsYPercent(newY);
      } else if (dragging === "footer") {
        setFooterXPercent(newX);
        setFooterYPercent(newY);
      }
    };

    const handleWindowTouchEnd = () => {
      setDragging(null);
    };

    window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
    window.addEventListener("touchend", handleWindowTouchEnd);

    return () => {
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowTouchEnd);
    };
  }, [dragging]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevents default browser image drag-and-drop actions!
    if (isHovered) {
      setDragging(isHovered);
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = "grabbing";
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((touch.clientY - rect.top) / rect.height) * canvas.height;

    let hoverElement: typeof dragging = null;
    const pad = 25; // generous padding for mobile touch

    for (let i = boundingBoxesRef.current.length - 1; i >= 0; i--) {
      const box = boundingBoxesRef.current[i];
      if (x >= box.x1 - pad && x <= box.x2 + pad &&
          y >= box.y1 - pad && y <= box.y2 + pad) {
        hoverElement = box.id;
        break;
      }
    }

    if (hoverElement) {
      e.preventDefault(); // Lock scrolling on touch devices while dragging elements
      setDragging(hoverElement);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const coords = getCanvasMouseCoords(e);

    let hoverElement: typeof dragging = null;
    const pad = 15; // 15px interaction padding

    for (let i = boundingBoxesRef.current.length - 1; i >= 0; i--) {
      const box = boundingBoxesRef.current[i];
      if (coords.x >= box.x1 - pad && coords.x <= box.x2 + pad &&
          coords.y >= box.y1 - pad && coords.y <= box.y2 + pad) {
        hoverElement = box.id;
        break;
      }
    }

    setIsHovered(hoverElement);
    if (hoverElement) {
      canvas.style.cursor = dragging ? "grabbing" : "grab";
    } else {
      canvas.style.cursor = "default";
    }
  };

  const handleCanvasMouseUp = () => {
    setDragging(null);
  };

  const drawBanner = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dimensions:
    // Instagram Square: 1080 x 1080
    // LinkedIn Landscape: 1200 x 630
    const width = size === "instagram" ? 1080 : 1200;
    const height = size === "instagram" ? 1080 : 630;
    canvas.width = width;
    canvas.height = height;

    const theme = THEMES[activeThemeIdx];
    const isInsta = size === "instagram";

    const logoX = logoXPercent * width;
    const logoY = logoYPercent * height;

    const hiringX = hiringXPercent * width;
    const hiringY = hiringYPercent * height;

    const companyX = companyXPercent * width;
    const companyY = companyYPercent * height;

    const titleX = titleXPercent * width;
    let titleY = titleYPercent * height;

    const badgesX = badgesXPercent * width;
    const badgesY = badgesYPercent * height;

    const bulletsX = bulletsXPercent * width;
    let bulletY = bulletsYPercent * height;

    const footerX = footerXPercent * width;
    const footerY = footerYPercent * height;

    const boxes: { id: "logo" | "hiring" | "company" | "title" | "badges" | "bullets" | "footer"; x1: number; y1: number; x2: number; y2: number }[] = [];

    // 1. Establish Layout variables & Font sizes to fill space beautifully (Instagram has huge typography to avoid empty margins)
    const hiringFont = isInsta 
      ? `italic 900 ${Math.round(74 * hiringScale)}px system-ui, sans-serif` 
      : `italic 900 ${Math.round(44 * hiringScale)}px system-ui, sans-serif`;
    const companyFont = isInsta 
      ? `bold ${Math.round(38 * companyScale)}px system-ui, sans-serif` 
      : `bold ${Math.round(24 * companyScale)}px system-ui, sans-serif`;
    const titleFontSize = Math.round((isInsta ? 76 : 46) * titleScale);
    const titleFont = `bold ${titleFontSize}px system-ui, -apple-system, sans-serif`;
    const badgeFont = isInsta ? `bold ${Math.round(28 * badgesScale)}px sans-serif` : `bold ${Math.round(18 * badgesScale)}px sans-serif`;
    const highlightHeaderFont = isInsta ? `bold ${Math.round(34 * bulletsScale)}px sans-serif` : `bold ${Math.round(22 * bulletsScale)}px sans-serif`;
    const bulletFont = isInsta ? `bold ${Math.round(28 * bulletsScale)}px sans-serif` : `500 ${Math.round(20 * bulletsScale)}px sans-serif`;
    const footerTextFont = isInsta ? `bold ${Math.round(24 * recruiterScale)}px sans-serif` : `bold ${Math.round(16 * recruiterScale)}px sans-serif`;
    const contactFont = isInsta ? `bold ${Math.round(24 * recruiterScale)}px sans-serif` : `bold ${Math.round(16 * recruiterScale)}px sans-serif`;
    
    const marginX = isInsta ? 90 : 70;
    const bulletSpacing = (isInsta ? 58 : 38) * bulletsScale;
    
    // Reset Canvas State
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 2. Render Background and borders depending on Selected Template Style
    if (selectedTemplate === "minimalist_editorial") {
      // Warm elegant white/cream card theme
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#fdfbf7");
      grad.addColorStop(1, "#f4efdf");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Double-stroke high-contrast editorial borders
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, width - 60, height - 60);
      ctx.lineWidth = 1;
      ctx.strokeRect(38, 38, width - 76, height - 76);

    } else if (selectedTemplate === "retro_mono") {
      // Brutalist monospace hacker console theme
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, width, height);

      // Draw subtle terminal scanlines
      ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
      for (let y = 0; y < height; y += 12) {
        ctx.fillRect(0, y, width, 1.5);
      }

      // Bright console border line
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, width - 40, height - 40);

    } else if (selectedTemplate === "neon_tech") {
      // Space violet with neon cyber glow
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#1e1b4b");
      grad.addColorStop(1, "#03001e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw cyber laser lines
      ctx.strokeStyle = "rgba(244, 63, 94, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.2);
      ctx.lineTo(width, height * 0.45);
      ctx.moveTo(0, height * 0.85);
      ctx.lineTo(width, height * 0.6);
      ctx.stroke();

    } else if (selectedTemplate === "gradient_wave") {
      // Fluid modern abstract card with soft organic curves
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, theme.gradientStart);
      grad.addColorStop(1, theme.gradientEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Overlapping fluid Bezier curves on the side
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(width * 0.6, 0);
      ctx.bezierCurveTo(width * 0.75, height * 0.3, width * 0.8, height * 0.5, width, height * 0.35);
      ctx.lineTo(width, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, height * 0.75);
      ctx.bezierCurveTo(width * 0.3, height * 0.6, width * 0.4, height * 0.95, width * 0.85, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

    } else if (selectedTemplate === "executive_classic") {
      // Prestige corporate dark navy with gold bands
      ctx.fillStyle = "#0b1329";
      ctx.fillRect(0, 0, width, height);

      // Elegant gold bands at top and bottom
      ctx.fillStyle = "#d97706"; // Royal gold
      ctx.fillRect(0, 0, width, 18);
      ctx.fillRect(0, height - 18, width, 18);

      // Inner double gold borders
      ctx.strokeStyle = "rgba(217, 119, 6, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(35, 35, width - 70, height - 70);

    } else {
      // "modern_bold": Original clean card style, geometric patterns, no yellow bar
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, theme.gradientStart);
      grad.addColorStop(1, theme.gradientEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Geometric overlay rings
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.beginPath();
      ctx.arc(width, 0, isInsta ? 550 : 450, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, height, isInsta ? 350 : 300, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw Large Brand Hiring Header (Remove solid yellow bar!)
    const activeHiringText = customHiringText || (
      selectedTemplate === "minimalist_editorial" ? "WE ARE RECRUITING" :
      selectedTemplate === "retro_mono" ? "OPEN RECRUITMENT" :
      selectedTemplate === "neon_tech" ? "WE ARE HIRING NOW" :
      selectedTemplate === "gradient_wave" ? "HIRING ACTIVE" :
      selectedTemplate === "executive_classic" ? "EXECUTIVE CAREER OPPORTUNITY" :
      "WE ARE HIRING"
    );

    ctx.fillStyle = customHiringColor || theme.textColor;
    
    if (selectedTemplate === "minimalist_editorial") {
      ctx.fillStyle = customHiringColor || "#1e293b";
      ctx.font = isInsta ? `italic bold ${Math.round(64 * hiringScale)}px Georgia, serif` : `italic bold ${Math.round(36 * hiringScale)}px Georgia, serif`;
      ctx.fillText(activeHiringText, hiringX, hiringY);

      // Drawn line below recruiting header
      ctx.strokeStyle = customHiringColor || "rgba(30, 41, 59, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hiringX, hiringY + 30);
      ctx.lineTo(width - hiringX, hiringY + 30);
      ctx.stroke();

    } else if (selectedTemplate === "retro_mono") {
      ctx.fillStyle = customHiringColor || "#10b981"; // neon green
      ctx.font = isInsta ? `900 ${Math.round(64 * hiringScale)}px monospace` : `900 ${Math.round(40 * hiringScale)}px monospace`;
      ctx.fillText(activeHiringText, hiringX, hiringY);

    } else if (selectedTemplate === "neon_tech") {
      // Glow shadow
      ctx.shadowColor = customHiringColor || "#f43f5e";
      ctx.shadowBlur = 12;
      ctx.fillStyle = customHiringColor || "#f43f5e"; // bright neon pink
      ctx.font = hiringFont;
      ctx.fillText(activeHiringText, hiringX, hiringY);
      ctx.shadowBlur = 0; // reset glow

    } else if (selectedTemplate === "gradient_wave") {
      ctx.fillStyle = customHiringColor || theme.accentColor;
      ctx.font = hiringFont;
      ctx.fillText(activeHiringText, hiringX, hiringY);

    } else if (selectedTemplate === "executive_classic") {
      ctx.fillStyle = customHiringColor || "#fbbf24"; // pure gold
      ctx.font = isInsta ? `italic 900 ${Math.round(68 * hiringScale)}px Georgia, serif` : `italic 900 ${Math.round(42 * hiringScale)}px Georgia, serif`;
      ctx.fillText(activeHiringText, hiringX, hiringY);

    } else {
      // modern_bold: Draw text directly without any surrounding square box
      ctx.fillStyle = customHiringColor || "#ffffff";
      ctx.font = isInsta ? `900 ${Math.round(56 * hiringScale)}px system-ui, sans-serif` : `900 ${Math.round(34 * hiringScale)}px system-ui, sans-serif`;
      ctx.fillText(activeHiringText, hiringX, hiringY);
    }

    // Add Hiring Box
    const hiringWidth = ctx.measureText(activeHiringText).width;
    const hiringH = (isInsta ? 74 : 44) * hiringScale;
    boxes.push({
      id: "hiring",
      x1: hiringX,
      y1: hiringY - hiringH,
      x2: hiringX + hiringWidth,
      y2: hiringY + 10
    });

    // 4. Draw Company Name
    ctx.shadowBlur = 0;
    ctx.fillStyle = customCompanyColor || (
      selectedTemplate === "minimalist_editorial" ? "#475569" :
      selectedTemplate === "retro_mono" ? "#34d399" :
      selectedTemplate === "neon_tech" ? "#38bdf8" :
      selectedTemplate === "executive_classic" ? "#e2e8f0" :
      theme.textColor
    );

    const companyText = selectedTemplate === "retro_mono" 
      ? `>> ORG: ${customCompany.toUpperCase()}` 
      : selectedTemplate === "minimalist_editorial" 
      ? `WITH ${customCompany.toUpperCase()}` 
      : customCompany.toUpperCase();

    if (selectedTemplate === "minimalist_editorial") {
      ctx.font = isInsta ? `bold ${Math.round(34 * companyScale)}px Georgia, serif` : `bold ${Math.round(22 * companyScale)}px Georgia, serif`;
      ctx.fillText(companyText, companyX, companyY);
    } else if (selectedTemplate === "retro_mono") {
      ctx.font = isInsta ? `bold ${Math.round(34 * companyScale)}px monospace` : `bold ${Math.round(22 * companyScale)}px monospace`;
      ctx.fillText(companyText, companyX, companyY);
    } else if (selectedTemplate === "neon_tech") {
      ctx.font = companyFont;
      ctx.fillText(companyText, companyX, companyY);
    } else if (selectedTemplate === "executive_classic") {
      ctx.font = isInsta ? `bold ${Math.round(36 * companyScale)}px Georgia, serif` : `bold ${Math.round(22 * companyScale)}px Georgia, serif`;
      ctx.fillText(companyText, companyX, companyY);
    } else {
      ctx.font = companyFont;
      ctx.fillText(companyText, companyX, companyY);
    }

    // Add Company Box
    const companyWidth = ctx.measureText(companyText).width;
    const companyH = (isInsta ? 38 : 24) * companyScale;
    boxes.push({
      id: "company",
      x1: companyX,
      y1: companyY - companyH,
      x2: companyX + companyWidth,
      y2: companyY + 10
    });

    // 5. Draw Job Title (with Wrap & Large fonts)
    ctx.fillStyle = customTitleColor || (
      (selectedTemplate === "minimalist_editorial") ? "#0f172a" 
      : (selectedTemplate === "retro_mono") ? "#ffffff"
      : theme.textColor
    );
                  
    ctx.font = (selectedTemplate === "minimalist_editorial") ? `bold italic ${titleFontSize}px Georgia, serif`
             : (selectedTemplate === "retro_mono") ? `bold ${titleFontSize}px monospace`
             : titleFont;

    const maxTitleWidth = width - titleX - (isInsta ? 100 : 80);
    const lines = getLines(ctx, customTitle, maxTitleWidth);
    const titleYStart = titleY - titleFontSize;
    let titleMaxWidth = 0;
    lines.forEach((line) => {
      const w = ctx.measureText(line).width;
      if (w > titleMaxWidth) titleMaxWidth = w;
      ctx.fillText(line, titleX, titleY);
      titleY += titleFontSize + (isInsta ? 16 : 10);
    });

    // Add Title Box
    boxes.push({
      id: "title",
      x1: titleX,
      y1: titleYStart,
      x2: titleX + titleMaxWidth,
      y2: titleY
    });

    // 6. Draw Sub-badges (Location, Employment & Salary)
    
    // Draw location badge
    const locText = `📍 ${customLocation}  |  ${selectedJob?.employment || "Full-time"}`;
    ctx.font = badgeFont;
    const locWidth = ctx.measureText(locText).width + (isInsta ? 40 : 30);
    
    if (selectedTemplate === "retro_mono") {
      ctx.strokeStyle = customBadgesColor || "#10b981";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(badgesX, badgesY, locWidth, isInsta ? 52 : 38);
      ctx.fillStyle = customBadgesColor || "#10b981";
      ctx.fillText(locText, badgesX + 15, badgesY + (isInsta ? 35 : 25));
    } else {
      ctx.fillStyle = customBadgesBg || (
        (selectedTemplate === "minimalist_editorial") ? "rgba(30, 41, 59, 0.08)" : "rgba(255, 255, 255, 0.16)"
      );
      ctx.beginPath();
      ctx.roundRect(badgesX, badgesY, locWidth, isInsta ? 52 : 38, 12);
      ctx.fill();
      ctx.fillStyle = customBadgesColor || (
        (selectedTemplate === "minimalist_editorial") ? "#1e293b" : theme.textColor
      );
      ctx.fillText(locText, badgesX + (isInsta ? 20 : 15), badgesY + (isInsta ? 35 : 26));
    }

    // Draw salary badge next to it
    const salText = `💰 ${customSalary}`;
    const salWidth = ctx.measureText(salText).width + (isInsta ? 40 : 30);
    const salX = badgesX + locWidth + (isInsta ? 24 : 15);
    
    if (selectedTemplate === "retro_mono") {
      ctx.strokeStyle = customBadgesColor || "#10b981";
      ctx.strokeRect(salX, badgesY, salWidth, isInsta ? 52 : 38);
      ctx.fillStyle = customBadgesColor || "#ffffff";
      ctx.fillText(salText, salX + 15, badgesY + (isInsta ? 35 : 25));
    } else {
      ctx.fillStyle = customBadgesBg || (
        (selectedTemplate === "minimalist_editorial") ? "rgba(217, 119, 6, 0.1)" : "rgba(255, 255, 255, 0.16)"
      );
      ctx.beginPath();
      ctx.roundRect(salX, badgesY, salWidth, isInsta ? 52 : 38, 12);
      ctx.fill();
      ctx.fillStyle = customBadgesColor || (
        (selectedTemplate === "minimalist_editorial") ? "#b45309" : theme.accentColor
      );
      ctx.fillText(salText, salX + (isInsta ? 20 : 15), badgesY + (isInsta ? 35 : 26));
    }

    // Add Badges Box
    const totalBadgesWidth = locWidth + (isInsta ? 24 : 15) + salWidth;
    const badgesH = isInsta ? 52 : 38;
    boxes.push({
      id: "badges",
      x1: badgesX,
      y1: badgesY,
      x2: badgesX + totalBadgesWidth,
      y2: badgesY + badgesH
    });

    // 7. Draw Bullet Highlight Points (Fill the space completely!)
    ctx.fillStyle = customBulletsColor || (
      (selectedTemplate === "minimalist_editorial") ? "#0f172a" 
      : (selectedTemplate === "retro_mono") ? "#10b981" 
      : theme.textColor
    );
                  
    ctx.font = (selectedTemplate === "minimalist_editorial") ? `bold ${Math.round(26 * bulletsScale)}px Georgia, serif`
             : (selectedTemplate === "retro_mono") ? `bold ${Math.round(24 * bulletsScale)}px monospace`
             : highlightHeaderFont;
              
    ctx.fillText(customBulletsHeader || "OPPORTUNITY HIGHLIGHTS:", bulletsX, bulletY);

    const bulletsYStart = bulletY - (isInsta ? 34 : 22) * bulletsScale;
    let bulletsMaxWidth = ctx.measureText(customBulletsHeader || "OPPORTUNITY HIGHLIGHTS:").width;

    bulletY += (isInsta ? 55 : 38);

    ctx.font = (selectedTemplate === "retro_mono") ? `bold ${Math.round(22 * bulletsScale)}px monospace` : bulletFont;
    const points = bullets.split("\n").filter(Boolean);
    
    points.slice(0, 4).forEach((point) => {
      // Draw Bullet marker
      if (selectedTemplate === "retro_mono") {
        ctx.fillStyle = customBulletsIconColor || "#10b981";
        ctx.fillText(customBulletsIcon || ">>", bulletsX, bulletY);
      } else if (selectedTemplate === "minimalist_editorial") {
        ctx.fillStyle = customBulletsIconColor || "#d97706";
        ctx.fillText(customBulletsIcon || "◈", bulletsX, bulletY);
      } else {
        ctx.fillStyle = customBulletsIconColor || theme.accentColor;
        ctx.fillText(customBulletsIcon || "✦", bulletsX, bulletY);
      }

      ctx.fillStyle = customBulletsColor || (
        (selectedTemplate === "minimalist_editorial") ? "#334155" 
        : (selectedTemplate === "retro_mono") ? "#e2e8f0"
        : theme.textColor
      );
                    
      ctx.fillText(point, bulletsX + (isInsta ? 40 : 30), bulletY);

      const pointW = (isInsta ? 40 : 30) + ctx.measureText(point).width;
      if (pointW > bulletsMaxWidth) bulletsMaxWidth = pointW;

      bulletY += bulletSpacing;
    });

    // Add Bullets Box
    boxes.push({
      id: "bullets",
      x1: bulletsX,
      y1: bulletsYStart,
      x2: bulletsX + bulletsMaxWidth,
      y2: bulletY
    });

    // 8. Footer Contacts (Background Box & CTA note removed as requested)
    let contactText = "";
    if (contactEmail && contactPhone) {
      contactText = `📧 ${contactEmail}  |  📞 ${contactPhone}`;
    } else if (contactEmail) {
      contactText = `📧 ${contactEmail}`;
    } else if (contactPhone) {
      contactText = `📞 ${contactPhone}`;
    }
    
    if (contactText) {
      ctx.fillStyle = customFooterColor || (
        (selectedTemplate === "retro_mono") ? "#10b981"
        : (selectedTemplate === "minimalist_editorial") ? "#1e293b" // dark slate on light cream
        : (selectedTemplate === "executive_classic") ? "#fbbf24"     // gold
        : theme.accentColor || "#ffffff" // template accent or fallback
      );
      ctx.font = (selectedTemplate === "retro_mono") ? `bold ${Math.round(20 * recruiterScale)}px monospace` : contactFont;
      ctx.textAlign = "center";
      
      // CRITICAL FIX: Render contact text centered around footerX instead of width / 2
      ctx.fillText(contactText, footerX, footerY);
      ctx.textAlign = "left"; // reset

      const footerWidth = ctx.measureText(contactText).width;
      const footerH = (isInsta ? 24 : 16) * recruiterScale;
      boxes.push({
        id: "footer",
        x1: footerX - footerWidth / 2,
        y1: footerY - footerH,
        x2: footerX + footerWidth / 2,
        y2: footerY + 10
      });
    }

    // 9. Draw Company Logo on top using coordinates and loadedLogo reference
    const logoR = (isInsta ? 80 : 55) * logoScale;

    // Add Logo Box
    boxes.push({
      id: "logo",
      x1: logoX - logoR,
      y1: logoY - logoR,
      x2: logoX + logoR,
      y2: logoY + logoR
    });

    // Assign boundingBoxesRef
    boundingBoxesRef.current = boxes;

    const drawLogoCircle = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.fillStyle = (selectedTemplate === "minimalist_editorial") ? "rgba(15, 23, 42, 0.08)" : theme.logoBg;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // letter/icon fallback - Draw a beautiful briefing case vector
      const iconSize = r * 0.9;
      ctx.save();
      ctx.translate(x - iconSize / 2, y - iconSize / 2);
      ctx.strokeStyle = (selectedTemplate === "minimalist_editorial") ? "#0f172a" : theme.textColor;
      ctx.lineWidth = Math.max(2.5, r * 0.08);
      ctx.beginPath();
      // briefcase handle
      ctx.roundRect(iconSize * 0.35, iconSize * 0.1, iconSize * 0.3, iconSize * 0.1, 2);
      // briefcase body
      ctx.roundRect(iconSize * 0.15, iconSize * 0.25, iconSize * 0.7, iconSize * 0.55, 4);
      ctx.stroke();
      ctx.restore();
    };

    if (loadedLogo) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX, logoY, logoR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(loadedLogo, logoX - logoR, logoY - logoR, logoR * 2, logoR * 2);
      ctx.restore();
    } else {
      drawLogoCircle(logoX, logoY, logoR);
    }

    // 10. Draw drag-and-drop helper boundaries during interactive preview (Not saved on download)
    if (dragging || isHovered) {
      ctx.save();
      ctx.strokeStyle = "rgba(99, 102, 241, 0.7)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      
      if (dragging === "logo" || isHovered === "logo") {
        ctx.beginPath();
        ctx.arc(logoX, logoY, logoR + 10, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = "rgba(99, 102, 241, 0.9)";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("LOGO (DRAGGABLE)", logoX, logoY - logoR - 20);
      }
      
      const activeElement = dragging || isHovered;
      if (activeElement && activeElement !== "logo") {
        let activeX = 0;
        let activeY = 0;
        let elWidth = size === "instagram" ? 750 : 600;
        let elHeight = size === "instagram" ? 60 : 40;
        let elLabel = "TEXT ELEMENT (DRAGGABLE)";

        if (activeElement === "hiring") {
          activeX = hiringX;
          activeY = hiringY;
          elLabel = "RECRUITING HEADER";
          elHeight = size === "instagram" ? 100 : 60;
        } else if (activeElement === "company") {
          activeX = companyX;
          activeY = companyY;
          elLabel = "COMPANY NAME";
        } else if (activeElement === "title") {
          activeX = titleX;
          activeY = titleYPercent * height;
          elLabel = "JOB TITLE";
          elHeight = size === "instagram" ? 180 : 100;
        } else if (activeElement === "badges") {
          activeX = badgesX;
          activeY = badgesY;
          elLabel = "INFO BADGES";
        } else if (activeElement === "bullets") {
          activeX = bulletsX;
          activeY = bulletsYPercent * height;
          elLabel = "HIGHLIGHT BULLETS";
          elHeight = size === "instagram" ? 280 : 180;
        } else if (activeElement === "footer") {
          activeX = footerX;
          activeY = footerY;
          elLabel = "CONTACT FOOTER";
        }

        ctx.strokeRect(activeX - 15, activeY - (size === "instagram" ? 50 : 35), elWidth, elHeight);
        
        ctx.fillStyle = "rgba(99, 102, 241, 0.9)";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${elLabel} (DRAGGABLE)`, activeX - 15, activeY - (size === "instagram" ? 65 : 45));
      }
      ctx.restore();
    }
  };

  // Helper text-wrap function
  const getLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `sharekit_hiring_${customTitle.toLowerCase().replace(/\s+/g, "_")}_${size}.png`;
    link.click();
  };

  const handleGenerateCaption = async () => {
    setIsGenerating(true);
    setCaption("");
    setErrorText("");
    
    try {
      const response = await fetch("/api/gemini/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: customTitle,
          company: customCompany,
          location: customLocation,
          skills: selectedJob?.skills || [],
          description: selectedJob?.description || "",
          platform: size
        }),
      });

      if (!response.ok) throw new Error("Caption API failed");
      const data = await response.json();
      setCaption(data.caption);
    } catch (err) {
      console.error(err);
      setErrorText("Gemini generation failed. Please verify that your server is running and configured.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCaptionToClipboard = () => {
    if (!caption) return;
    navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ShareKit Promo Lab</h1>
          <p className="text-sm text-slate-500">
            Generate customized high-impact social media posters featuring a large "WE ARE HIRING" banner, recruiter contacts, and your company logo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 space-y-5 shadow-sm h-fit">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">Poster Studio</h2>
            <span className="text-[10px] font-black tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">ShareKit v2</span>
          </div>
          
          {/* Active Job Select */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Target Job Opening
            </label>
            <select
              value={jobId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setJobId(id);
                onSelectJob(id);
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50/50 font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 focus:outline-none"
            >
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} ({j.dept})</option>
              ))}
            </select>
          </div>

          {/* Tab Selection Headers */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
            {(["content", "styles", "layout"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={`py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer focus:outline-none ${
                  activeTab === t 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* TAB 1: CONTENT EDITORS */}
          {activeTab === "content" && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-l-2 border-indigo-600 pl-2">Text & Labels</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hiring Tagline</label>
                    <input autoCapitalize="words"
                      type="text"
                      value={customHiringText}
                      onChange={(e) => setCustomHiringText(e.target.value)}
                      placeholder="✦ WE ARE HIRING ✦"
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50/30 capitalize"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Name</label>
                    <input autoCapitalize="words"
                      type="text"
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50/30 capitalize"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Job Opening Title</label>
                  <input autoCapitalize="words"
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50/30 capitalize"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Location Details</label>
                    <input autoCapitalize="words"
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50/30 capitalize"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Salary Range</label>
                    <input autoCapitalize="words"
                      type="text"
                      value={customSalary}
                      onChange={(e) => setCustomSalary(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50/30 capitalize"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-l-2 border-indigo-600 pl-2">Highlights List</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bullet Heading</label>
                    <input autoCapitalize="words"
                      type="text"
                      value={customBulletsHeader}
                      onChange={(e) => setCustomBulletsHeader(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50/30 font-semibold capitalize"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bullet Marker Icon</label>
                    <input autoCapitalize="words"
                      type="text"
                      value={customBulletsIcon}
                      onChange={(e) => setCustomBulletsIcon(e.target.value)}
                      placeholder="Default (✦, >>, ◈)"
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50/30 font-mono capitalize"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Bullet Highlights (One per line, max 4)
                  </label>
                  <textarea autoCapitalize="sentences"
                    rows={3}
                    value={bullets}
                    onChange={(e) => setBullets(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50/30 font-mono focus:outline-none capitalize"
                  ></textarea>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-l-2 border-indigo-600 pl-2">Recruiter Contacts</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Recruiter Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="recruiter@company.com"
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Recruiter Phone</label>
                    <input autoCapitalize="words"
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50/30 capitalize"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Logo Source Badge
                  </label>
                  <div className="flex flex-col gap-2">
                    <select
                      value={logoPreset}
                      onChange={(e) => setLogoPreset(e.target.value)}
                      className="border border-slate-200 rounded-xl text-xs py-1.5 px-3 bg-white focus:outline-none"
                    >
                      <option value="recruiter">System Brand Logo (Settings)</option>
                      <option value="apex">Default Emblem Placeholder</option>
                      <option value="custom">Upload One-Off Logo</option>
                    </select>
                    
                    {logoPreset === "custom" && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STYLES & COLOR PICKERS */}
          {activeTab === "styles" && (
            <div className="space-y-4 animate-fade-in">
              {/* Template selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Poster Template Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "modern_bold", label: "Modern Bold" },
                    { id: "minimalist_editorial", label: "Editorial Serif" },
                    { id: "retro_mono", label: "Terminal Mono" },
                    { id: "neon_tech", label: "Cyber Neon Glow" },
                    { id: "gradient_wave", label: "Fluid Abstract" },
                    { id: "executive_classic", label: "Executive Gold" }
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`py-1.5 px-2 border rounded-xl text-[10px] font-bold focus:outline-none transition-all cursor-pointer ${
                        selectedTemplate === tpl.id 
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 font-black shadow-xs" 
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Gradient Preset */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Brand Color Gradient Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  {THEMES.map((th, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveThemeIdx(idx)}
                      style={{ background: `linear-gradient(135deg, ${th.gradientStart}, ${th.gradientEnd})` }}
                      className={`w-7 h-7 rounded-lg border-2 transition-transform shadow-xs focus:outline-none cursor-pointer ${
                        activeThemeIdx === idx ? "border-slate-800 scale-110" : "border-transparent hover:scale-105"
                      }`}
                      title={th.name}
                    />
                  ))}
                </div>
              </div>

              {/* Individual Color Pickers */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-l-2 border-indigo-600 pl-2">Individual Color Selection</h3>
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Interactive Colors</span>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-normal">
                  Color selectors show active template defaults. Click any colored circle to customize.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {renderColorPicker(
                    "Hiring Tagline", 
                    "Main recruitment text", 
                    customHiringColor, 
                    getEffectiveColors().hiringColor, 
                    setCustomHiringColor
                  )}
                  {renderColorPicker(
                    "Company Name", 
                    "Your brand or organization", 
                    customCompanyColor, 
                    getEffectiveColors().companyColor, 
                    setCustomCompanyColor
                  )}
                  {renderColorPicker(
                    "Job Title", 
                    "Primary job opening text", 
                    customTitleColor, 
                    getEffectiveColors().titleColor, 
                    setCustomTitleColor
                  )}
                  {renderColorPicker(
                    "Badge Text", 
                    "Metadata pills text color", 
                    customBadgesColor, 
                    getEffectiveColors().badgesColor, 
                    setCustomBadgesColor
                  )}
                  {renderColorPicker(
                    "Badge Background", 
                    "Metadata pills background", 
                    customBadgesBg, 
                    getEffectiveColors().badgesBg, 
                    setCustomBadgesBg
                  )}
                  {renderColorPicker(
                    "Highlights Text", 
                    "Bullet points text", 
                    customBulletsColor, 
                    getEffectiveColors().bulletsColor, 
                    setCustomBulletsColor
                  )}
                  {renderColorPicker(
                    "Bullet Icons", 
                    "Marker points color", 
                    customBulletsIconColor, 
                    getEffectiveColors().bulletsIconColor, 
                    setCustomBulletsIconColor
                  )}
                  {renderColorPicker(
                    "Contact Details", 
                    "Recruiter email & phone text", 
                    customFooterColor, 
                    getEffectiveColors().footerColor, 
                    setCustomFooterColor
                  )}
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomHiringColor("");
                      setCustomCompanyColor("");
                      setCustomTitleColor("");
                      setCustomBadgesColor("");
                      setCustomBadgesBg("");
                      setCustomBulletsColor("");
                      setCustomBulletsIconColor("");
                      setCustomFooterColor("");
                      setCustomFooterBg("");
                    }}
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                  >
                    Reset Colors to Template Defaults
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: POSITIONING SLIDERS */}
          {activeTab === "layout" && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-slate-700 text-[11px] leading-normal space-y-1">
                <p className="font-bold text-amber-800">💡 Interactive Layout Positioning</p>
                <p>You can <strong>directly drag</strong> any block inside the live canvas preview to move it, or adjust the precision percentage sliders below!</p>
              </div>

              {/* Sizing & Scale Controls */}
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100 space-y-3 pt-3 pb-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Poster Elements Sizing</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoScale(1.0);
                      setHiringScale(1.0);
                      setCompanyScale(1.0);
                      setTitleScale(1.0);
                      setBadgesScale(1.0);
                      setBulletsScale(1.0);
                      setRecruiterScale(1.0);
                    }}
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                  >
                    Reset All Sizes
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Hiring Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>Hiring Tagline Size</span>
                      <span className="text-indigo-600 font-mono">{Math.round(hiringScale * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="2.0" step="0.05"
                      value={hiringScale} onChange={(e) => setHiringScale(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  {/* Company Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>Company Name Size</span>
                      <span className="text-indigo-600 font-mono">{Math.round(companyScale * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="2.0" step="0.05"
                      value={companyScale} onChange={(e) => setCompanyScale(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  {/* Title Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>Job Title Size</span>
                      <span className="text-indigo-600 font-mono">{Math.round(titleScale * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="2.0" step="0.05"
                      value={titleScale} onChange={(e) => setTitleScale(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  {/* Badges Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>Badge Pills Size</span>
                      <span className="text-indigo-600 font-mono">{Math.round(badgesScale * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="2.0" step="0.05"
                      value={badgesScale} onChange={(e) => setBadgesScale(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  {/* Bullets Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>Bullet Highlights Size</span>
                      <span className="text-indigo-600 font-mono">{Math.round(bulletsScale * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="2.0" step="0.05"
                      value={bulletsScale} onChange={(e) => setBulletsScale(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  {/* Recruiter/Footer Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>Contact Details Size</span>
                      <span className="text-indigo-600 font-mono">{Math.round(recruiterScale * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="2.0" step="0.05"
                      value={recruiterScale} onChange={(e) => setRecruiterScale(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  {/* Logo Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>Branding Logo Size</span>
                      <span className="text-indigo-600 font-mono">{Math.round(logoScale * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="2.0" step="0.05"
                      value={logoScale} onChange={(e) => setLogoScale(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 pt-2">
                {/* Logo Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>Company Logo Position</span>
                    <span>X: {Math.round(logoXPercent * 100)}% | Y: {Math.round(logoYPercent * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={logoXPercent} onChange={(e) => setLogoXPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={logoYPercent} onChange={(e) => setLogoYPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>

                {/* Hiring header Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>Hiring Tagline Position</span>
                    <span>X: {Math.round(hiringXPercent * 100)}% | Y: {Math.round(hiringYPercent * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={hiringXPercent} onChange={(e) => setHiringXPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={hiringYPercent} onChange={(e) => setHiringYPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>

                {/* Company Name Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>Company Name Position</span>
                    <span>X: {Math.round(companyXPercent * 100)}% | Y: {Math.round(companyYPercent * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={companyXPercent} onChange={(e) => setCompanyXPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={companyYPercent} onChange={(e) => setCompanyYPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>

                {/* Job Title Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>Job Title Position</span>
                    <span>X: {Math.round(titleXPercent * 100)}% | Y: {Math.round(titleYPercent * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={titleXPercent} onChange={(e) => setTitleXPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={titleYPercent} onChange={(e) => setTitleYPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>

                {/* Info Badges Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>Badges Position</span>
                    <span>X: {Math.round(badgesXPercent * 100)}% | Y: {Math.round(badgesYPercent * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={badgesXPercent} onChange={(e) => setBadgesXPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={badgesYPercent} onChange={(e) => setBadgesYPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>

                {/* Highlights Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>Highlights Position</span>
                    <span>X: {Math.round(bulletsXPercent * 100)}% | Y: {Math.round(bulletsYPercent * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={bulletsXPercent} onChange={(e) => setBulletsXPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={bulletsYPercent} onChange={(e) => setBulletsYPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>

                {/* Recruiter Contacts Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>Recruiter Contacts Position</span>
                    <span>X: {Math.round(footerXPercent * 100)}% | Y: {Math.round(footerYPercent * 100)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={footerXPercent} onChange={(e) => setFooterXPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <input 
                      type="range" min="0.01" max="0.99" step="0.01"
                      value={footerYPercent} onChange={(e) => setFooterYPercent(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setLogoXPercent(0.85); setLogoYPercent(0.15);
                    setHiringXPercent(0.08); setHiringYPercent(0.15);
                    setCompanyXPercent(0.08); setCompanyYPercent(0.26);
                    setTitleXPercent(0.08); setTitleYPercent(0.38);
                    setBadgesXPercent(0.08); setBadgesYPercent(0.50);
                    setBulletsXPercent(0.08); setBulletsYPercent(0.64);
                    setFooterXPercent(0.5); setFooterYPercent(0.93);
                    setLogoScale(1.0);
                    setHiringScale(1.0);
                    setCompanyScale(1.0);
                    setTitleScale(1.0);
                    setBadgesScale(1.0);
                    setBulletsScale(1.0);
                    setRecruiterScale(1.0);
                  }}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  Reset Layout to Default Grid
                </button>
              </div>
            </div>
          )}

          {/* Social Platform dimensions select (shown at base) */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Social Platform Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSize("instagram")}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 focus:outline-none transition-all cursor-pointer ${
                  size === "instagram" ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold shadow-xs" : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <Instagram className="w-3.5 h-3.5" /> Instagram (1:1)
              </button>
              <button
                type="button"
                onClick={() => setSize("linkedin")}
                className={`py-1.5 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 focus:outline-none transition-all cursor-pointer ${
                  size === "linkedin" ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold shadow-xs" : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn (16:9)
              </button>
            </div>
          </div>
        </div>

        {/* Right Hand: Interactive Banner Render & AI Caption Generator */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Banner canvas rendering frame */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 text-center">
            <h3 className="font-bold text-slate-800 text-xs text-left">Live Canvas Banner Preview</h3>
            
            <div className="w-full flex justify-center bg-slate-100 rounded-2xl p-4 overflow-hidden border border-slate-200/50">
              <canvas 
                ref={canvasRef} 
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className={`max-w-full bg-slate-800 rounded-lg shadow border border-slate-300 transition-all cursor-move ${
                  size === "instagram" ? "aspect-square max-h-[350px]" : "aspect-[1.91/1] max-h-[300px]"
                }`}
              />
            </div>

            <button
              onClick={handleDownload}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl py-3 px-4 transition-colors flex items-center justify-center gap-2 shadow focus:outline-none cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Graphic Poster (PNG)
            </button>
          </div>

          {/* Automated AI promotional social caption copy-generator */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" /> AI Social Media Copywriter
              </h3>
              <button
                onClick={handleGenerateCaption}
                disabled={isGenerating}
                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1 font-bold disabled:opacity-50 focus:outline-none cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" /> Generate Post Caption
                  </>
                )}
              </button>
            </div>

            {errorText && (
              <p className="text-xs text-red-500 font-semibold">{errorText}</p>
            )}

            {caption ? (
              <div className="space-y-3 animate-fade-in">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 max-h-56 overflow-y-auto text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                  {caption}
                </div>
                <button
                  onClick={copyCaptionToClipboard}
                  className="w-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg py-2.5 flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
                >
                  {captionCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" /> Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Caption Text
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                Click "Generate Post Caption" to automatically generate engaging promoting copy with Gemini AI.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
