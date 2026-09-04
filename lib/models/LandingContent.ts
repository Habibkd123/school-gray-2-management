import mongoose, { Document, Model, Schema } from "mongoose";

// ── Sub-schemas ─────────────────────────────────────────────────────────────

const ManagementMemberSchema = new Schema({
  name: { type: String, default: "" },
  position: { type: String, default: "" },
  bio: { type: String, default: "" },
  photo_url: { type: String, default: "" },
}, { _id: true });

const FacultyMemberSchema = new Schema({
  name: { type: String, default: "" },
  subject: { type: String, default: "" },
  qualification: { type: String, default: "" },
  photo_url: { type: String, default: "" },
}, { _id: true });

const AcademicProgramSchema = new Schema({
  title: { type: String, default: "" },
  age: { type: String, default: "" },
  desc: { type: String, default: "" },
  img: { type: String, default: "" },
}, { _id: true });

const FeeItemSchema = new Schema({
  class_name: { type: String, default: "" },
  annual_fee: { type: Number, default: 0 },
  monthly_fee: { type: Number, default: 0 },
}, { _id: true });

const AchievementSchema = new Schema({
  title: { type: String, default: "" },
  year: { type: Number, default: new Date().getFullYear() },
  description: { type: String, default: "" },
}, { _id: true });

const NewsItemSchema = new Schema({
  type: { type: String, enum: ["announcement", "circular", "result"], default: "announcement" },
  title: { type: String, default: "" },
  content: { type: String, default: "" },
  pdf_url: { type: String, default: "" },
  published_at: { type: Date, default: Date.now },
  is_published: { type: Boolean, default: true },
}, { _id: true });

const PhotoSchema = new Schema({
  url: { type: String, default: "" },
  caption: { type: String, default: "" },
  album: { type: String, default: "General" },
}, { _id: true });

const VideoSchema = new Schema({
  url: { type: String, default: "" },
  title: { type: String, default: "" },
}, { _id: true });

const HeroStatSchema = new Schema({
  value: { type: String, default: "" },
  label: { type: String, default: "" },
  icon: { type: String, default: "" },
}, { _id: true });

const HighlightSchema = new Schema({
  value: { type: String, default: "" },
  label: { type: String, default: "" },
  icon: { type: String, default: "" },
}, { _id: true });

const FeatureSchema = new Schema({
  title: { type: String, default: "" },
  desc: { type: String, default: "" },
  icon: { type: String, default: "" },
}, { _id: true });

const FacilityItemSchema = new Schema({
  title: { type: String, default: "" },
  icon: { type: String, default: "" },
}, { _id: true });

const TestimonialSchema = new Schema({
  name: { type: String, default: "" },
  role: { type: String, default: "" },
  content: { type: String, default: "" },
  img: { type: String, default: "" },
}, { _id: true });

const FAQSchema = new Schema({
  question: { type: String, default: "" },
  answer: { type: String, default: "" },
}, { _id: true });

// ── Main Interface ──────────────────────────────────────────────────────────
export interface ILandingContent extends Document {
  school_id: mongoose.Types.ObjectId;

  about: {
    hero_tagline: string;
    hero_description?: string;
    hero_image_url?: string;
    hero_side_image_url?: string;
    hero_video_url?: string;
    hero_stats?: Array<{
      _id?: mongoose.Types.ObjectId;
      value: string;
      label: string;
      icon: string;
    }>;
    affiliation_name?: string;
    affiliation_number?: string;
    school_code?: string;
    recognition_tags?: string[];
    admission_year_label?: string;
    history: string;
    history_image_url?: string;
    vision: string;
    mission: string;
    founded_year: number;
    infrastructure: string;
    infrastructure_image_url?: string;
    management_team: Array<{
      _id?: mongoose.Types.ObjectId;
      name: string;
      position: string;
      bio: string;
      photo_url: string;
    }>;
  };

  academics: {
    curriculum_overview: string;
    class_structure: string;
    academic_calendar: string;
    hero_image_url?: string;
    programs?: Array<{
      _id?: mongoose.Types.ObjectId;
      title: string;
      age: string;
      desc: string;
      img: string;
    }>;
    faculty: Array<{
      _id?: mongoose.Types.ObjectId;
      name: string;
      subject: string;
      qualification: string;
      photo_url: string;
    }>;
  };

  admissions: {
    how_to_apply: string;
    admission_open: boolean;
    apply_url: string;
    hero_image_url?: string;
    documents_required: string[];
    fee_structure: Array<{
      _id?: mongoose.Types.ObjectId;
      class_name: string;
      annual_fee: number;
      monthly_fee: number;
    }>;
  };

  student_life: {
    sports: string;
    sports_image_url?: string;
    cultural_activities: string;
    cultural_image_url?: string;
    clubs_societies: string;
    clubs_image_url?: string;
    hero_image_url?: string;
    achievements: Array<{
      _id?: mongoose.Types.ObjectId;
      title: string;
      year: number;
      description: string;
    }>;
  };

