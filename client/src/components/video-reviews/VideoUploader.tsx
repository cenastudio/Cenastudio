/**
 * VideoUploader Component
 *
 * Premium video upload with drag & drop, progress tracking, and Supabase Storage integration
 */

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileVideo, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export interface VideoFile {
  file: File;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  error?: string;
}

export interface VideoUploaderProps {
  /** Callback when upload completes */
  onUploadComplete?: (fileId: string, metadata: VideoMetadata) => void;

  /** Callback when upload fails */
  onUploadError?: (error: string) => void;

  /** Project ID to associate with upload */
  projectId?: number;

  /** Maximum file size in MB (default: 2000MB = 2GB) */
  maxSizeMB?: number;

  /** Allowed video formats */
  acceptedFormats?: string[];
}

export interface VideoMetadata {
  filename: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
}

const DEFAULT_FORMATS = [
  "video/mp4",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
  "video/x-matroska", // .mkv
  "video/webm",
];

export function VideoUploader({
  onUploadComplete,
  onUploadError,
  projectId,
  maxSizeMB = 2000,
  acceptedFormats = DEFAULT_FORMATS,
}: VideoUploaderProps) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check format
    if (!acceptedFormats.includes(file.type)) {
      const acceptedExts = acceptedFormats
        .map(format => format.split('/')[1])
        .join(', ');
      return t("app.videoUploader.formatNotSupported").replace("{formats}", acceptedExts);
    }

    // Check size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return t("app.videoUploader.fileTooLarge").replace("{max}", String(maxSizeMB));
    }

    return null;
  }, [acceptedFormats, maxSizeMB, t]);

  // Extract video metadata
  const extractMetadata = useCallback(async (file: File): Promise<VideoMetadata> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.preload = 'metadata';
      video.src = url;

      video.onloadedmetadata = () => {
        // Generate thumbnail
        video.currentTime = Math.min(1, video.duration / 2);
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

          resolve({
            filename: file.name,
            size: file.size,
            duration: Math.floor(video.duration),
            width: video.videoWidth,
            height: video.videoHeight,
            thumbnail,
          });
        } else {
          resolve({
            filename: file.name,
            size: file.size,
          });
        }

        URL.revokeObjectURL(url);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          filename: file.name,
          size: file.size,
        });
      };
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      if (onUploadError) onUploadError(error);
      return;
    }

    // Extract metadata
    const metadata = await extractMetadata(file);

    // Set file state
    setVideoFile({
      file,
      preview: metadata.thumbnail,
      progress: 0,
      status: "pending",
    });

    // Start upload
    await uploadToSupabase(file, metadata);
  }, [validateFile, extractMetadata]);

  // Upload to Supabase Storage
  const uploadToSupabase = async (file: File, metadata: VideoMetadata) => {
    try {
      setVideoFile(prev => prev ? { ...prev, status: "uploading", progress: 0 } : null);

      // Prepare form data
      const formData = {
        fileData: await fileToBase64(file),
        projectId: projectId?.toString(),
        metadata: JSON.stringify({
          filename: metadata.filename,
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          thumbnail: metadata.thumbnail,
        }),
      };

      // Time-based progress estimation tied to file size
      const estimateUploadTime = (fileSize: number) => Math.max(3000, (fileSize / (1024 * 1024)) * 500);
      const totalTime = estimateUploadTime(file.size);
      const steps = 20;
      const stepTime = totalTime / steps;

      const uploadSimulation = async () => {
        for (let i = 1; i <= steps; i++) {
          await new Promise(resolve => setTimeout(resolve, stepTime));
          setVideoFile(prev => prev ? { ...prev, progress: Math.min(85, Math.round((i / steps) * 85)) } : null);
        }
      };

      // Start progress simulation
      const progressPromise = uploadSimulation();

      // Make actual API call
      const response = await fetch('/api/video-upload/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      // Wait for progress to catch up
      await progressPromise;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("app.videoUploader.uploadError"));
      }

      const data = await response.json();

      setVideoFile(prev => prev ? { ...prev, status: "processing", progress: 95 } : null);

      // Simulate final processing
      await new Promise(resolve => setTimeout(resolve, 300));

      setVideoFile(prev => prev ? { ...prev, status: "complete", progress: 100 } : null);

      toast.success(t("app.videoReviews.videoUploaded"));

      if (onUploadComplete) {
        onUploadComplete(data.data.id.toString(), metadata);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t("app.videoUploader.uploadError");
      setVideoFile(prev => prev ? { ...prev, status: "error", error: errorMsg } : null);
      toast.error(errorMsg);
      if (onUploadError) onUploadError(errorMsg);
    }
  };

  // Helper to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:video/mp4;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleRemove = useCallback(() => {
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!videoFile && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragging
              ? 'border-frame-orange bg-frame-orange/10 scale-105'
              : 'border-frame-gray-3 hover:border-frame-orange/50 hover:bg-frame-orange/5'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />

          <Upload className={`
            w-12 h-12 mx-auto mb-4 transition-colors
            ${isDragging ? 'text-frame-orange' : 'text-frame-gray-light'}
          `} />

          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? t("app.videoUploader.dropHere") : t("app.videoUploader.dragOrClick")}
          </h3>

          <p className="text-sm text-frame-gray-light mb-4">
            {t("app.videoUploader.formatHint").replace("{max}", String(maxSizeMB))}
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-frame-orange/10 border border-frame-orange/30 rounded text-sm text-frame-orange">
            <FileVideo className="w-4 h-4" />
            {t("app.videoUploader.selectVideo")}
          </div>
        </div>
      )}

      {/* File Preview & Progress */}
      {videoFile && (
        <div className="border border-frame-gray-3 rounded-lg overflow-hidden bg-frame-gray-1/10">
          {/* Thumbnail */}
          {videoFile.preview && (
            <div className="relative aspect-video bg-black">
              <img
                src={videoFile.preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              {videoFile.status !== 'complete' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  {videoFile.status === 'uploading' && (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-frame-orange animate-spin mx-auto mb-2" />
                      <p className="text-sm text-white">{t("app.videoUploader.uploading").replace("...", "")} {videoFile.progress}%</p>
                    </div>
                  )}
                  {videoFile.status === 'processing' && (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-frame-orange animate-spin mx-auto mb-2" />
                      <p className="text-sm text-white">{t("app.videoUploader.processing")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File Info */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileVideo className="w-4 h-4 text-frame-orange flex-shrink-0" />
                  <p className="font-semibold truncate">{videoFile.file.name}</p>
                </div>

                <div className="flex items-center gap-3 text-xs text-frame-gray-light">
                  <span>{formatFileSize(videoFile.file.size)}</span>
                  <span>•</span>
                  <span>{formatDuration((videoFile as any).duration)}</span>
                  {(videoFile as any).width && (videoFile as any).height && (
                    <>
                      <span>•</span>
                      <span>{(videoFile as any).width}x{(videoFile as any).height}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {videoFile.status === 'complete' && (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
                {videoFile.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                {videoFile.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-frame-orange animate-spin" />
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {videoFile.status === 'uploading' && (
              <div className="space-y-1">
                <div className="h-2 bg-frame-gray-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-frame-orange transition-all duration-300"
                    style={{ width: `${videoFile.progress}%` }}
                  />
                </div>
                <p className="text-xs text-frame-gray-light text-right">
                  {videoFile.progress}%
                </p>
              </div>
            )}

            {/* Error Message */}
            {videoFile.status === 'error' && videoFile.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                {videoFile.error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleRemove}
                className="flex-1 px-3 py-2 text-sm border border-frame-gray-3 hover:border-frame-gray-4 rounded transition"
              >
                {videoFile.status === 'complete' ? t("app.videoUploader.remove") : t("app.videoUploader.cancel")}
              </button>

              {videoFile.status === 'complete' && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-3 py-2 text-sm bg-frame-orange hover:bg-frame-orange/90 text-white rounded transition"
                >
                  {t("app.videoUploader.sendAnother")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
