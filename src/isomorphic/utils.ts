import { inBrowser } from "../utils/environment";
import { find } from "../utils/find";
import { CustomElement } from "./types";

export const nodeNames = {
  APPLICATION: "application",
  REDIRECT: "redirect",
  ROUTE: "route",
  ROUTER: "single-spa-router",
  ROUTER_CONTENT: "ssl-router-content",
  TEMPLATE: "template",
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