  news?: {
    hero_image_url?: string;
  };

  news_notices: Array<{
    _id?: mongoose.Types.ObjectId;
    type: "announcement" | "circular" | "result";
    title: string;
    content: string;
    pdf_url: string;
    published_at: Date;
    is_published: boolean;
  }>;

  gallery: {
    hero_image_url?: string;
    photos: Array<{
      _id?: mongoose.Types.ObjectId;
      url: string;
      caption: string;
      album: string;
    }>;
    videos: Array<{
      _id?: mongoose.Types.ObjectId;
      url: string;
      title: string;
    }>;
  };

  contact: {
    address: string;
    phone: string;
    email: string;
    website: string;
    map_embed_url: string;
    hero_image_url?: string;
    social: {
      facebook: string;
      twitter: string;
      instagram: string;
      youtube: string;
    };
  };

  highlights?: Array<{
    _id?: mongoose.Types.ObjectId;
    value: string;
    label: string;
    icon: string;
  }>;
  why_choose_us?: Array<{
    _id?: mongoose.Types.ObjectId;
    title: string;
    desc: string;
    icon: string;
  }>;
  facilities?: Array<{
    _id?: mongoose.Types.ObjectId;
    title: string;
    icon: string;
  }>;
  testimonials?: Array<{
    _id?: mongoose.Types.ObjectId;
    name: string;
    role: string;
    content: string;
    img: string;
  }>;
  faqs?: Array<{
    _id?: mongoose.Types.ObjectId;
    question: string;
    answer: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

// ── Main Schema ─────────────────────────────────────────────────────────────
const landingContentSchema = new Schema<ILandingContent>(
  {
    school_id: { type: Schema.Types.ObjectId, ref: "School", required: true, unique: true },

    highlights: { type: [HighlightSchema], default: [] },
    why_choose_us: { type: [FeatureSchema], default: [] },
    facilities: { type: [FacilityItemSchema], default: [] },
    testimonials: { type: [TestimonialSchema], default: [] },
    faqs: { type: [FAQSchema], default: [] },

    about: {
      hero_tagline: { type: String, default: "" },
      hero_description: { type: String, default: "" },
      hero_image_url: { type: String, default: "" },
      hero_side_image_url: { type: String, default: "" },
      hero_video_url: { type: String, default: "" },
      hero_stats: { type: [HeroStatSchema], default: [] },
      affiliation_name: { type: String, default: "" },
      affiliation_number: { type: String, default: "" },
      school_code: { type: String, default: "" },
      recognition_tags: { type: [String], default: [] },
      admission_year_label: { type: String, default: "" },
      history: { type: String, default: "" },
      history_image_url: { type: String, default: "" },
      vision: { type: String, default: "" },
      mission: { type: String, default: "" },
      founded_year: { type: Number, default: 2000 },
      infrastructure: { type: String, default: "" },
      infrastructure_image_url: { type: String, default: "" },
      management_team: { type: [ManagementMemberSchema], default: [] },
    },

    academics: {
      curriculum_overview: { type: String, default: "" },
      class_structure: { type: String, default: "" },
      academic_calendar: { type: String, default: "" },
      hero_image_url: { type: String, default: "" },
      programs: { type: [AcademicProgramSchema], default: [] },
      faculty: { type: [FacultyMemberSchema], default: [] },
    },

    admissions: {
      how_to_apply: { type: String, default: "" },
      admission_open: { type: Boolean, default: false },
      apply_url: { type: String, default: "" },
      hero_image_url: { type: String, default: "" },
      documents_required: { type: [String], default: [] },
      fee_structure: { type: [FeeItemSchema], default: [] },
    },

    student_life: {
      sports: { type: String, default: "" },
      sports_image_url: { type: String, default: "" },
      cultural_activities: { type: String, default: "" },
      cultural_image_url: { type: String, default: "" },
      clubs_societies: { type: String, default: "" },
      clubs_image_url: { type: String, default: "" },
      hero_image_url: { type: String, default: "" },
      achievements: { type: [AchievementSchema], default: [] },
    },

    news: {
      hero_image_url: { type: String, default: "" },
    },

    news_notices: { type: [NewsItemSchema], default: [] },

    gallery: {
      hero_image_url: { type: String, default: "" },
      photos: { type: [PhotoSchema], default: [] },
      videos: { type: [VideoSchema], default: [] },
    },

    contact: {
      address: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      website: { type: String, default: "" },
      map_embed_url: { type: String, default: "" },
      hero_image_url: { type: String, default: "" },
      social: {
        facebook: { type: String, default: "" },
        twitter: { type: String, default: "" },
        instagram: { type: String, default: "" },
        youtube: { type: String, default: "" },
      },
    },
  },
  { timestamps: true }
);

const LandingContent: Model<ILandingContent> =
  (mongoose.models.LandingContent as Model<ILandingContent>) ||
  mongoose.model<ILandingContent>("LandingContent", landingContentSchema);


export default LandingContent;
