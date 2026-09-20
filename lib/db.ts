import mongoose from "mongoose";
import * as models from "./models";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in .env"
  );
}

// ─── Mongoose global options ───────────────────────────────────────
// Applied once; subsequent connectDB() calls reuse the cached connection.
mongoose.set("bufferCommands", true); // buffer queries while connecting (important for Vercel cold starts)
mongoose.set("autoIndex", false); // Disable autoIndex to prevent conflict errors on startup/hot-reload

// ─── Global cache to reuse connection across hot reloads ──────────
declare global {
  var _mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

const MONGOOSE_OPTS: mongoose.ConnectOptions = {
  // Connection pool — allows up to 100 simultaneous DB operations for scalability
  maxPoolSize: 100,
  minPoolSize: 0,  // serverless-friendly: no idle connections kept open permanently

  // Timeout settings — increased for Vercel cold start tolerance
  serverSelectionTimeoutMS: 10_000, // give up finding a server after 10 s (was 5 s)
  socketTimeoutMS: 45_000,          // close idle sockets after 45 s
  connectTimeoutMS: 15_000,         // TCP connect timeout (was 10 s)

  // Keep connections alive through load-balancer idle timeouts
  heartbeatFrequencyMS: 10_000,
};

async function connectDB(): Promise<typeof mongoose> {
  // Reference models to prevent tree-shaking of registrations
  void models;

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, MONGOOSE_OPTS).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// ─── One-time index sync utility (run manually via env flag if needed) ─────
// Usage: Set SYNC_INDEXES=true and restart ONCE to re-sync schema indexes.
// After sync completes, remove the flag to keep startup fast.
if (process.env.SYNC_INDEXES === "true") {
  void (async () => {
    try {
      await connectDB();
      console.log("🔄 [SYNC_INDEXES] Starting Mongoose schema index synchronization...");
      const modelNames = mongoose.modelNames();
      for (const modelName of modelNames) {
        const model = mongoose.model(modelName);
        console.log(`  Syncing indexes for: ${modelName}`);
        try {
          const dbIndexes = await model.collection.indexes() as Record<string, unknown>[];
          const schemaIndexes = model.schema.indexes() as [Record<string, unknown>, Record<string, unknown>][];
          for (const [schemaKeys, schemaOptions] of schemaIndexes) {
            const targetName = schemaOptions["name"] as string | undefined;
            if (!targetName) continue;
            const matchingDbIndex = dbIndexes.find((dbIdx) => {
              return (
                JSON.stringify(schemaKeys) === JSON.stringify(dbIdx["key"]) &&
                dbIdx["name"] !== targetName
              );
            });
            if (matchingDbIndex) {
              const idxName = matchingDbIndex["name"] as string;
              console.log(`    Dropping old-named index ${idxName} on ${modelName}`);
              await model.collection.dropIndex(idxName);
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`    ⚠️ Warning cleaning old indexes for ${modelName}:`, msg);
        }
        const result: unknown = await model.syncIndexes();
        if (result && (Array.isArray(result) ? result.length > 0 : Object.keys(result as object).length > 0)) {
          console.log(`    Synced ${modelName}: ${JSON.stringify(result)}`);
        }
      }
      console.log("✅ [SYNC_INDEXES] All indexes synchronized. Remove SYNC_INDEXES from .env to keep startup fast.");
    } catch (err) {
      console.error("❌ [SYNC_INDEXES] Failed:", err);
    }
  })();
}

export default connectDB;
