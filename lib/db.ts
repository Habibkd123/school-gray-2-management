import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in .env"
  );
}

// ─── Mongoose global options ───────────────────────────────────────
// Applied once; subsequent connectDB() calls reuse the cached connection.
mongoose.set("bufferCommands", false); // fail fast — no silent query queuing

// ─── Global cache to reuse connection across hot reloads ──────────
declare global {
  // eslint-disable-next-line no-var
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
  // Connection pool — allows up to 10 simultaneous DB operations
  maxPoolSize: 10,
  minPoolSize: 0,  // serverless-friendly: no idle connections kept open permanently

  // Timeout settings
  serverSelectionTimeoutMS: 5_000,  // give up finding a server after 5 s
  socketTimeoutMS: 45_000,          // close idle sockets after 45 s
  connectTimeoutMS: 10_000,         // TCP connect timeout

  // Keep connections alive through load-balancer idle timeouts
  heartbeatFrequencyMS: 10_000,
};

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, MONGOOSE_OPTS).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    
    // Database connection established successfully.
    // (Bulk username migrations are now run offline via scratch/migrate-usernames.js)
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
