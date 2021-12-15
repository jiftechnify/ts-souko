import * as t from 'io-ts';
import * as ss from 'superstruct';
import { z } from 'zod';
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
});

describe('codecs.bigint', () => {
  test('encode-then-decode preserves value', () => {
    const cases = [BigInt(1), BigInt(0), BigInt(-1), BigInt('9007199254740992'), BigInt('9007199254740992')];
    for (const c of cases) {
      const encoded = codecs.bigint.encode(c);
      expect(codecs.bigint.decode(encoded)).toEqual(c);
    }
  });
  test('throws error if decode a string not parsable as bigint', () => {
    const cases = ['1n', '0.0', 'true', 'false', '[]', '{}', 'null', 'undefined'];
    for (const c of cases) {
      expect(() => {
        codecs.bigint.decode(c);
      }).toThrow();
    }
  });
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

describe('codecs.jsonWithIoTs', () => {
  const User = t.type({
    userId: t.number,
    name: t.string,
  });
  type User = t.TypeOf<typeof User>;

  const userCodec = codecs.jsonWithIoTs(User);

  test('encode-then-decode value of correct type', () => {
    const u: User = { userId: 100, name: 'John' };
    const encoded = userCodec.encode(u);
    expect(encoded).toEqual(JSON.stringify(u));

    const decoded = userCodec.decode(encoded);
    expect(decoded).toEqual(u);
  });

  test('decoding invalid JSON throws error', () => {
    const cases = [{ foo: 100, bar: 'John' }, { name: 'Alice' }, { userId: '100', name: 'John' }];
    for (const c of cases) {
      expect(() => {
        userCodec.decode(JSON.stringify(c));
      }).toThrow();
    }
  });
});

describe('codecs.jsonWithSuperstruct', () => {
  const User = ss.object({
    userId: ss.number(),
    name: ss.string(),
  });
  type User = ss.Infer<typeof User>;

  const userCodec = codecs.jsonWithSuperstruct(User);

  test('encode-then-decode value of correct type', () => {
    const u: User = { userId: 100, name: 'John' };
    const encoded = userCodec.encode(u);
    expect(encoded).toEqual(JSON.stringify(u));

    const decoded = userCodec.decode(encoded);
    expect(decoded).toEqual(u);
  });

  test('decoding invalid JSON throws error', () => {
    const cases = [{ foo: 100, bar: 'John' }, { name: 'Alice' }, { userId: '100', name: 'John' }];
    for (const c of cases) {
      expect(() => {
        userCodec.decode(JSON.stringify(c));
      }).toThrow();
    }
  });
});

describe('codecs.jsonWithZod', () => {
  const User = z.object({
    userId: z.number(),
    name: z.string(),
  });
  type User = z.infer<typeof User>;

  const userCodec = codecs.jsonWithZod(User);

  test('encode-then-decode value of correct type', () => {
    const u: User = { userId: 100, name: 'John' };
    const encoded = userCodec.encode(u);
    expect(encoded).toEqual(JSON.stringify(u));

    const decoded = userCodec.decode(encoded);
    expect(decoded).toEqual(u);
  });

  test('decoding invalid JSON throws error', () => {
    const cases = [{ foo: 100, bar: 'John' }, { name: 'Alice' }, { userId: '100', name: 'John' }];
    for (const c of cases) {
      expect(() => {
        userCodec.decode(JSON.stringify(c));
      }).toThrow();
    }
  });
});
