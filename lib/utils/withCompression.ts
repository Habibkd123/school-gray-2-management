/**
 * withCompression — higher-order function that wraps any Next.js API route handler
 * and automatically applies Brotli/Gzip compression + ETag caching.
 *
 * Usage:
 *   export const GET = withCompression(async (req) => {
 *     const data = await fetchData();
 *     return data; // returns plain object/array, will be JSON-serialised and compressed
 *   });
 *
 * Or for routes that already return NextResponse:
 *   export const GET = withCompression(myHandler, { cacheControl: "public, max-age=300" });
 */
import { type NextRequest } from "next/server";
import { sendCompressedJson } from "@/lib/compression";

export interface WithCompressionOptions {
  /** HTTP Cache-Control header value. Defaults to "private, no-cache" */
  cacheControl?: string;
  /** Minimum bytes to trigger compression. Default: 1024 */
  minSize?: number;
  /** Additional headers to merge into the response */
  extraHeaders?: Record<string, string>;
}

type RouteHandler<T = unknown> = (req: NextRequest, ctx?: unknown) => Promise<T>;

/**
 * Wraps a route handler so it automatically compresses JSON responses.
 * - If the handler returns a `Response` / `NextResponse`, it is passed through as-is.
 * - If the handler returns any other value, it is JSON-serialised and compressed.
 */
export function withCompression<T = unknown>(
  handler: RouteHandler<T>,
  options: WithCompressionOptions = {}
) {
  return async function compressedHandler(req: NextRequest, ctx?: unknown) {
    const result = await handler(req, ctx);

    // If handler already returned a Response, pass through unchanged
    if (result instanceof Response) return result;

    return sendCompressedJson(req, result, {
      cacheControl: options.cacheControl ?? "private, no-cache",
      minCompressionSize: options.minSize ?? 1024,
      extraHeaders: options.extraHeaders,
    });
  };
}