import { fold } from 'fp-ts/lib/Either';
import { Errors, Type as IoTsType } from 'io-ts';

/**
 * Describes the way to convert a value to a string back and forth.
 *
 * You should implement `encode` and `decode` to ensure that they satisfy the rule: `decode(encode(x)) === x`.
 */
export interface Codec<T> {
  /**
   * Converts a value of type `T` to its string representation.
   */
  encode: (t: T) => string;

  /**
   * Converts a string to the value of type `T` that is represented by the input.
   *
   * Should throw error when the input is decodable as type `T`.
   */
  decode: (s: string) => T;
}

type BuiltinCodecsType = {
  string: Codec<string>;
  number: Codec<number>;
  boolean: Codec<boolean>;
  arrayOf: <T>(elemCodec: Codec<T>) => Codec<T[]>;
  fromIoTs: <T>(iots: IoTsType<T, string, string>) => Codec<T>;
};

export const codecs: BuiltinCodecsType = Object.freeze({
  /**
   * Codec for `string`.
   */
  string: Object.freeze({
    encode: (s: string) => s,
    decode: (s: string) => s,
  }),
  /**
   * Codec for `number`. `decode` throws when input doesn't represents a number.
   */
  number: Object.freeze({
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
  }),
  /**
   * Codec for `boolean`. `decode` throws when input doesn't represents a boolean.
   */
  boolean: Object.freeze({
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
  }),
  /**
   * Codec for array of values of single type `T`.
   *
   * @param elemCodec Codec for elements of the array.
   */
  arrayOf: <T>(elemCodec: Codec<T>) => {
    return Object.freeze({
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
    });
  },
  /**
   * Creates `Codec<T>` from `Type<T, string, string>` in [io-ts](https://gcanti.github.io/io-ts/).
   *
   * @param iots value of io-ts `Type`.
   */
  fromIoTs: <T>(iots: IoTsType<T, string, string>) => {
    return Object.freeze({
      encode: (t: T) => iots.encode(t),
      decode: (s: string) => {
        const v = iots.decode(s);
        const onLeft = (e: Errors) => {
          throw new Error(`io-ts validation error: ${e}`);
        };
        const onRight = (t: T) => t;
        return fold(onLeft, onRight)(v);
      },
    });
  },
});
