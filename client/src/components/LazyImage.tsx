/**
 * LazyImage - Imagem com lazy loading e blur-up effect
 *
 * Features:
 * - Intersection Observer para lazy load
 * - Blur-up transition suave
 * - Placeholder opcional
 * - Fallback para erro
 * - Support para srcSet (responsive)
 */

import { useState, useEffect, useRef, memo } from "react";
import { motion } from "framer-motion";

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  placeholder?: string; // Tiny placeholder (blur-up)
  fallback?: string; // Error fallback
  aspectRatio?: string; // e.g., "16/9"
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  loading?: "lazy" | "eager";
  threshold?: number; // Intersection threshold (0-1)
  rootMargin?: string; // Load before visible (e.g., "200px")
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  width,
  height,
  className = "",
  placeholder,
  fallback,
  aspectRatio,
  objectFit = "cover",
  loading = "lazy",
  threshold = 0.01,
  rootMargin = "200px",
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === "eager");
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === "eager" || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [loading, threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const containerStyle: React.CSSProperties = {
    width,
    height,
    aspectRatio,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "var(--ds-surface-elevated)",
  };

  const imgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit,
  };

  // Show fallback if error
  if (hasError && fallback) {
    return (
      <div ref={containerRef} style={containerStyle} className={className}>
        <img
          src={fallback}
          alt={alt}
          style={imgStyle}
          loading="eager"
        />
      </div>
    );
  }

  // Show error placeholder
  if (hasError) {
    return (
      <div
        ref={containerRef}
        style={containerStyle}
        className={`${className} flex items-center justify-center bg-frame-gray-2`}
      >
        <svg
          className="w-8 h-8 text-frame-gray-light"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle} className={className}>
      {/* Placeholder (blurred tiny image) */}
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          style={{
            ...imgStyle,
            position: "absolute",
            inset: 0,
            filter: "blur(20px)",
            transform: "scale(1.1)",
          }}
        />
      )}

      {/* Skeleton loader */}
      {!placeholder && !isLoaded && (
        <div className="absolute inset-0 skeleton-shimmer" />
      )}

      {/* Actual image */}
      {isInView && (
        <motion.img
          ref={imgRef}
          src={src}
          alt={alt}
          style={{
            ...imgStyle,
            position: placeholder ? "absolute" : "relative",
            inset: 0,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
        />
      )}
    </div>
  );
});

/**
 * LazyBackgroundImage - Background image com lazy loading
 */
interface LazyBackgroundImageProps {
  src: string;
  children?: React.ReactNode;
  className?: string;
  placeholder?: string;
  loading?: "lazy" | "eager";
  threshold?: number;
  rootMargin?: string;
}

export const LazyBackgroundImage = memo(function LazyBackgroundImage({
  src,
  children,
  className = "",
  placeholder,
  loading = "lazy",
  threshold = 0.01,
  rootMargin = "200px",
}: LazyBackgroundImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === "eager");
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer
  useEffect(() => {
    if (loading === "eager" || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading, threshold, rootMargin]);

  // Preload image
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
  }, [isInView, src]);

  return (
    <motion.div
      ref={containerRef}
      className={className}
      style={{
        backgroundImage: isLoaded ? `url(${src})` : placeholder ? `url(${placeholder})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: isLoaded ? "none" : "blur(20px)",
      }}
      animate={{
        filter: isLoaded ? "blur(0px)" : "blur(20px)",
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
});
