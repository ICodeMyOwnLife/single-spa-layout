import { AppProps, LifeCycles, ParcelConfig } from "single-spa";
import { ActiveWhen, ResolvedRoutesConfig } from "../../isomorphic";

export interface ApplicationOptions {
  loadApp: (config: Partial<AppProps>) => Promise<LifeCycles>;
  routes: ResolvedRoutesConfig;
}

export interface AppRoute {
  activeWhen: ActiveWhen;
  loader?: string | ParcelConfig;
  props: Record<string, unknown>;
}

export type ApplicationMap = Record<string, AppRoute[]>;
