import { pathToActiveWhen } from "single-spa";
import {
  assertArrayLike,
  assertBoolean,
  assertContainerEl,
  assertEnum,
  assertFullPath,
  assertObject,
  assertString,
  inBrowser,
  PlainObject,
  validateKeys,
} from "../../utils/index.js";
import type {
  ActiveWhen,
  ResolvedRouteChild,
  ResolvedRoutesConfig,
} from "../types.js";
import { nodeNames, resolvePath } from "../utils.js";

const defaultRoute =
  (
    siblingActiveWhens: ActiveWhen[],
    parentActiveWhen: ActiveWhen
  ): ActiveWhen =>
  (location: Location | URL) =>
    parentActiveWhen(location) &&
    !siblingActiveWhens.some((activeWhen) => activeWhen(location));

const sanitizeBase = (base: string) => {
  let result = base;
  if (result[0] !== "/") result = "/" + result;
  if (result[result.length - 1] !== "/") result = result + "/";
  return result;
};

function assertChildRoutes(
  name: string,
  routes: unknown,
  disableWarnings: boolean,
  {
    parentActiveWhen,
    parentPath,
    siblingActiveWhens,
  }: {
    parentActiveWhen: ActiveWhen;
    parentPath: string;
    siblingActiveWhens: ActiveWhen[];
  }
): asserts routes is ResolvedRouteChild[] {
  assertArrayLike(name, routes);
  for (let i = 0; i < routes.length; ++i) {
    assertRoute(`${name}[${i}]`, routes[i], disableWarnings, {
      parentActiveWhen,
      parentPath,
      siblingActiveWhens,
    });
  }
}

function assertApplication(
  name: string,
  value: PlainObject,
  disableWarnings: boolean
) {
  validateKeys(
    name,
    value,
    ["error", "loader", "name", "props", "type"],
    disableWarnings
  );
  if (value.props) assertObject(`${name}.props`, value.props);
  assertString(`${name}.name`, value.name);
}

function assertUrlRoute(
  name: string,
  value: PlainObject,
  disableWarnings: boolean,
  {
    parentActiveWhen,
    parentPath,
    siblingActiveWhens,
  }: {
    parentActiveWhen: ActiveWhen;
    parentPath: string;
    siblingActiveWhens: ActiveWhen[];
  }
) {
  validateKeys(
    name,
    value,
    ["default", "exact", "path", "props", "routes", "type"],
    disableWarnings
  );

  if (value.hasOwnProperty("exact"))
    assertBoolean(`${name}.exact`, value.exact);

  const hasPath = value.hasOwnProperty("path");
  const hasDefault = value.hasOwnProperty("default");
  let fullPath;

  if (hasPath) {
    assertString(`${name}.path`, value.path);
    fullPath = resolvePath(parentPath, value.path);
    value["activeWhen"] = pathToActiveWhen(fullPath, !!value.exact);
    siblingActiveWhens.push(value["activeWhen"] as ActiveWhen);
  } else if (hasDefault) {
    assertBoolean(`${name}.default`, value.default);
    fullPath = parentPath;
    value["activeWhen"] = defaultRoute(siblingActiveWhens, parentActiveWhen);
  } else
    throw Error(
      `Invalid ${name}: routes must have either a path or default property.`
    );

  if (hasDefault && hasPath && value.default)
    throw Error(
      `Invalid ${name}: cannot have both path and set default to true.`
    );

  if (value.routes)
    assertChildRoutes(`${name}.routes`, value.routes, disableWarnings, {
      parentActiveWhen: value["activeWhen"] as ActiveWhen,
      parentPath: fullPath,
      siblingActiveWhens: [],
    });
}

function assertRoute(
  name: string,
  route: unknown,
  disableWarnings: boolean,
  {
    parentActiveWhen,
    parentPath,
    siblingActiveWhens,
  }: {
    parentActiveWhen: ActiveWhen;
    parentPath: string;
    siblingActiveWhens: ActiveWhen[];
  }
): asserts route is ResolvedRouteChild {
  assertObject(name, route);

  if (route["type"] === nodeNames.APPLICATION)
    return assertApplication(name, route, disableWarnings);
  if (route["type"] === nodeNames.ROUTE)
    return assertUrlRoute(name, route, disableWarnings, {
      parentActiveWhen,
      parentPath,
      siblingActiveWhens,
    });
  if (typeof Node !== "undefined" && route instanceof Node) {
    // HTMLElements are allowed
    return;
  }
  for (const key in route) {
    if (key !== "routes" && key !== "attrs")
      assertString(`${name}.${key}`, route[key], false);
  }
  if (route["routes"]) {
    assertChildRoutes(`${name}.routes`, route["routes"], disableWarnings, {
      parentActiveWhen,
      parentPath,
      siblingActiveWhens,
    });
  }
}

export function validateRoutesConfig(
  routesConfig: unknown
): asserts routesConfig is ResolvedRoutesConfig {
  assertObject("routesConfig", routesConfig);

  const disableWarnings = !!routesConfig["disableWarnings"];

  validateKeys(
    "routesConfig",
    routesConfig,
    ["base", "containerEl", "disableWarnings", "mode", "redirects", "routes"],
    disableWarnings
  );

  if (routesConfig.hasOwnProperty("containerEl"))
    assertContainerEl("routesConfig.containerEl", routesConfig.containerEl);
  else routesConfig.containerEl = "body";

  if (!routesConfig.hasOwnProperty("mode")) routesConfig.mode = "history";

  assertEnum("routesConfig.mode", routesConfig.mode, [
    "history",
    "hash",
  ] as const);

  if (routesConfig.hasOwnProperty("base")) {
    assertString("routesConfig.base", routesConfig.base);
    routesConfig.base = sanitizeBase(routesConfig.base);
  } else routesConfig.base = "/";

  if (routesConfig.hasOwnProperty("redirects")) {
    assertObject("routesConfig.redirects", routesConfig.redirects);

    for (const from in routesConfig.redirects) {
      const to = routesConfig.redirects[from];
      assertFullPath(`routesConfig.redirects key`, from);
      assertFullPath(`routesConfig.redirects['${from}']`, to);
    }
  }

  const pathname = inBrowser ? window.location.pathname : "/";
  const hashPrefix = routesConfig.mode === "hash" ? pathname + "#" : "";

  assertChildRoutes(
    "routesConfig.routes",
    routesConfig.routes,
    disableWarnings,
    {
      parentActiveWhen: () => true,
      parentPath: hashPrefix + routesConfig.base,
      siblingActiveWhens: [],
    }
  );

  delete routesConfig.disableWarnings;
}
