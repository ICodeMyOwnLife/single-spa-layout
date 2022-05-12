import { checkActivityFunctions, getAppNames } from "single-spa";
import {
  Application,
  ContainerEl,
  CustomCommentNode,
  CustomNode,
  CustomTextNode,
  nodeNames,
  ResolvedUrlRoute,
  RouteMode,
} from "../../isomorphic";

export const getAppsToUnmount = (newUrl: string) => {
  const activeApps = checkActivityFunctions(
    newUrl ? new URL(newUrl) : location
  );
  return getAppNames().filter((appName) => !activeApps.includes(appName));
};

export const getParentContainer = (containerEl: ContainerEl) =>
  typeof containerEl === "string"
    ? document.querySelector<HTMLElement>(containerEl)!
    : (containerEl as HTMLElement);

export const getPath = (
  mode: RouteMode | undefined,
  location: Location | URL = window.location
) => location[mode === "hash" ? "hash" : "pathname"];

export const insertNode = (
  node: Node,
  container: Node,
  previousSibling: Node | undefined
) => {
  const nextSibling = previousSibling
    ? previousSibling.nextSibling
    : container.firstChild;

  // Only call insertBefore() if necessary
  // https://github.com/single-spa/single-spa-layout/issues/123
  if (nextSibling !== node) container.insertBefore(node, nextSibling);
};

export const createNodeFromObj = (
  obj: Application | ResolvedUrlRoute | CustomNode,
  recursive = false
): Node => {
  if (obj.type === nodeNames.TEXT)
    return document.createTextNode((obj as CustomTextNode).value);
  if (obj.type === nodeNames.COMMENT)
    return document.createComment((obj as CustomCommentNode).value);
  const node = document.createElement(obj.type);
  ("attrs" in obj ? obj.attrs : []).forEach((attr) =>
    node.setAttribute(attr.name, attr.value)
  );
  recursive &&
    "routes" in obj &&
    obj.routes.forEach(
      (child) =>
        !(child instanceof Node) && node.appendChild(createNodeFromObj(child))
    );
  return node;
};
