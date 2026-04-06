import { config } from "../package.json";
import { ZoteroToolkit } from "zotero-plugin-toolkit";
import Hooks from "./hooks";

// Make ztoolkit available globally
declare global {
  var ztoolkit: ZoteroToolkit;
  var addon: Hooks;
}

// Initialize toolkit
const ztoolkit = new ZoteroToolkit();
(window as any).ztoolkit = ztoolkit;
(window as any).addon = new Hooks();

// Export for use
export { ztoolkit, addon };
export default Hooks;
