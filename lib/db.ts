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
  // eslint-disable-next-line no-var
  var _mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
  // eslint-disable-next-line no-var
  var _indexesSynced: Promise<boolean> | undefined;
}

let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

const MONGOOSE_OPTS: mongoose.ConnectOptions = {
  // Connection pool — allows up to 10 simultaneous DB operations
  maxPoolSize: 10,
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
  const _ = models;
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, MONGOOSE_OPTS).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    
    // Database connection established successfully.
    // Run index synchronization exactly once per application process lifetime
    if (!global._indexesSynced) {
      global._indexesSynced = (async () => {
        console.log("🔄 Starting Mongoose schema index synchronization...");
        try {
          const modelNames = mongoose.modelNames();
          for (const modelName of modelNames) {
            const model = mongoose.model(modelName);
            console.log(`  Syncing indexes for: ${modelName}`);

            // Drop any indexes with the same keys but old/auto-generated names
            try {
              const dbIndexes = await model.collection.indexes();
              const schemaIndexes = model.schema.indexes();

              for (const [schemaKeys, schemaOptions] of schemaIndexes) {
                const targetName = (schemaOptions as any).name;
                if (!targetName) continue;

                const matchingDbIndex = dbIndexes.find((dbIdx: any) => {
                  const schemaKeyString = JSON.stringify(schemaKeys);
                  const dbKeyString = JSON.stringify(dbIdx.key);
                  return schemaKeyString === dbKeyString && dbIdx.name !== targetName;
                });

                if (matchingDbIndex) {
                  console.log(`    Dropping old-named index ${matchingDbIndex.name} on ${modelName} to rename to ${targetName}`);
                  await model.collection.dropIndex(matchingDbIndex.name!);
                }
              }
            } catch (err: any) {
              console.warn(`    ⚠️ Warning cleaning old indexes for ${modelName}:`, err.message);
            }

            const result = await model.syncIndexes() as any;
            if (result && (Array.isArray(result) ? result.length > 0 : Object.keys(result).length > 0)) {
              console.log(`    Synced ${modelName}: ${JSON.stringify(result)}`);
            }
          }
          console.log("✅ All Mongoose schema indexes synchronized successfully.");
          return true;
        } catch (syncErr: any) {
          console.error("❌ Schema index synchronization failed:", syncErr);
          return false;
        }
      })();
    }
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
