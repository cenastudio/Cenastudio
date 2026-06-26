import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import VideoPlayer from "@/components/VideoPlayer";
import type { Annotation } from "@/components/AnnotationCanvas";
import {
  Plus, Share2, MessageSquare, Clock, Trash2, Copy, ExternalLink,
  Film, CheckSquare, Square, Send, PenLine, ChevronRight, Video,
  CheckCircle2, XCircle, AlertCircle, HelpCircle, Loader2, FileVideo,
  X, Link2,
} from "lucide-react";
import { toast } from "sonner";

function parseGoogleDriveLink(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/\.(mp4|webm|mov|avi|mkv|ogg)(\?|$)/i.test(trimmed)) return trimmed;
  const patterns = [
    /(?:drive\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/,
    /(?:drive\.google\.com\/open\?id=)([a-zA-Z0-9_-]+)/,
    /(?:drive\.google\.com\/uc\?(?:export=download&)?id=)([a-zA-Z0-9_-]+)/,
    /(?:docs\.google\.com\/uc\?(?:export=download&)?id=)([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  if (/youtube\.com|youtu\.be/i.test(trimmed)) return trimmed;
  if (/vimeo\.com/i.test(trimmed)) return trimmed;
  return trimmed;
}

interface VideoReview {
  id: number;
  project_id: number;
  file_id: number;
  title: string;
  description: string | null;
  status: string;
  share_token: string | null;
  expires_at: string | null;
  original_name: string;
  file_path: string;
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
  const [, setLocation] = useLocation();
  const [reviews, setReviews] = useState<VideoReview[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedReview, setSelectedReview] = useState<VideoReview | null>(null);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [newReviewTitle, setNewReviewTitle] = useState("");
  const [newReviewDescription, setNewReviewDescription] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newCommentTimestamp, setNewCommentTimestamp] = useState<number | null>(null);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [driveLink, setDriveLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { loadAllReviews(); }, []);
  useEffect(() => { if (projectId) loadProjectFiles(); }, [projectId]);

  const loadAllReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/video-reviews", { credentials: "include" });
      const data = await response.json();
      if (data.success) setReviews(data.data);
    } catch {
      toast.error("Erro ao carregar reviews");
    } finally { setLoading(false); }
  };

  const loadProjectFiles = async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/files/projects/${projectId}`, { credentials: "include" });
      const data = await response.json();
      if (data.success) setProjectFiles(data.data);
    } catch { toast.error("Erro ao carregar arquivos"); }
  };

  const resolveVideoUrl = useCallback((review: VideoReview): string => {
    if (review.video_url) return review.video_url;
    if (review.file_path) {
      if (review.file_path.startsWith("http")) return review.file_path;
      return `/api/files/${review.file_id}/download`;
    }
    return "";
  }, []);

  const loadReviewDetails = async (reviewId: number) => {
    try {
      const response = await fetch(`/api/video-review?id=${reviewId}`, { credentials: "include" });
      const data = await response.json();
      if (data.success) {
        setSelectedReview(data.data);
        setComments(data.data.comments || []);
        setSeekTo(null);
      }
    } catch { toast.error("Erro ao carregar detalhes do review"); }
  };

  const handleCreateReview = async () => {
    if (!newReviewTitle.trim()) { toast.error("Título é obrigatório"); return; }
    const rawLink = driveLink.trim();
    if (!selectedFileId && !rawLink) { toast.error("Cole um link ou selecione um vídeo"); return; }
    setIsUploading(true);
    try {
      let fileId = selectedFileId ? parseInt(selectedFileId) : null;
      const videoUrl = rawLink ? parseGoogleDriveLink(rawLink) || rawLink : "";
      const activeProjectId = projectId ? parseInt(projectId) : null;
      const response = await fetch("/api/video-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: activeProjectId, fileId,
          title: newReviewTitle, description: newReviewDescription,
          videoUrl: videoUrl || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Review criado!");
        setShowCreateModal(false);
        setNewReviewTitle(""); setNewReviewDescription(""); setSelectedFileId(""); setDriveLink("");
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
        setSelectedReview(data.data);
        loadAllReviews();
      } else toast.error(data.error || "Erro ao criar review");
    } catch { toast.error("Erro ao criar review"); } finally { setIsUploading(false); }
  };

  const handleGenerateShareLink = async () => {
    if (!selectedReview) return;
    try {
      const response = await fetch("/api/video-review-share", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ reviewId: selectedReview.id, expiresInDays: 7 }),
      });
      const data = await response.json();
      if (data.success) { setShareUrl(data.data.shareUrl); setShowShareModal(true); }
    } catch { toast.error("Erro ao gerar link"); }
  };

  const handleAddAnnotatedComment = async (annotations: Annotation[], timestamp: number, commentText: string) => {
    if (!selectedReview) return;
    try {
      const response = await fetch("/api/video-review-comment", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ reviewId: selectedReview.id, timestampSeconds: timestamp, comment: commentText, authorName: "Você", annotations }),
      });
      const data = await response.json();
      if (data.success) { toast.success("Feedback enviado!"); setNewComment(""); loadReviewDetails(selectedReview.id); }
    } catch { toast.error("Erro ao adicionar feedback"); }
  };

  const handleAddComment = async () => {
    if (!selectedReview || !newComment.trim()) { toast.error("Comentário é obrigatório"); return; }
    try {
      const response = await fetch("/api/video-review-comment", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ reviewId: selectedReview.id, timestampSeconds: newCommentTimestamp ?? 0, comment: newComment, authorName: "Você" }),
      });
      const data = await response.json();
      if (data.success) { toast.success("Comentário adicionado!"); setNewComment(""); setNewCommentTimestamp(null); loadReviewDetails(selectedReview.id); }
    } catch { toast.error("Erro ao adicionar comentário"); }
  };

  const handleResolveComment = async (commentId: number, resolved: boolean) => {
    try {
      const response = await fetch("/api/video-review-comment-resolve", {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ commentId, resolved }),
      });
      if (response.ok) { toast.success(resolved ? "Resolvido!" : "Reaberto!"); if (selectedReview) loadReviewDetails(selectedReview.id); }
    } catch { toast.error("Erro ao atualizar"); }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Excluir comentário?")) return;
    try {
      const response = await fetch(`/api/video-review-comment?commentId=${commentId}`, { method: "DELETE", credentials: "include" });
      if (response.ok) { toast.success("Excluído!"); if (selectedReview) loadReviewDetails(selectedReview.id); }
    } catch { toast.error("Erro ao excluir"); }
  };

  const handleUpdateReviewStatus = async (status: string) => {
    if (!selectedReview) return;
    try {
      const response = await fetch(`/api/video-review?id=${selectedReview.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) { toast.success("Status atualizado!"); setSelectedReview(data.data); loadAllReviews(); }
    } catch { toast.error("Erro ao atualizar status"); }
  };

  const handleTimestampClick = (seconds: number) => setSeekTo(seconds);
  const handlePlayerProgress = (seconds: number) => setNewCommentTimestamp(Math.floor(seconds));

  const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const videoFiles = projectFiles.filter(
    (f) => f.mime_type?.startsWith("video/") || f.original_name.match(/\.(mp4|mov|avi|mkv|webm)$/i)
  );

  const commentMarkers = comments.map((c) => ({
    id: c.id, timestampSeconds: c.timestamp_seconds, comment: c.comment, resolved: !!c.resolved, authorName: c.author_name,
  }));

  const currentStatus = selectedReview ? STATUS_CONFIG[selectedReview.status] || STATUS_CONFIG.draft : null;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />
      {projectId && <ProjectNav projectId={parseInt(projectId)} />}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Top bar */}
        <div className="border-b border-frame-gray-3 bg-frame-gray-1/20 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <p className="frame-label shrink-0">// APROVAÇÃO</p>
            <div className="h-4 w-px bg-frame-gray-3" />
            {currentStatus && selectedReview ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[0.6rem] font-frame-mono ${currentStatus.bg} ${currentStatus.color} border border-current/20`}>
                  <currentStatus.icon className="w-3 h-3" />
                  {currentStatus.label}
                </span>
                <span className="text-sm font-medium truncate">{selectedReview.title}</span>
              </div>
            ) : (
              <span className="text-sm text-frame-gray-light">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedReview && (
              <>
                {STATUS_ACTIONS.map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => handleUpdateReviewStatus(action.value)}
                    className={`px-2.5 py-1.5 text-[0.55rem] font-frame-mono uppercase tracking-wider border transition ${action.color} ${
                      selectedReview.status === action.value ? "bg-white/5" : ""
                    }`}
                    disabled={selectedReview.status === action.value}
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleGenerateShareLink}
                  className="frame-btn-ghost flex items-center gap-1.5 text-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Compartilhar
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => { loadProjectFiles(); setShowCreateModal(true); }}
              className="frame-btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Review
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-frame-orange" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <Video className="w-16 h-16 mx-auto mb-4 text-frame-gray-light" />
              <h3 className="text-xl font-bold text-frame-white mb-2">Nenhum review ainda</h3>
              <p className="text-frame-gray-light text-sm mb-6">
                Crie um review para aprovar vídeos com anotações no frame e comentários com timestamp.
              </p>
              <button type="button" onClick={() => { loadProjectFiles(); setShowCreateModal(true); }} className="frame-btn-primary">
                Criar Primeiro Review
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* Left: Review List */}
            <aside className="w-64 shrink-0 overflow-y-auto border-r border-frame-gray-3 bg-frame-gray-1/10">
              <div className="p-3 space-y-1">
                {reviews.map((review) => {
                  const st = STATUS_CONFIG[review.status] || STATUS_CONFIG.draft;
                  const isActive = selectedReview?.id === review.id;
                  return (
                    <button
                      key={review.id}
                      type="button"
                      onClick={() => loadReviewDetails(review.id)}
                      className={`w-full text-left p-3 border-l-2 transition ${
                        isActive
                          ? "bg-frame-orange/5 border-frame-orange"
                          : "border-transparent hover:bg-frame-gray-2/30 hover:border-frame-gray-4"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${st.bg} ${st.color}`}>
                          <st.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{review.title}</p>
                          <p className="text-[0.6rem] text-frame-gray-light truncate mt-0.5">
                            {review.original_name || "Vídeo externo"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[0.5rem] font-frame-mono text-frame-gray-light">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(review.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Center + Right */}
            <div className="flex-1 flex min-h-0">
              {selectedReview ? (
                <>
                  {/* Main: Player */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 bg-black flex items-center justify-center p-4">
                      <div className="w-full max-w-4xl">
                        <VideoPlayer
                          url={resolveVideoUrl(selectedReview)}
                          onProgress={handlePlayerProgress}
                          seekTo={seekTo}
                          commentMarkers={commentMarkers}
                          onAddAnnotatedComment={handleAddAnnotatedComment}
                        />
                        <div className="flex items-center gap-3 mt-2 text-[0.5rem] text-frame-gray-light/40 font-frame-mono">
                          <span>Espaço/K — play/pause</span>
                          <span>← → — 5s</span>
                          <span>J/L — 10s</span>
                          <span>M — mudo</span>
                          <span>F — tela cheia</span>
                          <span>Pause para anotar o frame</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Comments Panel */}
                  <aside className="w-96 shrink-0 border-l border-frame-gray-3 bg-frame-gray-1/10 flex flex-col">
                    <div className="p-4 border-b border-frame-gray-3 shrink-0">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-frame-orange" />
                        Comentários
                        <span className="text-frame-gray-light font-normal text-xs ml-auto">{comments.length}</span>
                      </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      <AnimatePresence>
                        {comments.map((comment) => (
                          <motion.div
                            key={comment.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`group relative ${comment.resolved ? "opacity-50" : ""}`}
                          >
                            <div className="flex gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-frame-orange/10 text-frame-orange flex items-center justify-center text-xs font-bold shrink-0">
                                {comment.author_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-semibold">{comment.author_name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleTimestampClick(comment.timestamp_seconds)}
                                    className="text-[0.55rem] text-frame-orange hover:underline font-mono ml-auto flex items-center gap-1"
                                  >
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
                                <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition">
                                  <button
                                    type="button"
                                    onClick={() => handleResolveComment(comment.id, !comment.resolved)}
                                    className="text-[0.5rem] text-frame-gray-light hover:text-frame-white transition flex items-center gap-1"
                                  >
                                    {comment.resolved ? <Square className="w-2.5 h-2.5" /> : <CheckSquare className="w-2.5 h-2.5 text-green-400" />}
                                    {comment.resolved ? "Reabrir" : "Resolver"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-[0.5rem] text-frame-gray-light hover:text-red-400 transition flex items-center gap-1"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    Excluir
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {comments.length === 0 && (
                        <div className="text-center py-8">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-frame-gray-light/30" />
                          <p className="text-xs text-frame-gray-light/50">Nenhum comentário ainda</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-frame-gray-3 p-4 shrink-0">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Comentário (pause para anotar)..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1 bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-xs outline-none focus:border-frame-orange"
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                        />
                        <button type="button" onClick={handleAddComment} className="frame-btn-primary flex items-center gap-2 text-xs">
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[0.5rem] text-frame-gray-light/40">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Timestamp: {newCommentTimestamp !== null ? formatTimestamp(newCommentTimestamp) : "--:--"}</span>
                      </div>
                    </div>
                  </aside>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center border border-dashed border-frame-gray-3 m-6">
                  <div className="text-center p-12">
                    <Film className="w-16 h-16 mx-auto mb-4 text-frame-gray-light" />
                    <h3 className="text-lg font-bold text-frame-white mb-2">Selecione um review</h3>
                    <p className="text-frame-gray-light text-sm">Clique em um review na lista ao lado para começar.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => { setShowCreateModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-frame-gray-1 border border-frame-gray-3 w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-frame-gray-3 flex items-center justify-between">
                <div>
                  <p className="frame-label mb-1">// NOVO REVIEW</p>
                  <h2 className="text-xl font-bold">Criar Review de Vídeo</h2>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-frame-gray-light hover:text-frame-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-frame-mono uppercase tracking-wider text-frame-orange mb-2">Título *</label>
                  <input
                    type="text" value={newReviewTitle} onChange={(e) => setNewReviewTitle(e.target.value)}
                    className="frame-input w-full" placeholder="Ex: Review versão 2.0 - Cliente Final"
                  />
                </div>
                <div>
                  <label className="block text-xs font-frame-mono uppercase tracking-wider text-frame-orange mb-2">Descrição</label>
                  <textarea
                    value={newReviewDescription} onChange={(e) => setNewReviewDescription(e.target.value)}
                    className="frame-input w-full h-20 resize-none" placeholder="Instruções ou contexto para o review..."
                  />
                </div>
                <div className="border border-frame-gray-3 bg-frame-black/30 p-4 space-y-4">
                  <p className="text-xs font-frame-mono uppercase tracking-wider text-frame-gray-light flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5" />
                    Link do Vídeo
                  </p>
                  <input
                    type="url" value={driveLink} onChange={(e) => setDriveLink(e.target.value)}
                    className="frame-input w-full" placeholder="https://drive.google.com/file/d/..."
                  />
                  <p className="text-[0.6rem] text-frame-gray-light/50">Google Drive, YouTube, Vimeo ou URL direta</p>
                  <div className="border-t border-frame-gray-3 pt-4">
                    <p className="text-[0.55rem] font-frame-mono uppercase tracking-wider text-frame-gray-light mb-2 flex items-center gap-2">
                      <FileVideo className="w-3 h-3" />
                      Ou vídeo já enviado ao projeto
                    </p>
                    {videoFiles.length > 0 ? (
                      <select value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)} className="frame-input w-full">
                        <option value="">Nenhum</option>
                        {videoFiles.map((file) => (
                          <option key={file.id} value={file.id}>{file.original_name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-frame-gray-light italic">Nenhum vídeo no projeto</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-6 border-t border-frame-gray-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="frame-btn-ghost flex-1">Cancelar</button>
                <button type="button" onClick={handleCreateReview} disabled={isUploading} className="frame-btn-primary flex-1">
                  {isUploading ? "Enviando..." : "Criar Review"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-frame-gray-1 border border-frame-gray-3 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-frame-gray-3 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-frame-orange" />
                  Compartilhar Review
                </h2>
                <button type="button" onClick={() => setShowShareModal(false)} className="text-frame-gray-light hover:text-frame-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <input type="text" value={shareUrl} readOnly className="frame-input flex-1 text-xs" />
                  <button type="button" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copiado!"); }} className="frame-btn-ghost">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-frame-gray-light">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Este link expira em 7 dias
                </div>
              </div>
              <div className="p-6 border-t border-frame-gray-3">
                <button type="button" onClick={() => setShowShareModal(false)} className="frame-btn-primary w-full">Fechar</button>
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
