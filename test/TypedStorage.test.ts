import { baseStorages } from '../src/BaseStorage';
import { codecs } from '../src/Codec';
import { createTypedStorage } from '../src/TypedStorage';

describe('TypedStorage', () => {
  describe('get/set', () => {
    const ts = createTypedStorage({ key: codecs.number, nothing: codecs.string }, { base: baseStorages.inMemory });

    afterAll(() => {
      ts.remove('key');
      ts.remove('nothing');
    });

    test('get retrieves the value which is associated with a key via set', () => {
      ts.set('key', 100);
      expect(ts.get('key')).toEqual(100);
    });
    test("get returns null when key does't exist in storage", () => {
      expect(ts.get('nothing')).toBeNull();
    });
    test('get throws when internal Codec.encode throws', () => {
      baseStorages.inMemory.set('key', 'bad_data'); // setting non-number value directry not using TypedStorage!
      expect(() => ts.get('key')).toThrow();
    });
  });
  describe('remove', () => {
    const ts = createTypedStorage({ key1: codecs.number, key2: codecs.number }, { base: baseStorages.inMemory });

    afterAll(() => {
      ts.remove('key1');
      ts.remove('key2');
    });

    test('removes the specified key from storage', () => {
      ts.set('key1', 1);
      ts.set('key2', 2);
      expect(ts.get('key1')).not.toBeNull();
      expect(ts.get('key2')).not.toBeNull();

      ts.remove('key1');
      expect(ts.get('key1')).toBeNull();
      expect(ts.get('key2')).not.toBeNull();
    });
  });

  describe('storage with prefix', () => {
    const ts = createTypedStorage({ key: codecs.number }, { base: baseStorages.inMemory, keyPrefix: 'pre_' });

    afterAll(() => {
      ts.remove('key');
    });

    test('keys are prefixed internally', () => {
      ts.set('key', 1);
      expect(ts.get('key')).toEqual(1);

      // check if key is prefixed internally
      expect(baseStorages.inMemory.get('pre_key')).not.toBeNull();
      expect(baseStorages.inMemory.get('key')).toBeNull();
    });
  });
});
