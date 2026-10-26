"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ReceiptConfig,
  DEFAULT_RECEIPT_CONFIG,
  RECEIPT_PRESETS,
} from "@/lib/types/receipt-builder";

interface SchoolInfo {
  name: string;
  subtitle: string;
  logo_url: string;
  address: string;
  phone: string;
}

export function useReceiptConfig() {
  const [config, setConfigState] = useState<ReceiptConfig>(DEFAULT_RECEIPT_CONFIG);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: "Bajrang Shikshan Sansthan Secondary School",
    subtitle: "Padu Khurd | Padu Kurd",
    logo_url: "",
    address: "Padu Khurd, Nagaur, Rajasthan",
    phone: "+91 98765 43210",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Load configuration from API with local fallback
  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Try local cache first for instant render
      const localCached = typeof window !== "undefined" ? localStorage.getItem("sm_receipt_config") : null;
      if (localCached) {
        try {
          const parsed = JSON.parse(localCached);
          setConfigState((prev) => ({ ...prev, ...parsed }));
        } catch {
          // ignore corrupted local storage
        }
      }

      // 2. Fetch fresh from DB API
      const res = await fetch("/api/school/receipt-config");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const loaded = json.data.config || {};
          setConfigState((prev) => ({ ...prev, ...loaded }));
          if (json.data.schoolInfo) {
            setSchoolInfo(json.data.schoolInfo);
          }
          if (typeof window !== "undefined") {
            localStorage.setItem("sm_receipt_config", JSON.stringify(loaded));
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load receipt config from server, using local fallback", err);
    } finally {
      setIsLoading(false);
      setIsDirty(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update a single key or partial object
  const updateConfig = useCallback((updates: Partial<ReceiptConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...updates };
      return next;
    });
    setIsDirty(true);
    setSaveStatus(null);
  }, []);

  // Update a single field
  const updateField = useCallback(<K extends keyof ReceiptConfig>(key: K, value: ReceiptConfig[K]) => {
    setConfigState((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveStatus(null);
  }, []);

  // Load a preset template
  const loadPreset = useCallback((presetId: string) => {
    const preset = RECEIPT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfigState((prev) => ({
      ...prev,
      ...preset.config,
      template_id: preset.id,
      template_name: preset.name,
    }));
    setIsDirty(true);
    setSaveStatus({
      type: "success",
      message: `"${preset.name}" preset applied. Click "Save Configuration" to persist.`,
    });
  }, []);

  // Reset to default
  const resetToDefault = useCallback(() => {
    setConfigState(DEFAULT_RECEIPT_CONFIG);
    setIsDirty(true);
    setSaveStatus({
      type: "success",
      message: "Reset to default layout. Don't forget to save.",
    });
  }, []);

  // Save changes to API & local cache
  const saveConfig = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch("/api/school/receipt-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save configuration");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("sm_receipt_config", JSON.stringify(config));
      }

      setIsDirty(false);
      setSaveStatus({
        type: "success",
        message: "Receipt layout and format saved successfully!",
      });

      // Auto-hide alert after 4s
      setTimeout(() => setSaveStatus(null), 4000);
      return true;
    } catch (err: any) {
      setSaveStatus({
        type: "error",
        message: err.message || "Network error while saving receipt configuration",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  return {
    config,
    schoolInfo,
    isLoading,
    isSaving,
    saveStatus,
    isDirty,
    updateConfig,
    updateField,
    loadPreset,
    resetToDefault,
    saveConfig,
    reload: fetchConfig,
  };
}
