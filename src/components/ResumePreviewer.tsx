import React, { useState, useEffect } from "react";
import { FileText, Download, ExternalLink, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { Candidate } from "../types";
import { localResumeStorage } from "../lib/localResumeStorage";

interface ResumePreviewerProps {
  candidate: Candidate;
}

export default function ResumePreviewer({ candidate }: ResumePreviewerProps) {
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"pdf" | "text">("pdf");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasPdf, setHasPdf] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function loadResumePDF() {
      try {
        // 1. Try to load from IndexedDB or LocalStorage
        let data = await localResumeStorage.getResume(candidate.id);

        // 2. Fallback to candidate.resumePDF if it starts with "data:"
        if (!data && candidate.resumePDF && candidate.resumePDF.startsWith("data:")) {
          data = candidate.resumePDF;
        }

        if (!active) return;

        if (data && data.startsWith("data:")) {
          setHasPdf(true);
          try {
            const arr = data.split(",");
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);
            setActiveTab("pdf");
          } catch (e) {
            console.error("Failed to generate PDF blob URL:", e);
            setBlobUrl(data); // fallback to raw data URI
            setActiveTab("pdf");
          }
        } else {
          setHasPdf(false);
          setBlobUrl("");
          setActiveTab("text");
        }
      } catch (err) {
        console.error("Error loading original resume PDF:", err);
        setHasPdf(false);
        setBlobUrl("");
        setActiveTab("text");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadResumePDF();

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [candidate.id, candidate.resumePDF]);

  const cleanFilename = (() => {
    if (!candidate.resumePDF) return `${candidate.name.toLowerCase().replace(/\s+/g, "_")}_resume.pdf`;
    if (candidate.resumePDF.startsWith("data:")) return `${candidate.name.toLowerCase().replace(/\s+/g, "_")}_resume.pdf`;
    if (candidate.resumePDF.includes("|")) return candidate.resumePDF.split("|")[0];
    return candidate.resumePDF;
  })();

  const handleDownload = () => {
    const activePdf = blobUrl || (candidate.resumePDF && candidate.resumePDF.startsWith("data:") ? candidate.resumePDF : "");
    if (activePdf) {
      const link = document.createElement("a");
      link.href = activePdf;
      link.download = cleanFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback: download plain text resume
      const textContent = `==========================================================
CANDIDATE PROFILE: ${candidate.name}
Job Applied For: ${candidate.role}
Email: ${candidate.email}
Phone: ${candidate.phone}
==========================================================
${candidate.resumeText || "No resume text content stored."}
`;
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
    <div id="resume-previewer" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden animate-in fade-in duration-200">
      {/* Main Content Pane - Plain PDF Document */}
      <div className="relative bg-slate-100 min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-50 min-h-[400px]">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Loading PDF...</span>
          </div>
        ) : blobUrl ? (
          <div className="w-full h-[650px] bg-slate-100 relative">
            <iframe
              src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-full border-none bg-slate-100"
              title="Resume PDF Document"
            />
          </div>
        ) : (
          /* Plain Text View when PDF blob is not available */
          <div className="p-5 bg-white">
            <div className="bg-white rounded-xl border border-slate-200 shadow-inner p-4 sm:p-6 max-h-[600px] overflow-y-auto">
              {candidate.resumeText ? (
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed select-text">
                  {candidate.resumeText}
                </pre>
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs font-bold text-slate-500">No Resume Document Available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer controls: View Full-Screen PDF & Download Original Resume */}
      <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <span className="font-bold text-slate-400 uppercase tracking-wider block text-[8px]">Attached File</span>
          <span className="text-[11px] font-extrabold text-slate-700 truncate block max-w-xs">{cleanFilename}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {blobUrl && (
            <button
              onClick={() => window.open(blobUrl, "_blank")}
              className="text-xs font-extrabold bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider self-stretch sm:self-auto"
              title="Open full-screen PDF in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Full-Screen PDF
            </button>
          )}
          <button
            onClick={handleDownload}
            className="text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider self-stretch sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" /> Download Original Resume
          </button>
        </div>
      </div>
    </div>
  );
}
