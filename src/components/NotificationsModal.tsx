import React from "react";
import { Bell, Clock, Briefcase, Mail, Phone, ExternalLink, X, CheckCheck, Sparkles, UserCheck } from "lucide-react";
import { Candidate, Job } from "../types";

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  jobs: Job[];
  onSelectCandidate?: (cand: Candidate) => void;
  readNotificationIds: number[];
  onMarkAllRead: () => void;
  onMarkRead: (id: number) => void;
}

export function formatResponseDateTime(appliedStr: string, timeline?: Array<{ event: string; date: string }>): string {
  if (!appliedStr) return "Just now";

  // If appliedStr already has human date & time
  if (appliedStr.includes("at ") || appliedStr.includes("AM") || appliedStr.includes("PM")) {
    return appliedStr;
  }

  // Check timeline for exact application timestamp
  if (timeline && timeline.length > 0) {
    const applyEvent = timeline.find(t => t.event?.toLowerCase().includes("applied")) || timeline[0];
    if (applyEvent && applyEvent.date) {
      try {
        const d = new Date(applyEvent.date);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + 
            " at " + 
            d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        }
      } catch (e) {
        // fallback
      }
    }
  }

  // If appliedStr is ISO string with T
  if (appliedStr.includes("T")) {
    try {
      const d = new Date(appliedStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + 
          " at " + 
          d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      }
    } catch (e) {
      // fallback
    }
  }

  // If appliedStr is YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(appliedStr)) {
    try {
      const d = new Date(appliedStr + "T09:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " at 09:00 AM";
    } catch (e) {
      return appliedStr;
    }
  }

  return appliedStr;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  candidates,
  jobs,
  onSelectCandidate,
  readNotificationIds,
  onMarkAllRead,
  onMarkRead
}: NotificationsModalProps) {
  if (!isOpen) return null;

  // Sort candidates by newest response
  const sortedCandidates = [...candidates].sort((a, b) => {
    return (b.id || 0) - (a.id || 0);
  });

  const unreadCount = sortedCandidates.filter(c => !readNotificationIds.includes(c.id)).length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                Job Application Notifications
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full border border-rose-200">
                    {unreadCount} New Response(s)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Real-time candidate job application response log & timestamps</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-100/50 px-3 py-1.5 rounded-xl border border-indigo-200/60 transition-all flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
          {sortedCandidates.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No Job Responses Received Yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                When candidates submit applications for your job openings, response alerts and timestamps will appear here in real-time.
              </p>
            </div>
          ) : (
            sortedCandidates.map((cand) => {
              const targetJob = jobs.find(j => j.id === cand.jobId);
              const isRead = readNotificationIds.includes(cand.id);
              const responseTimeStr = formatResponseDateTime(cand.applied, cand.timeline);

              return (
                <div
                  key={cand.id}
                  onClick={() => {
                    onMarkRead(cand.id);
                    if (onSelectCandidate) {
                      onSelectCandidate(cand);
                      onClose();
                    }
                  }}
                  className={`pt-3.5 first:pt-0 p-4 rounded-2xl transition-all cursor-pointer border ${
                    isRead 
                      ? "bg-white border-slate-100 hover:bg-slate-50/80" 
                      : "bg-indigo-50/40 border-indigo-100/80 hover:bg-indigo-50/70 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      {/* Job title & unread dot */}
                      <div className="flex items-center gap-2">
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/60 px-2.5 py-0.5 rounded-md border border-indigo-200/50">
                          <Briefcase className="w-3 h-3 inline mr-1 -mt-0.5" />
                          {targetJob ? targetJob.title : cand.role}
                        </span>
                        {cand.stage && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                            {cand.stage}
                          </span>
                        )}
                      </div>

                      {/* Candidate Name & Contact */}
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          {cand.name}
                        </h4>
                        <span className="text-xs text-slate-500 font-semibold">({cand.role})</span>
                      </div>

                      {/* Response Date & Time */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-xl font-bold">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Job Response Time: <strong className="text-amber-950 font-black">{responseTimeStr}</strong></span>
                        </div>
                        {cand.email && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400" /> {cand.email}
                          </span>
                        )}
                        {cand.phone && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400" /> {cand.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 font-extrabold text-xs px-3 py-2 rounded-xl border border-indigo-200 hover:border-indigo-600 transition-all shadow-2xs shrink-0 flex items-center gap-1.5 self-center"
                    >
                      View Profile <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center shrink-0">
          <p className="text-[11px] text-slate-500 font-semibold">
            All candidate job response timestamps are synchronized with your ATS Database in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}
