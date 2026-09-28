import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Computes a standard HTTP ETag (MD5 hash enclosed in quotes) for a given string.
 */
export function computeETag(bodyString: string): string {
  return `"${crypto.createHash("md5").update(bodyString).digest("hex")}"`;
}

interface ConditionalJsonOptions {
  status?: number;
  cacheControl?: string;
  extraHeaders?: Record<string, string>;
}

/**
 * Returns a JSON response with an ETag and Cache-Control header.
 * If the client's `If-None-Match` header matches the computed ETag,
 * it returns a `304 Not Modified` with an EMPTY body (0 bytes transferred).
 */
export function sendConditionalJson(
  req: NextRequest,
  data: unknown,
  options?: ConditionalJsonOptions
): NextResponse {
  // Only GET and HEAD requests support conditional 304 responses
  if (req.method !== "GET" && req.method !== "HEAD") {
    return NextResponse.json(data, {
      status: options?.status || 200,
      headers: options?.extraHeaders,
    });
  }

  const bodyString = typeof data === "string" ? data : JSON.stringify(data);
  const etag = computeETag(bodyString);
  const clientEtag = req.headers.get("if-none-match");

  const headers = new Headers();
  headers.set("ETag", etag);
  // "private, no-cache": browser may cache the response, but MUST revalidate with If-None-Match
  headers.set("Cache-Control", options?.cacheControl || "private, no-cache");

  if (options?.extraHeaders) {
    for (const [key, value] of Object.entries(options.extraHeaders)) {
      headers.set(key, value);
    }
  }

  // Check If-None-Match (support weak W/ prefix as well)
  if (
    clientEtag &&
    (clientEtag === etag ||
      clientEtag === `W/${etag}` ||
      clientEtag.replace(/^W\//, "") === etag)
  ) {
    // 304 Not Modified — 0 bytes transferred across the network!
    return new NextResponse(null, {
      status: 304,
      headers,
    });
  }

  headers.set("Content-Type", "application/json");

  return new NextResponse(bodyString, {
    status: options?.status || 200,
    headers,
  });
}
