import { Merge2Stream } from "merge2";

declare module "merge2" {
  export interface MergeOptions {
    pipeError?: boolean;
  }

  export default function merge2(options?: MergeOptions): Merge2Stream;
}
