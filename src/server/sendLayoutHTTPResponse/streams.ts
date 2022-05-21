import { PassThrough, Readable, TransformCallback } from "node:stream";
import { isPromise } from "../../utils";
import { logError } from "./logError";

export type StreamValue = string | Readable;

export type StreamInput = StreamValue | PromiseLike<StreamValue>;

type MergeStreamInput = {
  name?: string;
  value: StreamInput;
};

const debugMode = !!process.env["DEBUG"];

export class MergeStream extends PassThrough {
  private ended = false;
  private wholeText = "";
  private inputs: MergeStreamInput[] = [];
  private merging = false;

  constructor(public readonly name: string) {
    super({ writableObjectMode: true });
    process.nextTick(() => this.next());
  }

  override _flush(callback: TransformCallback): void {
    callback(null);
  }

  override _transform(
    chunk: unknown,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    this.add(chunk as StreamInput);
    callback(null);
  }

  override push(chunk: unknown, _encoding?: BufferEncoding): boolean {
    const text = String(chunk);
    if (debugMode) {
      console.log(`MergeStream#${this.name}: push\n${text}`);
      this.wholeText += text;
    }
    return super.push(text);
  }

  add(value: StreamInput, name?: string) {
    if (this.ended)
      throw Error(
        `MergeStream#${this.name} Error: Adding value to already ended stream`
      );
    this.inputs.push({ name, value });
    this.next();
    return this;
  }

  private endStream() {
    if (debugMode)
      console.log(`MergeStream#${this.name}: end\n${this.wholeText}`);
    this.ended = true;
    super.push(null);
  }

  private async next(): Promise<void> {
    if (this.merging) return;
    const input = this.inputs.shift();
    if (!input) return this.endStream();
    if (this.ended)
      throw Error(
        `MergeStream#${this.name} Error: Stream ended before drained`
      );
    const { name, value } = input;
    this.merging = true;
    await this.merge(value, name);
    this.merging = false;
    this.next();
  }

  private merge(value: StreamInput, name: string | undefined): Promise<void> {
    if (isPromise(value)) {
      return this.mergePromise(value, name);
    }
    if (value instanceof Readable) {
      return this.mergeReadable(value, name);
    }
    return this.mergeOther(value);
  }

  private async mergePromise(
    value: PromiseLike<StreamValue>,
    name: string | undefined
  ) {
    try {
      this.merge(await Promise.resolve(value), name);
    } catch (error) {
      name && logError(name, error);
      this.emit("error", error);
    }
  }

  private mergeReadable(value: Readable, name: string | undefined) {
    // TODO: use pipeline?
    return new Promise<void>((resolve) => {
      value
        .on("data", (chunk) => {
          this.merge(chunk, name && `${name}-chunk`);
        })
        .on("end", resolve)
        .on("error", (error) => {
          name && logError(name, error);
          this.emit("error", error);
        });
    });
  }

  private async mergeOther(value: unknown) {
    this.push(value);
  }
}
