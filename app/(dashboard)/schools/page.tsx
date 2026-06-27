"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/auth";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  Plus, RefreshCcw, Building2, ShieldCheck, Mail, Phone, MapPin,
  CheckCircle, XCircle, Edit, Trash2, Loader2, AlertCircle, Eye
} from "lucide-react";
import { Modal } from "../../components/ui/modal";

interface SchoolData {
  _id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  is_active: boolean;
  createdAt: string;
}

export default function SchoolsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form/Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form inputs
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
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
    setAddress(school.address || "");
    setPhone(school.phone || "");
    setEmail(school.email || "");
    setIsActive(school.is_active);
    setFormError("");
    setIsEditOpen(true);
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

  if (authLoading || !user || user.role !== "super_admin") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-[#1E3A5F] animate-spin" />
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
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            <span>Super Admin</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200">Schools</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSchools}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors cursor-pointer"
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{schools.length}</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Total Registered Schools</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{activeSchools}</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Active Schools</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{inactiveSchools}</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Inactive Schools</p>
          </div>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/50">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Registered Institutions</h3>
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">School Details</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Slug / ID</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact Info</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {schools.map((school) => (
                  <tr key={school._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    {/* Name & Address */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-[14px]">
                          {school.name}
                        </span>
                        {school.address && (
                          <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {school.address}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Slug / ID */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[13px] text-amber-600 dark:text-amber-400">
                          {school.slug}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          ID: {school._id}
                        </span>
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
                          onClick={() => handleOpenEdit(school)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-amber-500 hover:border-amber-500 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm"
                          title="Edit School"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add School Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New School">
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
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Modern International School"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                Slug (Unique Subdomain Prefix) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="e.g. modern-school"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[13px] outline-none focus:border-amber-500/50 transition-colors bg-white dark:bg-slate-900"
                required
              />
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
                placeholder="+1 234 567 8900"
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
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit School Details">
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
                placeholder="+1 234 567 8900"
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
    </div>
  );
}
