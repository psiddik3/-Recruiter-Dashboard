import React, { useState, useEffect } from "react";
import { startupFeedDb, StartupPost } from "../lib/firebase";
import { Rocket, Search, Edit3, Trash2, ExternalLink, Plus, RefreshCw, Layers, CheckCircle2, AlertCircle, Eye, Sparkles, FileText, Globe, X, Image as ImageIcon, Upload, Link as LinkIcon } from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "funding", label: "Funding", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "stories", label: "Stories", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "events", label: "Events", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "accelerators", label: "Accelerators", badgeClass: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "general", label: "General", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" }
];

const PRESET_IMAGES = [
  { label: "AI & Tech", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80" },
  { label: "Funding & Money", url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80" },
  { label: "Startup Office", url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80" },
  { label: "Growth / Analytics", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80" }
];

export default function StartupFeedManager() {
  const [posts, setPosts] = useState<StartupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Form State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [category, setCategory] = useState("general");
  const [sourceName, setSourceName] = useState("");
  const [title, setTitle] = useState("");
  const [article, setArticle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Full article preview modal
  const [previewPost, setPreviewPost] = useState<StartupPost | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const showToast = (message: string, isError: boolean = false) => {
    setToast({ message, isError });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    startupFeedDb.loadAll().then(data => {
      setPosts(data);
      setLoading(false);
    });

    const unsubscribe = startupFeedDb.subscribeAll(data => {
      setPosts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResetForm = () => {
    setEditingPostId(null);
    setCategory("general");
    setSourceName("");
    setTitle("");
    setArticle("");
    setSourceUrl("");
    setImageUrl("");
  };

  const handleEditClick = (post: StartupPost) => {
    setEditingPostId(post.id);
    setCategory(post.category || "general");
    setSourceName(post.sourceName || "");
    setTitle(post.title || "");
    setArticle(post.article || "");
    setSourceUrl(post.sourceUrl || "");
    setImageUrl(post.imageUrl || "");
    showToast("Editing post – make changes and click Update.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size must be under 2MB.", true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
        showToast("Image attached!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post? This cannot be undone.")) return;
    try {
      await startupFeedDb.deletePost(postId);
      showToast("Post deleted.");
      if (editingPostId === postId) handleResetForm();
    } catch (err: any) {
      showToast("Error deleting post", true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !article.trim() || !sourceName.trim() || !sourceUrl.trim()) {
      showToast("Please fill all required fields.", true);
      return;
    }

    setIsSubmitting(true);
    let formattedUrl = sourceUrl.trim();
    if (!formattedUrl.startsWith("http")) formattedUrl = "https://" + formattedUrl;

    try {
      if (editingPostId) {
        await startupFeedDb.updatePost(editingPostId, {
          category,
          sourceName: sourceName.trim(),
          title: title.trim(),
          article: article.trim(),
          sourceUrl: formattedUrl,
          imageUrl: imageUrl.trim()
        });
        showToast("Post updated.");
      } else {
        await startupFeedDb.createPost({
          category,
          sourceName: sourceName.trim(),
          title: title.trim(),
          article: article.trim(),
          sourceUrl: formattedUrl,
          imageUrl: imageUrl.trim()
        });
        showToast("Post published.");
      }
      handleResetForm();
    } catch (err: any) {
      console.error(err);
      showToast("Error saving post. Check console.", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return "Recently";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return "Recently";
    }
  };

  const filteredPosts = posts.filter(p => {
    const matchesCategory = selectedCategoryFilter === "all" || p.category.toLowerCase() === selectedCategoryFilter.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || p.title.toLowerCase().includes(query) || p.sourceName.toLowerCase().includes(query) || p.article.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-xs font-black shadow-2xl transition-all flex items-center gap-2 ${
          toast.isError ? "bg-rose-600 text-white" : "bg-slate-900 text-emerald-400 border border-slate-700"
        }`}>
          {toast.isError ? <AlertCircle className="w-4 h-4 text-white" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-emerald-800/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider">
              <Rocket className="w-3.5 h-3.5 text-emerald-400" />
              <span>Spread One • Startup News & Intel</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Startup Feed Publisher
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Create, edit, or remove startup ecosystem updates, funding announcements, and founder stories. Changes sync instantly to Firestore across all visitor feeds.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <div className="bg-emerald-950/80 border border-emerald-800/50 px-4 py-3 rounded-2xl text-center">
              <span className="text-2xl font-black text-emerald-400 block">{posts.length}</span>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Published</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form & List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6">
            <div className="border-b border-slate-100 pb-4 mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {editingPostId ? <Edit3 className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                  {editingPostId ? "✏️ Edit Startup Post" : "Publish a New Post"}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Fill in article details to publish instantly
                </p>
              </div>
              {editingPostId && (
                <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200 uppercase tracking-wider">
                  Editing Mode
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Source Name *
                  </label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="e.g., TechCrunch"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Headline / Title * <span className="text-slate-400 font-normal">({title.length}/140)</span>
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Catchy headline summary..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Article * <span className="text-slate-400 font-normal">(Preserves line breaks & spaces)</span>
                </label>
                <textarea
                  rows={6}
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  placeholder="Write or paste the full article here..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Featured Image (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">URL, Upload, or Stock</span>
                </label>

                <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  {/* File Upload & URL Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Upload Local Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="relative">
                      <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Paste Image URL..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Stock Preset Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Presets:</span>
                    {PRESET_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setImageUrl(preset.url);
                          showToast(`Selected "${preset.label}" image`);
                        }}
                        className="text-[10px] font-extrabold bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-2 py-1 rounded-lg border border-slate-200 transition-all cursor-pointer"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Image Preview Box if attached */}
                  {imageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video max-h-36 group mt-2">
                      <img
                        src={imageUrl}
                        alt="Article Cover Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Source URL *
                </label>
                <input
                  type="text"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://techcrunch.com/..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                />
              </div>

              <div className="pt-2 flex items-center gap-2 justify-end">
                {editingPostId && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-5 py-2 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : editingPostId ? (
                    <Edit3 className="w-3.5 h-3.5" />
                  ) : (
                    <Rocket className="w-3.5 h-3.5" />
                  )}
                  <span>{editingPostId ? "Update Post" : "Publish Post"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Post List Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  All Published Posts ({filteredPosts.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative min-w-[160px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Posts Cards */}
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Loading published posts from Firestore...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-black text-slate-700 uppercase">No Posts Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No startup feed posts match your selected filter or search query. Publish a new post using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                {filteredPosts.map((post) => {
                  const catOpt = CATEGORY_OPTIONS.find(c => c.value === post.category.toLowerCase()) || CATEGORY_OPTIONS[4];
                  return (
                    <div
                      key={post.id}
                      className="bg-slate-50/80 hover:bg-white rounded-2xl border border-slate-200 p-4 transition-all hover:shadow-md space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${catOpt.badgeClass}`}>
                              {catOpt.label}
                            </span>
                            <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-emerald-600" />
                              {post.sourceName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {formatDate(post.createdAt)}
                            </span>
                          </div>

                          <h4 className="text-sm font-extrabold text-slate-900 leading-snug pt-0.5">
                            {post.title}
                          </h4>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewPost(post)}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            title="Preview article"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditClick(post)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title="Edit this post"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                            title="Delete this post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Post Thumbnail Image if present */}
                      {post.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-100">
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover max-h-48"
                            onError={(e) => {
                              const fallback = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
                              if ((e.target as HTMLImageElement).src !== fallback) {
                                (e.target as HTMLImageElement).src = fallback;
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Article snippet */}
                      <p className="text-xs text-slate-600 font-normal line-clamp-3 leading-relaxed whitespace-pre-line bg-white/70 p-2.5 rounded-xl border border-slate-100">
                        {post.article}
                      </p>

                      {/* Source Link */}
                      {post.sourceUrl && post.sourceUrl !== "#" && (
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <a
                            href={post.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 hover:text-emerald-900 font-extrabold flex items-center gap-1 hover:underline"
                          >
                            Read on {post.sourceName} <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="font-mono text-[9px] text-slate-400">ID: {post.id}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Article Modal Preview */}
      {previewPost && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setPreviewPost(null)}
              className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 pr-8">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md uppercase tracking-wider">
                  {previewPost.category}
                </span>
                <span className="text-xs font-bold text-slate-500">• {previewPost.sourceName}</span>
                <span className="text-xs text-slate-400">• {formatDate(previewPost.createdAt)}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 leading-snug">
                {previewPost.title}
              </h3>
            </div>

            {previewPost.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-64 bg-slate-900">
                <img
                  src={previewPost.imageUrl}
                  alt={previewPost.title}
                  className="w-full h-full object-cover max-h-64"
                />
              </div>
            )}

            <div className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              {previewPost.article}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <a
                href={previewPost.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm"
              >
                Visit Source Web Page <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setPreviewPost(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
