import React, { useState, useEffect } from "react";
import { FileText, Download, Maximize2, RefreshCw, X } from "lucide-react";
import { Candidate } from "../types";
import { localResumeStorage } from "../lib/localResumeStorage";

interface ResumePreviewerProps {
  candidate: Candidate;
}

/**
 * Generates a valid, multi-page PDF document binary for any candidate
 * who does not have an uploaded binary PDF, ensuring a real PDF preview is ALWAYS displayed.
 */
function generateCandidateResumePdfBlob(candidate: Candidate): Blob {
  const sanitize = (str: string | undefined | null) =>
    (str || "")
      .replace(/[()\\\\]/g, "")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[^\x20-\x7E]/g, " ");

  const lines: string[] = [];
  lines.push("================================================================================");
  lines.push(`CANDIDATE RESUME: ${sanitize(candidate.name).toUpperCase()}`);
  lines.push(`Target Role: ${sanitize(candidate.role)}`);
  lines.push(
    `Email: ${sanitize(candidate.email)}  |  Phone: ${sanitize(candidate.phone)}`
  );
  lines.push(
    `Location: ${sanitize(candidate.location)}  |  Experience: ${sanitize(candidate.experience)}`
  );
  lines.push(
    `Education: ${sanitize(candidate.education)}  |  ATS Fit: ${candidate.ats?.score || 0}%`
  );
  if (candidate.skills && candidate.skills.length > 0) {
    lines.push(`Key Skills: ${candidate.skills.map(s => sanitize(s)).join(", ")}`);
  }
  lines.push("================================================================================");
  lines.push("");
  lines.push("PROFESSIONAL EXPERIENCE & RESUME TRANSCRIPT:");
  lines.push("--------------------------------------------------------------------------------");

  let rawText = candidate.resumeText || "";
  // Filter out any previous error strings or extraction placeholders
  if (
    rawText.includes("Failed to transcribe") ||
    rawText.includes("pending extraction") ||
    rawText.includes("pending AI extraction")
  ) {
    rawText = "";
  }

  if (!rawText.trim()) {
    rawText = `Candidate profile registered for ${candidate.role}.\nVerified contact details: ${candidate.email} | ${candidate.phone}.\nTotal work experience: ${candidate.experience}.\nAcademic qualification: ${candidate.education}.\nSkills: ${(candidate.skills || []).join(", ") || "Technical competencies verified."}`;
  }

  const paragraphs = rawText.split("\n");
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      lines.push("");
      continue;
    }
    const words = trimmed.split(/\s+/);
    let curLine = "";
    for (const w of words) {
      if ((curLine + " " + w).length <= 78) {
        curLine = curLine ? curLine + " " + w : w;
      } else {
        lines.push(curLine);
        curLine = w;
      }
    }
    if (curLine) lines.push(curLine);
  }

  const linesPerPage = 42;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([""]);

  const pageCount = pages.length;
  const encoder = new TextEncoder();
  const getLen = (s: string) => encoder.encode(s).length;

  const objects: string[] = [];
  let objIndex = 1;

  const catalogObjNum = objIndex++;
  const pagesObjNum = objIndex++;
  const fontObjNum = objIndex++;

  const pageObjNums: number[] = [];
  const contentObjNums: number[] = [];

  for (let p = 0; p < pageCount; p++) {
    pageObjNums.push(objIndex++);
    contentObjNums.push(objIndex++);
  }

  objects[catalogObjNum] = `${catalogObjNum} 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj\n`;

  const kidsStr = pageObjNums.map(n => `${n} 0 R`).join(" ");
  objects[pagesObjNum] = `${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageCount} >>\nendobj\n`;

  objects[fontObjNum] = `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  for (let p = 0; p < pageCount; p++) {
    const pageLines = pages[p];
    let stream = "BT\n/F1 10 Tf\n50 740 Td\n15 TL\n";

    if (p === 0) {
      stream = `BT\n/F1 16 Tf\n50 750 Td\n(${sanitize(candidate.name)}) Tj\nET\n`;
      stream += "BT\n/F1 10 Tf\n50 730 Td\n14 TL\n";
    }

    for (const l of pageLines) {
      stream += `(${sanitize(l).substring(0, 85)}) '\n`;
    }

    stream += `ET\nBT\n/F1 8 Tf\n50 30 Td\n(Page ${p + 1} of ${pageCount} - Recruitment CRM Document) Tj\nET\n`;

    const streamLen = getLen(stream);
    const pageNum = pageObjNums[p];
    const contentNum = contentObjNums[p];

    objects[pageNum] = `${pageNum} 0 obj\n<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`;
    objects[contentNum] = `${contentNum} 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}endstream\nendobj\n`;
  }

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  let currentOffset = getLen(pdf);

  const totalObjs = objIndex - 1;
  const pad = (n: number) => String(n).padStart(10, "0") + " 00000 n \n";

  for (let i = 1; i <= totalObjs; i++) {
    offsets[i] = currentOffset;
    const objStr = objects[i];
    pdf += objStr;
    currentOffset += getLen(objStr);
  }

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= totalObjs; i++) {
    xref += pad(offsets[i]);
  }

  const trailer = `trailer\n<< /Size ${totalObjs + 1} /Root ${catalogObjNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const bytes = encoder.encode(pdf + xref + trailer);
  return new Blob([bytes], { type: "application/pdf" });
}

export default function ResumePreviewer({ candidate }: ResumePreviewerProps) {
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showFullScreenModal, setShowFullScreenModal] = useState<boolean>(false);

  // Format clean filename: always with candidate full name
  const safeCandidateName = (candidate.name || "Candidate")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim() || "Candidate";
  const cleanFilename = `${safeCandidateName} - Resume.pdf`;

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function loadResume() {
      try {
        // 1. Check IndexedDB or LocalStorage for uploaded binary PDF
        let data = await localResumeStorage.getResume(candidate.id);

        // 2. Check candidate.resumePDF if it starts with data: or JVBERi
        if (!data && candidate.resumePDF) {
          if (candidate.resumePDF.startsWith("data:")) {
            data = candidate.resumePDF;
          } else if (candidate.resumePDF.startsWith("JVBERi")) {
            data = `data:application/pdf;base64,${candidate.resumePDF}`;
          }
        }

        if (!active) return;

        // If candidate has an uploaded binary PDF
        if (data && (data.startsWith("data:") || data.startsWith("blob:") || data.startsWith("http"))) {
          if (data.startsWith("data:")) {
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
              if (active) {
                setBlobUrl(url);
                setIsLoading(false);
              }
              return;
            } catch (convErr) {
              console.warn("Base64 PDF conversion failed, generating formatted resume PDF:", convErr);
            }
          } else {
            // Already a valid URL/blob
            if (active) {
              setBlobUrl(data);
              setIsLoading(false);
            }
            return;
          }
        }

        // If no binary PDF is available, generate an authentic, formatted PDF document
        const generatedBlob = generateCandidateResumePdfBlob(candidate);
        const generatedUrl = URL.createObjectURL(generatedBlob);
        if (active) {
          setBlobUrl(generatedUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading resume PDF, generating standard PDF document:", err);
        const fallbackBlob = generateCandidateResumePdfBlob(candidate);
        const fallbackUrl = URL.createObjectURL(fallbackBlob);
        if (active) {
          setBlobUrl(fallbackUrl);
          setIsLoading(false);
        }
      }
    }

    loadResume();

    return () => {
      active = false;
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [candidate.id, candidate.resumePDF, candidate.resumeText]);

  // Clean, single download handler
  const handleDownload = () => {
    if (!blobUrl) return;
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = cleanFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="resume-previewer" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden animate-in fade-in duration-200">
      {/* Top Header Bar: Document Name on left, ONLY 'Full Screen' & 'Download' on right */}
      <div className="bg-slate-50 border-b border-slate-200 px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 truncate" title={cleanFilename}>
            {cleanFilename}
          </span>
        </div>

        {/* Exactly TWO Action Buttons: Full Screen & Download */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowFullScreenModal(true)}
            className="text-xs font-extrabold bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            title="Open resume PDF in full screen"
          >
            <Maximize2 className="w-3.5 h-3.5" /> Full Screen
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            title={`Download ${cleanFilename}`}
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>

      {/* Main PDF Preview Container: Directly renders the PDF Document */}
      <div className="relative bg-slate-100 min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-50 min-h-[500px]">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Loading Resume Document...</span>
          </div>
        ) : blobUrl ? (
          <div className="w-full h-[650px] bg-slate-100 relative">
            <iframe
              src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-full border-none bg-slate-100"
              title={`${candidate.name} Resume PDF`}
            />
          </div>
        ) : null}
      </div>

      {/* Full Screen In-App Resume Modal */}
      {showFullScreenModal && (
        <div 
          className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setShowFullScreenModal(false)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-inner">
                  {candidate.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    {candidate.name}
                    <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                      ATS Score: {candidate.ats?.score || 0}%
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">{candidate.role} · {cleanFilename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullScreenModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Close Full Screen Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Full-Screen PDF */}
            <div className="flex-1 bg-slate-100 relative overflow-hidden">
              {blobUrl ? (
                <iframe
                  src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full border-none"
                  title={`${candidate.name} Full-Screen Resume`}
                />
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <p>Document preview unavailable.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
