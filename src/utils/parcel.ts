import { ParcelConfig } from "single-spa";

export const htmlToParcelConfig = (html: string): ParcelConfig => ({
  bootstrap: () => Promise.resolve(),
  mount: (props) =>
    Promise.resolve().then(() => {
      props.domElement.innerHTML = html;
    }),
  unmount: (props) =>
    Promise.resolve().then(() => {
      props.domElement.innerHTML = "";
    }),
});
