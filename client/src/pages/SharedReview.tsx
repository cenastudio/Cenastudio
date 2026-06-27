import { useCallback, useEffect, useState } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import VideoPlayer from "@/components/VideoPlayer";
import ReviewCommentComposer from "@/components/ReviewCommentComposer";
import BrandLogo from "@/components/BrandLogo";
import {
  MessageSquare, Clock, AlertCircle, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

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
}

export default function SharedReview() {
  const { token } = useParams<{ token: string }>();
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
      } else {
        setError(data.error || "Erro ao carregar review");
      }
    } catch {
      setError("Erro ao carregar review");
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

  const resolveVideoUrl = (review: SharedReview): string => {
    if (review.video_url) return review.video_url;
    if (review.file_path) {
      if (review.file_path.startsWith("http")) return review.file_path;
      if (review.file_id) return `/api/files/${review.file_id}/download`;
    }
    return "";
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !authorName.trim()) {
      toast.error("Nome e comentário são obrigatórios");
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
        toast.success("Comentário adicionado!");
        setNewComment("");
        setCommentAnchor(null);
        await loadSharedReview(true);
      } else {
        toast.error(data.error || "Erro ao adicionar comentário");
      }
    } catch {
      toast.error("Erro ao adicionar comentário");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDecision = async (status: "approved" | "changes_requested" | "rejected") => {
    if (!authorName.trim()) {
      toast.error("Digite seu nome antes de enviar a decisão");
      return;
    }

    setIsDeciding(true);
    try {
      const response = await fetch("/api/public-review-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          status,
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
          status === "approved"
            ? "Vídeo aprovado!"
            : status === "changes_requested"
              ? "Alterações solicitadas!"
              : "Review rejeitado.",
        );
      } else {
        toast.error(data.error || "Erro ao enviar decisão");
      }
    } catch {
      toast.error("Erro ao enviar decisão");
    } finally {
      setIsDeciding(false);
    }
  };

  const handleTimestampClick = (seconds: number) => {
    setSeekTo(seconds);
  };

  const handlePlayerProgress = (seconds: number) => {
    setNewCommentTimestamp(Math.floor(seconds));
  };

  const captureCommentTime = () => {
    setCommentAnchor(Math.floor(newCommentTimestamp));
    setPauseRequest((request) => request + 1);
  };

  const commentMarkers = comments.map((comment) => ({
    id: comment.id,
    timestampSeconds: comment.timestamp_seconds,
    comment: comment.comment,
    resolved: false,
    authorName: comment.author_name,
  }));

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-frame-black flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-frame-orange" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-frame-black flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-frame-red" />
          <h2 className="text-2xl font-bold text-frame-white mb-2">Review não encontrado</h2>
          <p className="text-frame-gray-light mb-4">
            {error || "Este link pode ter expirado ou não existe."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-frame-black">
      {/* Brand Header */}
      <div className="border-b border-frame-gray-3 px-6 py-4">
        <div className="flex items-center gap-3">
          <BrandLogo compact />
          <span className="text-frame-gray-light text-sm">Review de Vídeo</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto p-8"
      >
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-frame-white mb-2">{review.title}</h1>
              {review.description && (
                <p className="text-frame-gray-light mb-4">{review.description}</p>
              )}
            </div>
            <span
              className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-mono uppercase tracking-wider ${
                review.status === "approved"
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : review.status === "changes_requested"
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                    : review.status === "rejected"
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : "border-frame-gray-3 bg-frame-gray-2 text-frame-gray-light"
              }`}
            >
              {review.status === "approved" ? "Aprovado" : review.status === "changes_requested" ? "Alterações" : review.status === "rejected" ? "Rejeitado" : "Pendente"}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-frame-gray-4">
            <span>Projeto: {review.project_name}</span>
            {review.expires_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Expira em {new Date(review.expires_at).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video + Comment Form */}
          <div className="space-y-6">
            <div className="bg-frame-gray-1 rounded-lg border border-frame-gray-3 p-6">
              <VideoPlayer
                url={resolveVideoUrl(review)}
                onProgress={handlePlayerProgress}
                seekTo={seekTo}
                commentMarkers={commentMarkers}
                pauseRequest={pauseRequest}
              />
            </div>

            <div className="bg-frame-gray-1 rounded-lg border border-frame-gray-3 p-6">
              <h3 className="text-xl font-bold text-frame-white mb-2">Decisão final</h3>
              <p className="text-frame-gray-light text-sm mb-4">
                Quando terminar de assistir, envie uma aprovação ou solicite ajustes.
              </p>
              <textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                className="frame-input w-full h-20 mb-4"
                placeholder="Observação opcional para a decisão..."
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={isDeciding}
                  onClick={() => handleDecision("approved")}
                  className="border border-green-500/30 bg-green-500/10 text-green-400 px-3 py-3 text-xs font-mono uppercase tracking-wider hover:bg-green-500/20 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprovar
                </button>
                <button
                  type="button"
                  disabled={isDeciding}
                  onClick={() => handleDecision("changes_requested")}
                  className="border border-orange-500/30 bg-orange-500/10 text-orange-400 px-3 py-3 text-xs font-mono uppercase tracking-wider hover:bg-orange-500/20 transition"
                >
                  Pedir ajustes
                </button>
                <button
                  type="button"
                  disabled={isDeciding}
                  onClick={() => handleDecision("rejected")}
                  className="border border-red-500/30 bg-red-500/10 text-red-400 px-3 py-3 text-xs font-mono uppercase tracking-wider hover:bg-red-500/20 transition flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Rejeitar
                </button>
              </div>
            </div>

          </div>

          {/* Comments List */}
          <div className="bg-frame-gray-1 border border-frame-gray-3 flex min-h-[520px] flex-col overflow-hidden">
            <h3 className="text-lg font-bold text-frame-white p-5 border-b border-frame-gray-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comentários ({comments.length})
            </h3>

            {comments.length === 0 ? (
              <div className="flex-1 text-center py-12 px-6 text-frame-gray-light">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-frame-gray-4" />
                <p>Nenhum comentário ainda</p>
                <p className="text-sm">Escreva abaixo enquanto assiste.</p>
              </div>
            ) : (
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 border-l-2 border-frame-orange bg-frame-gray-2/50"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-frame-orange flex items-center justify-center text-frame-black font-bold shrink-0">
                        {comment.author_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-frame-white">{comment.author_name}</p>
                        <button
                          onClick={() => handleTimestampClick(comment.timestamp_seconds)}
                          className="text-xs text-frame-orange hover:underline font-mono flex items-center gap-1 mt-0.5"
                        >
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(comment.timestamp_seconds)}
                        </button>
                      </div>
                    </div>
                    <p className="text-frame-gray-light pl-11">{comment.comment}</p>
                  </motion.div>
                ))}
              </div>
            )}

            <ReviewCommentComposer
              currentTimestamp={newCommentTimestamp}
              anchorTimestamp={commentAnchor}
              comment={newComment}
              onCommentChange={setNewComment}
              authorName={authorName}
              onAuthorNameChange={setAuthorName}
              onBegin={captureCommentTime}
              onRecapture={captureCommentTime}
              onSubmit={handleAddComment}
              submitting={isCommenting}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
