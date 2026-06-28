export function usePublicSchoolInfo() {
  const schoolInfo = {
    school_name: process.env.NEXT_PUBLIC_SCHOOL_NAME || "MySchoolLife",
    school_subtitle: process.env.NEXT_PUBLIC_SCHOOL_SUBTITLE || "Public School",
  };

  return { schoolInfo };
}
