// Zotero Plugin Bootstrap
// Patent PDF OCR - Convert scanned PDFs to searchable PDFs using ocrmypdf

const { XPCOM } = ChromeUtils.import("resource://gre/modules/XPCOM.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var PatentOCR = {
  startup: async function (data, reason) {
    // Wait for Zotero to be ready
    await Zotero.initializationPromise;
    
    // Load the plugin
    const rootURI = data.resourceURI.spec;
    Zotero.PatentOCR = {
      path: rootURI,
      data: { env: "bootstrap" }
    };
    
    // Import and initialize the plugin module
    const plugin = await import(rootURI + "chrome/content/scripts/index.js");
    if (plugin.default && plugin.default.init) {
      plugin.default.init();
    }
  },

  shutdown: function (data, reason) {
    // Cleanup
    if (Zotero.PatentOCR && Zotero.PatentOCR.hooks && Zotero.PatentOCR.hooks.onShutdown) {
      Zotero.PatentOCR.hooks.onShutdown(reason);
    }
    delete Zotero.PatentOCR;
  },

  install: function (data, reason) {},
  uninstall: function (data, reason) {}
};

function startup(data, reason) {
  PatentOCR.startup(data, reason);
}

function shutdown(data, reason) {
  PatentOCR.shutdown(data, reason);
}

function install(data, reason) {
  PatentOCR.install(data, reason);
}

function uninstall(data, reason) {
  PatentOCR.uninstall(data, reason);
}
