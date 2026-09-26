"use client";
import Image from "next/image";
import { useState, useCallback } from "react";

type OptimizedImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  style?: React.CSSProperties;
  onLoad?: () => void;
};

const BLUR_DATA_URL = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTJhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4=";

export default function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  className,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  fill = false,
  style,
  onLoad,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  if (error) {
    return (
      <div
        className={className}
        style={{
          width: fill ? "100%" : width,
          height: fill ? "100%" : height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--card-bg, rgba(15,15,30,0.92))",
          borderRadius: 8,
          color: "var(--text, #666)",
          fontSize: 14,
          ...style,
        }}
      >
        Image unavailable
      </div>
    );
  }

  const imageProps = {
    src,
    alt,
    className,
    priority,
    sizes,
    fill: fill ? true : undefined,
    width: fill ? undefined : width,
    height: fill ? undefined : height,
    style: {
      ...style,
      opacity: loaded ? 1 : 0,
      transition: "opacity 0.3s ease",
    },
    loading: priority ? undefined : "lazy" as const,
    placeholder: "blur" as const,
    blurDataURL: BLUR_DATA_URL,
    onError: handleError,
    onLoad: handleLoad,
  };

  if (fill) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: style?.borderRadius || 8 }}>
        <Image {...imageProps} />
      </div>
    );
  }

  return <Image {...imageProps} />;
}
