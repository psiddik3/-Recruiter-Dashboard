import React, { useEffect, useState } from "react";
import { Job, Recruiter } from "../types";
import { Briefcase, MapPin, DollarSign, UserCircle2, Newspaper, MessageSquare, Plus, ThumbsUp, MessageCircle, Sparkles, Send, Eye, Heart, Trash2, Rocket, Globe, ExternalLink, Image as ImageIcon, Clock, Award } from "lucide-react";
import { homeFeedDb, communityFeedDb, startupFeedDb, HomePost, CommunityPost, StartupPost, CommentItem } from "../lib/firebase";
import { formatTitleCase } from "../lib/formatUtils";

interface PublicHomepageViewProps {
  jobs: Job[];
  teamRecruiters: Recruiter[];
  companyName: string;
  companyLogo?: string;
}

export default function PublicHomepageView({ jobs, teamRecruiters, companyName, companyLogo }: PublicHomepageViewProps) {
  const [activeTab, setActiveTab] = useState<"home" | "startup" | "community" | "jobs">("startup");
  
  // Real-time feeds state
  const [homePosts, setHomePosts] = useState<HomePost[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [startupPosts, setStartupPosts] = useState<StartupPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Filters
  const [communityCategoryFilter, setCommunityCategoryFilter] = useState<string>("all");

  // Post creation modal states
  const [showHomePostModal, setShowHomePostModal] = useState(false);
  const [newHomeTitle, setNewHomeTitle] = useState("");
  const [newHomeAuthor, setNewHomeAuthor] = useState("");
  const [newHomeCategory, setNewHomeCategory] = useState("Career & Tech");
  const [newHomeContent, setNewHomeContent] = useState("");
  const [isSubmittingHome, setIsSubmittingHome] = useState(false);

  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [newCommTitle, setNewCommTitle] = useState("");
  const [newCommAuthor, setNewCommAuthor] = useState("");
  const [newCommCategory, setNewCommCategory] = useState("Career Guidance");
  const [newCommContent, setNewCommContent] = useState("");
  const [isSubmittingComm, setIsSubmittingComm] = useState(false);

  // Expanded Post Detail Modal States
  const [expandedHomePost, setExpandedHomePost] = useState<HomePost | null>(null);
  const [visitorCommentName, setVisitorCommentName] = useState("");
  const [visitorCommentText, setVisitorCommentText] = useState("");

  const [expandedCommunityPost, setExpandedCommunityPost] = useState<CommunityPost | null>(null);
  const [visitorAnswerName, setVisitorAnswerName] = useState("");
  const [visitorAnswerText, setVisitorAnswerText] = useState("");

  const [recruiterId, setRecruiterId] = useState<string | null>(null);

  const getDaysRemaining = (job: Job): number => {
    if (job.expiresAt) {
      const diffMs = new Date(job.expiresAt).getTime() - new Date().getTime();
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
    const created = job.createdAt ? new Date(job.createdAt) : new Date();
    const duration = job.durationDays || 15;
    const expiry = new Date(created.getTime() + duration * 24 * 60 * 60 * 1000);
    const diffMs = expiry.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const activeJobs = jobs.filter(j => j.status === "active" && getDaysRemaining(j) > 0);

  const handleApplyNavigate = (jobId: number | string, customRecruiterId?: string) => {
    const job = jobs.find(j => String(j.id) === String(jobId) || j.firebaseId === String(jobId));
    if (job?.externalApplyUrl && job.externalApplyUrl.trim()) {
      let target = job.externalApplyUrl.trim();
      if (!/^https?:\/\//i.test(target)) {
        target = "https://" + target;
      }
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }
    const targetRecruiter = customRecruiterId || recruiterId;
    const targetUrl = `/apply?jobId=${jobId}${targetRecruiter ? `&recruiterId=${targetRecruiter}` : ""}`;
    window.history.pushState({}, "", targetUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Real-time Firestore subscriptions for Home Feed & Community Feed
  useEffect(() => {
    // 1. Home posts subscription
    const unsubHome = homeFeedDb.subscribeAll((posts) => {
      const published = posts.filter(p => p.status !== "draft");
      setHomePosts(published);
      setLoadingPosts(false);

      setExpandedHomePost(prev => {
        if (!prev) return null;
        return published.find(p => p.id === prev.id) || prev;
      });
    });

    // 2. Community posts subscription
    const unsubComm = communityFeedDb.subscribeAll((posts) => {
      const published = posts.filter(p => p.status !== "draft");
      setCommunityPosts(published);

      setExpandedCommunityPost(prev => {
        if (!prev) return null;
        return published.find(p => p.id === prev.id) || prev;
      });
    });

    // 3. Startup posts subscription
    const unsubStartup = startupFeedDb.subscribeAll((posts) => {
      setStartupPosts(posts);
      setLoadingPosts(false);
    });

    return () => {
      unsubHome();
      unsubComm();
      unsubStartup();
    };
  }, []);

  const handleAddVisitorComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedHomePost || !visitorCommentText.trim()) return;

    const newCommentItem: CommentItem = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: visitorCommentName.trim() || "Community Visitor",
      text: visitorCommentText.trim(),
      createdAt: new Date().toISOString()
    };

    setExpandedHomePost(prev => prev ? { ...prev, comments: [...(prev.comments || []), newCommentItem] } : null);
    setHomePosts(prev => prev.map(p => p.id === expandedHomePost.id ? { ...p, comments: [...(p.comments || []), newCommentItem] } : p));

    await homeFeedDb.addComment(expandedHomePost.id, {
      id: newCommentItem.id,
      author: visitorCommentName.trim() || "Community Visitor",
      text: visitorCommentText.trim()
    });

    setVisitorCommentText("");
  };

  const handleDeleteVisitorComment = async (postId: string, commentId: string) => {
    console.log(`[DELETE_BUTTON_CLICKED] Visitor comment delete button clicked:`, { postId, commentId });
    if (!commentId) return;

    setExpandedHomePost(prev => {
      if (!prev) return null;
      const comments = prev.comments || [];
      const targetIdx = comments.findIndex((c, i) => c.id === commentId || `comment-${i}-${c.createdAt || c.text?.slice(0, 8) || ''}` === commentId);
      const remaining = targetIdx !== -1 ? comments.filter((_, i) => i !== targetIdx) : comments.filter(c => c.id && c.id !== commentId);
      return { ...prev, comments: remaining };
    });

    setHomePosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = p.comments || [];
      const targetIdx = comments.findIndex((c, i) => c.id === commentId || `comment-${i}-${c.createdAt || c.text?.slice(0, 8) || ''}` === commentId);
      const remaining = targetIdx !== -1 ? comments.filter((_, i) => i !== targetIdx) : comments.filter(c => c.id && c.id !== commentId);
      return { ...p, comments: remaining };
    }));

    await homeFeedDb.deleteComment(postId, commentId);
  };

  const handleAddVisitorAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedCommunityPost || !visitorAnswerText.trim()) return;

    const newAnswerItem: CommentItem = {
      id: `answer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: visitorAnswerName.trim() || "Community Member",
      text: visitorAnswerText.trim(),
      createdAt: new Date().toISOString()
    };

    setExpandedCommunityPost(prev => {
      if (!prev) return null;
      const updated = [...(prev.answers || []), newAnswerItem];
      return { ...prev, answers: updated, commentsCount: updated.length };
    });
    setCommunityPosts(prev => prev.map(p => {
      if (p.id !== expandedCommunityPost.id) return p;
      const updated = [...(p.answers || []), newAnswerItem];
      return { ...p, answers: updated, commentsCount: updated.length };
    }));

    await communityFeedDb.addAnswer(expandedCommunityPost.id, {
      id: newAnswerItem.id,
      author: visitorAnswerName.trim() || "Community Member",
      text: visitorAnswerText.trim()
    });

    setVisitorAnswerText("");
  };

  const handleDeleteVisitorAnswer = async (postId: string, answerId: string) => {
    console.log(`[DELETE_BUTTON_CLICKED] Visitor answer delete button clicked:`, { postId, answerId });
    if (!answerId) return;

    setExpandedCommunityPost(prev => {
      if (!prev) return null;
      const answers = prev.answers || [];
      const targetIdx = answers.findIndex((a, i) => a.id === answerId || `answer-${i}-${a.createdAt || a.text?.slice(0, 8) || ''}` === answerId);
      const remaining = targetIdx !== -1 ? answers.filter((_, i) => i !== targetIdx) : answers.filter(a => a.id && a.id !== answerId);
      return { ...prev, answers: remaining, commentsCount: remaining.length };
    });

    setCommunityPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const answers = p.answers || [];
      const targetIdx = answers.findIndex((a, i) => a.id === answerId || `answer-${i}-${a.createdAt || a.text?.slice(0, 8) || ''}` === answerId);
      const remaining = targetIdx !== -1 ? answers.filter((_, i) => i !== targetIdx) : answers.filter(a => a.id && a.id !== answerId);
      return { ...p, answers: remaining, commentsCount: remaining.length };
    }));

    await communityFeedDb.deleteAnswer(postId, answerId);
  };

  // Handle URL params for direct job links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("jobId");
    const rId = params.get("recruiterId");
    if (rId) setRecruiterId(rId);
    if (jobId) {
      setActiveTab("jobs");
      setTimeout(() => {
        const element = document.getElementById(`home-post-${jobId}`) || document.getElementById(`job-post-${jobId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-4", "ring-indigo-100", "ring-offset-2");
          setTimeout(() => element.classList.remove("ring-4", "ring-indigo-100", "ring-offset-2"), 2000);
        }
      }, 500);
    }
  }, []);

  // Post creation handler for Home Feed
  const handleCreateHomePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeTitle.trim() || !newHomeContent.trim()) return;
    setIsSubmittingHome(true);

    const docId = await homeFeedDb.createPost({
      title: newHomeTitle.trim(),
      content: newHomeContent.trim(),
      snippet: newHomeContent.trim().slice(0, 140),
      postedBy: newHomeAuthor.trim() || "Public Portal Contributor",
      category: newHomeCategory,
      status: "published",
      viewsCount: 1,
      likesCount: 0
    });

    setIsSubmittingHome(false);
    setShowHomePostModal(false);
    setNewHomeTitle("");
    setNewHomeContent("");
    setNewHomeAuthor("");

    if (docId) {
      alert("Article published! It is now live on the Spread One Home Feed and visible in Founder CRM moderation.");
    }
  };

  // Post creation handler for Community Feed
  const handleCreateCommunityPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommTitle.trim() || !newCommContent.trim()) return;
    setIsSubmittingComm(true);

    const docId = await communityFeedDb.createPost({
      title: newCommTitle.trim(),
      content: newCommContent.trim(),
      category: newCommCategory,
      postedBy: newCommAuthor.trim() || "Community Member",
      status: "published",
      upvotesCount: 0,
      commentsCount: 0
    });

    setIsSubmittingComm(false);
    setShowCommunityModal(false);
    setNewCommTitle("");
    setNewCommContent("");
    setNewCommAuthor("");

    if (docId) {
      alert("Question posted! It is now live on the Community Feed and visible in Founder CRM moderation.");
    }
  };

  const handleUpvoteQuestion = async (post: CommunityPost, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedCount = (post.upvotesCount || 0) + 1;
    setCommunityPosts(prev => prev.map(p => p.id === post.id ? { ...p, upvotesCount: updatedCount } : p));
    await communityFeedDb.updatePost(post.id, { upvotesCount: updatedCount });
  };

  const handleLikeHomePost = async (post: HomePost, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedLikes = (post.likesCount || 0) + 1;
    setHomePosts(prev => prev.map(p => p.id === post.id ? { ...p, likesCount: updatedLikes } : p));
    await homeFeedDb.updatePost(post.id, { likesCount: updatedLikes });
  };

  const filteredCommunity = communityPosts.filter(p => 
    communityCategoryFilter === "all" || p.category === communityCategoryFilter
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="h-8 object-contain" />
            ) : (
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                <span className="text-white font-black text-base">{companyName.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-slate-900 text-base tracking-tight">{companyName} Public Portal</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spread One Feed & Community</p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2">
            {activeTab === "home" && (
              <button
                type="button"
                onClick={() => setShowHomePostModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Post Article
              </button>
            )}

            {activeTab === "community" && (
              <button
                type="button"
                onClick={() => setShowCommunityModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Ask Question
              </button>
            )}
          </div>
        </div>

        {/* Tab Sub-Navigation */}
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 text-xs font-extrabold border-t border-slate-100 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("startup")}
            className={`pb-2.5 transition-all cursor-pointer flex items-center gap-2 border-b-2 shrink-0 ${activeTab === "startup" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Rocket className="w-4 h-4 text-emerald-600" /> Startup Feed ({startupPosts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className={`pb-2.5 transition-all cursor-pointer flex items-center gap-2 border-b-2 shrink-0 ${activeTab === "home" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Newspaper className="w-4 h-4" /> Home Feed Articles ({homePosts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("community")}
            className={`pb-2.5 transition-all cursor-pointer flex items-center gap-2 border-b-2 shrink-0 ${activeTab === "community" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <MessageSquare className="w-4 h-4" /> Community Q&A ({communityPosts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`pb-2.5 transition-all cursor-pointer flex items-center gap-2 border-b-2 shrink-0 ${activeTab === "jobs" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <Briefcase className="w-4 h-4" /> Open Positions ({activeJobs.length})
          </button>
        </div>
      </header>

      {/* Main Feed Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 space-y-6">

        {/* ================= STARTUP FEED TAB ================= */}
        {activeTab === "startup" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 shadow-lg border border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5" /> Spread One • Startup News & Intel
                </span>
                <h2 className="text-xl font-black tracking-tight">Startup Ecosystem & Venture Updates</h2>
                <p className="text-xs text-slate-300 font-medium">
                  Funding rounds, founder stories, accelerator batches, and ecosystem developments published directly from the Founder Console.
                </p>
              </div>
              <span className="bg-emerald-900/80 text-emerald-200 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-700/60 shrink-0">
                {startupPosts.length} Articles Live
              </span>
            </div>

            {startupPosts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                <Rocket className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Startup Posts Available</h3>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">Check back soon or publish startup posts in the Founder Console!</p>
              </div>
            ) : (
              startupPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-emerald-300 space-y-0"
                >
                  {/* Article Banner Header */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg uppercase tracking-wider">
                        {post.category || "General"}
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        {post.sourceName || "Startup News"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently"}
                    </span>
                  </div>

                  {/* Featured Article Image */}
                  {(() => {
                    const fallbackImg = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
                    const catImg = 
                      post.category?.toLowerCase().includes("fund") ? "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80" :
                      post.category?.toLowerCase().includes("accel") ? "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80" :
                      post.category?.toLowerCase().includes("stor") ? "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80" :
                      post.category?.toLowerCase().includes("event") ? "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80" :
                      fallbackImg;

                    const activeImg = post.imageUrl && post.imageUrl.trim().length > 0 ? post.imageUrl : catImg;

                    return (
                      <div className="w-full h-52 sm:h-64 bg-slate-900 overflow-hidden border-b border-slate-100 relative group">
                        <img
                          src={activeImg}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            const imgElem = e.target as HTMLImageElement;
                            if (imgElem.src !== catImg) {
                              imgElem.src = catImg;
                            }
                          }}
                        />
                      </div>
                    );
                  })()}

                  {/* Body Content */}
                  <div className="p-6 space-y-4">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                      {post.title}
                    </h3>

                    <p className="text-slate-700 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {post.article}
                    </p>

                    {post.sourceUrl && post.sourceUrl !== "#" && (
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                        <a
                          href={post.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm"
                        >
                          Read Original Source ({post.sourceName}) <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <span className="text-[10px] text-slate-400 font-mono">Verified Post</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= HOME FEED TAB ================= */}
        {activeTab === "home" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Spread One Home Portal</span>
                <h2 className="text-xl font-black tracking-tight">Public Home Feed & Articles</h2>
                <div className="flex items-center gap-3 pt-1">
                  <span className="bg-indigo-800/80 text-indigo-200 text-xs font-bold px-3 py-1 rounded-full border border-indigo-700">
                    Total Articles: {homePosts.length}
                  </span>
                  <span className="bg-slate-800/80 text-slate-200 text-xs font-bold px-3 py-1 rounded-full border border-slate-700">
                    Total Comments: {homePosts.reduce((sum, p) => sum + (p.comments?.length || 0), 0)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHomePostModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 shadow-sm cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4" /> Create Home Article
              </button>
            </div>

            {homePosts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                <Newspaper className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Home Posts Available</h3>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">Be the first to post an article to the Spread One Home Feed!</p>
                <button
                  type="button"
                  onClick={() => setShowHomePostModal(true)}
                  className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
                >
                  Write Post
                </button>
              </div>
            ) : (
              homePosts.map((post) => (
                <div
                  key={post.id}
                  id={`home-post-${post.id}`}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md hover:border-indigo-200"
                >
                  <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-extrabold text-sm">
                        {post.postedBy ? post.postedBy.charAt(0).toUpperCase() : "R"}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{post.postedBy || "Recruiter / Author"}</h4>
                        <p className="text-[11px] font-semibold text-slate-400">{post.authorRole || "Contributor"} • {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "Recently"}</p>
                      </div>
                    </div>
                    {post.category && (
                      <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                        {post.category}
                      </span>
                    )}
                  </div>

                  <div className="p-6 space-y-3 cursor-pointer" onClick={() => setExpandedHomePost(post)}>
                    {/* POST TITLE */}
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug hover:text-indigo-600 transition-colors">
                      {post.title}
                    </h3>

                    {post.snippet && (
                      <p className="text-xs font-semibold text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                        "{post.snippet}"
                      </p>
                    )}

                    <p className="text-slate-700 text-sm font-medium leading-relaxed line-clamp-3">
                      {post.content}
                    </p>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => handleLikeHomePost(post, e)}
                          className="flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          <Heart className="w-4 h-4 fill-rose-100" />
                          <span>{post.likesCount || 0} Likes</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setExpandedHomePost(post)}
                          className="flex items-center gap-1 text-indigo-600 font-extrabold hover:underline"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> {post.comments?.length || 0} Comments
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedHomePost(post)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
                        >
                          Read Total Article
                        </button>

                        {post.jobId && (
                          <button
                            type="button"
                            onClick={() => handleApplyNavigate(post.jobId)}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-2xs hover:bg-indigo-700 transition-all cursor-pointer"
                          >
                            Apply For Job
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= COMMUNITY FEED TAB ================= */}
        {activeTab === "community" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-violet-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Spread One Community</span>
                <h2 className="text-xl font-black tracking-tight">Questions & Discussions Feed</h2>
                <div className="flex items-center gap-3 pt-1">
                  <span className="bg-violet-800/80 text-violet-200 text-xs font-bold px-3 py-1 rounded-full border border-violet-700">
                    Total Questions: {communityPosts.length}
                  </span>
                  <span className="bg-slate-800/80 text-slate-200 text-xs font-bold px-3 py-1 rounded-full border border-slate-700">
                    Total Answers: {communityPosts.reduce((sum, p) => sum + (p.answers?.length || p.commentsCount || 0), 0)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCommunityModal(true)}
                className="bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> Ask Question
              </button>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {["all", "Career Guidance", "Tech Stack", "Work Culture", "Interview Prep"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCommunityCategoryFilter(cat)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer transition-all whitespace-nowrap ${communityCategoryFilter === cat ? "bg-violet-600 text-white shadow-2xs" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {cat === "all" ? "All Categories" : cat}
                </button>
              ))}
            </div>

            {filteredCommunity.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Community Topics Found</h3>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">Be the first to post a question in this category!</p>
                <button
                  type="button"
                  onClick={() => setShowCommunityModal(true)}
                  className="bg-violet-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
                >
                  Ask Question
                </button>
              </div>
            ) : (
              filteredCommunity.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 hover:shadow-md hover:border-violet-200 transition-all cursor-pointer"
                  onClick={() => setExpandedCommunityPost(post)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-black text-xs flex items-center justify-center">
                        {post.postedBy ? post.postedBy.charAt(0).toUpperCase() : "C"}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{post.postedBy || "Community Member"}</span>
                      <span className="text-[11px] text-slate-400 font-medium">• {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "Recently"}</span>
                    </div>

                    <span className="bg-violet-50 text-violet-700 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {post.category}
                    </span>
                  </div>

                  {/* QUESTION TITLE */}
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug hover:text-violet-600 transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3">
                    {post.content}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleUpvoteQuestion(post, e)}
                      className="bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 hover:border-violet-200 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-violet-600" />
                      <span>{post.upvotesCount || 0} Upvotes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedCommunityPost(post)}
                      className="text-xs font-extrabold text-violet-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Read Total Question & {post.answers?.length || post.commentsCount || 0} Answers
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= JOBS TAB ================= */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            {activeJobs.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No open positions</h3>
                <p className="text-sm text-slate-500 font-medium">Check back later for new opportunities.</p>
              </div>
            ) : (
              activeJobs.map(job => (
                <div 
                  key={job.id} 
                  id={`job-post-${job.id}`} 
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleApplyNavigate(job.id)}
                >
                  <div className="space-y-1">
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase">
                      Hiring Now
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-lg">{formatTitleCase(job.title)}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> {job.location}</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-indigo-500" /> {job.employment}</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-indigo-500" /> {job.salary}</span>
                      {job.experience && (
                        <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-indigo-500" /> {job.experience}</span>
                      )}
                      <span className="flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50/70 border border-indigo-100/80 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-indigo-500" /> {getDaysRemaining(job)} Days Left
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyNavigate(job.id);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-xs transition-all shrink-0 cursor-pointer"
                  >
                    Apply Now
                  </button>
                </div>
              ))
            )}
          </div>
        )}

      </main>

      {/* CREATE HOME ARTICLE MODAL */}
      {showHomePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-indigo-600" /> Post Article to Spread One Home Feed
              </h3>
              <button
                type="button"
                onClick={() => setShowHomePostModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHomePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Article Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Navigating Remote Engineering Teams in 2026"
                  value={newHomeTitle}
                  onChange={(e) => setNewHomeTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your Name / Organization"
                    value={newHomeAuthor}
                    onChange={(e) => setNewHomeAuthor(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newHomeCategory}
                    onChange={(e) => setNewHomeCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Career & Tech">Career & Tech</option>
                    <option value="Market Insights">Market Insights</option>
                    <option value="Salary & Hiring">Salary & Hiring</option>
                    <option value="Company Culture">Company Culture</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Article Body / Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type your complete article content here..."
                  value={newHomeContent}
                  onChange={(e) => setNewHomeContent(e.target.value)}
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHomePostModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHome}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmittingHome ? "Publishing..." : "Publish Article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE COMMUNITY QUESTION MODAL */}
      {showCommunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-violet-600" /> Post Question to Community
              </h3>
              <button
                type="button"
                onClick={() => setShowCommunityModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCommunityPost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Question Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to evaluate full-stack engineering candidates?"
                  value={newCommTitle}
                  onChange={(e) => setNewCommTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={newCommAuthor}
                    onChange={(e) => setNewCommAuthor(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newCommCategory}
                    onChange={(e) => setNewCommCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  >
                    <option value="Career Guidance">Career Guidance</option>
                    <option value="Tech Stack">Tech Stack</option>
                    <option value="Work Culture">Work Culture</option>
                    <option value="Interview Prep">Interview Prep</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Details / Context <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide background context or details for your question..."
                  value={newCommContent}
                  onChange={(e) => setNewCommContent(e.target.value)}
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCommunityModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComm}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmittingComm ? "Posting..." : "Post Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PUBLIC EXPANDED HOME ARTICLE & COMMENTS MODAL */}
      {expandedHomePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-slate-100 space-y-5 my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {expandedHomePost.category && (
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {expandedHomePost.category}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-slate-400">
                    {expandedHomePost.createdAt ? new Date(expandedHomePost.createdAt).toLocaleDateString() : "Recently"}
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xl leading-snug">
                  {expandedHomePost.title}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Posted by <strong className="text-slate-800">{expandedHomePost.postedBy || "Author"}</strong> ({expandedHomePost.authorRole || "Contributor"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedHomePost(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Total Article Body */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Full Article Content</span>
              <p className="text-slate-800 text-sm font-medium leading-relaxed whitespace-pre-line">
                {expandedHomePost.content || expandedHomePost.snippet}
              </p>
            </div>

            {/* Comments Section */}
            <div className="space-y-3 pt-2">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Comments & Discussion ({expandedHomePost.comments?.length || 0})
              </h4>

              {!expandedHomePost.comments || expandedHomePost.comments.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  No comments yet. Be the first to share your perspective!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {expandedHomePost.comments.map((comment, index) => {
                    const commentId = comment.id || `comment-${index}-${comment.createdAt || comment.text?.slice(0, 8) || ''}`;
                    return (
                      <div key={commentId} className="p-3 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 shadow-2xs">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-xs font-extrabold text-slate-900">{comment.author}</strong>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{comment.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteVisitorComment(expandedHomePost.id, commentId)}
                          className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Comment Form */}
              <form onSubmit={handleAddVisitorComment} className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={visitorCommentName}
                    onChange={(e) => setVisitorCommentName(e.target.value)}
                    className="w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Write a comment..."
                    value={visitorCommentText}
                    onChange={(e) => setVisitorCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!visitorCommentText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    Comment
                  </button>
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExpandedHomePost(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close Full Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLIC EXPANDED COMMUNITY QUESTION & ANSWERS MODAL */}
      {expandedCommunityPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-slate-100 space-y-5 my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {expandedCommunityPost.category && (
                    <span className="bg-violet-50 text-violet-700 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {expandedCommunityPost.category}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-slate-400">
                    Asked {expandedCommunityPost.createdAt ? new Date(expandedCommunityPost.createdAt).toLocaleDateString() : "Recently"}
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xl leading-snug">
                  {expandedCommunityPost.title}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Asked by <strong className="text-slate-800">{expandedCommunityPost.postedBy || "Community Member"}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedCommunityPost(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Total Question Content */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Question Details</span>
              <p className="text-slate-800 text-sm font-medium leading-relaxed whitespace-pre-line">
                {expandedCommunityPost.content}
              </p>
            </div>

            {/* Answers Section */}
            <div className="space-y-3 pt-2">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-violet-600" />
                Community Answers & Responses ({expandedCommunityPost.answers?.length || expandedCommunityPost.commentsCount || 0})
              </h4>

              {!expandedCommunityPost.answers || expandedCommunityPost.answers.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  No responses posted yet. Share your answer below!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {expandedCommunityPost.answers.map((answer, index) => {
                    const answerId = answer.id || `answer-${index}-${answer.createdAt || answer.text?.slice(0, 8) || ''}`;
                    return (
                      <div key={answerId} className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 shadow-2xs">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-xs font-extrabold text-slate-900">{answer.author}</strong>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {answer.createdAt ? new Date(answer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{answer.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteVisitorAnswer(expandedCommunityPost.id, answerId)}
                          className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Delete answer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Answer Form */}
              <form onSubmit={handleAddVisitorAnswer} className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={visitorAnswerName}
                    onChange={(e) => setVisitorAnswerName(e.target.value)}
                    className="w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Write your answer..."
                    value={visitorAnswerText}
                    onChange={(e) => setVisitorAnswerText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!visitorAnswerText.trim()}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    Post Answer
                  </button>
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExpandedCommunityPost(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
