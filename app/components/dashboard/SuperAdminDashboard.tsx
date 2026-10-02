"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCcw,
  Building2,
  CheckCircle2,
  X,
  ArrowRight,
  Plus,
  Loader2,
  Globe,
  GraduationCap,
  Users,
  BookOpen,
  Search,
  Filter,
  Download,
  ExternalLink,
  Phone,
  Mail,
  Calendar,
  Eye,
  ShieldCheck,
  Sparkles,
  School,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  MapPin,
  TrendingUp,
  Layers,
  BarChart3,
  Receipt,
  CreditCard,
  FileText,
  Activity,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";
import { getSubdomainHost } from "@/lib/utils/subdomain";
import { Modal } from "@/app/components/ui/modal";
import SuperAdminCharts, { AnalyticsData } from "./SuperAdminCharts";

interface SuperAdminDashboardProps {
  user: any;
}

interface SchoolItem {
  _id: string;
  name: string;
  slug: string;
  subdomain?: string;
  custom_domain?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  studentsCount: number;
  teachersCount: number;
  classesCount: number;
  createdAt?: string;
}

interface StudentItem {
  _id: string;
  name: string;
  roll_no?: string;
  admission_no?: string;
  gender?: string;
  dob?: string;
  photo_url?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  academic_year?: string;
  school_id: { _id: string; name: string; subdomain?: string; slug?: string } | any;
  class_id?: { _id: string; name: string; section?: string } | any;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: string;
  blood_group?: string;
  address?: string;
}

interface TeacherItem {
  _id: string;
  name: string;
  employee_id?: string;
  gender?: string;
  phone?: string;
  email?: string;
  designation?: string;
  department?: string;
  qualification?: string;
  is_active: boolean;
  school_id: { _id: string; name: string; subdomain?: string; slug?: string } | any;
}

export default function SuperAdminDashboard({ user }: SuperAdminDashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");

  // Analytics & tracking metrics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Schools state
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);


  const loadAnalytics = useCallback(() => {
    setLoadingAnalytics(true);
    fetch("/api/dashboard/super-analytics", { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setAnalytics(data.data);
        }
      })
      .catch((err) => console.error("Error loading analytics:", err))
      .finally(() => setLoadingAnalytics(false));
  }, []);

  // Load all schools with counts
  const loadSchools = useCallback(() => {
    setLoadingSchools(true);
    fetch("/api/schools", { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setSchools(data.data);
        }
      })
      .catch((err) => console.error("Error loading schools:", err))
      .finally(() => setLoadingSchools(false));
  }, []);

  useEffect(() => {
    loadSchools();
    loadAnalytics();
  }, [loadSchools, loadAnalytics]);

  // Aggregate global metrics
  const networkStats = useMemo(() => {
    const totalCampuses = schools.length;
    const activeCampuses = schools.filter((s) => s.is_active).length;
    const suspendedCampuses = totalCampuses - activeCampuses;
    const networkStudents = schools.reduce((acc, s) => acc + (s.studentsCount || 0), 0);
    const networkTeachers = schools.reduce((acc, s) => acc + (s.teachersCount || 0), 0);
    const networkClasses = schools.reduce((acc, s) => acc + (s.classesCount || 0), 0);

    return {
      totalCampuses,
      activeCampuses,
      suspendedCampuses,
      networkStudents,
      networkTeachers,
      networkClasses,
    };
  }, [schools]);
  
  return (
    <div className="font-sans font-roboto text-slate-800 dark:text-slate-100">
      <SuperAdminCharts analytics={analytics} loading={loadingAnalytics} />
    </div>
  );
}
