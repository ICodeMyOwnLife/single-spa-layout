import { addErrorHandler, Parcel, removeErrorHandler } from "single-spa";
import { inBrowser } from "../../utils";
import { singleSpaEvents } from "../utils";
import { createArrangeDomElements } from "./createArrangeDomElements";
import { handleBeforeMountRouting } from "./handleBeforeMountRouting";
import { handleBeforeRouting } from "./handleBeforeRouting";
import { handleError } from "./handleError";
import { handleRouting } from "./handleRouting";
import { hydrate } from "./hydrate";
import { LayoutEngine, LayoutEngineOptions } from "./types";
import { getParentContainer } from "./utils";

export * from "./types";

export const constructLayoutEngine = ({
  routes,
  active,
}: LayoutEngineOptions) => {
  const errorParcelByAppName: Record<string, Parcel> = {};
  const arrangeDomElements = createArrangeDomElements(routes);
  const beforeMountRoutingHandler =
    handleBeforeMountRouting(arrangeDomElements);
  const beforeRoutingHandler = handleBeforeRouting(
    routes,
    errorParcelByAppName
  );
  const errorHandler = handleError(routes, errorParcelByAppName);
  const routingHandler = handleRouting();
  const wasServerRendered = inBrowser && !!window.singleSpaLayoutData;
  let isActive = false;
  const layoutEngine: LayoutEngine = {
    activate: () => {
      if (isActive) return;
      isActive = true;
      if (!inBrowser) return;
      window.addEventListener(
        singleSpaEvents.BEFORE_MOUNT_ROUTING,
        beforeMountRoutingHandler
      );
      window.addEventListener(
        singleSpaEvents.BEFORE_ROUTING,
        beforeRoutingHandler
      );
      window.addEventListener(singleSpaEvents.ROUTING, routingHandler);
      addErrorHandler(errorHandler);
      wasServerRendered &&
        hydrate(getParentContainer(routes.containerEl), routes.routes);
      arrangeDomElements();
    },
    deactivate: () => {
      if (!isActive) return;
      isActive = false;
      if (!inBrowser) return;
      window.removeEventListener(
        singleSpaEvents.BEFORE_MOUNT_ROUTING,
        beforeMountRoutingHandler
      );
      window.removeEventListener(
        singleSpaEvents.BEFORE_ROUTING,
        beforeRoutingHandler
      );
      window.removeEventListener(singleSpaEvents.ROUTING, routingHandler);
      removeErrorHandler(errorHandler);
    },
    isActive: () => isActive,
  };
  if (!active) layoutEngine.activate();
  return layoutEngine;
};
