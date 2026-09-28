/**
 * Optimizes image URLs for minimal data consumption.
 * - Cloudinary URLs: dynamically transforms into auto-compressed WebP/AVIF thumbnails (w_80, q_auto, f_auto)
 * - Avatars: generates instant zero-network SVG Data URIs instead of calling external APIs
 */

export function getOptimizedImageUrl(url?: string | null, size: number = 80): string | null {
  if (!url || typeof url !== "string") return null;

  // Cloudinary image transformation
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    if (!url.includes("/c_") && !url.includes("w_")) {
      const transform = `c_thumb,w_${size},h_${size},g_face,q_auto,f_auto`;
      return url.replace("/upload/", `/upload/${transform}/`);
    }
  }

  return url;
}

/**
 * Generates an instant zero-network inline SVG avatar.
 * Requires 0 HTTP roundtrips to external third-party services.
 */
export function getInitialAvatarDataUrl(
  name: string,
  backgroundColor: string = "D2232A",
  textColor: string = "FFFFFF"
): string {
  const cleanName = (name || "User").trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  let initials = "U";

  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  // Sanitize colors for SVG URL
  const bg = backgroundColor.replace("#", "");
  const fg = textColor.replace("#", "");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="100%" height="100%" fill="%23${bg}" rx="32"/><text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="23" font-weight="700" fill="%23${fg}" dominant-baseline="middle" text-anchor="middle">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns optimized avatar source:
 * If a custom photo exists, optimizes it via thumbnail transforms.
 * Otherwise returns the instant zero-network inline SVG avatar.
 */
export function getOptimizedAvatar(photoUrl?: string | null, name: string = "User", size: number = 80): string {
  if (photoUrl && photoUrl.trim()) {
    const optimized = getOptimizedImageUrl(photoUrl, size);
    if (optimized) return optimized;
  }
  return getInitialAvatarDataUrl(name);
}
