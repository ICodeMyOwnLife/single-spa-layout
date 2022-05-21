import { html } from "parse5";
import { serializeDoctypeContent } from "parse5-htmlparser2-tree-adapter";
import {
  Application,
  CustomElement,
  matchRoute,
  MISSING_PROP,
  nodeNames,
} from "../../isomorphic";
import { applicationElementId } from "../../utils";
import { treeAdapter } from "../treeAdapter";
import { escapeString } from "./escapeString";
import { logError } from "./logError";
import { MergeStream } from "./streams";
import { AppToRender, SerializeArgs, SerializeFunc } from "./types";

const NS = html.NS;
const TAGS = html.TAG_NAMES;

const getPropsPromise = async (
  { name: appName, props: configProps = {} }: Application,
  { propPromises, renderOptions: { retrieveProp } }: SerializeArgs
) => {
  const propEntries = await Promise.all(
    Object.keys(configProps).map(async (propName) => {
      const propValue = configProps[propName];
      const value =
        propValue === MISSING_PROP
          ? (propPromises[propName] ||= Promise.resolve(retrieveProp(propName)))
          : propValue;
      const resolvedValue = await Promise.resolve(value);
      return [propName, resolvedValue] as const;
    })
  );
  const props = Object.fromEntries(propEntries);
  props["name"] = appName;
  return props;
};

const getAppStreams = (
  { appName, propsPromise }: AppToRender,
  { renderOptions: { renderApplication } }: SerializeArgs
) => {
  const contentStream = new MergeStream(`[${appName}-contentStream]`);
  const assetStream = new MergeStream(`[${appName}-assetStream]`);
  try {
    const renderResultPromise = Promise.resolve(
      renderApplication({ appName, propsPromise })
    );
    const contentPromise = renderResultPromise.then((result) =>
      typeof result === "object" && "content" in result
        ? result.content
        : result
    );
    const assetsPromise = renderResultPromise.then((result) =>
      typeof result === "object" && "assets" in result ? result.assets : ""
    );
    contentStream.add(contentPromise, `[${appName}-content]`);
    assetStream.add(assetsPromise, `[${appName}-assets]`);
  } catch (error) {
    logError(appName, error);
  }

  return { assetStream, contentStream };
};

const serializeApplication: SerializeFunc = (args) => {
  const {
    assetsStream,
    bodyStream,
    applicationPropPromises,
    headerPromises,
    node,
    renderOptions: { retrieveApplicationHeaders },
  } = args;
  if (!treeAdapter.isApplicationNode(node)) return;
  const { name: appName } = node;
  const propsPromise = getPropsPromise(node, args);
  applicationPropPromises[appName] = propsPromise;
  headerPromises[appName] = retrieveApplicationHeaders({
    appName,
    propsPromise,
  });
  const { assetStream, contentStream } = getAppStreams(
    { appName, propsPromise },
    args
  );
  assetsStream.add(assetStream);
  bodyStream.add(`<div id="${applicationElementId(appName)}">`);
  bodyStream.add(contentStream);
  bodyStream.add(`</div>`);
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
      bodyStream.add(` ${attrName}="${attrValue}"`);
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
  bodyStream.add(`<!--${treeAdapter.getCommentNodeContent(node)}-->`);
};

const serializeDocumentTypeNode: SerializeFunc = ({ bodyStream, node }) => {
  if (!treeAdapter.isDocumentTypeNode(node)) return;
  const name = treeAdapter.getDocumentTypeNodeName(node);
  bodyStream.add(`<${serializeDoctypeContent(name, "", "")}>`);
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
  bodyStream.add(`<${tn}`);
  serializeAttributes(args);
  bodyStream.add(`>`);

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
    bodyStream.add(`</${tn}>`);
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
      renderOptions.renderFragment(fragmentName),
      `Fragment ${fragmentName}`
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
    bodyStream.add(getLayoutData(propPromises), "Layout data");
  } catch (error) {
    logError("Serialize layout data", error);
  }
};

const serializeRouterContent: SerializeFunc = (args) => {
  const {
    node,
    renderOptions: {
      serverLayout: { resolvedRoutes },
      urlPath,
    },
  } = args;
  const { routes } = matchRoute(resolvedRoutes, urlPath);
  serializeChildNodes({
    ...args,
    // TODO: use routes: routes?
    node: { ...node, childNodes: routes as CustomElement[] },
  });
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
      bodyStream.add(content);
      break;

    default:
      bodyStream.add(escapeString(content, false));
      break;
  }
};
