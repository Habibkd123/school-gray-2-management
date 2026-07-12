import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRolePermission extends Document {
  school_id: mongoose.Types.ObjectId;
  role: string;
  permissions: Map<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
}

const rolePermissionSchema = new Schema<IRolePermission>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    role: { type: String, required: true },
    permissions: { type: Map, of: [String], default: {} },
  },
  { timestamps: true }
);

rolePermissionSchema.index({ school_id: 1, role: 1 }, { unique: true, name: "role_permission_school_role_unique_v1" });

const RolePermission: Model<IRolePermission> =
  mongoose.models.RolePermission || mongoose.model<IRolePermission>("RolePermission", rolePermissionSchema);

export default RolePermission;
