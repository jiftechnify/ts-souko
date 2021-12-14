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
  };
};

type BuiltinBaseStorages = {
  webLocal: BaseStorage;
  webSession: BaseStorage;
  inMemory: BaseStorage;
  inMemoryScoped: () => BaseStorage;
};

export const baseStorages: BuiltinBaseStorages = Object.freeze({
  /** `localStorage` of Web API. */
  webLocal: Object.freeze({
    get: (k: string) => localStorage.getItem(k),
    set: (k: string, v: string) => localStorage.setItem(k, v),
    remove: (k: string) => localStorage.removeItem(k),
  }),
  /** `sessionStorage` of Web API. */
  webSession: Object.freeze({
    get: (k: string) => sessionStorage.getItem(k),
    set: (k: string, v: string) => sessionStorage.setItem(k, v),
    remove: (k: string) => sessionStorage.removeItem(k),
  }),
  /** In-memory storage. */
  inMemory: Object.freeze(createInMemoryStorage()),
  /** Creates *scoped* in-memory storage instance. Every instance has separate key space.  */
  inMemoryScoped: () => Object.freeze(createInMemoryStorage()),
});
