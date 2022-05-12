import merge2, { MergeOptions } from "merge2";
import { Readable } from "node:stream";
import { isPromise } from "../../utils";
import { logError } from "./logError";

export const stringStream = (str: string) => Readable.from([str]);

export type StreamValue = string | Readable;

type ValueStreamInput = StreamValue | PromiseLike<StreamValue>;

async function* promiseToGenerator(
  promise: PromiseLike<StreamValue>,
  name: string
) {
  try {
    const result = await promise;
    if (typeof result === "string") {
      yield result;
      return;
    }
    for await (const data of result) {
      yield data as string;
    }
  } catch (error) {
    logError(name, error);
  }
}

const promiseStream = (promise: PromiseLike<StreamValue>, name: string) =>
  Readable.from(promiseToGenerator(promise, name));

export const valueStream = (value: ValueStreamInput, name: string) =>
  typeof value === "string"
    ? stringStream(value)
    : isPromise(value)
    ? promiseStream(value, name)
    : value;

export const mergeStream = (options?: MergeOptions) => merge2(options);
