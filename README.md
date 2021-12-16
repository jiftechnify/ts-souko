# ts-souko
*ts-souko* is a library for constructing **type-safe Storage wrapper**, for TypeScript.

> *souko*(倉庫) is a Japanese word stands for "warehouse", or "storage".

## Installation
By npm:

```
npm i ts-souko
```

By yarn:

```
yarn add ts-souko
```

## Basic Usage

```typescript
import { createTypedStorage, codecs, baseStorages } from 'ts-souko';

// Creating typed wrapper for localStorage.
// For each key, specify the `Codec` for the type of corresponding value.
const storage = createTypedStorage({
  id: codecs.number,
  name: codecs.string,
}, { base: baseStorages.webLocal } );

// Now, type of value is inferred as you specify key!
storage.set('id', 100);       // OK
storage.set('name', 'Alice'); // OK
storage.set('id', 'nan');     // type error!
storage.set('name', 0);       // type error!
storage.set('unknown', null); // type error!

const i = storage.get('id');      // i: number | null
const n = storage.get('name');    // n: string | null
const x = storage.get('unknown'); // type error!
```

## Features

### Type-safety and Developer Experience

Using *ts-souko*, you can get type-safety on string value storages by minimum code. Moreover, together with VS Code's powerful integration with TypeScript, you can get maximum developer experience on coding using storages. TypeScript compiler will be always on your side!

With *ts-souko*, you won't be troubled with problems like:

- What keys are available on the storage?
- What type of value is expected for that key?
- What type should you convert the value from storage to?



### Flexibility and Extensibility by Abstractions

*ts-souko* defines 2 abstractions: `BaseStorage` and `Codec`. They make *ts-souko* flexible and extensible.

- `BaseStorage` is abstraction of "string key - string value" storage. This enables you to **use** *ts-souko* **on any storage** that has ability to store string value with string key associated, not limited to browser's `localStorage` 
or `sessionStorage`!
    + "Async" version is also supported (`AsyncTypedStorage` on `AsyncBaseStorage`). This is useful to interact with storages that expose async API, such as [React Native Async Storage](https://react-native-async-storage.github.io/async-storage/docs/install/) or [Capacitor Storage](https://capacitorjs.com/docs/apis/storage).

- `Codec<T>` is abstraction about conversion between value of type `T` and it's string representation, back and forth. This enables you to **store and retrieve values of arbitrary type** to/from storage **in arbitrary format**, **with safety**. For example, you can write `Codec` for array of `number`s that converts an array as "slash(/) separated values":

```typescript
import { codecs, createTypedStorage } from 'ts-souko';

// note: codecs.number implements value-preserving conversion for numbers.
const slashSeparatedNumsCodec: Codec<number[]> = {
  encode: (a: number[]): string => 
    a.map(e => codecs.number.encode(e)).join('/'),

  decode: (s: string): number[] =>
    s.split('/').map(e => codecs.number.decode(e))
}

const ts = createTypedStorage({
  ssv: slashSeparatedNumsCodec, 
}, { ... });

ts.set('ssv', [1, 2, 3]) // OK. stores: '1/2/3' 
ts.get('ssv')            // => [1, 2, 3]

ts.set('ssv', ["a", "b"]) // type error!
```

### Built-in Interoperability with Schema Validation Libraries

Via `Codec` abstraction, you can write code that retrieve value from storage with schema validations using a library like [io-ts](https://gcanti.github.io/io-ts/). Fortunately, you don't have to write own `Codec` with validations! *ts-souko* is equipped with built-in `Codec` interoperate with popular schema validation libraries:

| Library Name | `Codec`  |
|:-------------|:---------|
|[io-ts](https://gcanti.github.io/io-ts/) | `codecs.jsonWithIoTs(iotsType, reporter?)`|
|[superstruct](https://docs.superstructjs.org/)| `codecs.jsonWithSuperstruct(struct)`|
|[zod](https://github.com/colinhacks/zod#readme)| `codecs.jsonWithZod(zod)` |

Example using *ts-souko* with *io-ts*:

```typescript
import { codecs, createTypedStorage } from 'ts-souko';
import * as t from 'io-ts';

const User = t.type({
  userId: t.number,
  name: t.string,
});
type User = t.TypeOf<typeof User>;

const userCodec = codecs.jsonWithIoTs(User);
const ts = crateTypedStorage({
  user: userCodec,
}, { ... });

const u: User = { userId: 1, name: 'Alice' };
ts.set('user', u) // OK
ts.get('user')    // === `u`

ts.set('user', { userId: '1', namee: 'Alice' }) // type error, of course.
```

If you couldn't find your favorite validation library, you can still use `codecs.jsonWithValidation(validate)`, where `validate` is function implements custom validation logic.
