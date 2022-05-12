import { inBrowser } from "../utils/environment";
import { find } from "../utils/find";
import {
  Application,
  CustomElement,
  ResolvedRouteChild,
  ResolvedUrlRoute,
} from "./types";

export const nodeNames = {
  APPLICATION: "application",
  ASSETS: "assets",
  COMMENT: "#comment",
  FRAGMENT: "fragment",
  REDIRECT: "redirect",
  ROUTE: "route",
  ROUTER: "single-spa-router",
  ROUTER_CONTENT: "ssl-router-content",
  TEXT: "#text",
} as const;

const isDomElement = (element: Element | CustomElement): element is Element =>
  inBrowser;

export const getAttribute = (
  element: Element | CustomElement,
  attrName: string
) =>
  isDomElement(element)
    ? element.getAttribute(attrName)
    : // watch out, parse5 converts attribute names to lowercase and not as is => https://github.com/inikulin/parse5/issues/116
      find(element.attrs, (attr) => attr.name === attrName.toLowerCase())
        ?.value ?? null;

export const hasAttribute = (
  element: Element | CustomElement,
  attrName: string
) =>
  isDomElement(element)
    ? element.hasAttribute(attrName)
    : element.attrs.some((attr) => attr.name === attrName.toLowerCase());

export function resolvePath(prefix: string, path: string): string {
  let result: string;

  if (prefix[prefix.length - 1] === "/") {
    if (path[0] === "/") {
      result = prefix + path.slice(1);
    } else {
      result = prefix + path;
    }
  } else if (path[0] === "/") {
    result = prefix + path;
  } else {
    result = prefix + "/" + path;
  }

  if (result.length > 1 && result[result.length - 1] === "/") {
    result = result.slice(0, result.length - 1);
  }

  return result;
}

export const routeChild = {
  isApplication: (child: ResolvedRouteChild): child is Application =>
    "type" in child && child.type === nodeNames.APPLICATION,
  isNode: (child: ResolvedRouteChild): child is Node =>
    typeof Node !== "undefined" && child instanceof Node,
  isUrlRoute: (child: ResolvedRouteChild): child is ResolvedUrlRoute =>
    "type" in child && child.type === nodeNames.ROUTE,
};
