import { ResolvedRoutesConfig } from '../isomorphic/index.js';

export const layoutConfigScriptId = '_ssl-config_';

export const layoutDataScriptId = '_ssl-data_';

export const applicationElementId = (fullName: string) =>
  `_ssl-app:${fullName}_`;

export const appPropsScriptId = (fullName: string) => `_ssl-props:${fullName}_`;

export const dataScript = (data: unknown, id: string) =>
  `<script id="${id}" type="application/json">${JSON.stringify(data)}</script>`;

export const getAppName = (fullName: string) =>
  /^(.+?)(#\d)?$/.exec(fullName)![1]!;

export const getDataScript = (id: string) =>
  document.querySelector<HTMLScriptElement>(`script[id="${id}"]`);

export const getDataFromScript = <TData>(id: string) => {
  const script = getDataScript(id);
  return script ? (JSON.parse(script.text) as TData) : undefined;
};

export const getAppProps = <TProps>(fullName: string) =>
  getDataFromScript<TProps>(appPropsScriptId(getAppName(fullName)));

export const getLayoutConfig = () =>
  getDataFromScript<ResolvedRoutesConfig>(layoutConfigScriptId);
