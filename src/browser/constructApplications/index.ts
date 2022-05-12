import { RegisterApplicationConfig } from "single-spa";
import { ActiveWhen } from "../../isomorphic";
import { inBrowser } from "../../utils";
import { placeLoader } from "./placeLoader";
import { recurseRoutes } from "./recurseRoutes";
import { ApplicationMap, ApplicationOptions } from "./types";

const topLevelActiveWhen: ActiveWhen = () => true;

export const constructApplications = ({
  loadApp,
  routes: { routes },
}: ApplicationOptions) => {
  const applicationMap: ApplicationMap = {};
  recurseRoutes(applicationMap, topLevelActiveWhen, {}, routes);
  return Object.entries(applicationMap).map<RegisterApplicationConfig>(
    ([name, appRoutes]) => ({
      activeWhen: appRoutes.map((appRoute) => appRoute.activeWhen),
      app: () => {
        const appRoute = inBrowser
          ? appRoutes.find((appRoute) => appRoute.activeWhen(window.location))
          : undefined;
        const loadPromise = loadApp({ name });
        return appRoute?.loader
          ? placeLoader(name, appRoute.loader, loadPromise)
          : loadPromise;
      },
      customProps: (_, location) => {
        const appRoute = appRoutes.find((appRoute) =>
          appRoute.activeWhen(location)
        );
        return appRoute?.props ?? {};
      },
      name,
    })
  );
};
