import { AppError, mountRootParcel, Parcel } from "single-spa";
import {
  Application,
  CustomElement,
  ResolvedRouteChild,
  ResolvedRoutesConfig,
  routeChild,
} from "../../isomorphic";
import { applicationElementId, htmlToParcelConfig } from "../../utils";

interface FindApplicationRouteInput {
  applicationName: string;
  location: Location | URL;
  routes: ResolvedRouteChild[];
}

const findApplicationRoute = ({
  applicationName,
  location,
  routes,
}: FindApplicationRouteInput): Optional<Application> => {
  for (const route of routes) {
    if (routeChild.isApplication(route)) {
      if (route.name === applicationName) return route;
    } else if (routeChild.isUrlRoute(route)) {
      if (route.activeWhen(location)) {
        const result = findApplicationRoute({
          applicationName,
          location,
          routes: route.routes,
        });
        if (result) return result;
      }
    } else if ("routes" in route) {
      const result = findApplicationRoute({
        applicationName,
        location,
        routes: route.routes as CustomElement[],
      });
      if (result) return result;
    }
  }
  return undefined;
};

export const handleError =
  (
    { routes }: ResolvedRoutesConfig,
    errorParcelByAppName: Record<string, Parcel>
  ) =>
  (err: AppError) => {
    const { appOrParcelName } = err;
    const applicationRoute = findApplicationRoute({
      applicationName: appOrParcelName,
      location: window.location,
      routes,
    });
    const errorHandler = applicationRoute?.error;
    if (errorHandler) {
      const applicationContainer = document.getElementById(
        applicationElementId(applicationRoute.name)
      )!;
      const parcelConfig =
        typeof errorHandler === "string"
          ? htmlToParcelConfig(errorHandler)
          : errorHandler;
      errorParcelByAppName[applicationRoute.name] = mountRootParcel(
        parcelConfig,
        { domElement: applicationContainer }
      );
    }
    if (process.env["BABEL_ENV"] !== "test")
      setTimeout(() => {
        throw err;
      });
  };
