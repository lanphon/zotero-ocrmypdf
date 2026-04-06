import { config } from "../package.json";
import PatentOCRPlugin from "./plugin";
import { BasicExampleFactory } from "./modules/examples";

class Hooks {
  public plugin: PatentOCRPlugin;

  constructor() {
    this.plugin = new PatentOCRPlugin();
  }

  public onStartup() {
    // Initialize plugin
    this.plugin.init();

    // Register UI elements
    this._registerContextMenu();
    ztoolkit.log("PatentOCR: Plugin started");
  }

  public onShutdown() {
    ztoolkit.unregisterAll();
    ztoolkit.log("PatentOCR: Plugin shutdown");
  }

  public onNotify(
    event: string,
    type: string,
    ids: number[] | string[],
    extraData: { [key: string]: any }
  ) {
    // Handle Zotero notifications
    ztoolkit.log(event, type, ids);
  }

  private _registerContextMenu() {
    const menuIcon = `chrome://${config.addonRef}/content/icons/favicon.png`;
    
    // Register right-click menu item
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-patent-ocr",
      label: "Convert to Searchable PDF",
      commandListener: () => this.plugin._runOCR(),
      icon: menuIcon,
    });
  }
}

export default Hooks;
