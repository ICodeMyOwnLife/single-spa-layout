import { html } from "parse5";
import { serializeDoctypeContent } from "parse5-htmlparser2-tree-adapter";
import { matchRoute, MISSING_PROP, nodeNames } from "../../isomorphic";
import { applicationElementId } from "../../utils";
import { treeAdapter } from "../treeAdapter";
import { escapeString } from "./escapeString";
import { logError } from "./logError";
import { mergeStream, stringStream, valueStream } from "./streams";
import { RenderResult, SerializeFunc } from "./types";

const NS = html.NS;
const TAGS = html.TAG_NAMES;

const renderResultToAppStreams = (name: string, result: RenderResult) => {
  const content =
    typeof result === "object" && "content" in result ? result.content : result;
  const assets =
    typeof result === "object" && "assets" in result ? result.assets : "";
  return {
    contentStream: valueStream(content, name),
    assetsStream: valueStream(assets, name),
  };
};

const serializeApplication: SerializeFunc = ({
  applicationPropPromises,
  assetsStream,
  bodyStream,
  headerPromises,
  node,
  propPromises,
  renderOptions: {
    renderApplication,
    retrieveApplicationHeaders,
    retrieveProp,
  },
}) => {
  if (!treeAdapter.isElementNode(node)) return;
  // TODO: where is name and props from?
  const { name: appName, props: propsConfig = {} } = node as unknown as {
    name: string;
    props?: Record<string, unknown>;
  };
  const propsPromise = Promise.all(
    Object.keys(propsConfig).map((propName) => {
      const propValue = propsConfig[propName];
      const value =
        propValue === MISSING_PROP
          ? (propPromises[propName] ||= retrieveProp(propName))
          : propValue;
      return Promise.resolve(value).then(
        (resolvedValue) => [propName, resolvedValue] as const
      );
    })
  ).then((propEntries) => {
    const props = Object.fromEntries(propEntries);
    props["name"] = appName;
    return props;
  });

  applicationPropPromises[appName] = propsPromise;

  headerPromises[appName] = retrieveApplicationHeaders({
    appName,
    propsPromise,
  });

  const contentStream = mergeStream();
  const assetStream = mergeStream();
  try {
    const renderResult = renderApplication({ appName, propsPromise });
    Promise.resolve(renderResult).then((result) => {
      const streams = renderResultToAppStreams(appName, result);
      contentStream.add(streams.contentStream);
      assetStream.add(streams.assetsStream);
    });
  } catch (error) {
    logError(appName, error);
  }

  assetsStream.add(assetStream);
  bodyStream.add(stringStream(`<div id="${applicationElementId(appName)}">`));
  bodyStream.add(contentStream);
  bodyStream.add(stringStream(`</div>`));
};

const serializeAssets: SerializeFunc = ({ assetsStream, bodyStream }) => {
  bodyStream.add(assetsStream);
};

const serializeAttributes: SerializeFunc = ({ bodyStream, node }) => {
  if (!treeAdapter.isElementNode(node)) return;
  treeAdapter
    .getAttrList(node)
    .forEach(({ name, namespace, prefix, value }) => {
      const attrValue = escapeString(value, true);
      let attrName = name;
      switch (namespace) {
        case NS.XML:
          attrName = `xml:${name}`;
          break;
        case NS.XMLNS:
          attrName = name === "xmlns" ? name : `xmlns:${name}`;
          break;
        case NS.XLINK:
          attrName = `xlink:${name}`;
          break;
        case undefined:
          break;
        default:
          attrName = `${prefix}:${name}`;
          break;
      }
      bodyStream.add(stringStream(` ${attrName}="${attrValue}"`));
    });
};

export const serializeChildNodes: SerializeFunc = (args) => {
  if (!treeAdapter.isParentNode(args.node)) return;
  const { inRouterElement, node: parentNode } = args;
  const childNodes = treeAdapter.getChildNodes(parentNode);
  childNodes.forEach((childNode) => {
    const node = childNode._originalNode ?? childNode;
    let serialize: Optional<SerializeFunc>;

    switch (true) {
      case !inRouterElement && treeAdapter.isApplicationNode(node):
        serialize = serializeApplication;
        break;

      case !inRouterElement && treeAdapter.isRouteNode(node):
        serialize = serializeRoute;
        break;

      case treeAdapter.isRouterContent(node):
        serialize = serializeRouterContent;
        break;

      case treeAdapter.isAssetsNode(node):
        serialize = serializeAssets;
        break;

      case treeAdapter.isFragmentNode(node):
        serialize = serializeFragment;
        break;

      case treeAdapter.isElementNode(node):
        serialize = serializeElement;
        break;

      case treeAdapter.isTextNode(node):
        serialize = serializeTextNode;
        break;

      case treeAdapter.isCommentNode(node):
        serialize = serializeCommentNode;
        break;

      case treeAdapter.isDocumentTypeNode(node):
        serialize = serializeDocumentTypeNode;
        break;

      default:
        break;
    }

    if (serialize) serialize({ ...args, node });
    else {
      console.error(node);
      throw Error(`Unable to serialize node: ${node.nodeName || node.type}`);
    }
  });
};

