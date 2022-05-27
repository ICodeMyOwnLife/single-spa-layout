import { Readable } from "node:stream";
import { isPromise } from "../../utils/index.js";
import { logError } from "./logError.js";

export type StreamValue = string | Readable;

export type StreamInput = StreamValue | PromiseLike<StreamValue>;

type MergeStreamItem = {
  name?: string;
  input: StreamInput;
};

export class MergeStream extends Readable {
  private ended = false;
  private wholeText = "";
  private queue: MergeStreamItem[] = [];
  private merging = false;

  constructor(public readonly streamName: string) {
    super();
    process.nextTick(() => this.next());
  }

  override _read(_size: number): void {}

  override push(chunk: unknown, _encoding?: BufferEncoding): boolean {
    const text = String(chunk);
    if (process.env.DEBUG) {
      console.log(`MergeStream#${this.streamName}: push\n${text}`);
      this.wholeText += text;
    }
    return super.push(text);
  }

  add(input: StreamInput, name?: string) {
    if (this.ended)
      throw Error(
        `MergeStream#${this.streamName} Error: Adding value to already ended stream`
      );
    this.queue.push({ input, name });
    this.next();
    return this;
  }

  private endStream() {
    if (process.env.DEBUG)
      console.log(`MergeStream#${this.streamName}: end\n${this.wholeText}`);
    this.ended = true;
    super.push(null);
  }

  private merge(input: StreamInput, name: string | undefined): Promise<void> {
    if (isPromise(input)) return this.mergePromise(input, name);
    if (input instanceof Readable) return this.mergeReadable(input, name);
    return this.mergeOther(input);
  }

  private async mergeOther(input: unknown) {
    this.push(input);
  }

  private async mergePromise(
    input: PromiseLike<StreamValue>,
    name: string | undefined
  ) {
    try {
      this.merge(await Promise.resolve(input), name);
    } catch (error) {
      logError(name || this.streamName, error);
      this.emit("error", error);
    }
  }

  private mergeReadable(input: Readable, name: string | undefined) {
    return new Promise<void>((resolve) => {
      input
        .on("data", (chunk) => {
          this.merge(chunk, `${name ?? "[Readable]"}-chunk`);
        })
        .on("end", resolve)
        .on("error", (error) => {
          name && logError(name || this.streamName, error);
          this.emit("error", error);
          resolve();
        });
    });
  }

  private async next(): Promise<void> {
    if (this.merging) return;
    if (this.queue.length === 0) return this.endStream();
    if (this.ended)
      throw Error(
        `MergeStream#${this.streamName} Error: Stream ended before queue was empty`
      );
    this.merging = true;
    const { input, name } = this.queue.shift()!;
    await this.merge(input, name);
    this.merging = false;
    this.next();
  }
}
