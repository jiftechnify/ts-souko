/**
 * Prescribes a common interface of string-value KVS.
 */
export interface BaseStorage {
  /**
   * Retrieves the value associated with the specified `key`.
   *
   * Returns `null` if the key is not found.
   *
   * @param key key to retrieve
   */
  get(key: string): string | null;

  /**
   * Associates the `value` with the `key`, then store the key-value pair.
   *
   * @param key key to store
   * @param value value to be associated with `key`
   */
  set(key: string, value: string): void;

  /**
   * Removes the `key` and its value.
   *
   * @param key key to remove
   */
  remove(key: string): void;

  /**
   * Removes all keys in the storage.
   */
  clear(): void;
}

const createInMemoryStorage = (): BaseStorage => {
  const m = new Map<string, string>();

  return {
    get(key: string) {
      return m.get(key) ?? null;
    },
    set(key: string, value: string) {
      m.set(key, value);
    },
    remove(key: string) {
      m.delete(key);
    },
    clear() {
      m.clear();
    },
  };
};

export const baseStorage = {
  /** `localStorage` of Web API. */
  webLocal: {
    get: localStorage.getItem,
    set: localStorage.setItem,
    remove: localStorage.removeItem,
    clear: localStorage.clear,
  },
  /** `sessionStorage` of Web API. */
  webSession: {
    get: sessionStorage.getItem,
    set: sessionStorage.setItem,
    remove: sessionStorage.removeItem,
    clear: sessionStorage.clear,
  },
  /** In-memory storage. */
  inMemory: createInMemoryStorage(),
};
