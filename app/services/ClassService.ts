import { getAuthHeaders } from "@/lib/utils/session";
import { ApiClass } from "@/app/hooks/useClasses";

let allClassesPromise: Promise<ApiClass[]> | null = null;
let allClassesCache: ApiClass[] | null = null;
let cacheTime = 0;
const TTL = 5000; // 5 seconds cache to avoid duplicate fast calls

export const ClassService = {
  async getAllClasses(options?: { forceRefetch?: boolean; status?: string; academic_year?: string }): Promise<ApiClass[]> {
    if (options?.forceRefetch) {
      allClassesCache = null;
      allClassesPromise = null;
    }

    const now = Date.now();
    if (allClassesCache && (now - cacheTime < TTL)) {
      return this.filterAndSortClasses(allClassesCache, options);
    }

    if (!allClassesPromise) {
      allClassesPromise = (async () => {
        try {
          const res = await fetch("/api/classes?limit=all", {
            headers: getAuthHeaders(),
          });
          if (!res.ok) throw new Error("Failed to fetch classes from ClassService");
          const json = await res.json();
          if (!json.success) throw new Error(json.message || "Failed to fetch classes");
          allClassesCache = json.data.classes || [];
          cacheTime = Date.now();
          return allClassesCache!;
        } catch (err) {
          allClassesPromise = null;
          throw err;
        }
      })();
    }

    try {
      const classes = await allClassesPromise;
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
