import { inBrowser } from "../../utils/environment";
import { assertString } from "../../utils/validation";
import { ResolvedRouteChild, ResolvedRoutesConfig } from "../types";
import { resolvePath } from "../utils";

const recurseRoutes = (
  location: Location | URL,
  routes: ResolvedRouteChild[]
) => {
  const result: ResolvedRouteChild[] = [];

  routes.forEach((route) => {
    if ("type" in route && route.type === "application")
      return result.push(route);
    if ("type" in route && route.type === "route") {
      if (route.activeWhen(location))
        result.push({
          ...route,
          routes: recurseRoutes(location, route.routes),
        });
      return;
    }
    if ("routes" in route && Array.isArray(route.routes)) {
      return result.push({
        ...route,
        routes: recurseRoutes(location, route.routes),
      });
    }
    return result.push(route);
  });

  return result;
};

export const matchRoute = (
  config: ResolvedRoutesConfig,
  path: string
): ResolvedRoutesConfig => {
  assertString("path", path);
  const result: ResolvedRoutesConfig = { ...config };
  const baseWithoutSlash = config.base.slice(0, config.base.length - 1);

  if (path.indexOf(baseWithoutSlash) === 0) {
    const origin = inBrowser ? window.location.origin : "http://localhost";
    const url = new URL(resolvePath(origin, path));
    result.routes = recurseRoutes(url, config.routes);
  } else result.routes = [];

  return result;
};
