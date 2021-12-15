import { fold } from 'fp-ts/Either';
import { Errors, Type as IoTsType } from 'io-ts';
import { Reporter } from 'io-ts/lib/Reporter';
import { PathReporter } from 'io-ts/PathReporter';
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

// auxiliary types for typing `tupleOf` Codec.
type TupleOfCodecs = readonly [...Codec<any>[]];
type TupleOfEachCodecTarget<T extends TupleOfCodecs> = {
  [I in keyof T]: T[I] extends Codec<infer T> ? T : never;
};

type BuiltinCodecsType = {
  string: Codec<string>;
  number: Codec<number>;
  bigint: Codec<bigint>;
  boolean: Codec<boolean>;

  arrayOf: <T>(elemCodec: Codec<T>) => Codec<T[]>;
  tupleOf: <Codecs extends TupleOfCodecs>(elemCodecs: Codecs) => Codec<TupleOfEachCodecTarget<Codecs>>;

  jsonWithValidation: <T>(validate: (p: unknown) => T) => Codec<T>;
  jsonWithIoTs: <T>(iots: IoTsType<T>) => Codec<T>;
  jsonWithSuperstruct: <T>(ss: SSStruct<T>) => Codec<T>;
  jsonWithZod: <T>(zod: ZodType<T>) => Codec<T>;
};

const decodeError = (input: string, typeName: string) => {
  return new Error(`input '${input}' is not decodable as ${typeName}`);
};

// `Codec` for type `T` that encodes to/decodes from JSON string, with runtime validation on decoding.
const jsonStrCodecWithValidation = <T>(validate: (p: unknown) => T): Codec<T> => {
  return {
    encode: (t: T) => JSON.stringify(t),
    decode: (s: string) => {
      const parsed = JSON.parse(s) as unknown;
      return validateParsedJSON(validate, parsed);
    },
  };
};

// validate `parsed` with `validate`(validation logic). `validate` must throw error if validation is failed.
const validateParsedJSON = <T>(validate: (p: unknown) => T, parsed: unknown): T => {
  try {
    return validate(parsed);
  } catch (e) {
    throw e;
  }
};

export const codecs: BuiltinCodecsType = Object.freeze({
  /**
   * `Codec` for `string`.
   */
  string: Object.freeze({
    encode: (s: string) => s,
    decode: (s: string) => s,
  }),
  /**
   * `Codec` for `number`. `decode` throws when input doesn't represent a number.
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
   * `Codec` for 'bigint'. `decode` throws when input doesn't represent a bigint value.
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
   * `Codec` for `boolean`. `decode` throws when input doesn't represents a boolean.
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
   * `Codec` for array of values of single type `T`.
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
   * Create `Codec` for arbitrary tuple type from tuple of `Codec`s for each element.
   *
   * @param elemCodecs Tuple of `Codec`s. Each `Codec` should be able to handle corresponding element of tuple you want to encode/decode.
   */
  tupleOf: <Codecs extends TupleOfCodecs>(elemCodecs: Codecs): Codec<TupleOfEachCodecTarget<Codecs>> => {
    return Object.freeze({
      encode: (tup: TupleOfEachCodecTarget<Codecs>) => {
        const encRes = tup.map((e, i) => {
          const codec = elemCodecs[i];
          return codec.encode(e);
        });
        return JSON.stringify(encRes);
      },
      decode: (s: string) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(s) as unknown;
        } catch (e) {
          throw decodeError(s, 'tuple');
        }
        if (!Array.isArray(parsed) || !parsed.every(el => typeof el === 'string')) {
          throw decodeError(s, 'tuple');
        }

        const decRes = parsed.map((s, i) => {
          const codec = elemCodecs[i];
          try {
            return codec.decode(s);
          } catch (e) {
            throw decodeError(s, 'tuple of specified type');
          }
        });
        return decRes as unknown as TupleOfEachCodecTarget<Codecs>;
      },
    });
  },

  /**
   * `Codec` for type `T` that encodes to/decodes from JSON string, with runtime validation on decoding.
   *
   * @param validate Runtime validation logic. It should throw error if the value passed didn't have expected type(`T`).
   */
  jsonWithValidation: <T>(validate: (parsed: unknown) => T) => {
    return Object.freeze(jsonStrCodecWithValidation(validate));
  },
  /**
   * `Codec` for type `T` that encodes to/decodes from JSON string, with validation on decoding powered by [io-ts](https://gcanti.github.io/io-ts/).
   *
   * @param iots value of io-ts `Type<T>` that is used to validate value parsed from JSON.
   * @param reporter io-ts `Reporter` used to print validation error. It's output type must be `string` or `string[]`. `PathReporter` will be used if no `Reporter` is specified.
   */
  jsonWithIoTs: <T>(iots: IoTsType<T>, reporter?: Reporter<string> | Reporter<string[]>) => {
    return Object.freeze(
      jsonStrCodecWithValidation((parsed: unknown) => {
        const validated = iots.decode(parsed);
        return fold(
          // onLeft
          (_: Errors) => {
            const rep = reporter ?? PathReporter;
            const repRes = rep.report(validated);
            if (typeof repRes === 'string') {
              throw new Error(repRes);
            } else {
              throw new Error(repRes.join(', '));
            }
          },
          // onRight
          (t: T) => t
        )(validated);
      })
    );
  },
  /**
   * `Codec` for type `T` that encodes to/decodes from JSON string, with validation on decoding powered by [superstruct](https://docs.superstructjs.org/).
   *
   * @param ss value of superstruct `Struct<T>` that is used to validate value parsed from JSON.
   */
  jsonWithSuperstruct: <T>(ss: SSStruct<T>) => {
    return Object.freeze(
      jsonStrCodecWithValidation((parsed: unknown) => {
        assertBySS(parsed, ss);
        return parsed;
      })
    );
  },
  /**
   * `Codec` for type `T` that encodes to/decodes from JSON string, with validation on decoding powered by [zod](https://github.com/colinhacks/zod#readme).
   *
   * @param zod value of `ZodType<T>`("schema" object) that is used to validate value parsed from JSON.
   */
  jsonWithZod: <T>(zod: ZodType<T>) => {
    return Object.freeze(
      jsonStrCodecWithValidation((parsed: unknown) => {
        return zod.parse(parsed);
      })
    );
  },
});
