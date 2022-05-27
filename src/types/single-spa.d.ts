import "single-spa";

declare module "single-spa" {
  export function checkActivityFunctions(location: Location | URL): string[];
}
