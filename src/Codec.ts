/**
 * Describes the way to convert a value to a string back and forth.
 */
export interface Codec<T> {
  /**
   * Convert a value of type `T` to its string representation.
   */
  encode: (t: T) => string;

  /**
   * Convert a string to the value of type `T` that is represented by the input.
   *
   * Should throw error when the input is decodable as type `T`.
   */
  decode: (s: string) => T;
}

export const codecs = {
  /**
   * Codec for `string`.
   */
  string: {
    encode: (s: string) => s,
    decode: (s: string) => s,
  },
  /**
   * Codec for `number`. `decode` throws when input doesn't represents a number.
   */
  number: {
    encode: (n: number) => (Object.is(n, -0) ? '-0' : n.toString()), // (-0).toString() doesn't preserve the negative sign!
    decode: (s: string) => {
      if (s === 'NaN') {
        return NaN;
      }
      const n = Number(s);
      if (isNaN(n)) {
        throw new Error(`input '${s}' is not decodable as number`);
      }
      return n;
    },
  },
  /**
   * Codec for `boolean`. `decode` throws when input doesn't represents a boolean.
   */
  boolean: {
    encode: (b: boolean) => JSON.stringify(b),
    decode: (s: string) => {
      let parsed: unknown;

      try {
        parsed = JSON.parse(s) as unknown;
      } catch (e) {
        throw new Error(`input '${s}' is not decodable as boolean`);
      }
      if (typeof parsed !== 'boolean') {
        throw new Error(`input '${s}' is not decodable as boolean`);
      }
      return parsed;
    },
  },
  /**
   * Codec for array of values of single type `T`.
   *
   * @param elemCodec Codec for elements of the array.
   */
  arrayOf: <T>(elemCodec: Codec<T>) => {
    return {
      encode: (arr: T[]) => JSON.stringify(arr.map(el => elemCodec.encode(el))),
      decode: (s: string) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(s) as unknown;
        } catch (e) {
          throw new Error(`input '${s}' is not decodable as array`);
        }
        if (!Array.isArray(parsed)) {
          throw new Error(`input '${s}' is not decodable as array`);
        }
        if (!parsed.every(el => typeof el === 'string')) {
          throw new Error(`input '${s}' is not decodable as array`);
        }
        try {
          return parsed.map(el => elemCodec.decode(el));
        } catch (e) {
          throw new Error(`input '${s}' is not decodable as array of specified type`);
        }
      },
    };
  },
};
