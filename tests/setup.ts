process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/school-management-test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-123456789";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-123456789";
process.env.JWT_ACCESS_EXPIRY = "15m";
process.env.JWT_REFRESH_EXPIRY = "7d";
(process.env as any).NODE_ENV = "test";
process.env.NEXT_PUBLIC_SCHOOL_SLUG = "school";
