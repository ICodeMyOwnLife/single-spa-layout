import { html } from "parse5";
import { inBrowser } from "../../utils/environment";
import {
  HTMLLayoutData,
  InputRoutesConfigObject,
  RouteMode,
  ResolvedRoutesConfig,
  CustomElement,
} from "../types";
import { nodeNames, getAttribute } from "../utils";
import { parseRoutes } from "./parseRoutes";
import { validateRoutesConfig } from "./validateRoutesConfig";

export { MISSING_PROP } from "./parseRoutes";

const parseRouterElement = (html: string) => {
  if (!inBrowser)
    throw Error(
      "calling constructRoutes with a string on the server is not yet supported"
    );
  const element = new DOMParser()
    .parseFromString(html, "text/html")
    .documentElement.querySelector<HTMLElement>(nodeNames.ROUTER);
  if (!element)
    throw Error(
      "constructRoutes should be called with a string HTML document that contains a <single-spa-router> element."
    );
  return element;
};

const getHtmlLayoutData = (layoutData: HTMLLayoutData | undefined) =>
  layoutData || inBrowser ? window.singleSpaLayoutData : undefined;

const isHTMLElement = (
  element: Element | CustomElement
): element is HTMLElement => inBrowser;

export const isTemplateElement = (
  element: CustomElement | HTMLElement
): element is HTMLTemplateElement =>
  element.tagName === html.TAG_NAMES.TEMPLATE;

const elementToRoutesConfig = (
  element: HTMLElement | CustomElement,
  htmlLayoutData: HTMLLayoutData = {}
): InputRoutesConfigObject => {
  const routerElement = isTemplateElement(element)
    ? // IE11 doesn't support the content property on templates
      (element.content || element).querySelector(nodeNames.ROUTER)!
    : element;

  if (routerElement.nodeName.toLowerCase() !== nodeNames.ROUTER)
    throw Error(
      `single-spa-layout: The HTMLElement passed to constructRoutes must be <single-spa-router> or a <template> containing the router. Received ${element.nodeName}`
    );

  if (
    isHTMLElement(element) &&
    isHTMLElement(routerElement) &&
    element.isConnected
  )
    routerElement.parentNode?.removeChild(element);

  const result: InputRoutesConfigObject = {
    base: getAttribute(routerElement, "base") ?? undefined,
    containerEl: getAttribute(routerElement, "containerEl") ?? undefined,
    mode: (getAttribute(routerElement, "mode") as RouteMode) ?? undefined,
    redirects: {},
    routes: [],
  };
  routerElement.childNodes.forEach((child) =>
    result.routes.push(...parseRoutes(child, htmlLayoutData, result))
  );

  return result;
};

export function constructRoutes(
  htmlOrElement: string | CustomElement,
  layoutData: HTMLLayoutData
): ResolvedRoutesConfig;
export function constructRoutes(
  configObject: InputRoutesConfigObject
): ResolvedRoutesConfig;
export function constructRoutes(
  arg1: string | CustomElement | InputRoutesConfigObject,
  arg2?: HTMLLayoutData
): ResolvedRoutesConfig {
  let config: InputRoutesConfigObject;
  if (typeof arg1 === "string" || "nodeName" in arg1) {
    const domElement =
      typeof arg1 === "string" ? parseRouterElement(arg1) : arg1;
    config = elementToRoutesConfig(domElement, getHtmlLayoutData(arg2));
  } else if (arg2) {
    throw Error(
      `constructRoutes should be called either with an HTMLElement and layoutData, or a single json object.`
    );
  } else {
    config = arg1;
  }
  validateRoutesConfig(config);
  return config;
}
