import zlib from "node:zlib";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Compression options for API responses.
 */
export interface CompressionOptions {
  status?: number;
  cacheControl?: string;
  extraHeaders?: Record<string, string>;
  /** Minimum payload size in bytes to trigger compression. Default: 1024 (1 KB) */
  minCompressionSize?: number;
}

/**
 * Computes an HTTP ETag (MD5 hash enclosed in quotes) for a response body.
 */
export function computeETag(bodyString: string): string {
  return `"${crypto.createHash("md5").update(bodyString).digest("hex")}"`;
}

// Fast Brotli compression parameters (Quality 4 is optimal for dynamic Web APIs)
const BROTLI_OPTIONS: zlib.BrotliOptions = {
  params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
  },
};

// Gzip compression level 6 (ideal balance of speed & compression ratio)
const GZIP_OPTIONS: zlib.ZlibOptions = {
  level: 6,
};

/**
 * Compresses an input buffer using Brotli, Gzip, or Deflate based on client Accept-Encoding.
 */
export function compressPayload(
  buffer: Buffer,
  acceptEncoding: string,
  minCompressionSize = 1024
): { data: Buffer | Uint8Array; encoding?: "br" | "gzip" | "deflate" } {
  // If payload is smaller than threshold, do not compress (compression overhead not worth it)
  if (buffer.byteLength < minCompressionSize) {
    return { data: buffer };
  }

  const enc = acceptEncoding.toLowerCase();

  try {
    // 1. Prefer Brotli (br) — 15-25% smaller than gzip on JSON/text
    if (enc.includes("br")) {
      return {
        data: zlib.brotliCompressSync(buffer, BROTLI_OPTIONS),
        encoding: "br",
      };
    }

    // 2. Gzip — universally supported fallback
    if (enc.includes("gzip")) {
      return {
        data: zlib.gzipSync(buffer, GZIP_OPTIONS),
        encoding: "gzip",
      };
    }

    // 3. Deflate — older fallback
    if (enc.includes("deflate")) {
      return {
        data: zlib.deflateSync(buffer, GZIP_OPTIONS),
        encoding: "deflate",
      };
    }
  } catch (err) {
    console.warn("[Compression] Compression error, falling back to uncompressed:", err);
  }

  return { data: buffer };
}

/**
 * Creates a high-performance compressed JSON response with:
 * 1. Brotli (`br`) or Gzip (`gzip`) compression for payloads >= 1KB
 * 2. HTTP ETag generation & `304 Not Modified` handling (0 bytes transfer on cache hit)
 * 3. `Vary: Accept-Encoding` & custom `Cache-Control`
 */
export function sendCompressedJson(
  req?: Request | NextRequest | null,
  data?: unknown,
  options?: CompressionOptions
): NextResponse {
  const status = options?.status || 200;
  const isString = typeof data === "string";
  const bodyString = isString ? (data as string) : JSON.stringify(data ?? {});
  const etag = computeETag(bodyString);

  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("ETag", etag);
  headers.set("Vary", "Accept-Encoding");
  headers.set("Cache-Control", options?.cacheControl || "private, no-cache");

  if (options?.extraHeaders) {
    for (const [key, value] of Object.entries(options.extraHeaders)) {
      headers.set(key, value);
    }
  }

  // Handle conditional GET / HEAD requests for instant 304 response
  if (req && (req.method === "GET" || req.method === "HEAD")) {
    const clientEtag = req.headers.get("if-none-match");
    if (
      clientEtag &&
      (clientEtag === etag ||
        clientEtag === `W/${etag}` ||
        clientEtag.replace(/^W\//, "") === etag)
    ) {
      // 304 Not Modified — 0 bytes transferred over network!
      return new NextResponse(null, {
        status: 304,
        headers,
      });
    }
  }

  // Compress payload if client supports it
  const acceptEncoding = req?.headers?.get("accept-encoding") || "";
  const inputBuffer = Buffer.from(bodyString, "utf-8");
  const { data: finalBody, encoding } = compressPayload(
    inputBuffer,
    acceptEncoding,
    options?.minCompressionSize ?? 1024
  );

  if (encoding) {
    headers.set("Content-Encoding", encoding);
    headers.set("Content-Length", String(finalBody.byteLength));
  } else {
    headers.set("Content-Length", String(inputBuffer.byteLength));
  }

  return new NextResponse(finalBody as unknown as BodyInit, {
    status,
    headers,
  });
}

/**
 * Alias for backward compatibility with `sendConditionalJson` from `@/lib/etag`.
 */
export const sendConditionalJson = sendCompressedJson;
