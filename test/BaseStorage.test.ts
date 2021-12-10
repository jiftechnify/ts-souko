import { baseStorage } from '../src/BaseStorage';

beforeAll(() => {
  baseStorage.inMemory.clear();
});

describe('inMemoryStorage', () => {
  describe('get/set', () => {
    test('get retrieves the value which is associated with a key via set', () => {
      baseStorage.inMemory.set('foo', 'some_value');
      const v = baseStorage.inMemory.get('foo');
      expect(v).toEqual('some_value');
    });
    test("get returns null when key doesn't exist in storage", () => {
      const v = baseStorage.inMemory.get('nothing');
      expect(v).toBeNull();
    });
  });
  describe('remove', () => {
    test('removes the specified key from the storage', () => {
      baseStorage.inMemory.set('foo', 'value');
      baseStorage.inMemory.set('bar', 'value');
      expect(baseStorage.inMemory.get('foo')).not.toBeNull();
      expect(baseStorage.inMemory.get('bar')).not.toBeNull();

      baseStorage.inMemory.remove('foo');
      expect(baseStorage.inMemory.get('foo')).toBeNull();
      expect(baseStorage.inMemory.get('bar')).not.toBeNull();
    });
  });
  describe('clear', () => {
    test('removes all keys from the storage', () => {
      baseStorage.inMemory.set('foo', 'value');
      baseStorage.inMemory.set('bar', 'value');
      expect(baseStorage.inMemory.get('foo')).not.toBeNull();
      expect(baseStorage.inMemory.get('bar')).not.toBeNull();

      baseStorage.inMemory.clear();
      expect(baseStorage.inMemory.get('foo')).toBeNull();
      expect(baseStorage.inMemory.get('bar')).toBeNull();
    });
  });
});
