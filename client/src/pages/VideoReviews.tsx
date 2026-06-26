import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import VideoPlayer from "@/components/VideoPlayer";
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
  Send,
  Share2,
  Square,
  Trash2,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

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

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  draft: { label: "Rascunho", icon: HelpCircle, color: "text-frame-gray-light", bg: "bg-frame-gray-3" },
  pending_review: { label: "Pendente", icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  changes_requested: { label: "Alterações", icon: AlertCircle, color: "text-orange-400", bg: "bg-orange-500/10" },
  approved: { label: "Aprovado", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
  rejected: { label: "Rejeitado", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

const STATUS_ACTIONS = [
  { value: "approved", label: "Aprovar", color: "border-green-500/30 text-green-400 hover:bg-green-500/10" },
  { value: "changes_requested", label: "Solicitar alterações", color: "border-orange-500/30 text-orange-400 hover:bg-orange-500/10" },
  { value: "rejected", label: "Rejeitar", color: "border-red-500/30 text-red-400 hover:bg-red-500/10" },
];

function VideoReviewsContent() {
  const { projectId } = useParams<{ projectId: string }>();
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

  const loadReviewDetails = useCallback(async (reviewId: number) => {
    try {
      const response = await fetch(`/api/video-review?id=${reviewId}`, { credentials: "include" });
      const data = await response.json();
      if (data.success) {
        setSelectedReview(data.data);
        setComments(data.data.comments || []);
        setSeekTo(null);
        return;
      }
      toast.error(data.error || "Erro ao carregar review");
    } catch {
      toast.error("Erro ao carregar review");
    }
  }, []);

  const loadAllReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/video-reviews", { credentials: "include" });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || "Erro ao carregar reviews");
        return;
      }
      const nextReviews = data.data || [];
      setReviews(nextReviews);
      if (nextReviews.length > 0) {
        await loadReviewDetails(nextReviews[0].id);
      } else {
        setSelectedReview(null);
        setComments([]);
      }
    } catch {
      toast.error("Erro ao carregar reviews");
    } finally {
      setLoading(false);
    }
  }, [loadReviewDetails]);

  const loadProjectFiles = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/files/projects/${projectId}`, { credentials: "include" });
      const data = await response.json();
      if (data.success) setProjectFiles(data.data);
    } catch {
      toast.error("Erro ao carregar arquivos do projeto");
    }
  }, [projectId]);

  useEffect(() => {
    loadAllReviews();
  }, [loadAllReviews]);

  useEffect(() => {
    loadProjectFiles();
  }, [loadProjectFiles]);

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
      toast.error("Dê um título para o review");
      return;
    }
    const rawLink = driveLink.trim();
    if (!selectedFileId && !rawLink) {
      toast.error("Cole um link ou escolha um vídeo do projeto");
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
        toast.error(data.error || "Erro ao criar review");
        return;
      }

      if (data.data.shareUrl) {
        setShareUrl(data.data.shareUrl);
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
          setShareUrl(shareData.data.shareUrl);
          setShowShareModal(true);
        }
      }

      toast.success("Review criado e link gerado");
      resetCreator();
      await loadAllReviews();
      await loadReviewDetails(data.data.id);
    } catch {
      toast.error("Erro ao criar review");
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
        setShareUrl(data.data.shareUrl);
        setShowShareModal(true);
      } else {
        toast.error(data.error || "Erro ao gerar link");
      }
    } catch {
      toast.error("Erro ao gerar link");
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
        toast.success("Status atualizado");
        setSelectedReview(data.data);
        loadAllReviews();
      } else {
        toast.error(data.error || "Erro ao atualizar status");
      }
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleAddAnnotatedComment = async (annotations: Annotation[], timestamp: number, commentText: string) => {
    if (!selectedReview) return;
    await addComment(commentText, timestamp, annotations);
  };

  const addComment = async (commentText: string, timestamp: number, annotations: Annotation[] = []) => {
    if (!selectedReview || !commentText.trim()) {
      toast.error("Comentário é obrigatório");
      return;
    }
    try {
      const response = await fetch("/api/video-review-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reviewId: selectedReview.id,
          timestampSeconds: timestamp,
          comment: commentText.trim(),
          authorName: "Você",
          annotations,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNewComment("");
        setNewCommentTimestamp(null);
        await loadReviewDetails(selectedReview.id);
      } else {
        toast.error(data.error || "Erro ao comentar");
      }
    } catch {
      toast.error("Erro ao comentar");
    }
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
      else toast.error(data.error || "Erro ao atualizar comentário");
    } catch {
      toast.error("Erro ao atualizar comentário");
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Excluir comentário?")) return;
    try {
      const response = await fetch(`/api/video-review-comment?commentId=${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (data.success && selectedReview) loadReviewDetails(selectedReview.id);
      else toast.error(data.error || "Erro ao excluir comentário");
    } catch {
      toast.error("Erro ao excluir comentário");
    }
  };

  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const currentStatus = selectedReview ? STATUS_CONFIG[selectedReview.status] || STATUS_CONFIG.draft : null;
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

      <main className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-frame-gray-3 bg-frame-gray-1/20 px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="frame-label">// APROVAÇÃO</p>
            <h1 className="frame-title text-[clamp(1.6rem,3vw,2.4rem)] leading-none mt-1">REVIEW ROOM</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedReview && currentStatus && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[0.62rem] font-frame-mono uppercase tracking-wider ${currentStatus.bg} ${currentStatus.color} border border-current/20`}>
                <currentStatus.icon className="w-3 h-3" />
                {currentStatus.label}
              </span>
            )}
            <button onClick={loadAllReviews} className="frame-btn-ghost flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
            {selectedReview && (
              <button onClick={handleGenerateShareLink} className="frame-btn-primary flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Link cliente
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-frame-orange" />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_380px] min-h-0">
            <aside className="border-b xl:border-b-0 xl:border-r border-frame-gray-3 bg-frame-gray-1/10 overflow-y-auto">
              <div className="p-4 border-b border-frame-gray-3">
                <p className="frame-label mb-3">// NOVO LINK</p>
                <div className="space-y-3">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="frame-input w-full" placeholder="Título do review" />
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="frame-input w-full h-20 resize-none" placeholder="Contexto para o cliente" />
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="frame-input w-full pl-10" placeholder="Google Drive, YouTube, Vimeo..." />
                  </div>
                  {videoFiles.length > 0 && (
                    <select value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)} className="frame-input w-full">
                      <option value="">Ou escolha um vídeo do projeto</option>
                      {videoFiles.map((file) => (
                        <option key={file.id} value={file.id}>{file.original_name}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={handleCreateReview} disabled={isCreating} className="frame-btn-primary w-full flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    {isCreating ? "Criando..." : "Criar review e link"}
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="frame-label">// FILA</p>
                  <span className="text-xs text-frame-gray-light">{reviews.length}</span>
                </div>
                {reviews.length === 0 ? (
                  <div className="border border-dashed border-frame-gray-3 p-5 text-center text-sm text-frame-gray-light">
                    Nenhum review ainda. Cole um link acima e crie o primeiro.
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
                              <p className="text-[0.62rem] text-frame-gray-light truncate">{review.original_name || "Vídeo externo"}</p>
                              <p className="text-[0.55rem] text-frame-gray-light/60 font-frame-mono mt-1">
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

            <section className="bg-black min-h-[420px] xl:min-h-0 flex flex-col">
              <div className="border-b border-frame-gray-3 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{selectedReview?.title || title || "Preview do review"}</p>
                  <p className="text-xs text-frame-gray-light truncate">
                    {selectedReview?.description || description || "Cole um link para testar o player antes de enviar ao cliente."}
                  </p>
                </div>
                {selectedReview && (
                  <div className="flex flex-wrap gap-2">
                    {STATUS_ACTIONS.map((action) => (
                      <button
                        key={action.value}
                        onClick={() => handleUpdateReviewStatus(action.value)}
                        disabled={selectedReview.status === action.value}
                        className={`px-2.5 py-1.5 text-[0.55rem] font-frame-mono uppercase tracking-wider border transition ${action.color} disabled:opacity-45`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center p-4">
                {selectedReview ? (
                  <div className="w-full max-w-5xl">
                    <VideoPlayer
                      url={resolveVideoUrl(selectedReview)}
                      onProgress={(seconds) => setNewCommentTimestamp(Math.floor(seconds))}
                      seekTo={seekTo}
                      commentMarkers={commentMarkers}
                      onAddAnnotatedComment={handleAddAnnotatedComment}
                    />
                    <p className="mt-3 text-[0.6rem] font-frame-mono uppercase tracking-wider text-frame-gray-light">
                      Pause o vídeo para desenhar no frame. Comentários abaixo ficam com timestamp.
                    </p>
                  </div>
                ) : previewUrl ? (
                  <div className="w-full max-w-5xl aspect-video border border-frame-gray-3 bg-frame-gray-1">
                    <iframe src={previewUrl} title="Preview do vídeo" className="w-full h-full" allow="autoplay; fullscreen" />
                  </div>
                ) : (
                  <div className="text-center max-w-md border border-dashed border-frame-gray-3 p-10">
                    <Video className="w-16 h-16 mx-auto mb-4 text-frame-gray-light" />
                    <h2 className="text-xl font-bold mb-2">Player pronto para aprovação</h2>
                    <p className="text-sm text-frame-gray-light">
                      Cole um link do Drive/YouTube/Vimeo ou escolha um vídeo do projeto para gerar a sala de review.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <aside className="border-t xl:border-t-0 xl:border-l border-frame-gray-3 bg-frame-gray-1/10 flex flex-col min-h-[460px] xl:min-h-0">
              <div className="p-4 border-b border-frame-gray-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-frame-orange" />
                  Comentários
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
                              <button onClick={() => setSeekTo(comment.timestamp_seconds)} className="text-[0.55rem] text-frame-orange hover:underline font-mono ml-auto flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTimestamp(comment.timestamp_seconds)}
                              </button>
                            </div>
                            <p className="text-xs text-frame-gray-light leading-relaxed">{comment.comment}</p>
                            {comment.annotations?.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-[0.5rem] text-frame-gray-light/50">
                                <PenLine className="w-2.5 h-2.5" />
                                {comment.annotations.length} anotação{comment.annotations.length > 1 ? "ões" : ""} no frame
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => handleResolveComment(comment.id, !comment.resolved)} className="text-[0.55rem] text-frame-gray-light hover:text-frame-white flex items-center gap-1">
                                {comment.resolved ? <Square className="w-3 h-3" /> : <CheckSquare className="w-3 h-3 text-green-400" />}
                                {comment.resolved ? "Reabrir" : "Resolver"}
                              </button>
                              <button onClick={() => handleDeleteComment(comment.id)} className="text-[0.55rem] text-frame-gray-light hover:text-red-400 flex items-center gap-1">
                                <Trash2 className="w-3 h-3" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-frame-gray-light/30" />
                      <p className="text-xs text-frame-gray-light/60">Nenhum comentário ainda</p>
                    </div>
                  )
                ) : (
                  <div className="space-y-3 text-sm text-frame-gray-light">
                    <div className="border border-frame-gray-3 bg-frame-black/30 p-4">
                      <FileVideo className="w-5 h-5 text-frame-orange mb-3" />
                      <p className="font-semibold text-frame-white">Workflow ideal</p>
                      <p className="text-xs mt-2">1. Cole o link do vídeo. 2. Crie o review. 3. Copie o link para o cliente. 4. Receba comentários e aprovação.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-frame-gray-3 p-4">
                <div className="flex gap-2">
                  <input
                    value={newComment}
                    disabled={!selectedReview}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && selectedReview) {
                        e.preventDefault();
                        addComment(newComment, newCommentTimestamp ?? 0);
                      }
                    }}
                    className="flex-1 bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-xs outline-none focus:border-frame-orange disabled:opacity-50"
                    placeholder={selectedReview ? "Comentário com timestamp..." : "Selecione um review"}
                  />
                  <button disabled={!selectedReview} onClick={() => addComment(newComment, newCommentTimestamp ?? 0)} className="frame-btn-primary px-3 disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[0.55rem] text-frame-gray-light/50">
                  <Clock className="w-3 h-3" />
                  Timestamp: {newCommentTimestamp !== null ? formatTimestamp(newCommentTimestamp) : "--:--"}
                </div>
              </div>
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
                  Link do Cliente
                </h2>
                <button onClick={() => setShowShareModal(false)} className="text-frame-gray-light hover:text-frame-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <input type="text" value={shareUrl} readOnly className="frame-input flex-1 text-xs" />
                  <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copiado"); }} className="frame-btn-ghost">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <a href={shareUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-frame-orange hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir página pública
                </a>
              </div>
              <div className="p-6 border-t border-frame-gray-3">
                <button onClick={() => setShowShareModal(false)} className="frame-btn-primary w-full">Fechar</button>
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
