import { LifeCycles, ParcelConfig } from "single-spa";
import { ActiveWhen, ResolvedRoutesConfig } from "../../isomorphic";

interface LoadAppProps {
  name: string;
}

export interface ApplicationOptions {
  loadApp: (config: LoadAppProps) => Promise<LifeCycles>;
  routes: ResolvedRoutesConfig;
}

export interface AppRoute {
  activeWhen: ActiveWhen;
  loader?: string | ParcelConfig;
  props: Record<string, unknown>;
}

export type ApplicationMap = Record<string, AppRoute[]>;
