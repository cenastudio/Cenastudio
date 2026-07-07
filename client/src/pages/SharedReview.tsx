import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import VideoPlayer from "@/components/VideoPlayer";
import ReviewCommentComposer from "@/components/ReviewCommentComposer";
import BrandLogo from "@/components/BrandLogo";
import { readStudioSettings } from "@/lib/studioSettings";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  MessageSquare,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface SharedReview {
  id: number;
  title: string;
  description: string | null;
  original_name: string;
  file_path: string;
  file_id: number;
  project_name: string;
  expires_at: string | null;
  status: string;
  video_url?: string;
}

interface VideoComment {
  id: number;
  author_name: string;
  timestamp_seconds: number;
  comment: string;
  created_at: string;
  resolved?: number;
}

const STATUS_COPY: Record<string, { labelKey: string; className: string }> = {
  approved: { labelKey: "app.videoReviews.approved", className: "border-green-500/30 bg-green-500/10 text-green-400" },
  changes_requested: { labelKey: "app.videoReviews.changesRequested", className: "border-orange-500/30 bg-orange-500/10 text-orange-400" },
  rejected: { labelKey: "app.videoReviews.rejected", className: "border-red-500/30 bg-red-500/10 text-red-400" },
  pending_review: { labelKey: "app.videoReviews.pending", className: "border-frame-gray-3 bg-frame-gray-2 text-frame-gray-light" },
  draft: { labelKey: "app.videoReviews.pending", className: "border-frame-gray-3 bg-frame-gray-2 text-frame-gray-light" },
};

