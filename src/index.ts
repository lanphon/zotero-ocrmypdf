import { ZoteroToolkit } from "zotero-plugin-toolkit";
import Addon from "./addon";
import { config } from "../package.json";

const _ztoolkit = new ZoteroToolkit();

// @ts-expect-error - runtime global, not typed
if (!_ztoolkit.getGlobal("Zotero")[config.addonInstance]) {
  // @ts-expect-error
  _globalThis.addon = new Addon();
  Object.defineProperty(_globalThis, "ztoolkit", {
    get() {
      // @ts-expect-error
      return _globalThis.addon.data.ztoolkit;
    },
  });
  // @ts-expect-error
  Zotero[config.addonInstance] = _globalThis.addon;
}
