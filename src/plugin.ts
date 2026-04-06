// Zotero Plugin: Patent PDF OCR
// Converts scanned PDFs to searchable PDFs using ocrmypdf

"use strict";

import { config } from "../package.json";
import { getString } from "../utils/locale";

class PatentOCRPlugin {
  constructor() {
    this.ocrQueue = new Map();
    this.defaultOcrPath = this._detectOcrPath();
  }

  get tooltip() {
    return "Convert to searchable PDF using ocrmypdf";
  }

  _detectOcrPath() {
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
    ztoolkit.log("PatentOCRPlugin: Initializing");
  }

  _loadPreferences() {
    this.ocrPath = Zotero.Prefs.get("zotero-patent.ocrpath") || this.defaultOcrPath;
    this.language = Zotero.Prefs.get("zotero-patent.language") || "eng";
    this.deskew = Zotero.Prefs.get("zotero-patent.deskew") !== false;
  }

  async _runOCR() {
    const ZoteroPane = ztoolkit.getGlobal("ZoteroPane");
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
    if (type === "error") {
      Zotero.error(message);
    } else {
      Zotero.debug(message);
    }
    // Also show progress window for better visibility
    new ztoolkit.ProgressWindow(config.addonName)
      .createLine({
        text: message,
        type: type === "error" ? "error" : "success",
      })
      .show();
  }
}

export default PatentOCRPlugin;
