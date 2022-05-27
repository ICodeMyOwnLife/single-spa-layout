import type { DefaultTreeAdapterMap, TreeAdapterTypeMap } from "parse5";
import type { ParcelConfig } from "single-spa";
import type { nodeNames } from "./utils.js";

interface BaseNode {
  _originalNode?: CustomNode;
  type: string;
}

interface BaseParentNode {
  routes: CustomChildNode[];
}

export type CustomCommentNode = DefaultTreeAdapterMap["commentNode"] &
  BaseNode & {
    type: typeof nodeNames.COMMENT;
    value: string;
  };

export type CustomDocument = DefaultTreeAdapterMap["document"] &
  BaseNode &
  BaseParentNode;

export type CustomDocumentFragment = DefaultTreeAdapterMap["documentFragment"] &
  BaseNode &
  BaseParentNode;

export type CustomDocumentType = DefaultTreeAdapterMap["documentType"] &
  BaseNode;

export type CustomElement = Omit<
  DefaultTreeAdapterMap["element"],
  "childNodes"
> &
  BaseNode &
  BaseParentNode & {
    childNodes: CustomChildNode[];
  };

export type CustomTemplate = DefaultTreeAdapterMap["template"] &
  BaseNode &
  BaseParentNode;

export type CustomTextNode = DefaultTreeAdapterMap["textNode"] &
  BaseNode & {
    type: typeof nodeNames.TEXT;
  };

export type CustomParentNode =
  | CustomDocument
  | CustomDocumentFragment
  | CustomElement
  | CustomTemplate;

export type CustomChildNode =
  | CustomCommentNode
  | CustomDocumentType
  | CustomElement
  | CustomTemplate
  | CustomTextNode;

export type CustomNode = CustomParentNode | CustomChildNode;

export type CustomTreeAdapterMap = TreeAdapterTypeMap<
  CustomNode,
  CustomParentNode,
  CustomChildNode,
  CustomDocument,
  CustomDocumentFragment,
  CustomElement,
  CustomCommentNode,
  CustomTextNode,
  CustomTemplate,
  CustomDocumentType
>;

// TODO: sometimes it's HTMLElement, sometimes it's CustomElement, how do I handle it elegantly?
export type ContainerEl = string | HTMLElement | CustomElement;

type Redirects = Record<string, string>;

export type ActiveWhen = (location: Location | URL) => boolean;

// TODO: Should it be one of CustomNode?
export interface Application {
  error?: string | ParcelConfig;
  loader?: string | ParcelConfig;
  name: string;
  props?: Record<string, unknown>;
  type: typeof nodeNames.APPLICATION;
}

export type ResolvedUrlRoute = {
  activeWhen: ActiveWhen;
  exact?: boolean;
  props: Record<string, unknown>;
  routes: ResolvedRouteChild[];
  type: typeof nodeNames.ROUTE;
} & (
  | {
      default: boolean;
      path?: never;
    }
  | {
      default?: never | false;
      path: string;
    }
);

export type ResolvedRouteChild =
  | ResolvedUrlRoute
  | CustomElement
  | Application
  | Node;

export type RouteMode = "history" | "hash";

export interface ResolvedRoutesConfig {
  base: string;
  containerEl: ContainerEl;
  mode?: RouteMode;
  redirects?: Redirects;
  routes: ResolvedRouteChild[];
}

export interface InputUrlRoute
  extends Omit<ResolvedUrlRoute, "activeWhen" | "routes"> {
  routes: InputRouteChild[];
}

export interface InputNode extends Node {
  routes: InputRouteChild[];
}

export interface InputCustomElement
  extends Partial<Omit<CustomElement, "routes" | "type">> {
  routes?: InputRouteChild[];
  type: string;
  value?: string;
}

export type InputRouteChild =
  | InputUrlRoute
  | InputCustomElement
  | Application
  | InputNode;

export interface InputRoutesConfigObject
  extends Partial<Omit<ResolvedRoutesConfig, "routes">> {
  disableWarnings?: boolean;
  routes: InputRouteChild[];
}

export interface HTMLLayoutData {
  errors?: Record<string, string | ParcelConfig>;
  loaders?: Record<string, any>;
  props?: Record<string, any>;
}

declare global {
  interface Window {
    singleSpaLayoutData?: HTMLLayoutData;
  }
}
