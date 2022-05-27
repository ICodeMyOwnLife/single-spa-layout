import { readFileSync } from "node:fs";
import { html } from "parse5";
import {
  constructRoutes,
  CustomElement,
  CustomNode,
  CustomTreeAdapterMap,
  nodeNames,
} from "../../isomorphic/index.js";
import { assertString } from "../../utils/index.js";
import { CustomParser } from "../CustomParser/index.js";
import { treeAdapter } from "../treeAdapter/index.js";
import type { HTMLTemplateOptions, ServerLayout } from "../types.js";

export * from "../types.js";

const errPrefix = `single-spa-layout (server):`;

const getHtmlString = (templateOptions: HTMLTemplateOptions) => {
  let htmlString: string;
  if ("html" in templateOptions) htmlString = templateOptions.html;
  else if ("filePath" in templateOptions)
    htmlString = readFileSync(templateOptions.filePath, "utf8");
  else
    throw Error(
      `${errPrefix} either templateOptions.html or templateOptions.filePath is required`
    );
  assertString("htmlString", htmlString);
  return htmlString;
};

const parseDocument = (htmlString: string) => {
  try {
    return CustomParser.parse<CustomTreeAdapterMap>(htmlString);
  } catch (error) {
    console.error(`${errPrefix} failed to parse HTML template with parse5.`);
    throw error;
  }
};

const findElementRecursive = (
  rootNode: CustomNode,
  nodeName: string
): CustomElement | null => {
  if (treeAdapter.isElementNode(rootNode)) {
    const tagName = treeAdapter.getTagName(rootNode);
    if (tagName === nodeName) return rootNode;
  }

  const childNodes = treeAdapter.isTemplateNode(rootNode)
    ? treeAdapter.getChildNodes(treeAdapter.getTemplateContent(rootNode))
    : treeAdapter.isParentNode(rootNode)
    ? treeAdapter.getChildNodes(rootNode)
    : [];

  for (const childNode of childNodes) {
    const result =
      treeAdapter.isElementNode(childNode) &&
      findElementRecursive(childNode, nodeName);
    if (result) return result;
  }

  return null;
};

const findElement = (rootNode: CustomNode, nodeName: string) => {
  const element = findElementRecursive(rootNode, nodeName);
  if (element) return element;
  throw Error(`${errPrefix} could not find ${nodeName} element in HTML`);
};

export const constructServerLayout = (
  templateOptions: HTMLTemplateOptions
): ServerLayout => {
  if (!templateOptions) throw Error(`${errPrefix} templateOptions is required`);
  const htmlString = getHtmlString(templateOptions);
  const parsedDocument = parseDocument(htmlString);
  const routerElement = findElement(parsedDocument, nodeNames.ROUTER);
  const resolvedRoutes = constructRoutes(routerElement, {});
  const containerEl =
    typeof resolvedRoutes.containerEl === "string"
      ? findElement(parsedDocument, resolvedRoutes.containerEl)
      : (resolvedRoutes.containerEl as CustomElement);
  const routerFragment = treeAdapter.createElement(
    nodeNames.ROUTER_CONTENT,
    html.NS.HTML,
    []
  );
  const firstChild = treeAdapter.getFirstChild(containerEl);
  firstChild
    ? treeAdapter.insertBefore(containerEl, routerFragment, firstChild)
    : treeAdapter.appendChild(containerEl, routerFragment);
  return {
    parsedDocument,
    resolvedRoutes,
  };
};
