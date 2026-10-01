// ─── Central Cache Synchronization & Invalidation Bus ────────────
// Ensures that whenever data is modified in the database (via POST/PUT/DELETE),
// all mounted React hooks, active UI components, and browser tabs instantly
// invalidate their local cache and refetch fresh data from MongoDB.

type InvalidationCallback = (domain: string, payload?: any) => void;

class CacheSyncBus {
  private listeners: Map<string, Set<InvalidationCallback>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        if (typeof (window as any).BroadcastChannel !== "undefined") {
          this.broadcastChannel = new BroadcastChannel("school_cache_sync");
          this.broadcastChannel.onmessage = (event: MessageEvent) => {
            if (event.data && event.data.domain) {
              this.notifyLocal(event.data.domain, event.data.payload);
            }
          };
        } else {
          // Fallback to storage event for older browsers
          window.addEventListener("storage", (event: StorageEvent) => {
            if (event.key === "sm_cache_sync_event" && event.newValue) {
              try {
                const parsed = JSON.parse(event.newValue);
                if (parsed.domain) {
                  this.notifyLocal(parsed.domain, parsed.payload);
                }
              } catch {}
            }
          });
        }
      } catch (e) {
        console.warn("[CacheSync] Cross-tab sync not supported:", e);
      }
    }
  }

  private notifyLocal(domain: string, payload?: any) {
    // Notify listeners subscribed to this specific domain
    const domainListeners = this.listeners.get(domain);
    if (domainListeners) {
      domainListeners.forEach((cb) => {
        try {
          cb(domain, payload);
        } catch (err) {
          console.error(`[CacheSync] Listener error for ${domain}:`, err);
        }
      });
    }

    // Also notify wildcard ("*") listeners
    const globalListeners = this.listeners.get("*");
    if (globalListeners) {
      globalListeners.forEach((cb) => {
        try {
          cb(domain, payload);
        } catch (err) {
          console.error(`[CacheSync] Global listener error for ${domain}:`, err);
        }
      });
    }
  }

  /**
   * Subscribe to cache invalidation events for a domain (e.g. 'results', 'students', 'fees').
   * Returns an unsubscribe function.
   */
  public subscribe(domain: string, callback: InvalidationCallback): () => void {
    if (!this.listeners.has(domain)) {
      this.listeners.set(domain, new Set());
    }
    this.listeners.get(domain)!.add(callback);

    return () => {
      const set = this.listeners.get(domain);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(domain);
        }
      }
    };
  }

  /**
   * Subscribe to cache invalidation events across multiple domains at once.
   */
  public subscribeMany(domains: string[], callback: InvalidationCallback): () => void {
    const unsubs = domains.map((d) => this.subscribe(d, callback));
    return () => unsubs.forEach((u) => u());
  }

  /**
   * Emit an invalidation event. This flushes local hook listeners AND broadcasts to all tabs.
   */
  public invalidate(domain: string, payload?: any): void {
    // 1. Notify current window listeners immediately
    this.notifyLocal(domain, payload);

    // 2. Broadcast to other open tabs
    if (typeof window !== "undefined") {
      try {
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage({ domain, payload, timestamp: Date.now() });
        } else {
          localStorage.setItem(
            "sm_cache_sync_event",
            JSON.stringify({ domain, payload, timestamp: Date.now() })
          );
        }
      } catch {}
    }
  }
}

export const cacheSync = new CacheSyncBus();

/**
   Helper to invalidate a specific cache domain
 */
export function invalidateCache(domain: string, payload?: any) {
  cacheSync.invalidate(domain, payload);
}