function formatTimestamp(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    : `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(value: string, locale: "pt" | "en") {
  return new Date(value).toLocaleString(locale === "pt" ? "pt-BR" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SharedReview() {
  const { t, locale } = useLanguage();
  const { token } = useParams<{ token: string }>();
  const composerRef = useRef<HTMLDivElement | null>(null);
  const commentsRef = useRef<HTMLDivElement | null>(null);
  const [review, setReview] = useState<SharedReview | null>(null);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [newCommentTimestamp, setNewCommentTimestamp] = useState<number>(0);
  const [authorName, setAuthorName] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [commentAnchor, setCommentAnchor] = useState<number | null>(null);
  const [pauseRequest, setPauseRequest] = useState(0);
  const [isCommenting, setIsCommenting] = useState(false);

  const loadSharedReview = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`/api/public-review?token=${token}`);
      const data = await response.json();
      if (data.success) {
        setReview(data.data);
        setComments(data.data.comments || []);
        setError(null);
      } else {
        setError(data.error || t("app.errors.loadReview"));
      }
    } catch {
      setError(t("app.errors.loadReview"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSharedReview();
    const interval = window.setInterval(() => loadSharedReview(true), 5000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadSharedReview(true);
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadSharedReview]);

  useEffect(() => {
    const savedName = window.localStorage.getItem("cena-review-author");
    if (savedName) setAuthorName(savedName);
  }, []);

  useEffect(() => {
    if (authorName.trim()) window.localStorage.setItem("cena-review-author", authorName.trim());
  }, [authorName]);

  const resolveVideoUrl = (currentReview: SharedReview): string => {
    if (currentReview.video_url) return currentReview.video_url;
    if (currentReview.file_path) {
      if (currentReview.file_path.startsWith("http")) return currentReview.file_path;
      if (currentReview.file_id) return `/api/files/${currentReview.file_id}/download`;
    }
    return "";
  };

  const status = review ? STATUS_COPY[review.status] || STATUS_COPY.pending_review : STATUS_COPY.pending_review;
  const decisionComment = comments.find((comment) => comment.comment.startsWith("[Aprovado]") || comment.comment.startsWith("[Alterações solicitadas]") || comment.comment.startsWith("[Rejeitado]"));
  const openComments = comments.filter((comment) => !comment.comment.startsWith("["));

  const commentMarkers = comments.map((comment) => ({
    id: comment.id,
    timestampSeconds: comment.timestamp_seconds,
    comment: comment.comment,
    resolved: !!comment.resolved,
    authorName: comment.author_name,
  }));

  const shareText = useMemo(() => {
    if (!review) return "";

    const statusEmoji = status.labelKey.includes("approved") ? "✅" :
                        status.labelKey.includes("changes") ? "🔄" :
                        status.labelKey.includes("rejected") ? "❌" : "⏳";

    return [
      `🎬 *${review.title}*`,
      ``,
      `Projeto: ${review.project_name}`,
      `Status: ${statusEmoji} ${t(status.labelKey)}`,
      ``,
      `👉 *Visualize e comente aqui:*`,
      window.location.href,
      ``,
      `💬 Você pode assistir o vídeo, adicionar comentários em momentos específicos e aprovar ou solicitar alterações diretamente na plataforma.`,
      ``,
      `_Enviado via Cena Studio_`
    ].join("\n");
  }, [review, status.labelKey, t]);

  const summaryText = useMemo(() => {
    if (!review) return "";
    const lines = [
      t("app.videoReviews.studioReviewRoom"),
      review.title,
      `${t("app.videoReviews.project")}: ${review.project_name}`,
      `${t("app.videoReviews.status")}: ${t(status.labelKey)}`,
      `${t("app.videoReviews.generatedAt")}: ${new Date().toLocaleString(locale === "pt" ? "pt-BR" : "en-US")}`,
      "",
      t("app.videoReviews.comments"),
      comments.length ? "" : t("app.videoReviews.noCommentsSent"),
      ...comments.map((comment) => (
        `[${formatTimestamp(comment.timestamp_seconds)}] ${comment.author_name} - ${comment.comment}`
      )),
    ];
    return lines.join("\n");
  }, [comments, locale, review, status.labelKey, t]);

  const focusComposer = () => {
    setCommentAnchor(Math.floor(newCommentTimestamp));
    setPauseRequest((request) => request + 1);
    window.setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  const handleTimestampClick = (seconds: number) => {
    setSeekTo(seconds);
    setPauseRequest((request) => request + 1);
  };

  const handlePlayerProgress = (seconds: number) => {
    setNewCommentTimestamp(Math.floor(seconds));
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !authorName.trim()) {
      toast.error(t("app.errors.nameAndCommentRequired"));
      return;
    }
    setIsCommenting(true);
    try {
      const response = await fetch("/api/public-review-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          timestampSeconds: commentAnchor ?? newCommentTimestamp,
          comment: newComment,
          authorName,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t("app.videoReviews.commentSent"));
        setNewComment("");
        setCommentAnchor(null);
        await loadSharedReview(true);
        window.setTimeout(() => commentsRef.current?.scrollTo({ top: commentsRef.current.scrollHeight, behavior: "smooth" }), 100);
      } else {
        toast.error(data.error || t("app.errors.addComment"));
      }
    } catch {
      toast.error(t("app.errors.addComment"));
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDecision = async (nextStatus: "approved" | "changes_requested" | "rejected") => {
    if (!authorName.trim()) {
      toast.error(t("app.errors.nameRequiredForDecision"));
      return;
    }

    setIsDeciding(true);
    try {
      const response = await fetch("/api/public-review-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          status: nextStatus,
          authorName,
          comment: decisionNote,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setReview(data.data);
        setComments(data.data.comments || []);
        setDecisionNote("");
        toast.success(
          nextStatus === "approved"
            ? t("app.videoReviews.videoApproved")
            : nextStatus === "changes_requested"
              ? t("app.videoReviews.changesSent")
              : t("app.videoReviews.reviewRejected"),
        );
      } else {
        toast.error(data.error || t("app.errors.sendDecision"));
      }
    } catch {
      toast.error(t("app.errors.sendDecision"));
    } finally {
      setIsDeciding(false);
    }
  };

  const copyShareMessage = async () => {
    await navigator.clipboard.writeText(shareText);
    toast.success(t("app.common.copied"));
  };

  const openWhatsapp = () => {
    const studioSettings = readStudioSettings();
    const whatsappNumber = studioSettings.approvalWhatsapp || "";

    // Se tem número configurado, abre direto com o número. Senão, abre sem número (usuário escolhe contato)
    const whatsappUrl = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(shareText)}`
      : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const downloadSummary = () => {
    if (!review) return;
    const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${review.title.replace(/[^\w\d-]+/g, "-").toLowerCase()}-review.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-frame-black flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-frame-orange" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-frame-black flex items-center justify-center p-8">
        <div className="max-w-md border border-frame-gray-3 bg-frame-gray-1 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-frame-red" />
          <h2 className="mb-2 text-2xl font-bold text-frame-white">{t("app.videoReviews.reviewNotFound")}</h2>
          <p className="mb-4 text-frame-gray-light">
            {error || t("app.videoReviews.linkExpired")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-frame-black text-frame-white">
      <header className="sticky top-0 z-40 border-b border-frame-gray-3 bg-black/84 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo compact tone="onDark" />
            <span className="hidden h-4 w-px bg-frame-gray-3 sm:block" />
            <span className="truncate text-xs text-frame-gray-light sm:text-sm">{t("app.videoReviews.reviewRoom")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={copyShareMessage} className="hidden items-center gap-2 border border-frame-gray-3 px-3 py-2 text-xs text-frame-gray-light transition hover:border-frame-orange hover:text-frame-white sm:inline-flex">
              <Copy className="h-3.5 w-3.5" />
              {t("app.videoReviews.copyMessage")}
            </button>
            <button type="button" onClick={openWhatsapp} className="border border-frame-orange bg-frame-orange px-3 py-2 text-xs font-medium text-black transition hover:bg-frame-orange-dark">
              WhatsApp
            </button>
          </div>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto grid max-w-[1500px] grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]"
      >
        <section className="min-w-0 space-y-5">
          <div className="flex flex-col gap-4 border border-frame-gray-3 bg-frame-gray-1/40 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="frame-label mb-3">// {t("app.videoReviews.clientApproval")}</p>
              <h1 className="text-[clamp(1.8rem,4vw,3.8rem)] font-light leading-none tracking-normal text-frame-white">
                {review.title}
              </h1>
              {review.description && (
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-frame-gray-light">{review.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-frame-gray-light">
                <span>{t("app.videoReviews.project")}: {review.project_name}</span>
                {review.expires_at && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {t("app.videoReviews.expiresAt")} {new Date(review.expires_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
            <span className={`inline-flex w-fit items-center gap-2 border px-3 py-2 font-frame-mono text-[0.64rem] uppercase tracking-[0.14em] ${status.className}`}>
              {review.status === "approved" ? <CheckCircle2 className="h-3.5 w-3.5" /> : review.status === "rejected" ? <XCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {t(status.labelKey)}
            </span>
          </div>

          <div className="border border-frame-gray-3 bg-[radial-gradient(circle_at_50%_38%,rgba(232,80,2,0.11),rgba(16,13,12,0.96)_50%,#050505_100%)] p-2 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <VideoPlayer
              url={resolveVideoUrl(review)}
              onProgress={handlePlayerProgress}
              seekTo={seekTo}
              commentMarkers={commentMarkers}
              pauseRequest={pauseRequest}
            />
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-xs leading-relaxed text-frame-gray-light">
                {t("app.videoReviews.markerHint")}
              </p>
              <button
                type="button"
                onClick={focusComposer}
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-frame-orange px-4 font-frame-mono text-[0.66rem] uppercase tracking-[0.12em] text-black transition hover:bg-frame-orange-dark"
              >
                <MessageSquare className="h-4 w-4" />
                {t("app.videoReviews.commentAt")} {formatTimestamp(newCommentTimestamp)}
              </button>
            </div>
          </div>

          <section className="border border-frame-gray-3 bg-frame-gray-1/60 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="frame-label mb-2">// {t("app.videoReviews.finalDecision")}</p>
                <h2 className="text-xl font-semibold">{t("app.videoReviews.sendResponseToTeam")}</h2>
                <p className="mt-1 text-sm text-frame-gray-light">
                  {t("app.videoReviews.decisionInstructions")}
                </p>
              </div>
              {decisionComment && (
                <div className="border border-frame-gray-3 bg-frame-black/35 px-3 py-2 text-xs text-frame-gray-light">
                    {t("app.videoReviews.lastDecision")}: {decisionComment.author_name} · {formatDate(decisionComment.created_at, locale)}
                </div>
              )}
            </div>
            <textarea
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              className="frame-input mb-3 h-24 w-full resize-none"
              placeholder={t("app.videoReviews.optionalNotePlaceholder")}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                disabled={isDeciding}
                onClick={() => handleDecision("approved")}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-green-500/30 bg-green-500/10 px-3 font-frame-mono text-[0.66rem] uppercase tracking-[0.12em] text-green-400 transition hover:bg-green-500/20 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("app.videoReviews.approve")}
              </button>
              <button
                type="button"
                disabled={isDeciding}
                onClick={() => handleDecision("changes_requested")}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-orange-500/30 bg-orange-500/10 px-3 font-frame-mono text-[0.66rem] uppercase tracking-[0.12em] text-orange-400 transition hover:bg-orange-500/20 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {t("app.videoReviews.requestChanges")}
              </button>
              <button
                type="button"
                disabled={isDeciding}
                onClick={() => handleDecision("rejected")}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-500/30 bg-red-500/10 px-3 font-frame-mono text-[0.66rem] uppercase tracking-[0.12em] text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                {t("app.videoReviews.reject")}
              </button>
            </div>
          </section>
        </section>

        <aside className="min-h-[580px] border border-frame-gray-3 bg-frame-gray-1/75 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)]">
          <div className="flex h-full flex-col">
            <div className="border-b border-frame-gray-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="frame-label mb-1">// {t("app.videoReviews.adjustments")}</p>
                  <h2 className="text-lg font-semibold">{t("app.videoReviews.comments")} ({comments.length})</h2>
                </div>
                <button
                  type="button"
                  onClick={downloadSummary}
                  className="inline-flex items-center gap-2 border border-frame-gray-3 px-3 py-2 text-xs text-frame-gray-light transition hover:border-frame-orange hover:text-frame-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("app.videoReviews.summary")}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-frame-gray-light">
                <Sparkles className="h-3.5 w-3.5 text-frame-orange" />
                {openComments.length} {t("app.videoReviews.feedbackPoints")} {t("app.videoReviews.onVideo")}
              </div>
            </div>

            <div ref={commentsRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {comments.length === 0 ? (
                <div className="flex h-full min-h-52 flex-col items-center justify-center text-center text-frame-gray-light">
                  <MessageSquare className="mb-4 h-12 w-12 text-frame-gray-4" />
                  <p>{t("app.videoReviews.noCommentsYet")}</p>
                  <p className="mt-1 text-sm">{t("app.videoReviews.pauseAndComment")}</p>
                </div>
              ) : (
                comments.map((comment) => {
                  const isDecision = comment.comment.startsWith("[");
                  return (
                    <motion.button
                      key={comment.id}
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleTimestampClick(comment.timestamp_seconds)}
                      className={`block w-full border p-3 text-left transition hover:border-frame-orange/60 ${
                        isDecision ? "border-frame-orange/25 bg-frame-orange/5" : "border-frame-gray-3 bg-frame-black/24"
                      }`}
                    >
                      <div className="mb-2 flex items-start gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-frame-orange text-xs font-bold text-black">
                          {comment.author_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-frame-white">{comment.author_name}</p>
                            <span className="ml-auto shrink-0 font-frame-mono text-[0.62rem] text-frame-orange">
                              {formatTimestamp(comment.timestamp_seconds)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[0.68rem] text-frame-gray-muted">{formatDate(comment.created_at, locale)}</p>
                        </div>
                      </div>
                      <p className="pl-10 text-sm leading-relaxed text-frame-gray-light">{comment.comment}</p>
                    </motion.button>
                  );
                })
              )}
            </div>

            <div ref={composerRef}>
              <ReviewCommentComposer
                currentTimestamp={newCommentTimestamp}
                anchorTimestamp={commentAnchor}
                comment={newComment}
                onCommentChange={setNewComment}
                authorName={authorName}
                onAuthorNameChange={setAuthorName}
                onBegin={focusComposer}
                onRecapture={focusComposer}
                onSubmit={handleAddComment}
                submitting={isCommenting}
              />
            </div>
          </div>
        </aside>
      </motion.main>
    </div>
  );
}
