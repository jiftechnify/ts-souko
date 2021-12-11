import { BaseStorage } from './BaseStorage';
import { Codec } from './Codec';

type StorageCodecSpec = Record<string, Codec<any>>;

type StorageKeys<Spec extends StorageCodecSpec> = {
  [K in keyof Spec]: K extends string ? K : never;
}[keyof Spec];

type StorageValTypeOf<Spec extends StorageCodecSpec, K extends StorageKeys<Spec>> = Spec[K] extends Codec<infer T>
  ? T
  : never;

export class TypedStorage<Spec extends StorageCodecSpec> {
  #keyToCodec: Record<string, unknown>;
  #baseStorage: BaseStorage;

  constructor(keyToCodec: Spec, baseStorage: BaseStorage) {
    this.#keyToCodec = Object.freeze(keyToCodec);
    this.#baseStorage = baseStorage;
  }

  public get<K extends StorageKeys<Spec>>(key: K): StorageValTypeOf<Spec, K> | null {
    try {
      const rawVal = this.#baseStorage.get(key);
      if (rawVal === null) {
        return null;
      }
      const codec = this.#keyToCodec[key] as unknown as Codec<StorageValTypeOf<Spec, K>>;
      return codec.decode(rawVal);
    } catch (e) {
      throw errorWithCause('failed to get data from storage', e);
    }
  }

  public set<K extends StorageKeys<Spec>>(key: K, value: StorageValTypeOf<Spec, K>): void {
    const codec = this.#keyToCodec[key] as unknown as Codec<StorageValTypeOf<Spec, K>>;
    const encoded = codec.encode(value);
    try {
      return this.#baseStorage.set(key, encoded);
    } catch (e) {
      throw errorWithCause('failed to set data to storage', e);
    }
  }

  public remove(key: StorageKeys<Spec>): void {
    try {
      return this.#baseStorage.remove(key);
    } catch (e) {
      throw errorWithCause('failed to remove data from storage', e);
    }
  }

  public clear(): void {
    try {
      return this.#baseStorage.clear();
    } catch (e) {
      throw errorWithCause('failed to clear storage', e);
    }
  }
}

const errorWithCause = (msg: string, errCause: unknown): Error => {
  if (hasStringMessage(errCause)) {
    return Error(`${msg}: ${errCause.message}`);
  }
  return Error(msg);
};

const hasStringMessage = (v: unknown): v is { message: string } => {
  if (typeof v !== 'object') {
    return false;
  }
  if (!Object.keys(v ?? {}).includes('message')) {
    return false;
  }
  return typeof (v as { message: unknown }).message === 'string';
};
