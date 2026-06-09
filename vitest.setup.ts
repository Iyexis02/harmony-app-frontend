// vitest setup — runs before each test file.
//
// jsdom in this setup does not expose a working `localStorage`, so hooks that read
// it (e.g. the `accountDeleted` guard in useMatching) throw in tests. Provide a
// minimal in-memory polyfill ONLY when one is absent, so test files that supply
// their own mock (via vi.stubGlobal) are left untouched. The property stays
// writable/configurable so vi.stubGlobal can still override it.
if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.getItem !== 'function'
) {
  class LocalStorageMock implements Storage {
    private store = new Map<string, string>();

    get length(): number {
      return this.store.size;
    }
    clear(): void {
      this.store.clear();
    }
    getItem(key: string): string | null {
      return this.store.has(key) ? (this.store.get(key) as string) : null;
    }
    key(index: number): string | null {
      return Array.from(this.store.keys())[index] ?? null;
    }
    removeItem(key: string): void {
      this.store.delete(key);
    }
    setItem(key: string, value: string): void {
      this.store.set(key, String(value));
    }
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: new LocalStorageMock(),
    writable: true,
    configurable: true,
  });
}