const serializeCommentNode: SerializeFunc = ({ bodyStream, node }) => {
  if (!treeAdapter.isCommentNode(node)) return;
  bodyStream.add(
    stringStream(`<!--${treeAdapter.getCommentNodeContent(node)}-->`)
  );
};

const serializeDocumentTypeNode: SerializeFunc = ({ bodyStream, node }) => {
  if (!treeAdapter.isDocumentTypeNode(node)) return;
  const name = treeAdapter.getDocumentTypeNodeName(node);
  bodyStream.add(stringStream(serializeDoctypeContent(name, "", "")));
};

const SELF_CLOSING_TAGS = [
  TAGS.AREA,
  TAGS.BASE,
  TAGS.BASEFONT,
  TAGS.BGSOUND,
  TAGS.BR,
  TAGS.COL,
  TAGS.EMBED,
  TAGS.FRAME,
  TAGS.HR,
  TAGS.IMG,
  TAGS.INPUT,
  TAGS.KEYGEN,
  TAGS.LINK,
  TAGS.META,
  TAGS.PARAM,
  TAGS.SOURCE,
  TAGS.TRACK,
  TAGS.WBR,
];

const serializeElement: SerializeFunc = (args) => {
  const { bodyStream, inRouterElement, node } = args;
  if (!treeAdapter.isElementNode(node)) return;
  const tn = treeAdapter.getTagName(node);
  bodyStream.add(stringStream(`<${tn}`));
  serializeAttributes(args);
  bodyStream.add(stringStream(`>`));

  if (!SELF_CLOSING_TAGS.includes(tn as html.TAG_NAMES)) {
    serializeChildNodes({
      ...args,
      inRouterElement: inRouterElement || tn === nodeNames.ROUTER,
      node:
        treeAdapter.isTemplateNode(node) &&
        treeAdapter.getNamespaceURI(node) === NS.HTML
          ? treeAdapter.getTemplateContent(node)
          : node,
    });
    bodyStream.add(stringStream(`</${tn}>`));
  }
};

const serializeFragment: SerializeFunc = ({
  bodyStream,
  node,
  renderOptions,
}) => {
  if (!treeAdapter.isElementNode(node)) return;
  const fragmentName = treeAdapter
    .getAttrList(node)
    .find(({ name }) => name === "name")?.value;
  if (!fragmentName) throw Error("<fragment> has unknown name");
  try {
    bodyStream.add(
      valueStream(
        renderOptions.renderFragment(fragmentName),
        `Fragment ${fragmentName}`
      )
    );
  } catch (error) {
    logError(`Fragment ${fragmentName}`, error);
  }
};

const getLayoutData = async (
  propPromises: Record<string, Promise<unknown>>
) => {
  const propsEntries = await Promise.all(
    Object.entries(propPromises).map(([propName, propValuePromise]) =>
      propValuePromise.then((propValue) => [propName, propValue] as const)
    )
  );
  const props = Object.fromEntries(propsEntries);
  return `<script>window.singleSpaLayoutData = ${JSON.stringify({
    props,
  })}</script>`;
};

const serializeLayoutData: SerializeFunc = ({ bodyStream, propPromises }) => {
  try {
    bodyStream.add(valueStream(getLayoutData(propPromises), "Layout data"));
  } catch (error) {
    logError("Serialize layout data", error);
  }
};

const serializeRouterContent: SerializeFunc = (args) => {
  const {
    renderOptions: {
      serverLayout: { resolvedRoutes },
      urlPath,
    },
  } = args;
  const { routes } = matchRoute(resolvedRoutes, urlPath);
  // @ts-expect-error TODO: why assign routes to node
  serializeChildNodes({ ...args, node: routes });
  serializeLayoutData(args);
};

const serializeRoute = serializeChildNodes;

const serializeTextNode: SerializeFunc = ({ bodyStream, node }) => {
  if (!treeAdapter.isTextNode(node)) return;
  const content = treeAdapter.getTextNodeContent(node);
  const parent = treeAdapter.getParentNode(node);
  const parentTagName =
    parent && treeAdapter.isElementNode(parent)
      ? treeAdapter.getTagName(parent)
      : null;

  switch (parentTagName) {
    case TAGS.IFRAME:
    case TAGS.NOEMBED:
    case TAGS.NOFRAMES:
    case TAGS.NOSCRIPT:
    case TAGS.PLAINTEXT:
    case TAGS.STYLE:
    case TAGS.SCRIPT:
    case TAGS.XMP:
      bodyStream.add(stringStream(content));
      break;

    default:
      bodyStream.add(stringStream(escapeString(content, false)));
      break;
  }
};
