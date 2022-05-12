import { Readable } from "node:stream";

export const stringStream = (str: string) => Readable.from([str]);

const logError = (name: string, err: unknown) => {
  console.error(`${name}: failed to render.`);
  console.error(err);
};

type StreamValue = string | Readable;

type ValueStreamInput = StreamValue | PromiseLike<StreamValue>;

async function* promiseToGenerator(
  promise: PromiseLike<StreamValue>,
  name: string
) {
  try {
    const result = await promise;
    if (typeof result === "string") return result;
    for await (const data of result) {
      yield data;
    }
  } catch (error) {
    logError(name, error);
    return "";
  }
}

const promiseStream = (promise: PromiseLike<StreamValue>, name: string) =>
  Readable.from(promiseToGenerator(promise, name));

const isPromise = (
  value: ValueStreamInput
): value is PromiseLike<StreamValue> =>
  !!value &&
  typeof value === "object" &&
  "then" in value &&
  typeof value.then === "function";

const valueStream = (value: ValueStreamInput, name: string) =>
  typeof value === "string"
    ? stringStream(value)
    : isPromise(value)
    ? promiseStream(value, name)
    : value;
