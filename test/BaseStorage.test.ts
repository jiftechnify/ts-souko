import { baseStorages } from '../src/BaseStorage';

describe('inMemoryStorage', () => {
  describe('get/set', () => {
    test('get retrieves the value which is associated with a key via set', () => {
      baseStorages.inMemory.set('foo', 'some_value');
      const v = baseStorages.inMemory.get('foo');
      expect(v).toEqual('some_value');

      // clean up
      baseStorages.inMemory.remove('foo');
    });
    test("get returns null when key doesn't exist in storage", () => {
      const v = baseStorages.inMemory.get('nothing');
      expect(v).toBeNull();
    });
  });
  describe('remove', () => {
    test('removes the specified key from the storage', () => {
      baseStorages.inMemory.set('foo', 'value');
      baseStorages.inMemory.set('bar', 'value');
      expect(baseStorages.inMemory.get('foo')).not.toBeNull();
      expect(baseStorages.inMemory.get('bar')).not.toBeNull();

      baseStorages.inMemory.remove('foo');
      expect(baseStorages.inMemory.get('foo')).toBeNull();
      expect(baseStorages.inMemory.get('bar')).not.toBeNull();

      // clean up
      baseStorages.inMemory.remove('bar');
    });
  });
});
