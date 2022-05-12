import {
  Application,
  CustomElement,
  nodeNames,
  ResolvedRouteChild,
  routeChild,
} from "../../isomorphic";
import { createNodeFromObj } from "./utils";

type PreviousNode = { nextSibling: ChildNode | null } | null | undefined;

const DOM_NODE_NAMES: string[] = [
  nodeNames.APPLICATION,
  nodeNames.ASSETS,
  nodeNames.FRAGMENT,
  nodeNames.REDIRECT,
  nodeNames.ROUTE,
];

const isDomRoute = (route: ResolvedRouteChild) =>
  !("type" in route) || !DOM_NODE_NAMES.includes(route.type);

const equalAttributes = (first: Node, second: Node) => {
  if (!(first instanceof Element) || !(second instanceof Element)) return true;
  const firstAttrNames = first.getAttributeNames();
  const secondAttrNames = second.getAttributeNames();
  return (
    firstAttrNames.length === secondAttrNames.length &&
    firstAttrNames.every(
      (attrName) =>
        second.getAttribute(attrName) === first.getAttribute(attrName)
    )
  );
};

const shallowEqualNode = (first: Node, second: Node) =>
  first.nodeName === second.nodeName &&
  first.nodeType === second.nodeType &&
  equalAttributes(first, second);

const nodeEqualsRoute = (
  node: Node | undefined | null,
  route: ResolvedRouteChild
) =>
  !node
    ? false
    : shallowEqualNode(
        node,
        route instanceof Node ? route : createNodeFromObj(route)
      );

type ExtendedRoute = (Application | CustomElement | Node) & {
  connectedNode: Node | null | undefined;
};

export const hydrate = (
  domNode: Node | null | undefined,
  routes: ResolvedRouteChild[] | undefined
) => {
  if (!domNode?.childNodes || !routes) return;
  let prevNode: PreviousNode = { nextSibling: domNode.childNodes[0] };
  routes.forEach((route) => {
    if (routeChild.isUrlRoute(route)) {
      hydrate(domNode, route.routes);
      return;
    }
    let node: Node | undefined | null = prevNode?.nextSibling;
    while (
      node?.nodeType === Node.TEXT_NODE &&
      domNode.textContent?.trim() === ""
    )
      node = node.nextSibling;
    prevNode = node;
    if (isDomRoute(route) && nodeEqualsRoute(node, route))
      (route as ExtendedRoute).connectedNode = node;
    if ("routes" in route) hydrate(node, route.routes as CustomElement[]);
  });
};
