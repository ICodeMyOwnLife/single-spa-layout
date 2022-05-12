import { defaultTreeAdapter, TreeAdapter } from "parse5";
import { NodeType } from "parse5/dist/tree-adapters/default";
import {
  CustomCommentNode,
  CustomElement,
  CustomParentNode,
  CustomTemplate,
  CustomTextNode,
  CustomTreeAdapterMap,
  nodeNames,
} from "../../isomorphic";
import { CustomTreeAdapter } from "../types";

const adapter =
  defaultTreeAdapter as unknown as TreeAdapter<CustomTreeAdapterMap>;

export const treeAdapter: CustomTreeAdapter = {
  ...adapter,

  getChildNodes: (node) =>
    // TODO: what is node.routes?
    adapter.getChildNodes(node) || node.routes,

  getCommentNodeContent: (node) =>
    adapter.getCommentNodeContent(node) || node.value,

  getTagName: (node) => adapter.getTagName(node) || node.type,

  isCommentNode: (node): node is CustomCommentNode =>
    adapter.isCommentNode(node) || node.type === NodeType.Comment,

  isElementNode: (node): node is CustomElement =>
    adapter.isElementNode(node) || (!!node.type && !node.type.startsWith("#")),

  isParentNode: (node): node is CustomParentNode =>
    "childNodes" in node || "routes" in node,

  isTemplateNode: (node): node is CustomTemplate =>
    node.nodeName === nodeNames.TEMPLATE,

  isTextNode: (node): node is CustomTextNode =>
    adapter.isTextNode(node) || node.type === NodeType.Text,
};
