import { BaseStorage } from './BaseStorage';
import { Codec } from './Codec';

type StorageCodecSpec = Record<string, Codec<any>>;

type StorageKeys<Spec extends StorageCodecSpec> = {
  [K in keyof Spec]: K extends string ? K : never;
}[keyof Spec];

type StorageValTypeOf<Spec extends StorageCodecSpec, K extends StorageKeys<Spec>> = Spec[K] extends Codec<infer T>
  ? T
  : never;

type TypedStorage<Spec extends StorageCodecSpec> = {
  get<K extends StorageKeys<Spec>>(key: K): StorageValTypeOf<Spec, K> | null;
  set<K extends StorageKeys<Spec>>(key: K, value: StorageValTypeOf<Spec, K>): void;
  remove(key: StorageKeys<Spec>): void;
};

export interface TypedStorageOptions {
  base: BaseStorage;
  keyPrefix?: string;
}

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
