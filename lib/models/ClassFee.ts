import mongoose, { Document, Schema, Model } from "mongoose";

export interface IFeeTypeItem {
  name: string;
  amount: number;
  is_enabled: boolean;
}

export interface IClassFee extends Document {
  school_id: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  academic_year: string;
  fee_types: IFeeTypeItem[];
  total_amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const classFeeSchema = new Schema<IClassFee>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    academic_year: { type: String, required: true },
    fee_types: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        is_enabled: { type: Boolean, default: true },
      },
    ],
    total_amount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

classFeeSchema.index({ school_id: 1, class_id: 1, academic_year: 1 }, { unique: true });

const ClassFee: Model<IClassFee> = mongoose.models.ClassFee || mongoose.model<IClassFee>("ClassFee", classFeeSchema);
export default ClassFee;
