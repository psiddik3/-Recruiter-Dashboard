import React, { useState, useEffect } from "react";
import { startupCommunitiesDb, StartupCommunity, StartupCommunityPostItem } from "../lib/firebase";
import { Rocket, Shield, CheckCircle2, XCircle, Trash2, Search, Users, MessageSquare, ThumbsUp, Calendar, MapPin, Image as ImageIcon, FileText, Plus, RefreshCw, Eye, X, Check, Lock, Unlock, AlertCircle } from "lucide-react";

export default function StartupCommunityManager() {
  const [communities, setCommunities] = useState<StartupCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCommunity, setSelectedCommunity] = useState<StartupCommunity | null>(null);

  // New Community Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("AI & Tech");
  const [newFounderName, setNewFounderName] = useState("");
  const [newFounderEmail, setNewFounderEmail] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState("");
  const [newCoverImageUrl, setNewCoverImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const showToast = (message: string, isError: boolean = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    startupCommunitiesDb.loadAll().then(data => {
      setCommunities(data);
      setLoading(false);
    });

    const unsubscribe = startupCommunitiesDb.subscribeAll(data => {
      setCommunities(data);
      setLoading(false);
      setSelectedCommunity(prev => {
        if (!prev) return null;
        const updated = data.find(c => c.id === prev.id);
        if (!updated) return null;
        return {
          ...updated,
          posts: updated.posts !== undefined ? updated.posts : prev.posts
        };
      });
    });

    return () => unsubscribe();
  }, []);

  const handleOpenCommunity = async (comm: StartupCommunity) => {
    // Dynamically load posts from collection as well
    const dbPosts = await startupCommunitiesDb.loadCommunityPosts(comm.id);
    const mergedMap = new Map<string, StartupCommunityPostItem>();
    [...(comm.posts || []), ...dbPosts].forEach(p => mergedMap.set(p.id, p));
    
    setSelectedCommunity({
      ...comm,
      posts: Array.from(mergedMap.values())
    });
  };

  const handleApprovePending = async (comm: StartupCommunity) => {
    await startupCommunitiesDb.updateStatus(comm.id, "approved");
    showToast(`Access granted successfully for "${comm.name}"! Community is now live.`);
  };

  const handleRevokeAccess = async (comm: StartupCommunity) => {
    await startupCommunitiesDb.updateStatus(comm.id, "revoked");
    showToast(`Access revoked for "${comm.name}". Community posts are now hidden.`);
  };

  const handleDeleteCommunity = async (comm: StartupCommunity) => {
    await startupCommunitiesDb.deleteCommunity(comm.id);
    setCommunities(prev => prev.filter(c => c.id !== comm.id));
    if (selectedCommunity?.id === comm.id) setSelectedCommunity(null);
    showToast(`Community "${comm.name}" deleted successfully.`);
  };

  const handleDeletePost = async (communityId: string, postId: string) => {
    await startupCommunitiesDb.deletePost(communityId, postId);
    if (selectedCommunity && selectedCommunity.id === communityId) {
      setSelectedCommunity({
        ...selectedCommunity,
        posts: (selectedCommunity.posts || []).filter(p => p.id !== postId)
      });
    }
    setCommunities(prev => prev.map(c => {
      if (c.id !== communityId) return c;
      const updatedPosts = (c.posts || []).filter(p => p.id !== postId);
      return {
        ...c,
        posts: updatedPosts,
        postsCount: updatedPosts.length
      };
    }));
    showToast("Community post deleted successfully.");
  };

  const handleDeleteComment = async (communityId: string, postId: string, commentId: string) => {
    await startupCommunitiesDb.deleteComment(communityId, postId, commentId);
    if (selectedCommunity && selectedCommunity.id === communityId) {
      setSelectedCommunity({
        ...selectedCommunity,
        posts: (selectedCommunity.posts || []).map(p => {
          if (p.id !== postId) return p;
          const updatedComments = (p.comments || []).filter(c => c.id !== commentId);
          return {
            ...p,
            comments: updatedComments,
            commentsCount: updatedComments.length
          };
        })
      });
    }
    setCommunities(prev => prev.map(c => {
      if (c.id !== communityId) return c;
      const updatedPosts = (c.posts || []).map(p => {
        if (p.id !== postId) return p;
        const updatedComments = (p.comments || []).filter(c => c.id !== commentId);
        return {
          ...p,
          comments: updatedComments,
          commentsCount: updatedComments.length
        };
      });
      return {
        ...c,
        posts: updatedPosts
      };
    }));
    showToast("Comment deleted successfully.");
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDesc.trim() || !newFounderName.trim()) {
      showToast("Please fill all required fields.", true);
      return;
    }

    setIsSubmitting(true);
    try {
      await startupCommunitiesDb.createCommunity({
        name: newName.trim(),
        description: newDesc.trim(),
        category: newCategory,
        founderName: newFounderName.trim(),
        founderEmail: newFounderEmail.trim() || "founder@startup.com",
        logoUrl: newLogoUrl.trim() || "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&auto=format&fit=crop&q=80",
        coverImageUrl: newCoverImageUrl.trim() || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80"
      });
      setIsSubmitting(false);
      setShowCreateModal(false);
      setNewName("");
      setNewDesc("");
      setNewFounderName("");
      setNewFounderEmail("");
      setNewLogoUrl("");
      setNewCoverImageUrl("");
      showToast("Startup community registered successfully! Awaiting founder grant access approval.");
    } catch (err) {
      setIsSubmitting(false);
      showToast("Failed to create community", true);
    }
  };

  const filteredCommunities = communities.filter(c => {
    const name = c.name || "";
    const description = c.description || "";
    const founderName = c.founderName || "";
    const query = searchQuery || "";
    const matchesSearch = name.toLowerCase().includes(query.toLowerCase()) ||
                          description.toLowerCase().includes(query.toLowerCase()) ||
                          founderName.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = communities.filter(c => c.status === "pending").length;
  const approvedCount = communities.filter(c => c.status === "approved").length;

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-semibold text-xs">Loading Startup Communities CRM...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
          toast.isError ? "bg-rose-600 text-white" : "bg-slate-900 text-white"
        }`}>
          {toast.isError ? <AlertCircle className="w-4 h-4 text-white" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Rocket className="w-56 h-56 text-indigo-400" />
        </div>
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" /> Founder CRM • Startup Communities Moderation
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Startup Community Feed & Access Control
          </h1>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Manage startup communities created by founders with custom profile DP & cover pictures. Review text posts, image posts, events, member discussions, and grant or revoke access before communities go live.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Register Community
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Communities</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{communities.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pending Access Review</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Active Live Communities</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Unlock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search communities or founders..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "pending", "approved", "revoked"].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-slate-900 text-white shadow"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Communities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCommunities.map(comm => (
          <div
            key={comm.id}
            className={`bg-white rounded-3xl border transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
              comm.status === "pending"
                ? "border-amber-300 ring-2 ring-amber-400/20"
                : comm.status === "revoked"
                ? "border-rose-200 bg-slate-50/50 opacity-85"
                : "border-slate-200/80"
            }`}
          >
            {/* Cover Picture Banner */}
            <div className="h-28 w-full bg-slate-200 relative overflow-hidden">
              {comm.coverImageUrl || comm.coverImage || comm.bannerUrl || comm.featuredImage ? (
                <img src={comm.coverImageUrl || comm.coverImage || comm.bannerUrl || comm.featuredImage} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-indigo-900 to-slate-800 flex items-center justify-center opacity-70">
                  <Rocket className="w-8 h-8 text-indigo-300" />
                </div>
              )}
              <div className="absolute top-3 right-3">
                {comm.status === "approved" && (
                  <span className="inline-flex items-center gap-1 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow">
                    <CheckCircle2 className="w-3 h-3 text-white" /> Live
                  </span>
                )}
                {comm.status === "pending" && (
                  <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow animate-pulse">
                    <Lock className="w-3 h-3 text-white" /> Pending
                  </span>
                )}
                {comm.status === "revoked" && (
                  <span className="inline-flex items-center gap-1 bg-rose-500 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow">
                    <XCircle className="w-3 h-3 text-white" /> Revoked
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 pt-0 space-y-4 relative">
              {/* Profile Picture (DP) overlap */}
              <div className="-mt-8 mb-2 flex items-end justify-between">
                <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden shrink-0">
                  {comm.logoUrl || comm.logo || comm.dpUrl || comm.photoUrl ? (
                    <img src={comm.logoUrl || comm.logo || comm.dpUrl || comm.photoUrl} alt={comm.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Rocket className="w-7 h-7" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {comm.category}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 line-clamp-1">{comm.name}</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2 mt-1">
                  {comm.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Founder: <strong className="text-slate-800">{comm.founderName}</strong></span>
                <span>{comm.membersCount} members</span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-700">{comm.posts?.length || 0} Posts & Activities</span>
                </div>
                <button
                  onClick={() => handleOpenCommunity(comm)}
                  className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> View Feed & Posts
                </button>
              </div>
            </div>

            {/* Card Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              {comm.status === "pending" ? (
                <button
                  onClick={() => handleApprovePending(comm)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Unlock className="w-3.5 h-3.5" /> Grant Access
                </button>
              ) : comm.status === "approved" ? (
                <button
                  onClick={() => handleRevokeAccess(comm)}
                  className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Revoke Access
                </button>
              ) : (
                <button
                  onClick={() => handleApprovePending(comm)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" /> Re-Grant Access
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCommunity(comm);
                }}
                className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Delete Community"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCommunities.length === 0 && (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
          <Rocket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No Startup Communities Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or register a new community.</p>
        </div>
      )}

      {/* Community Detail & Feed Moderation Modal */}
      {selectedCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header with Cover and DP */}
            <div className="relative bg-slate-900 text-white border-b border-slate-800">
              <div className="h-32 w-full overflow-hidden relative">
                {selectedCommunity.coverImageUrl || selectedCommunity.coverImage || selectedCommunity.bannerUrl || selectedCommunity.featuredImage ? (
                  <img src={selectedCommunity.coverImageUrl || selectedCommunity.coverImage || selectedCommunity.bannerUrl || selectedCommunity.featuredImage} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-indigo-900 to-slate-900 opacity-80" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
              </div>

              <div className="p-6 pt-0 relative flex items-end justify-between -mt-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white border-4 border-slate-900 shadow-xl overflow-hidden shrink-0">
                    {selectedCommunity.logoUrl || selectedCommunity.logo || selectedCommunity.dpUrl || selectedCommunity.photoUrl ? (
                      <img src={selectedCommunity.logoUrl || selectedCommunity.logo || selectedCommunity.dpUrl || selectedCommunity.photoUrl} alt={selectedCommunity.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white font-black">
                        <Rocket className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="pt-8 sm:pt-4">
                    <h2 className="text-lg font-black tracking-tight text-white">{selectedCommunity.name}</h2>
                    <p className="text-xs text-indigo-200 font-medium">{selectedCommunity.category} • Founder: {selectedCommunity.founderName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCommunity(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors mb-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Posts Feed */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Community Feed & Activities</h3>
                  <p className="text-xs text-slate-500 font-medium">Text posts, image posts, events, and member discussions with likes & comments count.</p>
                </div>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full text-xs font-bold">
                  {selectedCommunity.posts?.length || 0} Total Posts
                </span>
              </div>

              <div className="space-y-4">
                {(selectedCommunity.posts || []).map(post => (
                  <div key={post.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                          {post.authorName ? post.authorName.slice(0, 2).toUpperCase() : "SU"}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{post.authorName} <span className="text-slate-400 font-normal">({post.authorRole || "Member"})</span></p>
                          <p className="text-[10px] text-slate-400">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""} • <span className="text-indigo-600 font-bold uppercase">{post.postType || "text"} post</span></p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {post.postType === "event" && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                            Event
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(selectedCommunity.id, post.id);
                          }}
                          className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{post.title}</h4>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{post.content}</p>

                    {post.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 max-h-60 bg-slate-100">
                        <img src={post.imageUrl} alt="Post attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}

                    {post.postType === "event" && post.eventDate && (
                      <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 flex items-center gap-4 text-xs text-amber-900">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Calendar className="w-4 h-4 text-amber-600" /> {new Date(post.eventDate).toLocaleDateString()}
                        </div>
                        {post.eventLocation && (
                          <div className="flex items-center gap-1.5 font-medium">
                            <MapPin className="w-4 h-4 text-amber-600" /> {post.eventLocation}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Post Metrics / Likes & Comments */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-indigo-600">
                          <ThumbsUp className="w-3.5 h-3.5" /> {post.likesCount || 0} Likes
                        </span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <MessageSquare className="w-3.5 h-3.5" /> {post.commentsCount || post.comments?.length || 0} Comments
                        </span>
                      </div>
                    </div>

                    {/* Comments List */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200/60 mt-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Member Responses ({post.comments.length})</p>
                        {post.comments.map(c => (
                          <div key={c.id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-800">{c.author}: </span>
                              <span className="text-slate-600">{c.text}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteComment(selectedCommunity.id, post.id, c.id);
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded transition-colors cursor-pointer"
                              title="Delete Comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {(!selectedCommunity.posts || selectedCommunity.posts.length === 0) && (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No posts or activities in this community yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                Status: <strong className="uppercase text-slate-800">{selectedCommunity.status}</strong>
              </span>
              <button
                onClick={() => setSelectedCommunity(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
              >
                Close Feed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black tracking-tight text-white">Register Startup Community</h3>
                <p className="text-xs text-indigo-100 font-medium">New communities require admin access approval before going live.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Community Name</label>
                <input
                  type="text"
                  placeholder="e.g. Fintech Innovators Club"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600/20 bg-white"
                >
                  <option value="AI & Tech">AI & Tech</option>
                  <option value="SaaS & Growth">SaaS & Growth</option>
                  <option value="Fintech">Fintech</option>
                  <option value="Web3">Web3</option>
                  <option value="Hardware & DeepTech">Hardware & DeepTech</option>
                  <option value="General Startup">General Startup</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Founder Name</label>
                  <input
                    type="text"
                    placeholder="Rahul Sharma"
                    value={newFounderName}
                    onChange={e => setNewFounderName(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Founder Email</label>
                  <input
                    type="email"
                    placeholder="rahul@startup.com"
                    value={newFounderEmail}
                    onChange={e => setNewFounderEmail(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Profile Picture (DP) URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newLogoUrl}
                    onChange={e => setNewLogoUrl(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Cover Picture URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newCoverImageUrl}
                    onChange={e => setNewCoverImageUrl(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the community purpose and target audience..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600/20 resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Registering..." : "Submit for Access Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
