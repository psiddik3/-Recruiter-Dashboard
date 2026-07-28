import React, { useState, useEffect } from "react";
import { FileText, Download, User, Mail, Phone, Calendar, MapPin, Briefcase, GraduationCap, AlertCircle, ExternalLink } from "lucide-react";
import { Candidate } from "../types";
import { localResumeStorage } from "../lib/localResumeStorage";

interface ResumeDocumentViewerProps {
  candidate: Candidate;
}

export default function ResumeDocumentViewer({ candidate }: ResumeDocumentViewerProps) {
  const [resumeData, setResumeData] = useState<string>("");
  const [blobUrl, setBlobUrl] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function loadResume() {
      // 1. Try to load from IndexedDB/LocalStorage
      let data = await localResumeStorage.getResume(candidate.id);
      
      // 2. Fallback to candidate.resumePDF if it starts with data:
      if (!data && candidate.resumePDF && candidate.resumePDF.startsWith("data:")) {
        data = candidate.resumePDF;
      }

      if (!active) return;

      if (data && data.startsWith("data:")) {
        setResumeData(data);
        try {
          const arr = data.split(',');
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        } catch (e) {
          console.error("Failed to generate PDF blob URL:", e);
          setBlobUrl(data);
        }
      } else {
        setResumeData("");
        setBlobUrl("");
      }
    }

    loadResume();

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [candidate.id, candidate.resumePDF]);

  const cleanFilename = (() => {
    if (!candidate.resumePDF) return `${candidate.name.toLowerCase().replace(/\s+/g, '_')}_resume.pdf`;
    if (candidate.resumePDF.startsWith("data:")) return `${candidate.name.toLowerCase().replace(/\s+/g, '_')}_resume.pdf`;
    if (candidate.resumePDF.includes("|")) return candidate.resumePDF.split("|")[0];
    return candidate.resumePDF;
  })();

  const handleDownload = () => {
    const activePdf = resumeData || (candidate.resumePDF && candidate.resumePDF.startsWith("data:") ? candidate.resumePDF : "");
    if (activePdf) {
      const link = document.createElement("a");
      link.href = activePdf;
      link.download = cleanFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // If it is just a filename placeholder, download the text content of the resume as a standard txt file
      const separator = "==========================================================";
      const subSeparator = "----------------------------------------------------------";
      const textContent = `${separator}
RESUME OF ${candidate.name.toUpperCase()}
${separator}
Applied Position: ${candidate.role}
Email: ${candidate.email}
Phone: ${candidate.phone}
Age: ${candidate.age || "Not specified"}
Location: ${candidate.location}

EXPERIENCE: ${candidate.experience}
EDUCATION: ${candidate.education}

${subSeparator}
RESUME TRANSCRIPT & CORE DETAILS
${subSeparator}
${candidate.resumeText}

${separator}
Generated via Recruitment CRM Portal
${separator}`;
      
      const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = cleanFilename.endsWith(".pdf") ? cleanFilename.replace(".pdf", ".txt") : `${cleanFilename}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Candidate Details Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Candidate Details</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Applicant contact & baseline profile</p>
          </div>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-wider">
            Verified Profile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-700">
          <div className="flex items-start gap-2.5">
            <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[8px]">Full Legal Name</span>
              <span className="font-extrabold text-slate-800 text-xs">{candidate.name}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Briefcase className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[8px]">Job Applied For</span>
              <span className="font-extrabold text-indigo-600 text-xs">{candidate.role}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[8px]">Email ID</span>
              <span className="font-semibold text-slate-800">{candidate.email}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[8px]">Phone Number</span>
              <span className="font-semibold text-slate-800">{candidate.phone}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[8px]">Age</span>
              <span className="font-semibold text-slate-800">{candidate.age || "Not specified"} years</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[8px]">Location</span>
              <span className="font-semibold text-slate-800">{candidate.location}</span>
            </div>
          </div>
        </div>

        {/* Download Link Button situated below */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="font-bold text-slate-400 uppercase tracking-wider block text-[8px]">Resume Attachment File</span>
            <span className="text-[11px] font-extrabold text-slate-700 truncate block max-w-xs">{cleanFilename}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {blobUrl && (
              <button
                onClick={() => window.open(blobUrl, "_blank")}
                className="text-xs font-black bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider self-stretch sm:self-auto shrink-0"
                title="Open PDF in a fresh full-screen tab"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open PDF in New Tab
              </button>
            )}
            <button
              onClick={handleDownload}
              className="text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider self-stretch sm:self-auto shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Download Original Resume
            </button>
          </div>
        </div>
      </div>

      {/* Original Uploaded Resume Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Original Resume Preview
          </h3>
        </div>

        {blobUrl ? (
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100">
            <iframe
              src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-[650px] border-none bg-slate-100"
              title="Original Resume PDF"
            />
          </div>
        ) : (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
            <AlertCircle className="w-9 h-9 text-amber-500" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">Original Resume Document Preview</p>
              <p className="text-[10px] text-slate-400 max-w-md mx-auto">
                No active PDF stream is stored in memory for this candidate. You can view the transcribed resume text below or download the file.
              </p>
            </div>
            
            {candidate.resumeText && (
              <div className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 max-h-[300px] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-[10px] text-slate-600 leading-relaxed">
                  {candidate.resumeText}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
