import { baseStorages } from '../src/BaseStorage';

describe('baseStorage.inMemory', () => {
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

describe('baseStorages.inMemoryScoped', () => {
  test('every instance has separate key space', () => {
    const s1 = baseStorages.inMemoryScoped();
    const s2 = baseStorages.inMemoryScoped();

    s1.set('key', 'value1');
    s2.set('key', 'value2');

    expect(s1.get('key')).toEqual('value1');
    expect(s2.get('key')).toEqual('value2');
  });
});
