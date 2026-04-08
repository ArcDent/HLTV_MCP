interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  getStale<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    return entry?.value;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const ttlMs = Math.max(ttlSeconds, 1) * 1_000;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  clear(): void {
    this.store.clear();
  }
}
