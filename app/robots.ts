import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/login/",
          "/register/",
          "/reset-password/",
          "/forget-password/",
          "/email-verification/",
          "/two-step-verification/",
          "/student/",
          "/salary/",
          "/super-admin/",
          "/documents/",
          "/fees/",
          "/attendance/",
          "/examination/",
          "/reports/",
          "/academic/",
          "/leave/",
          "/maintenance/",
          "/error-500/",
        ],
      },
    ],
    sitemap: "https://myschoollife.in/sitemap.xml",
  };
}
