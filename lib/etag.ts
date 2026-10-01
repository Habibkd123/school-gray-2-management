/**
 * High-performance HTTP ETag & Response Compression utility.
 * Re-exports from @/lib/compression for unified caching & compression.
 */
export {
  computeETag,
  compressPayload,
  sendCompressedJson,
  sendConditionalJson,
} from "./compression";

export type { CompressionOptions, CompressionOptions as ConditionalJsonOptions } from "./compression";
