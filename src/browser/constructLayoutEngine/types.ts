import { ResolvedRoutesConfig } from "../../isomorphic";

export interface LayoutEngine {
  activate: () => void;
  deactivate: () => void;
  isActive: () => boolean;
}

export interface LayoutEngineOptions {
  active?: boolean;
  routes: ResolvedRoutesConfig;
}
