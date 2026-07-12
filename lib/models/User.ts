import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "super_admin" | "school_admin" | "accountant" | "teacher" | "student" | "parent";

export interface IUser extends Document {
  school_id: mongoose.Types.ObjectId | null;
  name: string;
  email: string;
  username: string;
  password_hash: string;
  plain_password?: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean; // true = first login, force password change
  last_login?: Date;
  reset_token?: string;
  reset_token_expiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    school_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null, // null = super_admin
      index: true,
    },
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: { type: String, required: [true, "Email is required"], lowercase: true, trim: true },
    username: {
      type: String,
      lowercase: true,
      trim: true,
    },
    password_hash: { type: String, required: true, select: false }, // Never returned by default
    plain_password: { type: String, default: null },
    role: {
      type: String,
      enum: ["super_admin", "school_admin", "accountant", "teacher", "student", "parent"],
      required: true,
    },
    is_active: { type: Boolean, default: true },
    must_change_password: { type: Boolean, default: false }, // set true for teacher/student on creation
    last_login: { type: Date, default: null },
    reset_token: { type: String, default: null, select: false },
    reset_token_expiry: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────
userSchema.index({ email: 1, school_id: 1 }, { unique: true, name: "user_email_school_unique_v1" });
userSchema.index({ username: 1 }, { unique: true, sparse: true, name: "user_username_unique_v1" });

// ─── Generate username if missing before validation ─────────────────
userSchema.pre("validate", async function () {
  if (!this.username && this.email) {
    const { generateUsernameForUser } = await import("../utils/username");
    this.username = await generateUsernameForUser(this.email, this.school_id);
  }
});

// ─── Hash password before saving ──────────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password_hash")) return;
  // Don't re-hash already hashed values (bcrypt hashes start with $2)
  if (this.password_hash?.startsWith("$2")) return;
  this.password_hash = await bcrypt.hash(this.password_hash, 12);
});

// ─── Method: Compare password ──────────────────────────────────────
userSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  // Guard: if password_hash wasn't selected, fail gracefully instead of crashing
  if (!this.password_hash) return false;
  return bcrypt.compare(plain, this.password_hash as string);
};

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
