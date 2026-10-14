import React, { useState, useEffect } from "react";
import { communityFeedDb, CommunityPost, CommentItem } from "../lib/firebase";
import { MessageSquare, Search, Trash2, ThumbsUp, FileText, CheckCircle2, Plus, Sparkles, RefreshCw, MessageCircle, Eye, X } from "lucide-react";

export default function CommunityFeedManager() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Selected Question for Total Question & Answers Modal
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [adminAnswerText, setAdminAnswerText] = useState("");

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("Rahul Sharma (Founder)");
  const [newCategory, setNewCategory] = useState("Career Guidance");
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initial load
    communityFeedDb.loadAll().then(data => {
      setPosts(data);
      setLoading(false);
    });

    // Real-time subscription
    const unsubscribe = communityFeedDb.subscribeAll(data => {
      setPosts(data);
      setLoading(false);
      // Keep selected question synced
      setSelectedPost(prev => {
        if (!prev) return null;
        return data.find(p => p.id === prev.id) || null;
      });
    });

    return () => unsubscribe();
  }, []);

  const handleToggleDraft = async (post: CommunityPost) => {
    const newStatus = post.status === "draft" ? "published" : "draft";
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
    if (selectedPost?.id === post.id) {
      setSelectedPost(prev => prev ? { ...prev, status: newStatus } : null);
    }
    await communityFeedDb.updatePost(post.id, { status: newStatus });
  };

  const handleDeletePost = async (post: CommunityPost) => {
    console.log(`[DELETE_BUTTON_CLICKED] Delete button clicked for Community Question:`, { id: post.id, title: post.title });
    setPosts(prev => prev.filter(p => p.id !== post.id));
    if (selectedPost?.id === post.id) setSelectedPost(null);
    await communityFeedDb.deletePost(post.id);
  };

  const handleDeleteAnswer = async (postId: string, answerId: string) => {
    console.log(`[DELETE_BUTTON_CLICKED] Delete button clicked for Answer:`, { postId, answerId });
    if (!answerId) return;

    setSelectedPost(prev => {
      if (!prev) return null;
      const answers = prev.answers || [];
      const targetIdx = answers.findIndex((a, i) => a.id === answerId || `answer-${i}-${a.createdAt || a.text?.slice(0, 8) || ''}` === answerId);
      const remaining = targetIdx !== -1 ? answers.filter((_, i) => i !== targetIdx) : answers.filter(a => a.id && a.id !== answerId);
      return {
        ...prev,
        answers: remaining,
        commentsCount: remaining.length
      };
    });

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const answers = p.answers || [];
      const targetIdx = answers.findIndex((a, i) => a.id === answerId || `answer-${i}-${a.createdAt || a.text?.slice(0, 8) || ''}` === answerId);
      const remaining = targetIdx !== -1 ? answers.filter((_, i) => i !== targetIdx) : answers.filter(a => a.id && a.id !== answerId);
      return {
        ...p,
        answers: remaining,
        commentsCount: remaining.length
      };
    }));

    await communityFeedDb.deleteAnswer(postId, answerId);
  };

  const handleDeleteAllAnswers = async (postId: string) => {
    setSelectedPost(prev => prev ? { ...prev, answers: [], commentsCount: 0 } : null);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, answers: [], commentsCount: 0 } : p));
    await communityFeedDb.deleteAllAnswers(postId);
  };

  const handleAddAdminAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !adminAnswerText.trim()) return;

    const newAnswerItem: CommentItem = {
      id: `answer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: "Rahul Sharma (Founder & Community Moderator)",
      text: adminAnswerText.trim(),
      createdAt: new Date().toISOString()
    };

    setSelectedPost(prev => {
      if (!prev) return null;
      const updated = [...(prev.answers || []), newAnswerItem];
      return { ...prev, answers: updated, commentsCount: updated.length };
    });
    setPosts(prev => prev.map(p => {
      if (p.id !== selectedPost.id) return p;
      const updated = [...(p.answers || []), newAnswerItem];
      return { ...p, answers: updated, commentsCount: updated.length };
    }));

    await communityFeedDb.addAnswer(selectedPost.id, {
      id: newAnswerItem.id,
      author: "Rahul Sharma (Founder & Community Moderator)",
      text: adminAnswerText.trim()
    });

    setAdminAnswerText("");
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsSubmitting(true);

    const docId = await communityFeedDb.createPost({
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      postedBy: newAuthor.trim(),
      status: "published",
      upvotesCount: 0,
      commentsCount: 0
    });

    setIsSubmitting(false);
    setShowCreateModal(false);
    setNewTitle("");
    setNewContent("");

    if (docId) {
      alert("Community question published successfully!");
    }
  };

  const filteredPosts = posts
    .filter(p => {
      const matchesSearch = (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.postedBy || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.content || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

  const publishedCount = posts.filter(p => p.status !== "draft").length;
  const draftCount = posts.filter(p => p.status === "draft").length;
  const totalAnswers = posts.reduce((sum, p) => sum + (p.answers?.length || p.commentsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Community Posts</span>
            <span className="text-2xl font-black text-slate-900">{posts.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Answers / Responses</span>
            <span className="text-2xl font-black text-violet-700">{totalAnswers}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active Discussions</span>
            <span className="text-2xl font-black text-emerald-700">{publishedCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Drafted / Hidden</span>
            <span className="text-2xl font-black text-amber-600">{draftCount}</span>
          </div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>💬 Spread One Community Feed Moderation</span>
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold">Admin Access</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review, draft, or delete user-submitted community questions and topics published across the portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Post Community Topic
          </button>
        </div>
      </div>

      {/* Search and Filters toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search community questions by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs py-2 px-3 font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs py-2 px-3 font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="Career Guidance">Career Guidance</option>
            <option value="Tech Stack">Tech Stack</option>
            <option value="Work Culture">Work Culture</option>
            <option value="Interview Prep">Interview Prep</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs py-2 px-3 font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafted / Hidden</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Synchronizing community discussions from Firestore...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">No Community Topics Found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No questions match your current search criteria. Post a community topic or reset your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map(post => {
            const isDraft = post.status === "draft";

            return (
              <div
                key={post.id}
                className={`bg-white rounded-2xl border ${isDraft ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'} p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isDraft ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {isDraft ? "Draft / Hidden" : "Published Live"}
                    </span>
                    <span className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                      Doc ID: {post.id}
                    </span>
                    {post.category && (
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                        {post.category}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Asked by <strong className="text-slate-700">{post.postedBy || "Community User"}</strong>
                    </span>
                  </div>

                  {/* QUESTION TITLE DISPLAYED PROMINENTLY */}
                  <h4 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                    {post.title}
                  </h4>

                  <p className="text-xs text-slate-600 font-medium line-clamp-2 max-w-3xl">
                    {post.content}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-indigo-600" /> Upvotes: <strong className="text-slate-600">{post.upvotesCount || 0}</strong>
                    </span>
                    <span className="flex items-center gap-1 text-violet-700 font-extrabold">
                      <MessageCircle className="w-3.5 h-3.5" /> Answers: <strong className="text-violet-700">{post.answers?.length || post.commentsCount || 0}</strong>
                    </span>
                    {post.createdAt && (
                      <span>Date: {new Date(post.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* MODERATION CONTROLS: EXPAND, DRAFT & DELETE */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-extrabold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="View total question and all community answers"
                  >
                    <Eye className="w-3.5 h-3.5 text-violet-600" />
                    Read Question & Answers ({post.answers?.length || post.commentsCount || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleDraft(post)}
                    className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${isDraft ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                    title={isDraft ? "Publish this topic to public community feed" : "Draft and hide this topic from community feed"}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {isDraft ? "Publish" : "Draft"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePost(post)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Delete question permanently from community feed"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Delete Question
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TOTAL QUESTION & COMMUNITY RESPONSES MODERATION MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-slate-100 space-y-5 my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${selectedPost.status === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {selectedPost.status === 'draft' ? "Draft / Hidden" : "Published Live"}
                  </span>
                  {selectedPost.category && (
                    <span className="bg-violet-50 text-violet-700 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                      {selectedPost.category}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-snug">
                  {selectedPost.title}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Asked by <strong className="text-slate-800">{selectedPost.postedBy || "Community User"}</strong> ({selectedPost.authorRole || "Member"}) • {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleDateString() : "Recently"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Question Content */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Question & Background Details</span>
              <p className="text-slate-800 text-xs font-medium leading-relaxed whitespace-pre-line">
                {selectedPost.content || "No detailed description provided."}
              </p>
            </div>

            {/* Answers List & Moderation */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-violet-600" />
                  Total Community Answers & Responses ({selectedPost.answers?.length || selectedPost.commentsCount || 0})
                </h4>
                {selectedPost.answers && selectedPost.answers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAllAnswers(selectedPost.id)}
                    className="text-[11px] font-extrabold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Delete all responses for this question"
                  >
                    <Trash2 className="w-3 h-3" /> Clear All Responses
                  </button>
                )}
              </div>

              {!selectedPost.answers || selectedPost.answers.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  No community answers posted for this question yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedPost.answers.map((answer, index) => {
                    const answerId = answer.id || `answer-${index}-${answer.createdAt || answer.text?.slice(0, 8) || ''}`;
                    return (
                      <div key={answerId} className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 shadow-2xs">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-xs font-extrabold text-slate-900">{answer.author}</strong>
                            <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                              ID: {answerId}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {answer.createdAt ? new Date(answer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{answer.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnswer(selectedPost.id, answerId)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Delete this answer/response"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Founder Response Form */}
              <form onSubmit={handleAddAdminAnswer} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Post an official founder answer/recommendation..."
                  value={adminAnswerText}
                  onChange={(e) => setAdminAnswerText(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="submit"
                  disabled={!adminAnswerText.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 shrink-0"
                >
                  Post Answer
                </button>
              </form>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDeletePost(selectedPost)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Entire Question
              </button>

              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition-all cursor-pointer"
              >
                Close Full View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Topic Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> Post Community Question
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Question / Topic Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to structure technical interviews for Lead Backend Engineers?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  Detailed Description / Context <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain the background details or question background..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Posting..." : "Publish Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
