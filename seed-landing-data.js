/**
 * seed-landing-data.js
 * Run: node seed-landing-data.js
 *
 * Populates MongoDB with rich, professional-grade mock landing content data.
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI;
const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID;

if (!MONGO_URI) {
  console.error("❌  MONGODB_URI not found in .env file");
  process.exit(1);
}

if (!SCHOOL_ID) {
  console.error("❌  NEXT_PUBLIC_SCHOOL_ID not found in .env file");
  process.exit(1);
}

// ─── Schema Definitions ──────────────────────────────────────────────────────

const ManagementMemberSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  position: { type: String, default: "" },
  bio: { type: String, default: "" },
  photo_url: { type: String, default: "" },
});

const FacultyMemberSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  subject: { type: String, default: "" },
  qualification: { type: String, default: "" },
  photo_url: { type: String, default: "" },
});

const AcademicProgramSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  age: { type: String, default: "" },
  desc: { type: String, default: "" },
  img: { type: String, default: "" },
});

const FeeItemSchema = new mongoose.Schema({
  class_name: { type: String, default: "" },
  annual_fee: { type: Number, default: 0 },
  monthly_fee: { type: Number, default: 0 },
});

const AchievementSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  year: { type: Number, default: new Date().getFullYear() },
  description: { type: String, default: "" },
});

const NewsItemSchema = new mongoose.Schema({
  type: { type: String, enum: ["announcement", "circular", "result"], default: "announcement" },
  title: { type: String, default: "" },
  content: { type: String, default: "" },
  pdf_url: { type: String, default: "" },
  published_at: { type: Date, default: Date.now },
  is_published: { type: Boolean, default: true },
});

const PhotoSchema = new mongoose.Schema({
  url: { type: String, default: "" },
  caption: { type: String, default: "" },
  album: { type: String, default: "General" },
});

const VideoSchema = new mongoose.Schema({
  url: { type: String, default: "" },
  title: { type: String, default: "" },
});

const HighlightSchema = new mongoose.Schema({
  value: { type: String, default: "" },
  label: { type: String, default: "" },
  icon: { type: String, default: "" },
});

const FeatureSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  desc: { type: String, default: "" },
  icon: { type: String, default: "" },
});

const FacilityItemSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  icon: { type: String, default: "" },
});

const TestimonialSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  role: { type: String, default: "" },
  content: { type: String, default: "" },
  img: { type: String, default: "" },
});

const FAQSchema = new mongoose.Schema({
  question: { type: String, default: "" },
  answer: { type: String, default: "" },
});

const landingContentSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, unique: true },

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

const LandingContent = mongoose.models.LandingContent || mongoose.model("LandingContent", landingContentSchema);

// ─── Data Payload ────────────────────────────────────────────────────────────

const dataPayload = {
  school_id: new mongoose.Types.ObjectId(SCHOOL_ID),
  highlights: [
    { value: "1500+", label: "Students Enrolled", icon: "users" },
    { value: "98%", label: "Academic Success Rate", icon: "graduation-cap" },
    { value: "50+", label: "Experienced Teachers", icon: "briefcase" },
    { value: "25+", label: "Co-curricular Clubs", icon: "palette" }
  ],
  why_choose_us: [
    {
      title: "Holistic Development",
      desc: "We focus on intellectual, physical, emotional, and social development through curated sports, arts, and leadership programs.",
      icon: "smile"
    },
    {
      title: "Modern Infrastructure",
      desc: "Smart classrooms, state-of-the-art science and computer labs, and a fully digital campus map/tour support next-gen learning.",
      icon: "laptop"
    },
    {
      title: "Global Standards",
      desc: "Our curriculum is aligned with international pedagogy standards, preparing students for success in global universities.",
      icon: "globe"
    },
    {
      title: "Safe & Nurturing Environment",
      desc: "CCTV monitored campus, certified medical care room, and dedicated student counseling support emotional and physical safety.",
      icon: "shield"
    }
  ],
  facilities: [
    { title: "Smart Classrooms", icon: "monitor" },
    { title: "Robotics & STEM Lab", icon: "cpu" },
    { title: "Olympic-size Swimming Pool", icon: "waves" },
    { title: "Modern Library", icon: "book-open" },
    { title: "Sports Complex", icon: "trophy" },
    { title: "Medical & Counseling Wing", icon: "heart" }
  ],
  testimonials: [
    {
      name: "Sarah Jenkins",
      role: "Parent of Grade 8 Student",
      content: "The dedication of the teachers here is unmatched. My daughter has grown not just academically, but also in confidence and public speaking through the school's debate club.",
      img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop"
    },
    {
      name: "Dr. Aris Vance",
      role: "Alumnus (Batch of 2018)",
      content: "Attending this institution laid the perfect foundation for my research career. The science lab facilities and mentorship from the teachers helped me pursue my passion at MIT.",
      img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop"
    },
    {
      name: "Elena Rodriguez",
      role: "President, Parent-Teacher Association",
      content: "The transparency in administration, robust digital ERP platform, and regular feedback loops make it a dream school for active parent engagement.",
      img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop"
    }
  ],
  faqs: [
    {
      question: "What is the teacher-to-student ratio?",
      answer: "Our average teacher-to-student ratio is 1:20, ensuring personalized attention and guidance for every student."
    },
    {
      question: "Which curriculum does the school follow?",
      answer: "We offer a dual curriculum path supporting the national standard board along with the Cambridge International IGCSE pathway for secondary students."
    },
    {
      question: "Are transport facilities available?",
      answer: "Yes, we operate a fleet of GPS-enabled, air-conditioned school buses covering the entire metropolitan area and surrounding suburbs."
    },
    {
      question: "What co-curricular activities are offered?",
      answer: "We offer a wide variety of activities including Robotics, Indian & Western Music, Classical Dance, Chess, Swimming, Soccer, and Debate."
    },
    {
      question: "How can I apply for admission?",
      answer: "You can apply online via our Admission portal by submitting the registration form, student transcripts, and scheduling an interaction session."
    }
  ],
  about: {
    hero_tagline: "Shaping the Leaders and Innovators of Tomorrow",
    hero_description: "Welcome to Modern School, where academic excellence meets holistic character development. Since our founding in 2000, we have nurtured thousands of students to achieve their potential and make meaningful contributions to the global community.",
    hero_image_url: "https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=1200&auto=format&fit=crop",
    hero_side_image_url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=800&auto=format&fit=crop",
    hero_video_url: "https://assets.mixkit.co/videos/preview/mixkit-kids-playing-and-learning-in-school-classroom-34241-large.mp4",
    history: "Founded in the year 2000 by a team of visionary educationists, Modern School started with a humble batch of 80 students. Over the last two decades, it has grown into a premier multi-disciplinary campus serving over 1,500 students. Our history is built on a rich tradition of academic rigour, athletic prowess, and dedicated community service.",
    history_image_url: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop",
    vision: "To become a globally recognized center of learning that fosters curiosity, inclusivity, and critical thinking, empowering students to lead with integrity and compassion.",
    mission: "We are committed to providing a stimulating environment that enables academic success, physical fitness, emotional resilience, and aesthetic awareness, tailoring our pedagogy to individual learning needs.",
    founded_year: 2000,
    infrastructure: "Spread across a lush green 15-acre campus, our infrastructure includes fully climate-controlled smart classrooms, advanced chemistry, physics, and biology laboratories, two modern ICT computer labs, a 500-seat amphitheater, and a state-of-the-art indoor sports complex.",
    infrastructure_image_url: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop",
    management_team: [
      {
        name: "Dr. Devendra Raj",
        position: "Founder & Chairman",
        bio: "Dr. Raj holds a PhD in Educational Leadership from Oxford University and has spent 30+ years establishing high-quality schools across Asia.",
        photo_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=300&auto=format&fit=crop"
      },
      {
        name: "Mrs. Shalini Sen",
        position: "Principal",
        bio: "Mrs. Sen has over 20 years of experience in classroom teaching and administration. She is a strong advocate for digital-first active learning strategies.",
        photo_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop"
      },
      {
        name: "Mr. Kabir Malhotra",
        position: "Director of Sports & Student Life",
        bio: "Former national track athlete, dedicated to bringing sports excellence and health education to every student.",
        photo_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=300&auto=format&fit=crop"
      }
    ]
  },
  academics: {
    curriculum_overview: "Our curriculum balances core mathematical and scientific inquiry with humanities, linguistic excellence, and computational thinking. We emphasize project-based learning and continuous formative assessment to ensure true understanding rather than rote memorization.",
    class_structure: "From Kindergarten (Ages 3-5) through Elementary (Grades 1-5), Middle School (Grades 6-8), and High School (Grades 9-12). Each grade is divided into sections with a strict cap of 25 students per section to ensure individual attention.",
    academic_calendar: "Our academic session runs from April to March. The year is divided into two terms: Term 1 (April to September) and Term 2 (October to March). Major exams are held in September and March, supplemented by monthly formative evaluations.",
    hero_image_url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop",
    programs: [
      {
        title: "Primary Wing",
        age: "Ages 5 - 10",
        desc: "Building strong foundational skills in literacy, mathematical reasoning, environmental studies, and artistic expression through activity-centered methods.",
        img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=400&auto=format&fit=crop"
      },
      {
        title: "Middle School",
        age: "Ages 11 - 14",
        desc: "Introducing deeper subject specialization in physics, chemistry, biology, advanced mathematics, history, geography, and a choice of secondary languages.",
        img: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=400&auto=format&fit=crop"
      },
      {
        title: "Senior Secondary",
        age: "Ages 15 - 18",
        desc: "Specialized streams in Sciences (STEM), Commerce & Finance, and Humanities, preparing students for national boards and university entrance exams.",
        img: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=400&auto=format&fit=crop"
      }
    ],
    faculty: [
      {
        name: "Dr. Amit Verma",
        subject: "Head of Mathematics",
        qualification: "PhD in Mathematics, 15 years experience",
        photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop"
      },
      {
        name: "Ms. Priya Sharma",
        subject: "Senior English Faculty",
        qualification: "M.A. in English Literature from Delhi University",
        photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop"
      },
      {
        name: "Mr. Ryan Reynolds",
        subject: "Computer Science & Robotics Coach",
        qualification: "M.Tech in Software Systems, specializes in AI education",
        photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop"
      }
    ]
  },
  admissions: {
    how_to_apply: "Step 1: Fill out the online registration form on our portal. Step 2: Upload copies of previous class transcripts and birth certificate. Step 3: Attend the interactive mapping and cognitive assessment session. Step 4: Complete verification of physical documents and submit the fee to secure your seat.",
    admission_open: true,
    apply_url: "/admissions/apply",
    hero_image_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
    documents_required: [
      "Student's Birth Certificate (issued by municipal corporation)",
      "Transfer Certificate (TC) from the last attended school",
      "Report Card / Transcript of the last completed academic year",
      "Passport size photographs of the student (4 copies)",
      "Aadhaar Card copies of both student and parents"
    ],
    fee_structure: [
      { class_name: "Kindergarten", annual_fee: 45000, monthly_fee: 3500 },
      { class_name: "Primary (Grades 1-5)", annual_fee: 60000, monthly_fee: 4800 },
      { class_name: "Middle School (Grades 6-8)", annual_fee: 72000, monthly_fee: 5800 },
      { class_name: "High School (Grades 9-12)", annual_fee: 90000, monthly_fee: 7200 }
    ]
  },
  student_life: {
    sports: "We offer standard-setting training facilities in Soccer, Basketball, Lawn Tennis, Swimming, Athletics, and Gymnastics. Our students regularly bring home laurels from state and national championships.",
    sports_image_url: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop",
    cultural_activities: "Art is central to student expression. We organize annual musical plays, classical music and dance recitals, fine art exhibitions, and inter-school debate tournaments.",
    cultural_image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop",
    clubs_societies: "Students can choose from a range of active student-led bodies including the Robotics Club, Eco-Green Society, Literary & Debating Club, coding club, and Young Entrepreneurs Forum.",
    clubs_image_url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800&auto=format&fit=crop",
    hero_image_url: "https://images.unsplash.com/photo-1491841573190-7cd31f9ab3db?q=80&w=1200&auto=format&fit=crop",
    achievements: [
      {
        title: "National STEM Cup Winner",
        year: 2025,
        description: "Our middle school robotics team won first prize at the National STEM Olympiad for developing an automated waste segregation model."
      },
      {
        title: "State Soccer Gold Medal",
        year: 2024,
        description: "Under-17 soccer team won the inter-district cup with an undefeated streak of 6 games."
      }
    ]
  },
  news: {
    hero_image_url: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&auto=format&fit=crop"
  },
  news_notices: [
    {
      type: "announcement",
      title: "Admissions Open for Academic Session 2026-27",
      content: "Registration is now open for classes from Kindergarten through Grade 11. Interaction sessions will start from July 1st, 2026. Please apply online.",
      pdf_url: "",
      published_at: new Date(),
      is_published: true
    },
    {
      type: "circular",
      title: "Summer Vacation Schedule & Homework Guidelines",
      content: "The school will remain closed for summer vacation from June 25th to August 5th, 2026. Please check the website portal to download the holiday homework sheets.",
      pdf_url: "/downloads/summer_homework_2026.pdf",
      published_at: new Date(),
      is_published: true
    },
    {
      type: "result",
      title: "Outstanding Board Results - 100% Pass Rate",
      content: "We are proud to announce a 100% pass rate in the Grade 12 board examinations. School topper Amit Pathak secured 99.4% in the Science stream.",
      pdf_url: "",
      published_at: new Date(),
      is_published: true
    }
  ],
  gallery: {
    hero_image_url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1200&auto=format&fit=crop",
    photos: [
      {
        url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=600&auto=format&fit=crop",
        caption: "Students working on chemistry experiments in the science lab.",
        album: "Science Lab"
      },
      {
        url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=600&auto=format&fit=crop",
        caption: "Interactive math session in Grade 5 Smart Classroom.",
        album: "Academic Life"
      },
      {
        url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=600&auto=format&fit=crop",
        caption: "Annual School Sports Day - Under 14 sprint final.",
        album: "Sports"
      },

      {
        url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=600&auto=format&fit=crop",
        caption: "Robotics club designing a new prototype.",
        album: "Clubs & Activities"
      },
      {
        url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop",
        caption: "Interactive English debate tournament.",
        album: "Academic Life"
      }
    ],
    videos: [
      {
        url: "https://assets.mixkit.co/videos/preview/mixkit-kids-playing-and-learning-in-school-classroom-34241-large.mp4",
        title: "Virtual School Campus Tour & Highlights"
      },
      {
        url: "https://assets.mixkit.co/videos/preview/mixkit-hand-of-a-teacher-writing-on-a-blackboard-with-chalk-41617-large.mp4",
        title: "Smart Classroom and Robotics Lab Session"
      }
    ]
  },
  contact: {
    address: "12, Education Expressway, Sector 4, Knowledge Park, Noida, UP - 201301",
    phone: "+91 120 4567 890, +91 98765 43210",
    email: "admissions@modernschool.edu, info@modernschool.edu",
    website: "https://www.modernschool.edu",
    map_embed_url: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3504.606361833014!2d77.30663737618957!3d28.55156687570959!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ce42ecfffffb1%3A0x6b09bb8693240212!2sNoida%20Expressway!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin",
    hero_image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
    social: {
      facebook: "https://facebook.com/modernschool",
      twitter: "https://twitter.com/modernschool",
      instagram: "https://instagram.com/modernschool",
      youtube: "https://youtube.com/modernschool"
    }
  }
};

async function main() {
  console.log("\n🔌  Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected!\n");

  console.log(`🎯  Upserting landing content for school_id: ${SCHOOL_ID}...`);

  const existing = await LandingContent.findOne({ school_id: SCHOOL_ID });

  if (existing) {
    await LandingContent.updateOne(
      { school_id: SCHOOL_ID },
      { $set: dataPayload }
    );
    console.log("🔄  Landing content updated successfully!");
  } else {
    await LandingContent.create(dataPayload);
    console.log("🆕  Landing content created successfully!");
  }

  console.log("\n🔍  Verifying database state...");
  const verifyDoc = await LandingContent.findOne({ school_id: SCHOOL_ID }).lean();
  if (verifyDoc) {
    console.log("✅  Verification passed!");
    console.log(`    - Highlights count: ${verifyDoc.highlights.length}`);
    console.log(`    - Faculty count: ${verifyDoc.academics.faculty.length}`);
    console.log(`    - Photos count: ${verifyDoc.gallery.photos.length}`);
    console.log(`    - Videos count: ${verifyDoc.gallery.videos.length}`);
    console.log(`    - Testimonials count: ${verifyDoc.testimonials.length}`);
    console.log(`    - FAQ count: ${verifyDoc.faqs.length}`);
  } else {
    console.log("❌  Verification failed! Document not found.");
  }

  await mongoose.disconnect();
  console.log("\n🔌  Disconnected. Done!\n");
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
