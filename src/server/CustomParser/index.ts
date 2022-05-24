import { html, Parser, Token } from "parse5";
import { CustomTreeAdapterMap, nodeNames } from "../../isomorphic";

export class CustomParser extends Parser<CustomTreeAdapterMap> {
  // TODO: what is this doing?
  override _processToken(token: Token.Token): void {
    if (
      this.insertionMode === /* InsertionMode.IN_HEAD */ 3 &&
      token.type === Token.TokenType.START_TAG &&
      (token.tagName === nodeNames.FRAGMENT ||
        token.tagName === nodeNames.ASSETS)
    ) {
      this._appendElement(token, html.NS.HTML);
      token.ackSelfClosing = true;
    } else {
      super._processToken(token);
    }
  }
}
