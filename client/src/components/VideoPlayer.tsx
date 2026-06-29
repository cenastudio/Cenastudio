import { useEffect, useRef, useState, useCallback } from "react";
import ReactPlayer from "react-player";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipForward, SkipBack, Monitor, Smartphone,
} from "lucide-react";
import AnnotationCanvas, { type Annotation } from "./AnnotationCanvas";
import { useLanguage } from "@/contexts/LanguageContext";

interface CommentMarker {
  id: number;
  timestampSeconds: number;
  comment: string;
  resolved: boolean;
  authorName: string;
}

interface VideoPlayerProps {
  url: string;
  onProgress?: (seconds: number) => void;
  onDuration?: (duration: number) => void;
  seekTo?: number | null;
  onReady?: () => void;
  commentMarkers?: CommentMarker[];
  onAddAnnotatedComment?: (annotation: Annotation[], timestamp: number, comment: string) => void;
  pauseRequest?: number;
}

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2];

function extractGoogleDriveId(url: string): string | null {
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?(?:export=(?:download|view)&)?id=([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/uc\?(?:export=(?:download|view)&)?id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function getGoogleDrivePreviewUrl(url: string): string | null {
  const id = extractGoogleDriveId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

export default function VideoPlayer({
  url, onProgress, onDuration, seekTo, onReady,
  commentMarkers = [],
  onAddAnnotatedComment,
  pauseRequest = 0,
}: VideoPlayerProps) {
  const { t } = useLanguage();
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [hoveredMarker, setHoveredMarker] = useState<CommentMarker | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [driveFallback, setDriveFallback] = useState(false);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");

  const controlsTimeoutRef = useRef<any>(null);
  const googleDrivePreviewUrl = getGoogleDrivePreviewUrl(url);
  const googleDriveId = extractGoogleDriveId(url);
  const playableUrl = googleDriveId
    ? `https://drive.google.com/uc?export=download&id=${googleDriveId}`
    : url;
  const playerAspectRatio = orientation === "portrait" ? "9/16" : "16/9";
  const playerMaxWidth = orientation === "portrait" && !isFullscreen ? "min(100%, 520px)" : "100%";

  const seekToSeconds = useCallback((seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.currentTime = Math.max(0, Math.min(seconds, Number.isFinite(player.duration) ? player.duration : seconds));
  }, []);

  useEffect(() => {
    if (seekTo != null && playerRef.current) {
      seekToSeconds(seekTo);
      setCurrentTime(seekTo);
      setPlayed(duration ? seekTo / duration : 0);
      setPlaying(false);
      setShowControls(true);
      setAnnotationMode(false);
      setShowCommentInput(false);
      setAnnotations([]);
    }
  }, [seekTo, seekToSeconds, duration]);

  useEffect(() => {
    if (pauseRequest > 0) {
      setPlaying(false);
      setShowControls(true);
    }
  }, [pauseRequest]);

  useEffect(() => {
    if (!url) {
      setPlaying(false);
      setPlayed(0);
      setCurrentTime(0);
      setDuration(0);
      setAnnotationMode(false);
      setDriveFallback(false);
    }
  }, [url]);

  const handleTimeUpdate = (event: any) => {
    const seconds = Number(event?.currentTarget?.currentTime ?? playerRef.current?.currentTime ?? 0);
    const nextDuration = Number(event?.currentTarget?.duration ?? playerRef.current?.duration ?? duration);
    setCurrentTime(seconds);
    setPlayed(nextDuration > 0 ? seconds / nextDuration : 0);
    onProgress?.(seconds);
  };

  const handleDuration = (eventOrDuration: any) => {
    const dur = Number(
      typeof eventOrDuration === "number"
        ? eventOrDuration
        : eventOrDuration?.currentTarget?.duration ?? playerRef.current?.duration ?? 0,
    );
    if (!Number.isFinite(dur) || dur <= 0) return;
    setDuration(dur);
    onDuration?.(dur);
  };

  const handleReady = () => {
    onReady?.();
  };

  const handlePlayPause = () => {
    if (playing) {
      setPlaying(false);
    } else {
      setPlaying(true);
      setAnnotationMode(false);
      setShowCommentInput(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMuted(val === 0);
  };

  const handleMute = () => setMuted((prev) => !prev);

  const handleSkip = (seconds: number) => {
    if (playerRef.current) {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
      seekToSeconds(newTime);
      setCurrentTime(newTime);
      setPlayed(duration ? newTime / duration : 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    setPlayed(duration ? val / duration : 0);
    if (playerRef.current) {
      seekToSeconds(val);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  };

  const handleVideoClick = () => {
    if (!annotationMode) {
      handlePlayPause();
    }
  };

  const updateVideoSize = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setVideoSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateVideoSize();
    const observer = new ResizeObserver(updateVideoSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateVideoSize]);

  const handleSubmitAnnotation = () => {
    if (!commentText.trim()) return;
    const timestamp = Math.floor(currentTime);
    onAddAnnotatedComment?.(annotations, timestamp, commentText.trim());
    setAnnotations([]);
    setCommentText("");
    setShowCommentInput(false);
    setAnnotationMode(false);
    setPlaying(true);
  };

  const handleCancelAnnotation = () => {
    setAnnotations([]);
    setShowCommentInput(false);
    setAnnotationMode(false);
    setPlaying(true);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatSpeed = (rate: number) => `${rate}x`;

  const getMarkerPosition = (marker: CommentMarker) => {
    if (duration === 0) return 0;
    return (marker.timestampSeconds / duration) * 100;
  };

  if (!url) {
    return (
      <div className="aspect-video bg-frame-black rounded-lg flex items-center justify-center border border-frame-gray-3">
        <div className="text-center">
          <Play className="w-16 h-16 mx-auto mb-4 text-frame-gray-4" />
          <p className="text-frame-gray-light text-sm">{t("app.videoReviews.noVideoLoaded") as string}</p>
        </div>
      </div>
    );
  }

  if (googleDrivePreviewUrl && driveFallback) {
    return (
      <div
        ref={containerRef}
        className="relative mx-auto w-full bg-black rounded-lg overflow-hidden border border-frame-gray-3"
        style={{ aspectRatio: playerAspectRatio, maxWidth: playerMaxWidth }}
      >
        <iframe
          src={googleDrivePreviewUrl}
          title="Google Drive video preview"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0 bg-black"
        />
        <div className="absolute left-3 top-3 flex items-center border border-white/10 bg-black/75 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setOrientation("landscape")}
            className={`flex h-8 items-center gap-1.5 px-2 font-mono text-[0.56rem] uppercase tracking-wider transition ${orientation === "landscape" ? "bg-frame-orange text-black" : "text-white/65 hover:text-white"}`}
            title={t("app.videoReviews.horizontal") as string}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("app.videoReviews.horizontal") as string}</span>
          </button>
          <button
            type="button"
            onClick={() => setOrientation("portrait")}
            className={`flex h-8 items-center gap-1.5 px-2 font-mono text-[0.56rem] uppercase tracking-wider transition ${orientation === "portrait" ? "bg-frame-orange text-black" : "text-white/65 hover:text-white"}`}
            title={t("app.videoReviews.vertical") as string}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("app.videoReviews.vertical") as string}</span>
          </button>
        </div>
        <div className="absolute right-3 bottom-3 flex items-center gap-2 rounded-none border border-white/10 bg-black/70 px-3 py-2 text-[0.62rem] text-white/70 backdrop-blur">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-frame-orange hover:text-frame-white transition"
          >
            {t("app.videoReviews.openSource") as string}
          </a>
          <button type="button" onClick={toggleFullscreen} className="text-frame-orange hover:text-frame-white transition">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full bg-black rounded-lg overflow-hidden border border-frame-gray-3 group"
      style={{ aspectRatio: playerAspectRatio, maxWidth: playerMaxWidth }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (playing) setShowControls(false);
        setHoveredMarker(null);
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        switch (e.key) {
          case " ":
          case "k":
            e.preventDefault();
            handlePlayPause();
            break;
          case "j":
            e.preventDefault();
            handleSkip(-10);
            break;
          case "l":
            e.preventDefault();
            handleSkip(10);
            break;
          case "m":
            e.preventDefault();
            handleMute();
            break;
          case "f":
            e.preventDefault();
            toggleFullscreen();
            break;
          case "ArrowLeft":
            e.preventDefault();
            handleSkip(-5);
            break;
          case "ArrowRight":
            e.preventDefault();
            handleSkip(5);
            break;
        }
      }}
    >
      {annotationMode ? (
        <div className="relative" style={{ aspectRatio: playerAspectRatio }}>
          <ReactPlayer
            ref={playerRef}
            src={playableUrl}
            width="100%"
            height="100%"
            playing={false}
            muted={muted}
            volume={volume}
            playbackRate={playbackRate}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDuration}
            onReady={handleReady}
            style={{ position: "absolute", top: 0, left: 0 }}
            onError={() => googleDrivePreviewUrl && setDriveFallback(true)}
            playsInline
          />
          {videoSize.width > 0 && (
            <div className="absolute inset-0 z-10">
              <AnnotationCanvas
                width={videoSize.width}
                height={videoSize.height}
                annotations={annotations}
                onAnnotationsChange={setAnnotations}
                active
              />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t("app.videoReviews.feedbackPlaceholder") as string}
                className="flex-1 bg-black/60 border border-white/20 px-3 py-2 text-sm text-white outline-none focus:border-frame-orange"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitAnnotation();
                  }
                }}
                autoFocus
              />
              <span className="text-xs text-white/60 font-mono shrink-0">
                {formatTime(currentTime)}
              </span>
              <button
                type="button"
                onClick={handleSubmitAnnotation}
                disabled={!commentText.trim()}
                className="bg-frame-orange text-frame-black px-3 py-2 text-sm font-medium disabled:opacity-50 shrink-0"
              >
                {t("app.common.send") as string}
              </button>
              <button
                type="button"
                onClick={handleCancelAnnotation}
                className="text-white/70 hover:text-white px-2 py-2 text-sm shrink-0"
              >
                {t("app.common.cancel") as string}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ReactPlayer
            ref={playerRef}
            src={playableUrl}
            width="100%"
            height="100%"
            playing={playing}
            muted={muted}
            volume={volume}
            playbackRate={playbackRate}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDuration}
            onReady={handleReady}
            style={{ position: "absolute", top: 0, left: 0 }}
            onError={() => googleDrivePreviewUrl && setDriveFallback(true)}
            playsInline
          />

          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={handlePlayPause}
                  className="w-16 h-16 rounded-full bg-frame-orange/90 hover:bg-frame-orange flex items-center justify-center transition-[background-color,transform] duration-200 ease-out hover:scale-105"
                >
                  <Play className="w-7 h-7 text-frame-black ml-1" />
                </button>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 0.001)}
                  step="any"
                  value={Math.min(currentTime, duration || 0)}
                  onChange={handleSeek}
                  onMouseDown={() => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); }}
                  className="w-full h-1 appearance-none bg-frame-gray-4/50 rounded-full cursor-pointer accent-frame-orange
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-frame-orange [&::-webkit-slider-thumb]:cursor-pointer"
                />
                {commentMarkers.map((marker) => (
                  <button
                    key={marker.id}
                    type="button"
                    className="absolute top-1/2 h-5 w-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125"
                    style={{
                      left: `${getMarkerPosition(marker)}%`,
                    }}
                    title={`${formatTime(marker.timestampSeconds)} - ${marker.comment}`}
                    onMouseEnter={(e) => {
                      setHoveredMarker(marker);
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHoveredMarker(null)}
                    onClick={() => {
                      seekToSeconds(marker.timestampSeconds);
                      setCurrentTime(marker.timestampSeconds);
                      setPlayed(duration ? marker.timestampSeconds / duration : played);
                      setPlaying(false);
                      setShowControls(true);
                    }}
                  >
                    <span
                      className={`block h-5 w-0.5 mx-auto ${marker.resolved ? "bg-frame-gray-light" : "bg-frame-orange"}`}
                    />
                    <span
                      className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border ${
                        marker.resolved ? "border-frame-gray-light bg-frame-gray-3" : "border-frame-orange bg-frame-orange"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={handlePlayPause} className="text-white hover:text-frame-orange transition">
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleSkip(-10)} className="text-white/70 hover:text-white transition" title={t("app.videoReviews.backTenSeconds") as string}>
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleSkip(10)} className="text-white/70 hover:text-white transition" title={t("app.videoReviews.forwardTenSeconds") as string}>
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button onClick={handleMute} className="text-white/70 hover:text-white transition">
                      {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range" min={0} max={1} step="any"
                      value={muted ? 0 : volume} onChange={handleVolumeChange}
                      className="w-16 h-1 appearance-none bg-frame-gray-4/50 rounded-full cursor-pointer accent-frame-orange
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-frame-orange"
                    />
                  </div>
                  <span className="text-xs text-white/70 font-mono whitespace-nowrap">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center border border-white/20 p-0.5">
                    <button
                      type="button"
                      onClick={() => setOrientation("landscape")}
                      className={`flex h-7 w-8 items-center justify-center transition ${orientation === "landscape" ? "bg-frame-orange text-black" : "text-white/65 hover:text-white"}`}
                      title={t("app.videoReviews.horizontal") as string}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation("portrait")}
                      className={`flex h-7 w-8 items-center justify-center transition ${orientation === "portrait" ? "bg-frame-orange text-black" : "text-white/65 hover:text-white"}`}
                      title={t("app.videoReviews.vertical") as string}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="text-white/70 hover:text-white text-xs font-mono px-2 py-1 border border-white/20 rounded transition"
                    >
                      {formatSpeed(playbackRate)}
                    </button>
                    {showSpeedMenu && (
                      <div className="absolute bottom-full right-0 mb-1 bg-frame-black border border-frame-gray-3 rounded shadow-xl overflow-hidden">
                        {PLAYBACK_SPEEDS.map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => { setPlaybackRate(speed); setShowSpeedMenu(false); }}
                            className={`block w-full text-left px-4 py-1.5 text-xs font-mono transition hover:bg-frame-gray-2 ${
                              playbackRate === speed ? "text-frame-orange" : "text-white/70"
                            }`}
                          >
                            {formatSpeed(speed)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition">
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {hoveredMarker && (
        <div
          className="absolute z-50 bg-frame-black border border-frame-gray-3 px-3 py-2 shadow-xl pointer-events-none"
          style={{
            left: Math.min(mousePos.x - containerRef.current!.getBoundingClientRect().left, (containerRef.current?.getBoundingClientRect().width || 300) - 200),
            top: -80,
          }}
        >
          <p className="text-xs text-frame-orange font-mono">{formatTime(hoveredMarker.timestampSeconds)}</p>
          <p className="text-sm text-frame-white max-w-[200px] truncate">{hoveredMarker.comment}</p>
          <p className="text-xs text-frame-gray-light">{hoveredMarker.authorName}</p>
        </div>
      )}
    </div>
  );
}
