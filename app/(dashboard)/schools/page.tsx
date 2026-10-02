"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  Plus, RefreshCcw, Building2, ShieldCheck, Mail, Phone, MapPin,
  CheckCircle, XCircle, Edit, Trash2, Loader2, AlertCircle, Eye,
  Globe, ExternalLink, Copy, Check, Search, Tag, Upload,
  GraduationCap, Users, ChevronRight, Sparkles, X, Filter
} from "lucide-react";
import Link from "next/link";
import { Modal } from "../../components/ui/modal";
import { getSubdomainHost } from "@/lib/utils/subdomain";

interface SchoolData {
  _id: string;
  name: string;
  slug: string;
  subdomain?: string;
  custom_domain?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  is_active: boolean;
  createdAt: string;
  studentsCount?: number;
  teachersCount?: number;
  classesCount?: number;
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";

export default function SchoolsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Form/Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // SEO / Meta Modal states
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [selectedMetaSchool, setSelectedMetaSchool] = useState<SchoolData | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaSubmitting, setMetaSubmitting] = useState(false);
  const [metaSuccess, setMetaSuccess] = useState("");
  const [metaError, setMetaError] = useState("");
  const [metaForm, setMetaForm] = useState({
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: "",
    favicon_url: "",
    google_site_verification: "",
    google_analytics_id: "",
  });
  const [uploadingOg, setUploadingOg] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const handleUploadMetaImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "og_image" | "favicon_url"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === "og_image") setUploadingOg(true);
    else setUploadingFavicon(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setMetaForm((prev) => ({ ...prev, [field]: data.url }));
      } else {
        alert(data.message || "Failed to upload file.");
      }
    } catch {
      alert("Failed to upload file. Please try again.");
    } finally {
      if (field === "og_image") setUploadingOg(false);
      else setUploadingFavicon(false);
      e.target.value = "";
    }
  };

  // Form inputs
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Authorization Check
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "super_admin")) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const fetchSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schools", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch schools");
      }
      setSchools(data.data);
    } catch (err: any) {
      setError(err.message || "Failed to load schools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "super_admin") {
      fetchSchools();
    }
  }, [user]);

  const resetForm = () => {
    setName("");
    setSlug("");
    setSubdomain("");
    setCustomDomain("");
    setAddress("");
    setPhone("");
    setEmail("");
    setIsActive(true);
    setFormError("");
  };

  const handleOpenEdit = (school: SchoolData) => {
    setSelectedSchool(school);
    setName(school.name);
    setSlug(school.slug);
    setSubdomain(school.subdomain || "");
    setCustomDomain(school.custom_domain || "");
    setAddress(school.address || "");
    setPhone(school.phone || "");
    setEmail(school.email || "");
    setIsActive(school.is_active);
    setFormError("");
    setIsEditOpen(true);
  };

  const getSchoolLoginUrl = (school: SchoolData) => {
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const sub = school.subdomain || school.slug;
    if (isLocal) {
      return `${window.location.origin}/login?subdomain=${encodeURIComponent(sub)}`;
    }
    if (school.custom_domain) {
      return `https://${school.custom_domain}/login`;
    }
    const host = getSubdomainHost(sub, false);
    return `https://${host}/login`;
  };

  const handleCopyLink = (school: SchoolData) => {
    const url = getSchoolLoginUrl(school);
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(school._id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim() || !slug.trim()) {
      setFormError("School Name and Slug are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          subdomain: subdomain.trim().toLowerCase() || slug.trim().toLowerCase(),
          custom_domain: customDomain.trim().toLowerCase() || undefined,
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          is_active: isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create school");
      }

      setIsAddOpen(false);
      resetForm();
      fetchSchools();
    } catch (err: any) {
      setFormError(err.message || "Failed to create school");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;

    setFormError("");
    if (!name.trim()) {
      setFormError("School Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/schools/${selectedSchool._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: name.trim(),
          subdomain: subdomain.trim().toLowerCase() || null,
          custom_domain: customDomain.trim().toLowerCase() || null,
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          is_active: isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update school");
      }

      setIsEditOpen(false);
      resetForm();
      fetchSchools();
    } catch (err: any) {
      setFormError(err.message || "Failed to update school");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (school: SchoolData) => {
    try {
      const res = await fetch(`/api/schools/${school._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          is_active: !school.is_active,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSchools((prev) =>
          prev.map((s) => (s._id === school._id ? { ...s, is_active: !s.is_active } : s))
        );
      }
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  const handleOpenMeta = async (school: SchoolData) => {
    setSelectedMetaSchool(school);
    setIsMetaOpen(true);
    setMetaSuccess("");
    setMetaError("");
    setMetaLoading(true);

    try {
      const res = await fetch(`/api/school/meta-config?school_id=${school._id}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMetaForm({
          meta_title: json.data.meta_title || `${school.name} | Portal`,
          meta_description: json.data.meta_description || `Official ERP portal of ${school.name}.`,
          meta_keywords: json.data.meta_keywords || `${school.name.toLowerCase()}, school portal, myschoollife`,
          og_image: json.data.og_image || "",
          favicon_url: json.data.favicon_url || "",
          google_site_verification: json.data.google_site_verification || "",
          google_analytics_id: json.data.google_analytics_id || "",
        });
      } else {
        setMetaForm({
          meta_title: `${school.name} | Portal`,
          meta_description: `Official ERP portal of ${school.name}.`,
          meta_keywords: `${school.name.toLowerCase()}, school portal, myschoollife`,
          og_image: "",
          favicon_url: "",
          google_site_verification: "",
          google_analytics_id: "",
        });
      }
    } catch {
      setMetaForm({
        meta_title: `${school.name} | Portal`,
        meta_description: `Official ERP portal of ${school.name}.`,
        meta_keywords: `${school.name.toLowerCase()}, school portal, myschoollife`,
        og_image: "",
        favicon_url: "",
        google_site_verification: "",
        google_analytics_id: "",
      });
    } finally {
      setMetaLoading(false);
    }
  };

  const handleMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMetaSchool) return;

    setMetaSubmitting(true);
    setMetaSuccess("");
    setMetaError("");

    try {
      const res = await fetch("/api/school/meta-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          school_id: selectedMetaSchool._id,
          meta_title: metaForm.meta_title.trim(),
          meta_description: metaForm.meta_description.trim(),
          meta_keywords: metaForm.meta_keywords.trim(),
          og_image: metaForm.og_image.trim(),
          favicon_url: metaForm.favicon_url.trim(),
          google_site_verification: metaForm.google_site_verification.trim(),
          google_analytics_id: metaForm.google_analytics_id.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update SEO metadata");
      }

      setMetaSuccess("SEO & Metadata updated successfully! Cache cleared.");
      setTimeout(() => {
        setIsMetaOpen(false);
        setMetaSuccess("");
      }, 1500);
    } catch (err: any) {
      setMetaError(err.message || "Failed to update metadata");
    } finally {
      setMetaSubmitting(false);
    }
  };

  if (authLoading || !user || user.role !== "super_admin") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const activeSchools = schools.filter((s) => s.is_active).length;
  const inactiveSchools = schools.length - activeSchools;
  const totalNetworkStudents = schools.reduce((acc, s) => acc + (s.studentsCount || 0), 0);
  const totalFaculty = schools.reduce((acc, s) => acc + (s.teachersCount || 0), 0);

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.subdomain && s.subdomain.toLowerCase().includes(q)) ||
        (s.slug && s.slug.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_active) ||
        (statusFilter === "inactive" && !s.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [schools, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 max-w-full sm:w-[1600px] mx-auto font-roboto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white">
            Schools Management
          </h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Super Admin</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200">Schools Directory</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSchools}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors cursor-pointer dark:text-slate-400"
            title="Refresh List"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add School</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {/* Total Campuses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Campuses
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {schools.length}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{activeSchools} Active</span>
            <span>•</span>
            <span className={inactiveSchools > 0 ? "text-rose-500 font-semibold" : "text-slate-400"}>
              {inactiveSchools} Inactive
            </span>
          </div>
        </div>

        {/* Enrolled Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Enrolled Students
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {totalNetworkStudents.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Combined multi-tenant enrollment
          </div>
        </div>

        {/* Active Faculty */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Faculty
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {totalFaculty.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Verified academic instructors
          </div>
        </div>

        {/* Network Operations Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Network Operations
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {schools.length > 0 ? `${Math.round((activeSchools / schools.length) * 100)}%` : "100%"}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Multi-tenant routes operational</span>
          </div>
        </div>
      </div>

      {/* Schools Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-left">
        {/* Table Top Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <span>Registered Institutions &amp; Subdomains</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live portal routing, faculty assignment, and tenant domain mapping
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Root Domain:</span>
            <span className="px-2.5 py-1 rounded-lg font-mono text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700">
              .{ROOT_DOMAIN}
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by school name, subdomain, address, or email..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              All ({schools.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              Active ({activeSchools})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === "inactive"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              Inactive ({inactiveSchools})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span className="text-[14px] font-medium">Loading schools...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <p className="text-[14px] font-medium">{error}</p>
            <button
              onClick={fetchSchools}
              className="px-4 py-2 text-[13px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : schools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
            <Building2 className="w-8 h-8 opacity-40" />
            <p className="text-[14px] font-medium">No schools registered yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-6 min-w-[280px]">Institution</th>
                  <th className="py-3.5 px-6 min-w-[320px]">Subdomain &amp; Live URL</th>
                  <th className="py-3.5 px-6 min-w-[220px]">Enrollment &amp; Staff</th>
                  <th className="py-3.5 px-6 min-w-[200px]">Contact Info</th>
                  <th className="py-3.5 px-6 min-w-[120px]">Status</th>
                  <th className="py-3.5 px-6 min-w-[100px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredSchools.map((school) => {
                  const sub = school.subdomain || school.slug;
                  const liveUrl = getSchoolLoginUrl(school);
                  const isCopied = copiedId === school._id;
                  const initial = (school.name || "S").trim().charAt(0).toUpperCase();

                  return (
                    <tr
                      key={school._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* School Details */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[14px] text-slate-900 dark:text-white capitalize truncate max-w-[220px]">
                              {school.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10.5px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                slug: {school.slug}
                              </span>
                            </div>
                            {school.address && (
                              <div
                                className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 truncate max-w-[240px]"
                                title={school.address}
                              >
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{school.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subdomain & Live URL */}
                      <td className="py-4 px-6 align-middle">
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2.5 w-full min-w-[280px] space-y-2">
                          {/* Full domain row */}
                          <div className="flex items-center gap-1.5 text-xs font-mono">
                            <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="whitespace-nowrap"><span className="font-bold text-slate-900 dark:text-white">{sub}</span><span className="text-slate-400">.{ROOT_DOMAIN}</span></span>
                          </div>

                          {/* Custom domain if exists */}
                          {school.custom_domain && (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <span className="truncate">{school.custom_domain}</span>
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50">
                            <a
                              href={liveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/25 transition-colors cursor-pointer"
                            >
                              <span>Open Portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            <button
                              onClick={() => handleCopyLink(school)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                              title="Copy portal login URL"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy URL</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Enrolled Students & Faculty */}
                      <td className="py-4 px-6 align-middle">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <GraduationCap className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-[13px] text-slate-900 dark:text-white">
                                {(school.studentsCount ?? 0).toLocaleString()}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">Students</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <Users className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-[13px] text-slate-900 dark:text-white">
                                {(school.teachersCount ?? 0).toLocaleString()}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">Faculty</span>
                            </div>
                          </div>

                          <Link
                            href={`/students?school_id=${school._id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline group"
                          >
                            <span>View Students Directory</span>
                            <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </div>
                      </td>

                      {/* Contact details */}
                      <td className="py-4 px-6 align-middle">
                        <div className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                          {school.email ? (
                            <a
                              href={`mailto:${school.email}`}
                              className="flex items-center gap-1.5 text-[11.5px] hover:text-amber-600 transition-colors truncate max-w-[190px]"
                              title={school.email}
                            >
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{school.email}</span>
                            </a>
                          ) : null}

                          {school.phone ? (
                            <a
                              href={`tel:${school.phone}`}
                              className="flex items-center gap-1.5 text-[11.5px] hover:text-amber-600 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{school.phone}</span>
                            </a>
                          ) : null}

                          {!school.email && !school.phone && (
                            <span className="text-slate-400 text-xs italic">—</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 align-middle">
                        <button
                          onClick={() => toggleStatus(school)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wider uppercase transition-all cursor-pointer border ${
                            school.is_active
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100"
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100"
                          }`}
                          title="Click to toggle school status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              school.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                            }`}
                          />
                          <span>{school.is_active ? "Active" : "Inactive"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenMeta(school)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-2xs"
                            title="SEO, Social & Search Keywords"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(school)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-2xs"
                            title="Edit School & Subdomain"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredSchools.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <Building2 className="w-8 h-8 opacity-40 mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No campuses match your filter
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Try searching with a different term or clear the filter
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="mt-3 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer"
                >
                  Clear Search Filter
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add School Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New School & Subdomain">
        <form onSubmit={handleAddSubmit} className="space-y-4 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[13px] font-medium border border-rose-200/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                School Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) {
                    const autoSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    setSlug(autoSlug);
                    if (!subdomain) setSubdomain(autoSlug);
                  }
                }}
                placeholder="e.g. Bajrang Public School"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Slug (Internal Identifier) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="e.g. bajrang"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Subdomain Prefix <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="e.g. bajrang"
                  className="w-full px-3.5 py-2 border border-r-0 border-slate-200 dark:border-slate-800 rounded-l-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
                />
                <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-r-lg text-[12px] font-medium text-slate-500 whitespace-nowrap">
                  .{ROOT_DOMAIN}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Live URL: <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">https://{subdomain || "school"}.{ROOT_DOMAIN}/login</span>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Custom Domain (Optional)
              </label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                placeholder="e.g. www.bajrangschool.com"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
              />
              <p className="text-[11px] text-slate-400">For institutions having their own web domain</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@school.com"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Campus Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full physical address of the campus"
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900 h-20 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_add"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="is_active_add" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Set School Status to Active on Creation
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg transition-colors cursor-pointer bg-white dark:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-[13px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create School
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit School Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit School & Subdomain Details">
        <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[13px] font-medium border border-rose-200/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                School Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Modern International School"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-400 dark:text-slate-600">
                Slug (Read Only)
              </label>
              <input
                type="text"
                value={slug}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] bg-slate-50 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed outline-none"
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Subdomain Prefix
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="e.g. bajrang"
                  className="w-full px-3.5 py-2 border border-r-0 border-slate-200 dark:border-slate-800 rounded-l-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
                />
                <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-r-lg text-[12px] font-medium text-slate-500 whitespace-nowrap">
                  .{ROOT_DOMAIN}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Live URL: <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">https://{subdomain || "school"}.{ROOT_DOMAIN}/login</span>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Custom Domain (Optional)
              </label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                placeholder="e.g. www.bajrangschool.com"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
              />
              <p className="text-[11px] text-slate-400">For institutions having their own web domain</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@school.com"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Campus Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full physical address of the campus"
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900 h-20 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="is_active_edit" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              School Status is Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg transition-colors cursor-pointer bg-white dark:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-[13px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* SEO & Search Metadata Modal */}
      <Modal
        isOpen={isMetaOpen}
        onClose={() => setIsMetaOpen(false)}
        title={`SEO & Search Metadata — ${selectedMetaSchool?.name || ""}`}
      >
        {metaLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-[13px] font-medium">Loading SEO metadata...</span>
          </div>
        ) : (
          <form onSubmit={handleMetaSubmit} className="space-y-4 text-left">
            {metaSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[13px] font-medium border border-emerald-200/50">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {metaSuccess}
              </div>
            )}
            {metaError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[13px] font-medium border border-rose-200/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {metaError}
              </div>
            )}

            {/* Google SERP Live Preview */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Google Search Snippet Preview</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live Preview</span>
              </div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                https://{selectedMetaSchool?.subdomain || selectedMetaSchool?.slug || "school"}.{ROOT_DOMAIN}
              </div>
              <div className="text-[16px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer line-clamp-1">
                {metaForm.meta_title || `${selectedMetaSchool?.name} | Portal`}
              </div>
              <p className="text-[13px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {metaForm.meta_description || `Official ERP portal of ${selectedMetaSchool?.name}. Admissions open, attendance, exam results, and fee payment.`}
              </p>
            </div>

            {/* Meta Title */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Page Title (Meta Title)
                </label>
                <span className={`text-[11px] font-mono ${metaForm.meta_title.length > 60 ? "text-amber-500 font-bold" : "text-slate-400"}`}>
                  {metaForm.meta_title.length}/60 chars
                </span>
              </div>
              <input
                type="text"
                value={metaForm.meta_title}
                onChange={(e) => setMetaForm({ ...metaForm, meta_title: e.target.value })}
                placeholder="e.g. Bajrang Public School | Official Portal"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-indigo-500/50 transition-colors bg-white dark:bg-slate-900"
              />
            </div>

            {/* Meta Description */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Meta Description
                </label>
                <span className={`text-[11px] font-mono ${metaForm.meta_description.length > 160 ? "text-amber-500 font-bold" : "text-slate-400"}`}>
                  {metaForm.meta_description.length}/160 chars
                </span>
              </div>
              <textarea
                value={metaForm.meta_description}
                onChange={(e) => setMetaForm({ ...metaForm, meta_description: e.target.value })}
                placeholder="e.g. Official portal of Bajrang Public School, Jaipur. Direct access for parents, students, and staff."
                rows={3}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-indigo-500/50 transition-colors bg-white dark:bg-slate-900 resize-none leading-relaxed"
              />
            </div>

            {/* Meta Keywords */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>Search Keywords (comma separated)</span>
              </label>
              <input
                type="text"
                value={metaForm.meta_keywords}
                onChange={(e) => setMetaForm({ ...metaForm, meta_keywords: e.target.value })}
                placeholder="e.g. bajrang school, cbse jaipur, school admission 2026, student erp"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-indigo-500/50 transition-colors bg-white dark:bg-slate-900"
              />
              {metaForm.meta_keywords && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {metaForm.meta_keywords.split(",").map((kw, i) => {
                    const tag = kw.trim();
                    if (!tag) return null;
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50"
                      >
                        #{tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* OG Image & Favicon Upload & URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* OG Image */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Social Sharing Image (OG Image)
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-md cursor-pointer transition-colors">
                    {uploadingOg ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Image</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingOg}
                      className="hidden"
                      onChange={(e) => handleUploadMetaImage(e, "og_image")}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={metaForm.og_image}
                    onChange={(e) => setMetaForm({ ...metaForm, og_image: e.target.value })}
                    placeholder="Upload image or paste URL"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-indigo-500/50 transition-colors bg-white dark:bg-slate-900"
                  />
                  {metaForm.og_image && (
                    <button
                      type="button"
                      onClick={() => setMetaForm({ ...metaForm, og_image: "" })}
                      className="text-[11px] text-rose-500 hover:text-rose-600 shrink-0 font-medium px-1.5 py-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {metaForm.og_image && (
                  <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={metaForm.og_image}
                      alt="OG Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                  </div>
                )}
                <p className="text-[11px] text-slate-400">Recommended: 1200x630px. Shown on WhatsApp/Facebook sharing.</p>
              </div>

              {/* Favicon */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                    Custom Favicon
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-md cursor-pointer transition-colors">
                    {uploadingFavicon ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Icon</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,.ico"
                      disabled={uploadingFavicon}
                      className="hidden"
                      onChange={(e) => handleUploadMetaImage(e, "favicon_url")}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={metaForm.favicon_url}
                    onChange={(e) => setMetaForm({ ...metaForm, favicon_url: e.target.value })}
                    placeholder="Upload favicon or paste URL (.ico / .png)"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-indigo-500/50 transition-colors bg-white dark:bg-slate-900"
                  />
                  {metaForm.favicon_url && (
                    <div className="w-9 h-9 shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-center p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={metaForm.favicon_url}
                        alt="Favicon"
                        className="w-5 h-5 object-contain"
                        onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                      />
                    </div>
                  )}
                  {metaForm.favicon_url && (
                    <button
                      type="button"
                      onClick={() => setMetaForm({ ...metaForm, favicon_url: "" })}
                      className="text-[11px] text-rose-500 hover:text-rose-600 shrink-0 font-medium px-1.5 py-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">Browser tab icon (.ico, .png, or .svg).</p>
              </div>
            </div>

            {/* Google Search Console */}
            <div className="rounded-xl border border-indigo-200/50 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Google Search Console</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  Google Site Verification Token (Optional)
                </label>
                <input
                  type="text"
                  value={metaForm.google_site_verification}
                  onChange={(e) => setMetaForm({ ...metaForm, google_site_verification: e.target.value.trim() })}
                  placeholder='e.g. abc123XYZ (from <meta name="google-site-verification" content="...">)'
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-indigo-500/50 transition-colors bg-white dark:bg-slate-900 font-mono"
                />
                <p className="text-[11px] text-slate-400">
                  Optional. Paste only the token value from Google Search Console HTML meta tag verification.
                </p>
              </div>
            </div>



            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsMetaOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg transition-colors cursor-pointer bg-white dark:bg-slate-900"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={metaSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-[13px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer"
              >
                {metaSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Save SEO Metadata
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
