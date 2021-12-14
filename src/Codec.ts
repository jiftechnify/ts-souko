import { fold } from 'fp-ts/Either';
import { Errors, Type as IoTsType } from 'io-ts';
import { assert as assertBySS, Struct as SSStruct } from 'superstruct';
import { ZodType } from 'zod';

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
  jsonWithIoTs: <T>(iots: IoTsType<T>) => Codec<T>;
  jsonWithSuperstruct: <T>(ss: SSStruct<T>) => Codec<T>;
  jsonWithZod: <T>(zod: ZodType<T>) => Codec<T>;
};

// Codec for type `T` that encodes to/decodes from JSON string, with runtime validation on decoding.
const jsonStrCodecWithValidation = <T>(validatorName: string, validate: (p: unknown) => T): Codec<T> => {
  return {
    encode: (t: T) => JSON.stringify(t),
    decode: (s: string) => {
      const parsed = JSON.parse(s) as unknown;
      return validateParsedJSON(validatorName, validate, parsed);
    },
  };
};

// validate `parsed` with `validate`(validation logic). `validate` must throw error if validation is failed.
const validateParsedJSON = <T>(validatorName: string, validate: (p: unknown) => T, parsed: unknown): T => {
  try {
    return validate(parsed);
  } catch (e) {
    throw new Error(`${validatorName} validation error: ${e}`);
  }
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
   * Codec for type `T` that encodes to/decodes from JSON string, with validation on decoding powered by [io-ts](https://gcanti.github.io/io-ts/).
   *
   * @param iots value of io-ts `Type<T>` that is used to validate value parsed from JSON.
   */
  jsonWithIoTs: <T>(iots: IoTsType<T>) => {
    return Object.freeze(
      jsonStrCodecWithValidation('io-ts', (parsed: unknown) => {
        const validated = iots.decode(parsed);
        return fold(
          // onLeft
          (e: Errors) => {
            throw new Error(`io-ts validation error: ${e}`);
          },
          // onRight
          (t: T) => t
        )(validated);
      })
    );
  },
  /**
   * Codec for type `T` that encodes to/decodes from JSON string, with validation on decoding powered by [superstruct](https://docs.superstructjs.org/).
   *
   * @param ss value of superstruct `Struct<T>` that is used to validate value parsed from JSON.
   */
  jsonWithSuperstruct: <T>(ss: SSStruct<T>) => {
    return Object.freeze(
      jsonStrCodecWithValidation('superstruct', (parsed: unknown) => {
        assertBySS(parsed, ss);
        return parsed;
      })
    );
  },
  /**
   * Codec for type `T` that encodes to/decodes from JSON string, with validation on decoding powered by [zod](https://github.com/colinhacks/zod#readme).
   *
   * @param zod value of `ZodType<T>`("schema" object) that is used to validate value parsed from JSON.
   */
  jsonWithZod: <T>(zod: ZodType<T>) => {
    return Object.freeze(
      jsonStrCodecWithValidation('zod', (parsed: unknown) => {
        return zod.parse(parsed);
      })
    );
  },
});
