import { ServerResponse } from 'node:http';
import type { ServerLayout } from '../types.js';
import { MergeStream, StreamInput, StreamValue } from './MergeStream.js';

export interface AppToRender {
  appName: string;
  propsPromise: Promise<Record<string, unknown>>;
}

export interface AppHeaders {
  appHeaders: Record<string, string>;
  appProps: Record<string, unknown>;
}

export interface RenderResult {
  assets?: StreamInput;
  content: StreamInput;
  props?: {} | Promise<{}>;
}

export interface RenderOptions {
  assembleFinalHeaders: (appHeaders: AppHeaders[]) => Record<string, string>;
  renderApplication: (appToRender: AppToRender) => RenderResult;
  renderFragment: (name: string) => StreamValue | Promise<StreamValue>;
  res: ServerResponse;
  retrieveApplicationHeaders: (
    appToRender: AppToRender,
  ) => Promise<Record<string, string>>;
  retrieveProp: (name: string) => unknown | Promise<unknown>;
  serverLayout: ServerLayout;
  urlPath: string;
}

type AppName = string;
type PropName = string;

export interface RenderArgs {
  appPropsPromises: Record<AppName, Promise<Record<string, unknown>>>;
  appContents: Record<AppName, StreamInput>;
  assetsStream: MergeStream;
  dataStream: MergeStream;
  bodyStream: MergeStream;
  headerPromises: Record<AppName, Promise<Record<string, string>>>;
  propPromises: Record<PropName, Promise<unknown>>;
  renderOptions: RenderOptions;
}
