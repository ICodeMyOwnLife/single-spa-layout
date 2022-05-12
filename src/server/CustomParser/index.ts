import { html, Parser, Token } from "parse5";
import { InsertionMode } from "parse5/dist/parser";
import { CustomTreeAdapterMap } from "../../isomorphic";

// TODO: use custom TreeAdapterMap?
export class CustomParser extends Parser<CustomTreeAdapterMap> {
  // TODO: what is this doing?
  override _processToken(token: Token.Token): void {
    if (
      this.insertionMode === InsertionMode.IN_HEAD &&
      token.type === Token.TokenType.START_TAG &&
      (token.tagName === "fragment" || token.tagName === "assets")
    ) {
      this._appendElement(token, html.NS.HTML);
      token.ackSelfClosing = true;
    } else {
      super._processToken(token);
    }
  }
}
