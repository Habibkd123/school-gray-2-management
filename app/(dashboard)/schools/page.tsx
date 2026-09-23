"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  Plus, RefreshCcw, Building2, ShieldCheck, Mail, Phone, MapPin,
  CheckCircle, XCircle, Edit, Trash2, Loader2, AlertCircle, Eye,
  Globe, ExternalLink, Copy, Check, Search, Tag
} from "lucide-react";
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
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";

export default function SchoolsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  });

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
        });
      } else {
        setMetaForm({
          meta_title: `${school.name} | Portal`,
          meta_description: `Official ERP portal of ${school.name}.`,
          meta_keywords: `${school.name.toLowerCase()}, school portal, myschoollife`,
          og_image: "",
          favicon_url: "",
        });
      }
    } catch {
      setMetaForm({
        meta_title: `${school.name} | Portal`,
        meta_description: `Official ERP portal of ${school.name}.`,
        meta_keywords: `${school.name.toLowerCase()}, school portal, myschoollife`,
        og_image: "",
        favicon_url: "",
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

  return (
    <div className="space-y-6 max-w-full sm:w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white">
            Schools Management
          </h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Super Admin</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200">Schools</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="section-title">{schools.length}</h3>
            <p className="card-subtitle text-[13px] mt-0.5">Total Schools</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="section-title">{activeSchools}</h3>
            <p className="card-subtitle text-[13px] mt-0.5">Active Institutions</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="section-title">{schools.filter((s) => !!s.subdomain).length}</h3>
            <p className="card-subtitle text-[13px] mt-0.5">Subdomains Active</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="section-title">{inactiveSchools}</h3>
            <p className="card-subtitle text-[13px] mt-0.5">Suspended / Inactive</p>
          </div>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Registered Institutions & Subdomains</h3>
          <span className="text-[12px] text-slate-500 dark:text-slate-400">
            Root: <code className="font-mono text-amber-600 dark:text-amber-400">.{ROOT_DOMAIN}</code>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
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
            <p className="text-[14px] font-medium">No schools found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">School Details</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subdomain & Live URL</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact Info</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {schools.map((school) => {
                  const sub = school.subdomain || school.slug;
                  const liveUrl = getSchoolLoginUrl(school);
                  const isCopied = copiedId === school._id;

                  return (
                    <tr key={school._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      {/* Name & Address */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white text-[14px]">
                            {school.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                            ID: {school._id}
                          </span>
                          {school.address && (
                            <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {school.address}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Subdomain & Live URL */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Globe className="w-3 h-3" />
                              {sub}.{ROOT_DOMAIN}
                            </span>
                            {school.custom_domain && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                {school.custom_domain}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <button
                              onClick={() => handleCopyLink(school)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors cursor-pointer"
                              title="Copy Login URL"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>

                            <span className="text-slate-300 dark:text-slate-700">•</span>

                            <a
                              href={liveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              <span>Open Portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Contact details */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-[12px] text-slate-600 dark:text-slate-300">
                          {school.email && (
                            <span className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {school.email}
                            </span>
                          )}
                          {school.phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {school.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(school)}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider cursor-pointer transition-all ${
                            school.is_active
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 hover:bg-emerald-500/25"
                              : "bg-rose-500/15 text-rose-500 border border-rose-500/25 hover:bg-rose-500/25"
                          }`}
                        >
                          {school.is_active ? "ACTIVE" : "INACTIVE"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenMeta(school)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm"
                            title="Manage SEO & Meta Keywords"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(school)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-amber-500 hover:border-amber-500 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm dark:text-slate-300"
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

            {/* OG Image & Favicon URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Social Sharing Image (OG Image URL)
                </label>
                <input
                  type="url"
                  value={metaForm.og_image}
                  onChange={(e) => setMetaForm({ ...metaForm, og_image: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-indigo-500/50 transition-colors bg-white dark:bg-slate-900"
                />
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
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  Custom Favicon URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={metaForm.favicon_url}
                    onChange={(e) => setMetaForm({ ...metaForm, favicon_url: e.target.value })}
                    placeholder="https://example.com/favicon.ico"
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
                </div>
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
