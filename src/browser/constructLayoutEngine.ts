export interface LayoutEngine {
  activate: () => void;
  deactivate: () => void;
  isActive: () => boolean;
}
