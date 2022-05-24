import { SingleSpaCustomEventDetail } from "single-spa";
import { applicationElementId } from "../../utils";
import { getAppsToUnmount } from "./utils";

export const handleRouting = (): EventListener => (e) => {
  const {
    detail: { newUrl },
  } = e as CustomEvent<SingleSpaCustomEventDetail>;
  getAppsToUnmount(newUrl).forEach((name) => {
    const appElement = document.getElementById(applicationElementId(name));
    appElement?.isConnected && appElement.remove();
  });
};
