import React, { useState, useEffect } from "react";
import { homeFeedDb, HomePost, CommentItem } from "../lib/firebase";
import { Newspaper, Search, Trash2, Eye, FileText, CheckCircle2, Plus, Sparkles, RefreshCw, Layers, MessageSquare, CornerDownRight, X, Heart, ShieldAlert } from "lucide-react";

export default function HomeFeedManager() {
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  
  // Selected Post for Full Detail & Comments Modal
  const [selectedPost, setSelectedPost] = useState<HomePost | null>(null);
  const [adminCommentText, setAdminCommentText] = useState("");

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("Rahul Sharma (Founder)");
  const [newCategory, setNewCategory] = useState("Career & Tech");
  const [newSnippet, setNewSnippet] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initial load
    homeFeedDb.loadAll().then(data => {
      setPosts(data);
      setLoading(false);
    });

    // Real-time subscription
    const unsubscribe = homeFeedDb.subscribeAll(data => {
      setPosts(data);
      setLoading(false);
      // Keep selected post synced
      setSelectedPost(prev => {
        if (!prev) return null;
        return data.find(p => p.id === prev.id) || null;
      });
    });

    return () => unsubscribe();
  }, []);

  const handleToggleDraft = async (post: HomePost) => {
    const newStatus = post.status === "draft" ? "published" : "draft";
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
    if (selectedPost?.id === post.id) {
      setSelectedPost(prev => prev ? { ...prev, status: newStatus } : null);
    }
    await homeFeedDb.updatePost(post.id, { status: newStatus });
  };

  const handleDeletePost = async (post: HomePost) => {
    console.log(`[DELETE_BUTTON_CLICKED] Delete button clicked for Home Article:`, { id: post.id, title: post.title });
    setPosts(prev => prev.filter(p => p.id !== post.id));
    if (selectedPost?.id === post.id) setSelectedPost(null);
    await homeFeedDb.deletePost(post.id);
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    console.log(`[DELETE_BUTTON_CLICKED] Delete button clicked for Comment:`, { postId, commentId });
    if (!commentId) return;

    setSelectedPost(prev => {
      if (!prev) return null;
      const comments = prev.comments || [];
      const targetIdx = comments.findIndex((c, i) => c.id === commentId || `comment-${i}-${c.createdAt || c.text?.slice(0, 8) || ''}` === commentId);
      const remaining = targetIdx !== -1 ? comments.filter((_, i) => i !== targetIdx) : comments.filter(c => c.id && c.id !== commentId);
      return { ...prev, comments: remaining };
    });

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = p.comments || [];
      const targetIdx = comments.findIndex((c, i) => c.id === commentId || `comment-${i}-${c.createdAt || c.text?.slice(0, 8) || ''}` === commentId);
      const remaining = targetIdx !== -1 ? comments.filter((_, i) => i !== targetIdx) : comments.filter(c => c.id && c.id !== commentId);
      return { ...p, comments: remaining };
    }));

    await homeFeedDb.deleteComment(postId, commentId);
  };

  const handleAddAdminComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !adminCommentText.trim()) return;

    const newCommentItem: CommentItem = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: "Rahul Sharma (Founder & Admin)",
      text: adminCommentText.trim(),
      createdAt: new Date().toISOString()
    };

    setSelectedPost(prev => prev ? { ...prev, comments: [...(prev.comments || []), newCommentItem] } : null);
    setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, comments: [...(p.comments || []), newCommentItem] } : p));

    await homeFeedDb.addComment(selectedPost.id, {
      id: newCommentItem.id,
      author: "Rahul Sharma (Founder & Admin)",
      text: adminCommentText.trim()
    });

    setAdminCommentText("");
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);

    const docId = await homeFeedDb.createPost({
      title: newTitle.trim(),
      snippet: newSnippet.trim() || newContent.trim().slice(0, 120),
      content: newContent.trim() || newSnippet.trim(),
      postedBy: newAuthor.trim(),
      category: newCategory,
      status: "published",
      viewsCount: 1,
      likesCount: 0
    });

    setIsSubmitting(false);
    setShowCreateModal(false);
    setNewTitle("");
    setNewSnippet("");
    setNewContent("");

    if (docId) {
      alert("Article published successfully to Spread One Home Feed!");
    }
  };

  const filteredPosts = posts
    .filter(p => {
      const matchesSearch = (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.postedBy || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.snippet || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

  const publishedCount = posts.filter(p => p.status !== "draft").length;
  const draftCount = posts.filter(p => p.status === "draft").length;
  const totalComments = posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Home Feed Posts</span>
            <span className="text-2xl font-black text-slate-900">{posts.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Comments</span>
            <span className="text-2xl font-black text-purple-700">{totalComments}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Live Published</span>
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
            <span>📰 Spread One Home Feed Moderation</span>
            <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold">Admin Access</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitor, draft, or delete articles and posts appearing on the public Spread One homepage feed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Publish New Article
          </button>
        </div>
      </div>

      {/* Search and Filters toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search home posts by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs py-2 px-3 font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs py-2 px-3 font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Post Statuses</option>
            <option value="published">Published Only</option>
            <option value="draft">Drafted / Hidden Only</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Synchronizing home feed posts from Firestore...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">No Home Posts Found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No articles match your search filter. Create a post or clear your search criteria.
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
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {post.category}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Posted by <strong className="text-slate-700">{post.postedBy || "Recruiter"}</strong>
                    </span>
                  </div>

                  {/* TITLE DISPLAYED PROMINENTLY */}
                  <h4 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                    {post.title}
                  </h4>

                  {post.snippet || post.content ? (
                    <p className="text-xs text-slate-600 font-medium line-clamp-2 max-w-3xl">
                      {post.snippet || post.content}
                    </p>
                  ) : null}

                  <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-400 pt-1">
                    <span>Views: <strong className="text-slate-600">{post.viewsCount || 1}</strong></span>
                    <span>Likes: <strong className="text-slate-600">{post.likesCount || 0}</strong></span>
                    <span className="flex items-center gap-1 text-indigo-600 font-bold">
                      <MessageSquare className="w-3.5 h-3.5" /> Comments: {post.comments?.length || 0}
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
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="View complete article and moderate comments"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    Read Article & Comments ({post.comments?.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleDraft(post)}
                    className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${isDraft ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                    title={isDraft ? "Publish this post live to home feed" : "Draft and hide this post from public home feed"}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {isDraft ? "Publish" : "Draft"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePost(post)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Delete post permanently from home feed"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Delete Article
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL ARTICLE & COMMENTS MODERATION MODAL */}
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
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                      {selectedPost.category}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-snug">
                  {selectedPost.title}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  By <strong className="text-slate-800">{selectedPost.postedBy || "Author"}</strong> ({selectedPost.authorRole || "Contributor"}) • {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleDateString() : "Recently"}
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

            {/* Total Article Content */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Article Content</span>
              <p className="text-slate-800 text-xs font-medium leading-relaxed whitespace-pre-line">
                {selectedPost.content || selectedPost.snippet || "No detailed body provided."}
              </p>
            </div>

            {/* Comments List & Moderation */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  Total Comments ({selectedPost.comments?.length || 0})
                </h4>
                <span className="text-[11px] font-medium text-slate-400">Click garbage icon to moderate / delete inappropriate comments</span>
              </div>

              {!selectedPost.comments || selectedPost.comments.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  No user comments posted on this article yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedPost.comments.map((comment, index) => {
                    const commentId = comment.id || `comment-${index}-${comment.createdAt || comment.text?.slice(0, 8) || ''}`;
                    return (
                      <div key={commentId} className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 shadow-2xs">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-xs font-extrabold text-slate-900">{comment.author}</strong>
                            <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                              ID: {commentId}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{comment.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(selectedPost.id, commentId)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Delete this comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Founder Response Form */}
              <form onSubmit={handleAddAdminComment} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add an official founder comment/response..."
                  value={adminCommentText}
                  onChange={(e) => setAdminCommentText(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="submit"
                  disabled={!adminCommentText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 shrink-0"
                >
                  Post Comment
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
                <Trash2 className="w-3.5 h-3.5" /> Delete Entire Post
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

      {/* Create Article Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> Publish Article to Home Feed
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
                  Article Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Engineering Hiring Guide & Salary Benchmarks"
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
                    <option value="Career & Tech">Career & Tech</option>
                    <option value="Market Insights">Market Insights</option>
                    <option value="Salary & Hiring">Salary & Hiring</option>
                    <option value="Company Culture">Company Culture</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Short Snippet / Summary
                </label>
                <input
                  type="text"
                  placeholder="Brief preview line shown on the homepage..."
                  value={newSnippet}
                  onChange={(e) => setNewSnippet(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Article Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Write the complete article announcement or post text..."
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
                  {isSubmitting ? "Publishing..." : "Publish to Home Feed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
