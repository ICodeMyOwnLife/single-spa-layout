import { ParcelConfig } from "single-spa";
import { inBrowser } from "../../utils/environment";
import {
  Application,
  HTMLLayoutData,
  InputRoutesConfigObject,
  InputRouteChild,
  InputUrlRoute,
  InputNode,
  InputCustomElement,
  CustomElement,
  CustomChildNode,
} from "../types";
import { getAttribute, nodeNames, hasAttribute, resolvePath } from "../utils";

// TODO: what is MISSING_PROP for?
export const MISSING_PROP = typeof Symbol !== "undefined" ? Symbol() : "@";

const getProps = (
  element: HTMLElement | CustomElement,
  layoutData: HTMLLayoutData
) => {
  const props: Record<string, unknown> = {};
  (getAttribute(element, "props") || "").split(",").forEach((value) => {
    const propName = value.trim();
    if (propName === "") return;
    if (layoutData.props?.hasOwnProperty(propName)) {
      props[propName] = layoutData.props[propName];
    } else if (inBrowser) {
      throw Error(
        `Prop '${propName}' was not defined in the htmlLayoutData. Either remove this attribute from the HTML element or provide the prop's value`
      );
    } else {
      props[propName] = MISSING_PROP;
    }
  });

  return props;
};

type HandledElement = Node | CustomChildNode;

const hasNodeName = (element: HandledElement, name: string) =>
  element.nodeName.toLowerCase() === name;

const isApplication = (element: HandledElement): element is CustomElement =>
  hasNodeName(element, nodeNames.APPLICATION);

const isRoute = (element: HandledElement): element is CustomElement =>
  hasNodeName(element, nodeNames.ROUTE);

const isRedirectElement = (element: HandledElement): element is CustomElement =>
  hasNodeName(element, nodeNames.REDIRECT);

const isNode = (element: HandledElement): element is Node =>
  typeof Node !== "undefined" && element instanceof Node;

const isParse5Element = (element: HandledElement): element is CustomElement =>
  "childNodes" in element;

const getApplicationHandler = (
  element: CustomElement,
  handlers: Optional<Record<string, string | ParcelConfig>>,
  handlerName: keyof Application
) => {
  const handlerKey = getAttribute(element, handlerName);
  if (!handlerKey) return undefined;
  if (handlers?.hasOwnProperty(handlerKey)) return handlers[handlerKey];
  if (inBrowser)
    throw Error(
      `Application ${handlerName} handler '${handlerKey}' was not defined in the htmlLayoutData`
    );
  return undefined;
};

const parseApplicationRoutes = (
  element: CustomElement,
  layoutData: HTMLLayoutData
): Application[] => {
  if (element.childNodes.length > 0)
    throw Error(
      `<application> elements must not have childNodes. You must put in a closing </application> - self closing is not allowed`
    );
  return [
    {
      error: getApplicationHandler(element, layoutData.errors, "error"),
      loader: getApplicationHandler(element, layoutData.loaders, "loader"),
      name: getAttribute(element, "name")!,
      props: getProps(element, layoutData),
      type: nodeNames.APPLICATION,
    },
  ];
};

const parseChildRoutes = (
  childNodes: CustomChildNode[],
  layoutData: HTMLLayoutData,
  config: InputRoutesConfigObject
) => {
  const routes: InputRouteChild[] = [];
  childNodes.forEach((childNode) =>
    routes.push(...parseRoutes(childNode, layoutData, config))
  );
  return routes;
};

const parseRouteRoutes = (
  element: CustomElement,
  layoutData: HTMLLayoutData,
  config: InputRoutesConfigObject
): InputUrlRoute[] => [
  {
    default: hasAttribute(element, "default") || undefined,
    exact: hasAttribute(element, "exact") || undefined,
    path: getAttribute(element, "path") ?? undefined,
    props: getProps(element, layoutData),
    routes: parseChildRoutes(element.childNodes, layoutData, config),
    type: nodeNames.ROUTE,
  },
];

const parseNodeRoutes = (
  element: Node,
  layoutData: HTMLLayoutData,
  config: InputRoutesConfigObject
): InputNode[] => {
  if (element.nodeType === Node.TEXT_NODE && element.textContent?.trim() === "")
    return [];
  const inputNode = element as InputNode;
  if (element.childNodes.length > 0) {
    inputNode.routes = [];
    for (let i = 0; i < element.childNodes.length; ++i) {
      inputNode.routes.push(
        ...parseRoutes(element.childNodes[i] as HTMLElement, layoutData, config)
      );
    }
  }
  return [inputNode];
};

const parseElementRoutes = (
  element: CustomElement,
  layoutData: HTMLLayoutData,
  config: InputRoutesConfigObject
): InputCustomElement[] => [
  {
    type: element.nodeName.toLowerCase(),
    routes: parseChildRoutes(element.childNodes, layoutData, config),
    attrs: element.attrs,
  },
];

export const parseRoutes = (
  element: HandledElement,
  layoutData: HTMLLayoutData,
  config: InputRoutesConfigObject
): InputRouteChild[] => {
  if (isApplication(element))
    return parseApplicationRoutes(element, layoutData);
  if (isRoute(element)) return parseRouteRoutes(element, layoutData, config);
  if (isRedirectElement(element)) {
    config.redirects![resolvePath("/", getAttribute(element, "from")!)] =
      resolvePath("/", getAttribute(element, "to")!);
    return [];
  }
  if (isNode(element)) return parseNodeRoutes(element, layoutData, config);
  if (isParse5Element(element))
    return parseElementRoutes(element, layoutData, config);
  if (element.nodeName === nodeNames.COMMENT)
    return [{ type: nodeNames.COMMENT, value: element.data }];
  if (element.nodeName === nodeNames.TEXT)
    return [{ type: nodeNames.TEXT, value: element.value }];
  return [];
};
