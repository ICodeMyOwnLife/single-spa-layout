import type { TreeAdapterTypeMap } from "parse5";
import type { Attribute } from "parse5/dist/common/token";
import {
  CommentNode,
  Document,
  DocumentFragment,
  DocumentType,
  Element,
  Template,
  TextNode,
} from "parse5/dist/tree-adapters/default";
import type { ParcelConfig } from "single-spa";

interface BaseNode {
  type: string;
}

interface BaseParentNode {
  routes: CustomChildNode[];
}

export interface CustomCommentNode extends CommentNode, BaseNode {
  value: string;
}

export interface CustomDocument extends Document, BaseNode, BaseParentNode {}

export interface CustomDocumentFragment
  extends DocumentFragment,
    BaseNode,
    BaseParentNode {}

export interface CustomDocumentType extends DocumentType, BaseNode {}

export interface CustomElement extends Element, BaseNode, BaseParentNode {}

export interface CustomTemplate extends Template, BaseNode, BaseParentNode {}

export interface CustomTextNode extends TextNode, BaseNode {}

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

type ContainerEl = string | CustomElement;

type Redirects = Record<string, string>;

export type ActiveWhen = (location: Location | URL) => boolean;

export interface Application {
  error?: string | ParcelConfig;
  loader?: string | ParcelConfig;
  name: string;
  props?: Record<string, any>; // TODO: use generic here?
  type: "application";
}

export type ResolvedUrlRoute = {
  activeWhen: ActiveWhen;
  exact?: boolean;
  props: Record<string, any>; // TODO: use generic here?
  routes: ResolvedRouteChild[];
  type: "route";
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

export type CustomRoute = {
  attrs?: Attribute[];
  routes: ResolvedRouteChild[];
  type?: never;
  [key: string]: unknown;
};

export type ResolvedRouteChild =
  | ResolvedUrlRoute
  | CustomRoute
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

export interface InputCustomRoute extends Omit<CustomRoute, "routes" | "type"> {
  routes?: InputRouteChild[];
  type: string;
}

export type InputRouteChild =
  | InputUrlRoute
  | InputCustomRoute
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
