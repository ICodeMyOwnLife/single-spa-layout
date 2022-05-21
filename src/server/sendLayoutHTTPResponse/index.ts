import { serializeChildNodes } from "./serializers";
import { MergeStream } from "./streams";
import { AppHeaders, RenderOptions, SerializeArgs } from "./types";

export * from "./types";

const isRedirected = ({
  res,
  serverLayout: {
    resolvedRoutes: { redirects },
  },
  urlPath,
}: RenderOptions) => {
  for (const from in redirects) {
    if (urlPath === from) {
      res.writeHead(302, { Location: redirects[from] });
      res.end();
      return true;
    }
  }
  return false;
};

const serializeDocument = (renderOptions: RenderOptions) => {
  const {
    serverLayout: { parsedDocument },
  } = renderOptions;
  const args: SerializeArgs = {
    applicationPropPromises: {},
    assetsStream: new MergeStream("assetsStream"),
    bodyStream: new MergeStream("bodyStream"),
    headerPromises: {},
    inRouterElement: false,
    node: parsedDocument,
    propPromises: {},
    renderOptions,
  };
  serializeChildNodes(args);
  return args;
};

const getHeaders = async ({
  applicationPropPromises,
  headerPromises,
  renderOptions: { assembleFinalHeaders },
}: SerializeArgs) => {
  const appHeaders = await Promise.all(
    Object.entries(headerPromises).map<Promise<AppHeaders>>(
      async ([appName, headerPromise]) => {
        const [appHeaders, appProps] = await Promise.all([
          headerPromise,
          applicationPropPromises[appName]!,
        ]);
        return { appHeaders, appProps };
      }
    )
  );
  return assembleFinalHeaders(appHeaders);
};

export const sendLayoutHTTPResponse = async (renderOptions: RenderOptions) => {
  if (isRedirected(renderOptions)) return;
  const args = serializeDocument(renderOptions);
  const headers = await getHeaders(args);
  const { res } = renderOptions;
  const { bodyStream } = args;
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  bodyStream.pipe(res);
};
