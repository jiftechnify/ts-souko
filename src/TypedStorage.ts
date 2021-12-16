import { AsyncBaseStorage, BaseStorage } from './BaseStorage';
import { Codec } from './Codec';

/* auxiliary types / type functions for defining `TypedStorage` I/F */
// An object consists of "key to `Codec` for its value".
// `Codec<any>` means "some `Codec<T>`".
type StorageCodecSpec = Record<string, Codec<any>>;

// Set of string keys in `Spec` (concrete type that satisfies `StorageCodecSpec`), i.e. set of available keys of the storage wrapper.
// `keyof Spec` is inferred as `string | number | symbol` due to [a change in TS 2.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-9.html#support-number-and-symbol-named-properties-with-keyof-and-mapped-types),
// so excluding `number | symbol` possibility here.
type StorageKeys<Spec extends StorageCodecSpec> = Extract<keyof Spec, string>;

// Type of value for specific key `K` in a storage that has `Spec`.
type StorageValTypeOf<Spec extends StorageCodecSpec, K extends StorageKeys<Spec>> = Spec[K] extends Codec<infer T>
  ? T
  : never;

/**
 * Interface of strongly typed storage wrapper.
 */
type TypedStorage<Spec extends StorageCodecSpec> = {
  /**
   * Retrieves a value associated with the `key` from the underlying storage (with decoding).
   *
   * Returns `null` if value is not associated.
   */
  get<K extends StorageKeys<Spec>>(key: K): StorageValTypeOf<Spec, K> | null;

  /**
   * Associates the `key` with the `value` and saves the key-value pair in the underlying storage (with encoding).
   */
  set<K extends StorageKeys<Spec>>(key: K, value: StorageValTypeOf<Spec, K>): void;

  /**
   * Removes the `key` and the value with it from the underlying storage.
   */
  remove(key: StorageKeys<Spec>): void;
};

/**
 * Options for `TypedStorage`.
 */
export interface TypedStorageOptions {
  /**
   * {@linkcode BaseStorage} implementation used by typed wrapper.
   */
  base: BaseStorage;

  /**
   * If this option is set, every key will be prefixed by `${keyPrefix}_` *internally* (in BaseStorage level).
   *
   * Can be used for namespacing a *singleton* storage (e.g. localStorage/sessionStorage).
   */
  keyPrefix?: string;
}

/**
 * Creates a `TypedStorage`, typed storage wrapper.
 *
 * @example
 * ```
 * import { createTypedStorage, codecs, baseStorages } from 'ts-souko';
 *
 * // create typed wrapper for LocalStorage
 * const storage = createTypedStorage({
 *   id: codecs.number,
 *   name: codecs.string,
 * }, { base: baseStorages.webLocal } );
 *
 * storage.set('id', 100);       // OK
 * storage.set('name', 'Alice'); // OK
 * storage.set('id', 'nan');     // type error!
 * storage.set('name', 0);       // type error!
 *
 * storage.get('id');   // number | null
 * storage.get('name'); // string | null
 * ```
 *
 * @param spec an object consists of "key to `Codec` for its value" pairs, specifies value's type for each key.
 * @param options options for `TypedStorage`.
 */
export const createTypedStorage = <Spec extends StorageCodecSpec>(
  spec: Spec,
  { base, keyPrefix: prefix }: TypedStorageOptions
): TypedStorage<Spec> => {
  const keyToCodec = spec;
  const baseStrg = base;

  const prefixed = (key: string) => {
    if (prefix === undefined) {
      return key;
    }
    return `${prefix}_${key}`;
  };

  return Object.freeze({
    get<K extends StorageKeys<Spec>>(key: K): StorageValTypeOf<Spec, K> | null {
      try {
        const rawVal = baseStrg.get(prefixed(key));
        if (rawVal === null) {
          return null;
        }
        const codec = keyToCodec[key] as Codec<StorageValTypeOf<Spec, K>>;
        return codec.decode(rawVal);
      } catch (e) {
        throw errorWithCause(`failed to get value from storage (key: '${key}')`, e);
      }
    },
    set<K extends StorageKeys<Spec>>(key: K, value: StorageValTypeOf<Spec, K>): void {
      try {
        const codec = keyToCodec[key] as Codec<StorageValTypeOf<Spec, K>>;
        const encoded = codec.encode(value);
        baseStrg.set(prefixed(key), encoded);
      } catch (e) {
        throw errorWithCause(`failed to set value from storage (key: '${key}')`, e);
      }
    },
    remove(key: StorageKeys<Spec>): void {
      try {
        baseStrg.remove(prefixed(key));
      } catch (e) {
        throw errorWithCause(`failed to remove value from storage (key : '${key}')`, e);
      }
    },
  });
};

