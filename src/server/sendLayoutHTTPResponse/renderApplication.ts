import { MISSING_PROP, ResolvedApplication } from '../../isomorphic/index.js';
import {
  applicationElementId,
  appPropsScriptId,
  dataScript,
  getAppName,
} from '../../utils/index.js';
import { logError } from './logError.js';
import { MergeStream, StreamInput } from './MergeStream.js';
import { AppToRender, RenderArgs } from './types.js';

const getPropsPromise = async (
  { name, props: configProps = {} }: ResolvedApplication,
  { propPromises, renderOptions: { retrieveProp } }: RenderArgs,
) => {
  const propEntries = await Promise.all(
    Object.keys(configProps).map(async propName => {
      const propValue = configProps[propName];
      const value =
        propValue === MISSING_PROP
          ? (propPromises[propName] ||= Promise.resolve(retrieveProp(propName)))
          : propValue;
      const resolvedValue = await Promise.resolve(value);
      return [propName, resolvedValue] as const;
    }),
  );
  const props = Object.fromEntries(propEntries);
  props['name'] = getAppName(name);
  return props;
};

type AppStreamInput =
  | {
      isNew: true;
      assets?: StreamInput;
      content: StreamInput;
      props?: StreamInput;
    }
  | { isNew: false; content: StreamInput };

const getAppStreamInput = (
  appToRender: AppToRender,
  { appContents, renderOptions: { renderApplication } }: RenderArgs,
): AppStreamInput => {
  const { appName } = appToRender;
  const content = appContents[appName];
  if (content) {
    return { isNew: false, content: MergeStream.clone(content) };
  }

  try {
    const { assets, content, props } = renderApplication(appToRender);
    appContents[appName] = content;
    return {
      isNew: true,
      assets,
      content: MergeStream.clone(content),
      props:
        props &&
        Promise.resolve(props).then(p =>
          p ? dataScript(p, appPropsScriptId(appName)) : '',
        ),
    };
  } catch (error) {
    logError(appName, error);
    return { isNew: true, content: '' };
  }
};

export const renderApplication = (
  node: ResolvedApplication,
  args: RenderArgs,
) => {
  const {
    assetsStream,
    appPropsPromises,
    bodyStream,
    dataStream,
    headerPromises,
    renderOptions: { retrieveApplicationHeaders },
  } = args;
  const { name } = node;
  const appName = getAppName(name);
  const propsPromise = (appPropsPromises[appName] ??= getPropsPromise(
    node,
    args,
  ));
  const appToRender = { appName, propsPromise };
  headerPromises[appName] ??= retrieveApplicationHeaders(appToRender);
  const appStreamInput = getAppStreamInput(appToRender, args);
  bodyStream.add(`<div id="${applicationElementId(name)}">`);
  bodyStream.add(appStreamInput.content);
  bodyStream.add(`</div>`);
  if (appStreamInput.isNew) {
    appStreamInput.assets && assetsStream.add(appStreamInput.assets);
    appStreamInput.props && dataStream.add(appStreamInput.props);
  }
};
