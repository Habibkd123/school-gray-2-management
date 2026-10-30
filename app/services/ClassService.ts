import { getAuthHeaders } from "@/lib/utils/session";
import { ApiClass } from "@/app/hooks/useClasses";

let allClassesPromise: Promise<ApiClass[]> | null = null;
let allClassesCache: ApiClass[] | null = null;
let cacheTime = 0;
const TTL = 60_000; // 60 seconds cache to avoid duplicate calls

export const ClassService = {
  async getAllClasses(options?: { forceRefetch?: boolean; status?: string; academic_year?: string }): Promise<ApiClass[]> {
    if (options?.forceRefetch) {
      allClassesCache = null;
      allClassesPromise = null;
      if (typeof window !== "undefined") {
        try { sessionStorage.removeItem("sm_classes_cache"); } catch { }
      }
    }

    const now = Date.now();
    if (allClassesCache && allClassesCache.length > 0 && (now - cacheTime < TTL)) {
      return this.filterAndSortClasses(allClassesCache, options);
    }

    // Try reading from sessionStorage (shared across components and fast page navigation)
    if (!allClassesCache && typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("sm_classes_cache");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.classes) && parsed.classes.length > 0) {
            allClassesCache = parsed.classes;
            cacheTime = parsed.timestamp || now;
            if (now - (parsed.timestamp || 0) < TTL) {
              return this.filterAndSortClasses(allClassesCache!, options);
            }
          }
        }
      } catch { }
    }

    if (!allClassesPromise) {
      allClassesPromise = (async () => {
        try {
          const authHeaders = getAuthHeaders();
          let schoolIdHeader = "";
          if (typeof window !== "undefined") {
            try {
              const sInfo = localStorage.getItem("sm_school_info");
              if (sInfo) schoolIdHeader = JSON.parse(sInfo)?.id || "";
            } catch { }
          }
          const headers: Record<string, string> = { ...(authHeaders as any) };
          if (schoolIdHeader) headers["x-school-id"] = schoolIdHeader;

          const res = await fetch("/api/classes?limit=all&include_stats=false", {
            headers,
            cache: "no-store",
          });
          if (!res.ok) throw new Error("Failed to fetch classes from ClassService");
          const json = await res.json();
          if (!json.success) throw new Error(json.message || "Failed to fetch classes");
          const fetchedClasses = Array.isArray(json.data) ? json.data : (json.data?.classes || []);
          if (fetchedClasses.length > 0) {
            allClassesCache = fetchedClasses;
            cacheTime = Date.now();
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem("sm_classes_cache", JSON.stringify({ classes: allClassesCache, timestamp: cacheTime }));
              } catch { }
            }
          }
          return fetchedClasses;
        } catch (err) {
          allClassesPromise = null;
          throw err;
        }
      })();
    }

    try {
      const classes = await allClassesPromise;
      allClassesPromise = null; // Always clear in-flight promise after resolution
      return this.filterAndSortClasses(classes, options);
    } catch (err) {
      allClassesPromise = null;
      throw err;
    }
  },

  invalidateCache() {
    allClassesCache = null;
    allClassesPromise = null;
    cacheTime = 0;
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem("sm_classes_cache"); } catch { }
    }
  },

  filterAndSortClasses(classes: ApiClass[], options?: { status?: string; academic_year?: string }): ApiClass[] {
    let result = [...classes];
    if (options?.status && options.status !== "all") {
      result = result.filter(c => c.status === options.status);
    }
    if (options?.academic_year) {
      result = result.filter(c => c.academic_year === options.academic_year);
    }

    // Deduplicate by _id
    const seen = new Set<string>();
    result = result.filter(c => {
      if (seen.has(c._id)) return false;
      seen.add(c._id);
      return true;
    });

    // Sort classes by name and section using alphanumeric sorting
    return result.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      if (nameCompare !== 0) return nameCompare;
      return a.section.localeCompare(b.section);
    });
  }
};
