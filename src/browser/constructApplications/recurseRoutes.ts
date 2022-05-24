import {
  ActiveWhen,
  CustomElement,
  ResolvedRouteChild,
  routeChild,
} from "../../isomorphic";
import { ApplicationMap } from "./types";

export const recurseRoutes = (
  applicationMap: ApplicationMap,
  activeWhen: ActiveWhen,
  props: Record<string, unknown>,
  routes: ResolvedRouteChild[]
): void =>
  routes.forEach((route) => {
    if (routeChild.isApplication(route))
      return (applicationMap[route.name] ||= []).push({
        activeWhen,
        props: { ...props, ...route.props },
        loader: route.loader,
      });
    if (routeChild.isUrlRoute(route))
      return recurseRoutes(
        applicationMap,
        route.activeWhen,
        { ...props, ...route.props },
        route.routes
      );
    if ("routes" in route && Array.isArray(route.routes))
      return recurseRoutes(
        applicationMap,
        activeWhen,
        props,
        route.routes as CustomElement[]
      );
  });
