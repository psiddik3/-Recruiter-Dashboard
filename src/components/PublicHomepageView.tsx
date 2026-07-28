import React, { useEffect, useState } from "react";
import { Job, Recruiter } from "../types";
import { Briefcase, MapPin, DollarSign, UserCircle2 } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

interface PublicHomepageViewProps {
  jobs: Job[];
  teamRecruiters: Recruiter[];
  companyName: string;
  companyLogo?: string;
}

export default function PublicHomepageView({ jobs, teamRecruiters, companyName, companyLogo }: PublicHomepageViewProps) {
  const activeJobs = jobs.filter(j => j.status === "active");
  const [recruiterId, setRecruiterId] = useState<string | null>(null);
  const [homePosts, setHomePosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Load home posts from Firestore
  useEffect(() => {
    async function fetchHomePosts() {
      if (!db) {
        setLoadingPosts(false);
        return;
      }
      try {
        const colRef = collection(db, "home_posts");
        const q = query(colRef, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const posts = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setHomePosts(posts);
      } catch (e) {
        console.error("Error loading home posts:", e);
      } finally {
        setLoadingPosts(false);
      }
    }
    fetchHomePosts();
  }, []);

  // Helper to match a home post to a local job
  const getMatchingJob = (post: any) => {
    // 1. Try to find by matching title and location (most robust across local/Firestore sync)
    let found = jobs.find(j => 
      (j.title || "").toLowerCase().trim() === (post.title || "").toLowerCase().trim() &&
      (j.location || "").toLowerCase().trim() === (post.location || "").toLowerCase().trim()
    );
    if (found) return found;

    // 2. Try to find by numeric ID matching
    if (/^\d+$/.test(post.jobId)) {
      found = jobs.find(j => String(j.id) === String(post.jobId));
      if (found) return found;
    }

    // 3. Try to find by mapping string ID to numeric ID
    if (post.jobId) {
      const cleanId = String(post.jobId).replace(/\D/g, "");
      if (cleanId) {
        const numId = parseInt(cleanId.slice(-8), 10);
        found = jobs.find(j => j.id === numId);
        if (found) return found;
      }
    }

    return null;
  };

  // Scroll to and highlight post if jobId/hash is in URL/hash
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("jobId");
    const rId = params.get("recruiterId");
    if (rId) {
      setRecruiterId(rId);
    }
    if (jobId) {
      setTimeout(() => {
        const element = document.getElementById(`home-post-${jobId}`) || document.getElementById(`job-post-${jobId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-4", "ring-indigo-100", "ring-offset-2");
          setTimeout(() => element.classList.remove("ring-4", "ring-indigo-100", "ring-offset-2"), 2000);
        }
      }, 500);
    }
  }, [homePosts, jobs]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash !== "#jobs") {
      const cleanHash = hash.replace("#", "");
      setTimeout(() => {
        const element = document.getElementById(`home-post-${cleanHash}`) || document.getElementById(`job-post-${cleanHash}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-4", "ring-indigo-100", "ring-offset-2");
          setTimeout(() => element.classList.remove("ring-4", "ring-indigo-100", "ring-offset-2"), 2000);
        }
      }, 500);
    }
  }, [homePosts, jobs]);

  // Determine display posts, falling back to activeJobs if home_posts is empty
  const displayItems = homePosts.length > 0 ? homePosts : activeJobs;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                <span className="text-white font-black text-sm">{companyName.charAt(0)}</span>
              </div>
            )}
            <h1 className="font-extrabold text-slate-900 text-lg tracking-tight">{companyName} Careers</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {displayItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No open positions</h3>
            <p className="text-sm text-slate-500 font-medium">Check back later for new opportunities.</p>
          </div>
        ) : (
          displayItems.map(item => {
            const isPost = 'jobId' in item;
            const post = isPost ? item : null;
            const matchingJob = post ? getMatchingJob(post) : (item as Job);

            const title = post ? post.title : (item as Job).title;
            const experience = post ? post.experience : (item as Job).experience;
            const salary = post ? post.salary : (item as Job).salary;
            const location = post ? post.location : (item as Job).location;
            const employment = matchingJob ? matchingJob.employment : "Full Time";
            const skills = matchingJob ? matchingJob.skills : [];
            const jobIdForRedirect = matchingJob ? matchingJob.id : (post ? post.jobId : (item as Job).id);

            const postedBy = (post && (post as any).postedBy) || (matchingJob ? matchingJob.postedBy : "Hiring Team");
            const recruiter = teamRecruiters.find(r => r.name === postedBy);
            const authorName = recruiter ? recruiter.name : postedBy;

            const skillsText = Array.isArray(skills) ? skills.slice(0, 3).join(', ') : (typeof skills === 'string' ? skills : "");

            return (
              <div 
                key={item.id} 
                id={`home-post-${item.id}`} 
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-500 cursor-pointer hover:shadow-md hover:border-indigo-200"
                onClick={() => {
                  window.location.hash = 'jobs';
                  window.location.href = `/apply?jobId=${jobIdForRedirect}${recruiterId ? `&recruiterId=${recruiterId}` : ""}`;
                }}
              >
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <UserCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{authorName}</h3>
                    <p className="text-[11px] font-semibold text-slate-500">Recruiter at {companyName}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Hiring Now
                    </span>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <p className="text-slate-700 text-sm font-medium leading-relaxed">
                      We are hiring for this job. Currently looking for a <span className="font-bold text-slate-900">{title}</span> to join our team.
                      Taking on roles requiring {skillsText || "matching skills"} and {experience} experience.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-base">{title}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {location}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {employment}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> {salary}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
