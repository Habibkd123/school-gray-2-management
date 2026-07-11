import { getAuthHeaders } from "@/lib/utils/session";
import { ApiTeacher } from "@/app/hooks/useTeachers";

let allTeachersPromise: Promise<ApiTeacher[]> | null = null;
let allTeachersCache: ApiTeacher[] | null = null;
let cacheTime = 0;
const TTL = 5000;

export const TeacherService = {
  async getAllTeachers(options?: { forceRefetch?: boolean; status?: string }): Promise<ApiTeacher[]> {
    if (options?.forceRefetch) {
      allTeachersCache = null;
      allTeachersPromise = null;
    }

    const now = Date.now();
    if (allTeachersCache && (now - cacheTime < TTL)) {
      return this.filterAndSortTeachers(allTeachersCache, options);
    }

    if (!allTeachersPromise) {
      allTeachersPromise = (async () => {
        try {
          const res = await fetch("/api/teachers?limit=all", {
            headers: getAuthHeaders(),
          });
          if (!res.ok) throw new Error("Failed to fetch teachers from TeacherService");
          const json = await res.json();
          if (!json.success) throw new Error(json.message || "Failed to fetch teachers");
          allTeachersCache = json.data.teachers || [];
          cacheTime = Date.now();
          return allTeachersCache!;
        } catch (err) {
          allTeachersPromise = null;
          throw err;
        }
      })();
    }

    try {
      const teachers = await allTeachersPromise;
      return this.filterAndSortTeachers(teachers, options);
    } catch (err) {
      allTeachersPromise = null;
      throw err;
    }
  },

  invalidateCache() {
    allTeachersCache = null;
    allTeachersPromise = null;
    cacheTime = 0;
  },

  filterAndSortTeachers(teachers: ApiTeacher[], options?: { status?: string }): ApiTeacher[] {
    let result = [...teachers];
    if (options?.status && options.status !== "all" && options.status !== "Select") {
      const isActive = options.status.toLowerCase() === "active";
      result = result.filter(t => t.is_active === isActive);
    }

    // Deduplicate by _id
    const seen = new Set<string>();
    result = result.filter(t => {
      if (seen.has(t._id)) return false;
      seen.add(t._id);
      return true;
    });

    // Sort by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }
};
