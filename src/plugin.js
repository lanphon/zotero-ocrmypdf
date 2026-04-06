// Zotero Plugin: Patent PDF OCR
// Converts scanned PDFs to searchable PDFs using ocrmypdf

"use strict";

import { BasicTool, MenuManager, UITool, KeyboardManager, DialogHelper, Prompt } from "zotero-plugin-toolkit";

class PatentOCRPlugin extends BasicTool {
  constructor() {
    super();
    this.ocrQueue = new Map();
    this.defaultOcrPath = this._detectOcrPath();
    this._ui = new UITool();
  }

  get tooltip() {
    return "Convert to searchable PDF using ocrmypdf";
  }

  _detectOcrPath() {
    const Zotero = this.getGlobal("Zotero");
    if (Zotero.isWin) {
      return "ocrmypdf";
    } else if (Zotero.isMac) {
      return "/usr/local/bin/ocrmypdf";
    } else {
      return "/usr/bin/ocrmypdf";
    }
  }

  init() {
    this._loadPreferences();
    this._registerToolbarButton();
    this._registerContextMenu();
    this._registerShortcuts();
    this.getGlobal("Zotero").ZoteroPatents.initComplete = true;
  }

  _loadPreferences() {
    const Zotero = this.getGlobal("Zotero");
    this.ocrPath = Zotero.Prefs.get("zotero-patent.ocrpath") || this.defaultOcrPath;
    this.language = Zotero.Prefs.get("zotero-patent.language") || "eng";
    this.deskew = Zotero.Prefs.get("zotero-patent.deskew") !== false;
  }

  _registerToolbarButton() {
    const icon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M4 8h8M8 4v8" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    `;

    this._ui.register("item", {
      id: "zotero-patent-toolbar-button",
      icon: icon,
      tooltip: this.tooltip,
      onClick: () => this._runOCR()
    });
  }

  _registerContextMenu() {
    const menuManager = new MenuManager();
    menuManager.register("item-context-menu", {
      id: "zotero-patent-ocr",
      label: "Convert to Searchable PDF",
      icon: null,
      callback: () => this._runOCR()
    });
  }

  _registerShortcuts() {
    const keyManager = new KeyboardManager();
    keyManager.register("ctrl+shift+o", {
      callback: () => this._runOCR()
    });
  }

  async _runOCR() {
    const ZoteroPane = this.getGlobal("ZoteroPane");
    const items = ZoteroPane.getSelectedItems();
    const pdfItems = items.filter(item => item.attachmentMIMEType === "application/pdf");

    if (pdfItems.length === 0) {
      this._showNotification("No PDF items selected", "warning");
      return;
    }

    for (const item of pdfItems) {
      await this._ocrSinglePDF(item);
    }
  }

  async _ocrSinglePDF(item) {
    const path = item.getFilePath();
    if (!path) {
      this._showNotification("Could not get file path", "error");
      return;
    }

    const outputPath = path.replace(".pdf", ".ocr.pdf");
    const ocrPath = this.ocrPath;
    const Zotero = this.getGlobal("Zotero");

    // Build ocrmypdf arguments
    const args = [
      "--language", this.language,
      this.deskew ? "--deskew" : "--no-deskew",
      "-o", outputPath,
      path
    ];

    try {
      this._showNotification(`Starting OCR for: ${item.getDisplayTitle()}`, "info");

      const process = await Zotero.File.execAsync(ocrPath, args);

      if (process.exitCode === 0) {
        // Replace the original PDF with the OCR version
        await item.replaceFile(outputPath);
        this._showNotification("OCR completed successfully", "info");
      } else {
        const error = process.stderr || "Unknown error";
        this._showNotification(`OCR failed: ${error}`, "error");
      }
    } catch (e) {
      this._showNotification(`OCR error: ${e.message}`, "error");
    }
  }

  _showNotification(message, type = "info") {
    const Zotero = this.getGlobal("Zotero");
    if (type === "error") {
      Zotero.error(message);
    } else {
      Zotero.debug(message);
    }
  }
}

// Register plugin
const ztoolkit = new (require("zotero-plugin-toolkit").ZoteroToolkit)();
const plugin = new PatentOCRPlugin();

ztoolkit.register("plugin", {
  init: () => {
    plugin.init();
  },
  destroy: () => {
    // Cleanup
  },
  getSchema: () => ({
    id: "zotero-patent",
    name: "Patent PDF OCR"
  })
});

module.exports = { PatentOCRPlugin, plugin };
