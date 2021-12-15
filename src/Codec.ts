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
   * Should throw error when the input is not decodable as type `T`.
   */
  decode: (s: string) => T;
}

type BuiltinCodecsType = {
  string: Codec<string>;
  number: Codec<number>;
  bigint: Codec<bigint>;
  boolean: Codec<boolean>;
  arrayOf: <T>(elemCodec: Codec<T>) => Codec<T[]>;

  jsonWithValidation: <T>(validate: (p: unknown) => T, validatorName?: string) => Codec<T>;
  jsonWithIoTs: <T>(iots: IoTsType<T>) => Codec<T>;
  jsonWithSuperstruct: <T>(ss: SSStruct<T>) => Codec<T>;
  jsonWithZod: <T>(zod: ZodType<T>) => Codec<T>;
};

const decodeError = (input: string, typeName: string) => {
  return new Error(`input '${input}' is not decodable as ${typeName}`);
};

// Codec for type `T` that encodes to/decodes from JSON string, with runtime validation on decoding.
const jsonStrCodecWithValidation = <T>(validate: (p: unknown) => T, validatorName?: string): Codec<T> => {
  return {
    encode: (t: T) => JSON.stringify(t),
    decode: (s: string) => {
      const parsed = JSON.parse(s) as unknown;
      return validateParsedJSON(validate, parsed, validatorName);
    },
  };
};

// validate `parsed` with `validate`(validation logic). `validate` must throw error if validation is failed.
const validateParsedJSON = <T>(validate: (p: unknown) => T, parsed: unknown, validatorName?: string): T => {
  try {
    return validate(parsed);
  } catch (e) {
    let errMsg = `validation error: ${e}`;
    if (validatorName !== '') {
      errMsg = `${validatorName} ${errMsg}`;
    }
    throw new Error(errMsg);
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
   * Codec for `number`. `decode` throws when input doesn't represent a number.
   */
  number: Object.freeze({
    encode: (n: number) => (Object.is(n, -0) ? '-0' : n.toString()), // (-0).toString() doesn't preserve the negative sign!
    decode: (s: string) => {
      if (s === 'NaN') {
        return NaN;
      }
      const n = Number(s);
      if (isNaN(n)) {
        throw decodeError(s, 'number');
      }
      return n;
    },
  }),
  /**
   * Codec for 'bigint'. `decode` throws when input doesn't represent a bigint value.
   */
  bigint: Object.freeze({
    encode: (n: bigint) => n.toString(),
    decode: (s: string) => {
      try {
        return BigInt(s);
      } catch {
        throw decodeError(s, 'bigint');
      }
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
        throw decodeError(s, 'boolean');
      }
      if (typeof parsed !== 'boolean') {
        throw decodeError(s, 'boolean');
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
          throw decodeError(s, 'array');
        }
        if (!Array.isArray(parsed)) {
          throw decodeError(s, 'array');
        }
        if (!parsed.every(el => typeof el === 'string')) {
          throw decodeError(s, 'array');
        }
        try {
          return parsed.map(el => elemCodec.decode(el));
        } catch (e) {
          throw decodeError(s, 'array of specified type');
        }
      },
    });
  },

  /**
   * Codec for type `T` that encodes to/decodes from JSON string, with runtime validation on decoding.
   *
   * @param validate Runtime validation logic. It should throw error if the value passed didn't have expected type(`T`).
   * @param validatorName Optional. Name of validator that will be shown in validation error.
   */
  jsonWithValidation: <T>(validate: (parsed: unknown) => T, validatorName?: string) => {
    return Object.freeze(jsonStrCodecWithValidation(validate, validatorName));
  },
  /**
   * Codec for type `T` that encodes to/decodes from JSON string, with validation on decoding powered by [io-ts](https://gcanti.github.io/io-ts/).
   *
   * @param iots value of io-ts `Type<T>` that is used to validate value parsed from JSON.
   */
  jsonWithIoTs: <T>(iots: IoTsType<T>) => {
    return Object.freeze(
      jsonStrCodecWithValidation((parsed: unknown) => {
        const validated = iots.decode(parsed);
        return fold(
          // onLeft
          (e: Errors) => {
            throw e;
          },
          // onRight
          (t: T) => t
        )(validated);
      }, 'io-ts')
    );
  },
  /**
   * Codec for type `T` that encodes to/decodes from JSON string, with validation on decoding powered by [superstruct](https://docs.superstructjs.org/).
   *
   * @param ss value of superstruct `Struct<T>` that is used to validate value parsed from JSON.
   */
  jsonWithSuperstruct: <T>(ss: SSStruct<T>) => {
    return Object.freeze(
      jsonStrCodecWithValidation((parsed: unknown) => {
        assertBySS(parsed, ss);
        return parsed;
      }, 'superstruct')
    );
  },
  /**
   * Codec for type `T` that encodes to/decodes from JSON string, with validation on decoding powered by [zod](https://github.com/colinhacks/zod#readme).
   *
   * @param zod value of `ZodType<T>`("schema" object) that is used to validate value parsed from JSON.
   */
  jsonWithZod: <T>(zod: ZodType<T>) => {
    return Object.freeze(
      jsonStrCodecWithValidation((parsed: unknown) => {
        return zod.parse(parsed);
      }, 'zod')
    );
  },
});
