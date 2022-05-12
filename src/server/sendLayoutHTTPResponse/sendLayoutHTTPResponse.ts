import { serializeChildNodes } from "./serializers";
import { mergeStream } from "./streams";
import { RenderOptions, SerializeArgs } from "./types";

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
    assetsStream: mergeStream({ pipeError: true }),
    bodyStream: mergeStream({ pipeError: true }),
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
    Object.keys(headerPromises).map(async (appName) => {
      const [appHeaders, appProps] = await Promise.all([
        headerPromises[appName],
        applicationPropPromises[appName],
      ]);
      return { appHeaders, appProps };
    })
  );
  return assembleFinalHeaders(appHeaders);
};

export const sendLayoutHTTPResponse = async (renderOptions: RenderOptions) => {
  if (isRedirected(renderOptions)) return;
  const args = serializeDocument(renderOptions);
  const headers = await getHeaders(args);
  const { res } = renderOptions;
  const { bodyStream } = args;
  for (const headerName in headers) {
    res.setHeader(headerName, headers[headerName]);
  }
  bodyStream.pipe(res);
};
