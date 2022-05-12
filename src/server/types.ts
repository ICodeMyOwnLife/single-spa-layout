import { TreeAdapter } from "parse5";
import {
  CustomDocument,
  CustomNode,
  CustomParentNode,
  CustomTemplate,
  CustomTreeAdapterMap,
  ResolvedRoutesConfig,
} from "../isomorphic";

export interface CustomTreeAdapter extends TreeAdapter<CustomTreeAdapterMap> {
  isParentNode: (node: CustomNode) => node is CustomParentNode;
  isTemplateNode: (node: CustomNode) => node is CustomTemplate;
}

export interface ServerLayout {
  parsedDocument: CustomDocument;
  resolvedRoutes: ResolvedRoutesConfig;
}

export type HTMLTemplateOptions = { filePath: string } | { html: string };
