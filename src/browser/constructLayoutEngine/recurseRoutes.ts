import {
  Application,
  CustomElement,
  ResolvedRouteChild,
  ResolvedUrlRoute,
  routeChild,
} from "../../isomorphic";
import { applicationElementId } from "../../utils";
import { createNodeFromObj, insertNode } from "./utils";

export interface DomChangeInput {
  applicationContainers: Record<string, HTMLElement>;
  location: Location | URL;
  parentContainer: Node;
  previousSibling?: Node;
  routes: ResolvedRouteChild[];
  shouldMount: boolean;
}

const createApplicationElement = (htmlId: string) => {
  const applicationElement = document.createElement("div");
  applicationElement.id = htmlId;
  return applicationElement;
};

const processApplication = (
  { name }: Application,
  { applicationContainers, parentContainer, shouldMount }: DomChangeInput,
  previousSibling: Node | undefined
) => {
  if (!shouldMount) return previousSibling;
  const htmlId = applicationElementId(name);
  const applicationElement =
    applicationContainers[name] ??
    document.getElementById(htmlId) ??
    createApplicationElement(htmlId);
  insertNode(applicationElement, parentContainer, previousSibling);
  return applicationElement;
};

const processUrlRoute = (
  { activeWhen, routes }: ResolvedUrlRoute,
  {
    applicationContainers,
    location,
    parentContainer,
    shouldMount,
  }: DomChangeInput,
  previousSibling: Node | undefined
) =>
  recurseRoutes({
    applicationContainers,
    location,
    parentContainer,
    previousSibling,
    routes: routes,
    shouldMount: shouldMount && activeWhen(location),
  });

type ExtendedNode = (CustomElement | Node) & { connectedNode?: Node };

const processNode = (
  node: Node | CustomElement,
  {
    applicationContainers,
    location,
    parentContainer,
    shouldMount,
  }: DomChangeInput,
  previousSibling: Node | undefined
) => {
  const extendedNode = node as ExtendedNode;
  if (!shouldMount) {
    extendedNode.connectedNode?.parentNode?.removeChild(
      extendedNode.connectedNode
    );
    delete extendedNode.connectedNode;
    return previousSibling;
  }

  extendedNode.connectedNode ||=
    node instanceof Node
      ? node.cloneNode(false)
      : createNodeFromObj(node, true);
  insertNode(extendedNode.connectedNode, parentContainer, previousSibling);
  if ("routes" in extendedNode)
    recurseRoutes({
      applicationContainers,
      location,
      parentContainer: extendedNode.connectedNode,
      previousSibling: undefined,
      routes: extendedNode.routes as CustomElement[],
      shouldMount,
    });
  return extendedNode.connectedNode;
};

export const recurseRoutes = (input: DomChangeInput) => {
  let previousSibling = input.previousSibling;

  input.routes.forEach((route) => {
    if (routeChild.isApplication(route))
      previousSibling = processApplication(route, input, previousSibling);
    else if (routeChild.isUrlRoute(route))
      previousSibling = processUrlRoute(route, input, previousSibling);
    else if (route instanceof Node || typeof route.type === "string")
      previousSibling = processNode(route, input, previousSibling);
  });

  return previousSibling;
};
