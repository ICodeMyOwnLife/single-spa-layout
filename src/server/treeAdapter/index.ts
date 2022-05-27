import { defaultTreeAdapter, html, TreeAdapter } from "parse5";
import {
  Application,
  CustomCommentNode,
  CustomElement,
  CustomParentNode,
  CustomTemplate,
  CustomTextNode,
  CustomTreeAdapterMap,
  nodeNames,
} from "../../isomorphic/index.js";
import type { CustomTreeAdapter } from "../types.js";

const adapter =
  defaultTreeAdapter as unknown as TreeAdapter<CustomTreeAdapterMap>;

export const treeAdapter: CustomTreeAdapter = {
  ...adapter,

  getChildNodes: (node) =>
    // TODO: what is node.routes? We don't need to get routes?
    adapter.getChildNodes(node) || node.routes,

  getCommentNodeContent: (node) =>
    adapter.getCommentNodeContent(node) || node.value,

  getTagName: (node) => adapter.getTagName(node) || node.type,

  isApplicationNode: (node): node is CustomElement & Application =>
    treeAdapter.isElementNode(node) &&
    treeAdapter.getTagName(node) === nodeNames.APPLICATION,

  isAssetsNode: (node): node is CustomElement =>
    treeAdapter.isElementNode(node) &&
    treeAdapter.getTagName(node) === nodeNames.ASSETS,

  isCommentNode: (node): node is CustomCommentNode =>
    adapter.isCommentNode(node) || node.type === nodeNames.COMMENT,

  isElementNode: (node): node is CustomElement =>
    adapter.isElementNode(node) || (!!node.type && !node.type.startsWith("#")),

  isFragmentNode: (node): node is CustomElement =>
    treeAdapter.isElementNode(node) &&
    treeAdapter.getTagName(node) === nodeNames.FRAGMENT,

  isParentNode: (node): node is CustomParentNode =>
    "childNodes" in node || "routes" in node,

  isRouteNode: (node): node is CustomElement =>
    treeAdapter.isElementNode(node) &&
    treeAdapter.getTagName(node) === nodeNames.ROUTE,

  isRouterContent: (node): node is CustomElement =>
    treeAdapter.isElementNode(node) &&
    treeAdapter.getTagName(node) === nodeNames.ROUTER_CONTENT,

  isTemplateNode: (node): node is CustomTemplate =>
    node.nodeName === html.TAG_NAMES.TEMPLATE,

  isTextNode: (node): node is CustomTextNode =>
    adapter.isTextNode(node) || node.type === nodeNames.TEXT,
};
