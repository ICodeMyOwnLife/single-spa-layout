import { navigateToUrl, Parcel, SingleSpaCustomEventDetail } from "single-spa";
import { ResolvedRoutesConfig } from "../../isomorphic";
import { getAppsToUnmount, getPath } from "./utils";

export const executeCancelNavigation = (
  cancelNavigation: VoidFunction | undefined
) => {
  if (!cancelNavigation)
    throw Error(`single-spa-layout: <redirect> requires single-spa@>=5.7.0`);
  cancelNavigation();
};

const isRedirected = (
  { mode, redirects }: ResolvedRoutesConfig,
  { newUrl, cancelNavigation }: SingleSpaCustomEventDetail
) => {
  const path = getPath(mode, new URL(newUrl));

  for (const from in redirects) {
    const to = redirects[from];
    if (from === path) {
      // Calling cancelNavigation sends us back to the old URL
      executeCancelNavigation(cancelNavigation);

      // We must wail until single-spa starts sending us back to the old URL before attempting to navigate to the new one
      setTimeout(() => navigateToUrl(to));
      return true;
    }
  }

  return false;
};

const hasErrors = (
  errorParcelByAppName: Record<string, Parcel>,
  { cancelNavigation, newUrl }: SingleSpaCustomEventDetail
) => {
  const errorParcelUnmountPromises = getAppsToUnmount(newUrl).flatMap(
    (name) => {
      const errorParcel = errorParcelByAppName[name];
      if (errorParcel) {
        delete errorParcelByAppName[name];
        return errorParcel.unmount();
      }
      return [];
    }
  );
  if (errorParcelUnmountPromises.length) {
    executeCancelNavigation(cancelNavigation);
    Promise.all(errorParcelUnmountPromises).then(() => navigateToUrl(newUrl));
    return true;
  }
  return false;
};

export const handleBeforeRouting =
  (
    routesConfig: ResolvedRoutesConfig,
    errorParcelByAppName: Record<string, Parcel>
  ): EventListener =>
  (e) => {
    const { detail } = e as CustomEvent<SingleSpaCustomEventDetail>;
    if (isRedirected(routesConfig, detail)) return;
    if (hasErrors(errorParcelByAppName, detail)) return;
  };
