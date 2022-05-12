import { TreeAdapter } from "parse5";
import {
  CustomDocument,
  CustomElement,
  CustomNode,
  CustomParentNode,
  CustomTemplate,
  CustomTreeAdapterMap,
  ResolvedRoutesConfig,
} from "../isomorphic";

export interface CustomTreeAdapter extends TreeAdapter<CustomTreeAdapterMap> {
  isApplicationNode: (node: CustomNode) => node is CustomElement;
  isAssetsNode: (node: CustomNode) => node is CustomElement;
  isFragmentNode: (node: CustomNode) => node is CustomElement;
  isParentNode: (node: CustomNode) => node is CustomParentNode;
  isRouteNode: (node: CustomNode) => node is CustomElement;
  isRouterContent: (node: CustomNode) => node is CustomElement;
  isTemplateNode: (node: CustomNode) => node is CustomTemplate;
}

export interface ServerLayout {
  parsedDocument: CustomDocument;
  resolvedRoutes: ResolvedRoutesConfig;
}

export type HTMLTemplateOptions = { filePath: string } | { html: string };
