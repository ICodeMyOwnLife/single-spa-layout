// TODO: update this
export interface ParcelProps {
  domElement: HTMLElement;
}

// TODO: update this
export interface ParcelConfig {
  bootstrap: () => Promise<void>;
  mount: (props: ParcelProps) => Promise<void>;
  unmount: (props: ParcelProps) => Promise<void>;
}

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
