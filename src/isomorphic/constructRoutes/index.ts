import { html } from "parse5";
import { inBrowser } from "../../utils/index.js";
import type {
  HTMLLayoutData,
  InputRoutesConfigObject,
  RouteMode,
  ResolvedRoutesConfig,
  CustomElement,
} from "../types.js";
import { nodeNames, getAttribute } from "../utils.js";
import { parseRoutes } from "./parseRoutes.js";
import { validateRoutesConfig } from "./validateRoutesConfig.js";

export { MISSING_PROP } from "./parseRoutes.js";

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

const getHtmlLayoutData = (layoutData: Optional<HTMLLayoutData>) =>
  layoutData || (inBrowser ? window.singleSpaLayoutData : undefined);

const isHTMLElement = (
  element: HTMLElement | CustomElement
): element is HTMLElement =>
  inBrowser ||
  (typeof HTMLElement !== "undefined" && element instanceof HTMLElement);

export const isTemplateElement = (
  element: CustomElement | HTMLElement
): element is HTMLTemplateElement =>
  element.tagName.toLowerCase() === html.TAG_NAMES.TEMPLATE;

const setIfHasValue = <TName extends string, TValue>(
  key: TName,
  value: Nullable<TValue>
) => (!!value ? ({ [key]: value } as Record<TName, TValue>) : undefined);

const setFromAttribute =
  <TName extends string>(attrName: TName) =>
  <TValue extends string>(routerElement: HTMLElement | CustomElement) =>
    setIfHasValue(attrName, getAttribute(routerElement, attrName) as TValue);

const elementToRoutesConfig = (
  element: HTMLElement | CustomElement,
  htmlLayoutData: HTMLLayoutData = {}
): InputRoutesConfigObject => {
  const routerElement = isTemplateElement(element)
    ? element.content.querySelector<HTMLElement>(nodeNames.ROUTER)!
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
    element.remove();

  const result: InputRoutesConfigObject = {
    ...setFromAttribute("base")(routerElement),
    ...setFromAttribute("containerEl")(routerElement),
    ...setFromAttribute("mode")<RouteMode>(routerElement),
    redirects: {},
    routes: [],
  };
  routerElement.childNodes.forEach((child) =>
    result.routes.push(...parseRoutes(child, htmlLayoutData, result))
  );

  return result;
};

export function constructRoutes(
  htmlOrElement: string | CustomElement | HTMLElement,
  layoutData?: HTMLLayoutData
): ResolvedRoutesConfig;
export function constructRoutes(
  configObject: InputRoutesConfigObject
): ResolvedRoutesConfig;
export function constructRoutes(
  arg1: string | CustomElement | HTMLElement | InputRoutesConfigObject,
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
