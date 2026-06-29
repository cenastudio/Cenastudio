import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import VideoPlayer from "@/components/VideoPlayer";
import ReviewCommentComposer from "@/components/ReviewCommentComposer";
import type { Annotation } from "@/components/AnnotationCanvas";
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  ExternalLink,
  FileVideo,
  Film,
  HelpCircle,
  Link2,
  Loader2,
  MessageSquare,
  PenLine,
  Plus,
  RefreshCw,
  Share2,
  Square,
  Trash2,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

function parseVideoLink(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?(?:export=(?:download|view)&)?id=([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/uc\?(?:export=(?:download|view)&)?id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return trimmed;
}

function normalizeShareUrl(url: string, token?: string | null): string {
  if (token) return `${window.location.origin}/review/${token}`;
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return url;
  }
  return url;
}

interface VideoReview {
  id: number;
  project_id: number;
  file_id: number | null;
  title: string;
  description: string | null;
  status: string;
  share_token: string | null;
  expires_at: string | null;
  original_name: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string;
  video_url?: string;
}

interface VideoComment {
  id: number;
  review_id: number;
  author_name: string;
  timestamp_seconds: number;
  comment: string;
  annotations: Annotation[];
  resolved: number;
  created_at: string;
}

interface ProjectFile {
  id: number;
  original_name: string;
  mime_type: string | null;
  size: number | null;
}

const STATUS_CONFIG: Record<string, { labelKey: string; icon: any; color: string; bg: string }> = {
  draft: { labelKey: "app.videoReviews.draft", icon: HelpCircle, color: "text-frame-gray-light", bg: "bg-frame-gray-3" },
  pending_review: { labelKey: "app.videoReviews.pending", icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  changes_requested: { labelKey: "app.videoReviews.changes", icon: AlertCircle, color: "text-orange-400", bg: "bg-orange-500/10" },
  approved: { labelKey: "app.videoReviews.approved", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
  rejected: { labelKey: "app.videoReviews.rejected", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

const STATUS_ACTIONS = [
  { value: "approved", labelKey: "app.videoReviews.approve", color: "border-green-500/30 text-green-400 hover:bg-green-500/10" },
  { value: "changes_requested", labelKey: "app.videoReviews.requestChanges", color: "border-orange-500/30 text-orange-400 hover:bg-orange-500/10" },
  { value: "rejected", labelKey: "app.videoReviews.reject", color: "border-red-500/30 text-red-400 hover:bg-red-500/10" },
];

function VideoReviewsContent() {
  const { t } = useLanguage();
  const { projectId } = useParams<{ projectId: string }>();
  const targetReviewId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("review");
    return raw ? parseInt(raw, 10) : null;
  }, []);
  const [reviews, setReviews] = useState<VideoReview[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedReview, setSelectedReview] = useState<VideoReview | null>(null);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newCommentTimestamp, setNewCommentTimestamp] = useState<number | null>(null);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [commentAnchor, setCommentAnchor] = useState<number | null>(null);
  const [pauseRequest, setPauseRequest] = useState(0);
  const [isCommenting, setIsCommenting] = useState(false);

  const loadReviewDetails = useCallback(async (reviewId: number, preservePlayer = false) => {
    try {
      const response = await fetch(`/api/video-review?id=${reviewId}`, { credentials: "include" });
      const data = await response.json();
      if (data.success) {
        setSelectedReview(data.data);
        setComments(data.data.comments || []);
        if (!preservePlayer) setSeekTo(null);
        return;
      }
      toast.error(data.error || t("app.errors.loadReview"));
    } catch {
      toast.error(t("app.errors.loadReview"));
    }
  }, []);

  const loadAllReviews = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = projectId ? `/api/video-reviews/projects/${projectId}` : "/api/video-reviews";
      const response = await fetch(endpoint, { credentials: "include" });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || t("app.errors.loadReviews"));
        return;
      }
      const nextReviews = data.data || [];
      setReviews(nextReviews);
      if (nextReviews.length > 0) {
        const targetReview = targetReviewId
          ? nextReviews.find((review: VideoReview) => review.id === targetReviewId)
          : null;
        await loadReviewDetails((targetReview || nextReviews[0]).id);
      } else {
        setSelectedReview(null);
        setComments([]);
      }
    } catch {
      toast.error(t("app.errors.loadReviews"));
    } finally {
      setLoading(false);
    }
  }, [loadReviewDetails, projectId, targetReviewId]);

  const loadProjectFiles = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/files/projects/${projectId}`, { credentials: "include" });
      const data = await response.json();
      if (data.success) setProjectFiles(data.data);
    } catch {
      toast.error(t("app.errors.loadProjectFiles"));
    }
  }, [projectId]);

  useEffect(() => {
    loadAllReviews();
  }, [loadAllReviews]);

  useEffect(() => {
    loadProjectFiles();
  }, [loadProjectFiles]);

  useEffect(() => {
    if (!selectedReview?.id) return;
    const reviewId = selectedReview.id;
    const interval = window.setInterval(() => loadReviewDetails(reviewId, true), 5000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadReviewDetails(reviewId, true);
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadReviewDetails, selectedReview?.id]);

  const videoFiles = useMemo(
    () =>
      projectFiles.filter(
        (file) =>
          file.mime_type?.startsWith("video/") ||
          file.original_name.match(/\.(mp4|mov|avi|mkv|webm)$/i),
      ),
    [projectFiles],
  );

  const resolveVideoUrl = useCallback((review: VideoReview): string => {
    if (review.video_url) return review.video_url;
    if (review.file_path) {
      if (review.file_path.startsWith("http")) return review.file_path;
      return `/api/files/${review.file_id}/download`;
    }
    return "";
  }, []);

  const previewUrl = parseVideoLink(driveLink) || "";

  const resetCreator = () => {
    setTitle("");
    setDescription("");
    setSelectedFileId("");
    setDriveLink("");
  };

  const handleCreateReview = async () => {
    if (!title.trim()) {
      toast.error(t("app.errors.provideReviewTitle"));
      return;
    }
    const rawLink = driveLink.trim();
    if (!selectedFileId && !rawLink) {
      toast.error(t("app.errors.provideLinkOrVideo"));
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/video-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: projectId ? parseInt(projectId) : null,
          fileId: selectedFileId ? parseInt(selectedFileId) : null,
          title: title.trim(),
          description: description.trim(),
          videoUrl: rawLink ? parseVideoLink(rawLink) || rawLink : undefined,
          status: "pending_review",
        }),
      });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || t("app.errors.createReview"));
        return;
      }

      if (data.data.shareUrl) {
        setShareUrl(normalizeShareUrl(data.data.shareUrl, data.data.share_token));
        setShowShareModal(true);
      } else {
        const shareResponse = await fetch("/api/video-review-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ reviewId: data.data.id, expiresInDays: 7 }),
        });
        const shareData = await shareResponse.json();
        if (shareData.success) {
          setShareUrl(normalizeShareUrl(shareData.data.shareUrl));
          setShowShareModal(true);
        }
      }

      toast.success(t("app.videoReviews.reviewCreated"));
      resetCreator();
      await loadAllReviews();
      await loadReviewDetails(data.data.id);
    } catch {
      toast.error(t("app.errors.createReview"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!selectedReview) return;
    try {
      const response = await fetch("/api/video-review-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reviewId: selectedReview.id, expiresInDays: 7 }),
      });
      const data = await response.json();
      if (data.success) {
        setShareUrl(normalizeShareUrl(data.data.shareUrl, selectedReview.share_token));
        setShowShareModal(true);
      } else {
        toast.error(data.error || t("app.errors.generateLink"));
      }
    } catch {
      toast.error(t("app.errors.generateLink"));
    }
  };

  const handleUpdateReviewStatus = async (status: string) => {
    if (!selectedReview) return;
    try {
      const response = await fetch(`/api/video-review?id=${selectedReview.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t("app.videoReviews.statusUpdated"));
        setSelectedReview(data.data);
        loadAllReviews();
      } else {
        toast.error(data.error || t("app.errors.updateStatus"));
      }
    } catch {
      toast.error(t("app.errors.updateStatus"));
    }
  };

  const handleAddAnnotatedComment = async (annotations: Annotation[], timestamp: number, commentText: string) => {
    if (!selectedReview) return;
    await addComment(commentText, timestamp, annotations);
  };

  const addComment = async (commentText: string, timestamp: number, annotations: Annotation[] = []) => {
    if (!selectedReview || !commentText.trim()) {
      toast.error(t("app.errors.commentRequired"));
      return;
    }
    setIsCommenting(true);
    try {
      const response = await fetch("/api/video-review-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reviewId: selectedReview.id,
          timestampSeconds: timestamp,
          comment: commentText.trim(),
          authorName: t("app.common.you"),
          annotations,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNewComment("");
        setCommentAnchor(null);
        await loadReviewDetails(selectedReview.id, true);
      } else {
        toast.error(data.error || t("app.errors.addComment"));
      }
    } catch {
      toast.error(t("app.errors.addComment"));
    } finally {
      setIsCommenting(false);
    }
  };

  const captureCommentTime = () => {
    setCommentAnchor(Math.floor(newCommentTimestamp ?? 0));
    setPauseRequest((request) => request + 1);
  };

  const handleResolveComment = async (commentId: number, resolved: boolean) => {
    try {
      const response = await fetch("/api/video-review-comment-resolve", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ commentId, resolved }),
      });
      const data = await response.json();
      if (data.success && selectedReview) loadReviewDetails(selectedReview.id);
      else toast.error(data.error || t("app.errors.updateComment"));
    } catch {
      toast.error(t("app.errors.updateComment"));
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm(t("app.videoReviews.confirmDeleteComment"))) return;
    try {
      const response = await fetch(`/api/video-review-comment?commentId=${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (data.success && selectedReview) loadReviewDetails(selectedReview.id);
      else toast.error(data.error || t("app.errors.deleteComment"));
    } catch {
      toast.error(t("app.errors.deleteComment"));
    }
  };

  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const currentStatus = selectedReview ? STATUS_CONFIG[selectedReview.status] || STATUS_CONFIG.draft : null;
  const selectedShareUrl = useMemo(() => {
    if (shareUrl && selectedReview) return shareUrl;
    if (selectedReview?.share_token) return `${window.location.origin}/review/${selectedReview.share_token}`;
    return "";
  }, [selectedReview, shareUrl]);
  const commentMarkers = comments.map((comment) => ({
    id: comment.id,
    timestampSeconds: comment.timestamp_seconds,
    comment: comment.comment,
    resolved: !!comment.resolved,
    authorName: comment.author_name,
  }));

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />
      {projectId && <ProjectNav projectId={parseInt(projectId)} />}

      <main id="main-content" className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-frame-gray-3 bg-frame-gray-1/20 px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="frame-label">// {t("app.videoReviews.approval")}</p>
            <h1 className="frame-title text-[clamp(1.6rem,3vw,2.4rem)] leading-none mt-1">{t("app.videoReviews.reviewRoom")}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedReview && currentStatus && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[0.62rem] font-frame-mono uppercase tracking-wider ${currentStatus.bg} ${currentStatus.color} border border-current/20`}>
                <currentStatus.icon className="w-3 h-3" />
                {t(currentStatus.labelKey)}
              </span>
            )}
            <button onClick={loadAllReviews} className="frame-btn-ghost flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              {t("app.common.refresh")}
            </button>
            {selectedReview && (
              <button onClick={handleGenerateShareLink} className="frame-btn-primary flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                {selectedShareUrl ? t("app.videoReviews.updateLink") : t("app.videoReviews.generateLink")}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-frame-orange" />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)_400px] min-h-0">
            <aside className="border-b xl:border-b-0 xl:border-r border-frame-gray-3 bg-frame-gray-1/10 overflow-y-auto">
              <div className="p-4 border-b border-frame-gray-3">
                <p className="frame-label mb-3">// {t("app.videoReviews.createRoom")}</p>
                <div className="space-y-3">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="frame-input w-full" placeholder={t("app.videoReviews.reviewTitlePlaceholder")} />
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="frame-input w-full h-20 resize-none" placeholder={t("app.videoReviews.contextPlaceholder")} />
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="frame-input w-full pl-10" placeholder={t("app.videoReviews.drivePlaceholder")} />
                  </div>
                  {videoFiles.length > 0 && (
                    <select value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)} className="frame-input w-full">
                      <option value="">{t("app.videoReviews.chooseProjectVideo")}</option>
                      {videoFiles.map((file) => (
                        <option key={file.id} value={file.id}>{file.original_name}</option>
                      ))}
                    </select>
                  )}
                  {previewUrl && (
                    <div className="border border-frame-orange/30 bg-frame-orange/5 p-3">
                      <p className="text-[0.64rem] font-frame-mono uppercase tracking-wider text-frame-orange mb-1">
                        {t("app.videoReviews.previewDetected")}
                      </p>
                      <p className="text-xs text-frame-gray-light break-all">
                        {previewUrl}
                      </p>
                    </div>
                  )}
                  <button onClick={handleCreateReview} disabled={isCreating} className="frame-btn-primary w-full flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    {isCreating ? t("app.videoReviews.creating") : t("app.videoReviews.createApprovalRoom")}
                  </button>
                  <p className="text-[0.62rem] text-frame-gray-light leading-relaxed">
                    {t("app.videoReviews.clientReceivesLink")}
                  </p>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="frame-label">// {t("app.videoReviews.queue")}</p>
                  <span className="text-xs text-frame-gray-light">{reviews.length}</span>
                </div>
                {reviews.length === 0 ? (
                  <div className="border border-dashed border-frame-gray-3 p-5 text-center text-sm text-frame-gray-light">
                    {t("app.videoReviews.noReviewsYet")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviews.map((review) => {
                      const st = STATUS_CONFIG[review.status] || STATUS_CONFIG.draft;
                      const active = selectedReview?.id === review.id;
                      return (
                        <button
                          key={review.id}
                          onClick={() => loadReviewDetails(review.id)}
                          className={`w-full text-left border p-3 transition ${active ? "border-frame-orange bg-frame-orange/5" : "border-frame-gray-3 bg-frame-black/20 hover:border-frame-gray-4"}`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-9 h-9 flex items-center justify-center shrink-0 ${st.bg} ${st.color}`}>
                              <st.icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{review.title}</p>
                              <p className="text-[0.62rem] text-frame-gray-light truncate">{review.original_name || t("app.videoReviews.externalVideo")}</p>
                              <p className="text-[0.64rem] text-frame-gray-light/60 font-frame-mono mt-1">
                                {new Date(review.created_at).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            <section className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_38%,rgba(232,80,2,0.12),rgba(16,13,12,0.94)_46%,#050505_100%)] min-h-[420px] xl:min-h-0 flex flex-col">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.025),transparent_38%,rgba(232,80,2,0.035))]" />
              <div className="relative border-b border-frame-gray-3 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{selectedReview?.title || title || t("app.videoReviews.reviewPreview")}</p>
                  <p className="text-xs text-frame-gray-light truncate">
                    {selectedReview?.description || description || t("app.videoReviews.linkHint")}
                  </p>
                </div>
              </div>

              {selectedReview && (
                <div className="relative flex flex-col gap-3 border-b border-frame-gray-3 bg-black/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">
                      // {t("app.videoReviews.finalDecision")}
                    </p>
                    <p className="mt-1 text-xs text-frame-gray-light">{t("app.videoReviews.decisionInstructions")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_ACTIONS.map((action) => (
                      <button
                        key={action.value}
                        onClick={() => handleUpdateReviewStatus(action.value)}
                        disabled={selectedReview.status === action.value}
                        className={`px-3 py-2 text-[0.62rem] font-frame-mono uppercase tracking-wider border bg-black/20 transition ${action.color} disabled:opacity-45`}
                      >
                        {t(action.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative flex-1 flex items-center justify-center p-4">
                {selectedReview ? (
                  <div className="w-full max-w-5xl">
                    <VideoPlayer
                      url={resolveVideoUrl(selectedReview)}
                      onProgress={(seconds) => setNewCommentTimestamp(Math.floor(seconds))}
                      seekTo={seekTo}
                      commentMarkers={commentMarkers}
                      onAddAnnotatedComment={handleAddAnnotatedComment}
                      pauseRequest={pauseRequest}
                    />
                    <p className="mt-3 text-[0.6rem] font-frame-mono uppercase tracking-wider text-frame-gray-light">
                      {t("app.videoReviews.playerHint")}
                    </p>
                  </div>
                ) : previewUrl ? (
                  <div className="w-full max-w-5xl aspect-video border border-frame-gray-3 bg-frame-gray-1">
                    <iframe src={previewUrl} title={t("app.videoReviews.videoPreview") as string} className="w-full h-full" allow="autoplay; fullscreen" />
                  </div>
                ) : (
                  <div className="text-center max-w-md border border-dashed border-frame-gray-3 p-10">
                    <Video className="w-16 h-16 mx-auto mb-4 text-frame-gray-light" />
                    <h2 className="text-xl font-bold mb-2">{t("app.videoReviews.roomReady")}</h2>
                    <p className="text-sm text-frame-gray-light">
                      {t("app.videoReviews.roomReadyDescription")}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <aside className="border-t xl:border-t-0 xl:border-l border-frame-gray-3 bg-frame-gray-1/10 flex flex-col min-h-[460px] xl:min-h-0">
              <div className="p-4 border-b border-frame-gray-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-frame-orange" />
                    {t("app.videoReviews.clientRoom")}
                  </h3>
                  <span className="text-[0.64rem] font-frame-mono uppercase tracking-wider text-frame-gray-light">
                    {selectedReview ? (selectedReview.expires_at ? t("app.videoReviews.linkActive") : t("app.videoReviews.noLink")) : t("app.videoReviews.waiting")}
                  </span>
                </div>
                {selectedReview && selectedShareUrl ? (
                  <>
                    <div className="border border-frame-gray-3 bg-frame-black/40 p-3 text-xs text-frame-gray-light break-all">
                      {selectedShareUrl}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedShareUrl);
                          toast.success(t("app.common.copied"));
                        }}
                        className="frame-btn-ghost flex items-center justify-center gap-2"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {t("app.common.copy")}
                      </button>
                      <a
                        href={selectedShareUrl}
                        target="_self"
                        className="frame-btn-primary flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {t("app.common.open")}
                      </a>
                    </div>
                  </>
                ) : selectedReview ? (
                  <button type="button" onClick={handleGenerateShareLink} className="frame-btn-primary w-full flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" />
                    {t("app.videoReviews.generateClientLink")}
                  </button>
                ) : (
                  <div className="border border-frame-gray-3 bg-frame-black/30 p-4">
                    <FileVideo className="w-5 h-5 text-frame-orange mb-3" />
                    <p className="text-sm font-semibold text-frame-white">{t("app.videoReviews.createOrSelect")}</p>
                    <p className="text-xs text-frame-gray-light mt-2">
                      {t("app.videoReviews.sidePanelHint")}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 border-b border-frame-gray-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-frame-orange" />
                  {t("app.videoReviews.comments")}
                  <span className="text-frame-gray-light font-normal text-xs ml-auto">{comments.length}</span>
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedReview ? (
                  comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className={`group ${comment.resolved ? "opacity-50" : ""}`}>
                        <div className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-frame-orange/10 text-frame-orange flex items-center justify-center text-xs font-bold shrink-0">
                            {comment.author_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold">{comment.author_name}</span>
                              <button onClick={() => setSeekTo(comment.timestamp_seconds)} className="text-[0.64rem] text-frame-orange hover:underline font-mono ml-auto flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTimestamp(comment.timestamp_seconds)}
                              </button>
                            </div>
                            <p className="text-xs text-frame-gray-light leading-relaxed">{comment.comment}</p>
                            {comment.annotations?.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-[0.62rem] text-frame-gray-light/50">
                                <PenLine className="w-2.5 h-2.5" />
                                {comment.annotations.length} {comment.annotations.length > 1 ? t("app.videoReviews.annotations") : t("app.videoReviews.annotation")} {t("app.videoReviews.onFrame")}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => handleResolveComment(comment.id, !comment.resolved)} className="text-[0.64rem] text-frame-gray-light hover:text-frame-white flex items-center gap-1">
                                {comment.resolved ? <Square className="w-3 h-3" /> : <CheckSquare className="w-3 h-3 text-green-400" />}
                                {comment.resolved ? t("app.videoReviews.reopen") : t("app.videoReviews.resolve")}
                              </button>
                              <button onClick={() => handleDeleteComment(comment.id)} className="text-[0.64rem] text-frame-gray-light hover:text-red-400 flex items-center gap-1">
                                <Trash2 className="w-3 h-3" />
                                {t("app.common.delete")}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-frame-gray-light/30" />
                      <p className="text-xs text-frame-gray-light/60">{t("app.videoReviews.noCommentsYet")}</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-10">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-frame-gray-light/30" />
                    <p className="text-xs text-frame-gray-light/60">{t("app.videoReviews.commentsWhenSelected")}</p>
                  </div>
                )}
              </div>

              {selectedReview && (
                <ReviewCommentComposer
                  currentTimestamp={newCommentTimestamp ?? 0}
                  anchorTimestamp={commentAnchor}
                  comment={newComment}
                  onCommentChange={setNewComment}
                  onBegin={captureCommentTime}
                  onRecapture={captureCommentTime}
                  onSubmit={() => addComment(newComment, commentAnchor ?? newCommentTimestamp ?? 0)}
                  submitting={isCommenting}
                />
              )}
            </aside>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-frame-gray-1 border border-frame-gray-3 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-frame-gray-3 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-frame-orange" />
                  {t("app.videoReviews.clientLink")}
                </h2>
                <button onClick={() => setShowShareModal(false)} className="text-frame-gray-light hover:text-frame-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <input type="text" value={shareUrl} readOnly className="frame-input flex-1 text-xs" />
                  <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success(t("app.common.copied")); }} className="frame-btn-ghost">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <a href={shareUrl} target="_self" className="flex items-center gap-2 text-xs text-frame-orange hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t("app.videoReviews.openPublicPage")}
                </a>
              </div>
              <div className="p-6 border-t border-frame-gray-3">
                <button onClick={() => setShowShareModal(false)} className="frame-btn-primary w-full">{t("app.common.close")}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function VideoReviews() {
  return (
    <ProtectedRoute>
      <VideoReviewsContent />
    </ProtectedRoute>
  );
}
