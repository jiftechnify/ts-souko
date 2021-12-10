import { codecs } from '../src/Codec';

describe('codecs.string', () => {
  test('encode', () => {
    const cases = ['string', ''];
    for (const c of cases) {
      expect(codecs.string.encode(c)).toEqual(c);
    }
  });
  test('decode', () => {
    const cases = ['string', ''];
    for (const c of cases) {
      expect(codecs.string.decode(c)).toEqual(c);
    }
  });
});

describe('codecs.number', () => {
  test('encode-then-decode preserves value (integer)', () => {
    const cases = [1, -1, 0, +0, -0, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
    for (const c of cases) {
      const encoded = codecs.number.encode(c);
      expect(codecs.number.decode(encoded)).toEqual(c);
    }
  });
  test('encode-then-decode preserves value (float)', () => {
    const cases = [
      123.456,
      -987.654,
      0.1 + 0.2,
      Number.MAX_VALUE,
      Number.MIN_VALUE,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NaN,
    ];
    for (const c of cases) {
      const encoded = codecs.number.encode(c);
      expect(codecs.number.decode(encoded)).toEqual(c);
    }
  });
  test('throws error if decode a string not parsable as number', () => {
    const cases = ['not a number', 'true', 'false', '[]', '{}', 'null', 'undefined'];
    for (const c of cases) {
      expect(() => {
        codecs.number.decode(c);
      }).toThrow();
    }
  });

  describe('codecs.boolean', () => {
    test('encode-then-decode preserves value', () => {
      const cases = [true, false];
      for (const c of cases) {
        const encoded = codecs.boolean.encode(c);
        expect(codecs.boolean.decode(encoded)).toEqual(c);
      }
    });
    test('throws error if decode a string not parsable as boolean', () => {
      const cases = ['1', '0', 'hoge', 'yes', 'no', '[]', '{}', 'null', 'undefined'];
      for (const c of cases) {
        expect(() => {
          codecs.boolean.decode(c);
        }).toThrow();
      }
    });
  });

  describe('codecs.arrayOf', () => {
    test('encode-then-decode preserves array of number', () => {
      const numArrayCodec = codecs.arrayOf(codecs.number);
      const arr = [1, -1, 0, -0, Number.MAX_SAFE_INTEGER, 123.4, 0.1 + 0.2, Number.POSITIVE_INFINITY];

      const encoded = numArrayCodec.encode(arr);
      expect(numArrayCodec.decode(encoded)).toEqual(arr);
    });
    test('throws error when decoding a string not parsable as array', () => {
      const arrayCodec = codecs.arrayOf(codecs.string);
      const cases = ['str', '1', 'true', '{"a":1,"b":2}', ':not-a-json:', 'null'];

      for (const c of cases) {
        expect(() => {
          arrayCodec.decode(c);
        }).toThrow('is not decodable as array');
      }
    });
    test('throws error when decoding a string parsable as array but some element is not decodable by inner codec', () => {
      const boolArrayCodec = codecs.arrayOf(codecs.boolean);
      const input = '["true", "false", "1"]';

      expect(() => {
        boolArrayCodec.decode(input);
      }).toThrow('is not decodable as array of specified type');
    });
  });
});
