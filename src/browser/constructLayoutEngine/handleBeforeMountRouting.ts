export const handleBeforeMountRouting =
  (arrangeDomElements: VoidFunction): EventListener =>
  () => {
    arrangeDomElements();
  };
