"use client";

import { useEffect, useState } from "react";

export interface SchoolInfo {
  school_name: string;
  school_subtitle?: string;
  logo_url: string | null;
  school_slug: string;
}

export function usePublicSchoolInfo() {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    school_name: "School",
    school_subtitle: "Public School",
    logo_url: null,
    school_slug: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        const res = await fetch("/api/public/theme");
        if (res.ok) {
          const json = await res.json();
          const data = json.data;
          setSchoolInfo({
            school_name: data.school_name || "School",
            school_subtitle: data.school_subtitle || "Public School",
            logo_url: data.logo_url || null,
            school_slug: data.school_slug || "",
          });
        }
      } catch (error) {
        console.error("[usePublicSchoolInfo Error]", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolInfo();
  }, []);

  return { schoolInfo, loading };
}
