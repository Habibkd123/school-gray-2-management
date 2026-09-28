"use client";

import React, { useState } from "react";
import { getOptimizedAvatar, getInitialAvatarDataUrl } from "@/lib/utils/image";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number; // pixel width/height (default: 32)
  className?: string;
  alt?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function Avatar({
  src,
  name = "User",
  size = 32,
  className = "",
  alt,
  onClick,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  const displaySrc = hasError || !src
    ? getInitialAvatarDataUrl(name)
    : getOptimizedAvatar(src, name, size * 2);

  return (
    <img
      src={displaySrc}
      alt={alt || name}
      loading="lazy"
      decoding="async"
      onClick={onClick}
      onError={() => setHasError(true)}
      className={`rounded-full object-cover shrink-0 select-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
}

export default Avatar;