/**
 * Interface of asynchronous strongly typed storage wrapper.
 */
type AsyncTypedStorage<Spec extends StorageCodecSpec> = {
  /**
   * Retrieves a value associated with the `key` from the underlying storage (with decoding) asynchronously.
   *
   * Returns `null` if value is not associated.
   */
  get<K extends StorageKeys<Spec>>(key: K): Promise<StorageValTypeOf<Spec, K> | null>;

  /**
   * Associates the `key` with the `value` and saves the key-value pair in the underlying storage (with encoding) asynchronously.
   */
  set<K extends StorageKeys<Spec>>(key: K, value: StorageValTypeOf<Spec, K>): Promise<void>;

  /**
   * Removes the `key` and the value with it from the underlying storage asynchronously.
   */
  remove(key: StorageKeys<Spec>): Promise<void>;
};

/**
 * Options for `TypedStorage`.
 */
export interface AsyncTypedStorageOptions {
  /**
   * {@linkcode AsyncBaseStorage} implementation used by typed wrapper.
   */
  base: AsyncBaseStorage;

  /**
   * If this option is set, every key will be prefixed by `${keyPrefix}_` *internally* (in BaseStorage level).
   *
   * Can be used for namespacing *singleton* storage (e.g. localStorage/sessionStorage).
   */
  keyPrefix?: string;
}

/**
 * Creates a `AsyncTypedStorage`, typed wrapper for asynchronous storage.
 *
 * @example
 * ```
 * import { createAsyncTypedStorage, codecs, AsyncBaseStorage } from 'ts-souko';
 *
 * // async string value storage
 * const asyncBase: AsyncBaseStorage = ...;
 *
 * // create typed wrapper for `asyncBase`
 * const storage = createAsyncTypedStorage({
 *   id: codecs.number,
 *   name: codecs.string,
 * }, { base: asyncBase } );
 *
 * async () => {
 *   await storage.set('id', 100);       // OK
 *   await storage.set('name', 'Alice'); // OK
 *   await storage.set('id', 'nan');     // type error!
 *   await storage.set('name', 0);       // type error!
 *
 *   const i = await storage.get('id');   // number | null
 *   const n = await storage.get('name'); // string | null
 * }
 * ```
 *
 * @param spec an object consists of "key to `Codec` for its value" pairs, specifies value's type for each key.
 * @param options options for `AsyncTypedStorage`.
 */
export const createAsyncTypedStorage = <Spec extends StorageCodecSpec>(
  spec: Spec,
  { base, keyPrefix: prefix }: AsyncTypedStorageOptions
): AsyncTypedStorage<Spec> => {
  const keyToCodec = spec;
  const baseStrg = base;

  const prefixed = (key: string) => {
    if (prefix === undefined) {
      return key;
    }
    return `${prefix}_${key}`;
  };

  return Object.freeze({
    async get<K extends StorageKeys<Spec>>(key: K): Promise<StorageValTypeOf<Spec, K> | null> {
      try {
        const rawVal = await baseStrg.get(prefixed(key));
        if (rawVal === null) {
          return null;
        }
        const codec = keyToCodec[key] as Codec<StorageValTypeOf<Spec, K>>;
        return codec.decode(rawVal);
      } catch (e) {
        throw errorWithCause(`failed to get value from storage (key: '${key}')`, e);
      }
    },
    async set<K extends StorageKeys<Spec>>(key: K, value: StorageValTypeOf<Spec, K>): Promise<void> {
      try {
        const codec = keyToCodec[key] as Codec<StorageValTypeOf<Spec, K>>;
        const encoded = codec.encode(value);
        await baseStrg.set(prefixed(key), encoded);
      } catch (e) {
        throw errorWithCause(`failed to set value from storage (key: '${key}')`, e);
      }
    },
    async remove(key: StorageKeys<Spec>): Promise<void> {
      try {
        await baseStrg.remove(prefixed(key));
      } catch (e) {
        throw errorWithCause(`failed to remove value from storage (key : '${key}')`, e);
      }
    },
  });
};

/* error utils */
const errorWithCause = (msg: string, errCause: unknown): Error => {
  if (hasStringMessage(errCause)) {
    return Error(`${msg}: ${errCause.message}`);
  }
  return Error(msg);
};

const hasStringMessage = (v: unknown): v is { message: string } => {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  if (!Object.keys(v).includes('message')) {
    return false;
  }
  return typeof (v as { message: unknown }).message === 'string';
};
