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

const AVATAR_PALETTE = [
  "#4F46E5", // Indigo
  "#0284C7", // Sky
  "#059669", // Emerald
  "#D97706", // Amber
  "#7C3AED", // Violet
  "#E11D48", // Rose
  "#0D9488", // Teal
  "#2563EB", // Blue
  "#D2232A", // Brand Crimson
  "#475569", // Slate
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

function toBase64(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64");
  }
  if (typeof btoa !== "undefined") {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      return btoa(str);
    }
  }
  return "";
}

/**
 * Generates an instant zero-network inline SVG avatar.
 * Requires 0 HTTP roundtrips to external third-party services.
 */
export function getInitialAvatarDataUrl(
  name: string,
  backgroundColor?: string,
  textColor: string = "#FFFFFF"
): string {
  const cleanName = (name || "User").trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  let initials = "U";

  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  const bg = backgroundColor
    ? (backgroundColor.startsWith("#") ? backgroundColor : `#${backgroundColor}`)
    : getColorForName(cleanName);

  const fg = textColor.startsWith("#") ? textColor : `#${textColor}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/><text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="${fg}" dominant-baseline="middle" text-anchor="middle">${initials}</text></svg>`;

  const b64 = toBase64(svg);
  if (b64) {
    return `data:image/svg+xml;base64,${b64}`;
  }
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

