import { config } from "../package.json";

// Track registered windows to avoid double-registration in Zotero 9
// where bootstrap calls onMainWindowLoad for ALL existing windows on startup
const registeredWindows = new Set<any>();

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  // Register menu on ALL currently open windows (official template pattern)
  const windows = Zotero.getMainWindows();
  Zotero.debug(`[${config.addonName}] onStartup: found ${windows.length} open windows`);
  for (const win of windows) {
    registerMenuItem(win);
  }

  addon.data.initialized = true;
  Zotero.debug(`[${config.addonName}] Startup complete, registered ${windows.length} windows`);
}

// onMainWindowLoad is called by bootstrap for new windows AND existing windows on startup.
// Only register if not already registered to avoid double-registration.
async function onMainWindowLoad(win: any) {
  if (!registeredWindows.has(win)) {
    registerMenuItem(win);
  }
}

async function onMainWindowUnload(win: any) {
  registeredWindows.delete(win);
  const existing = win.document.getElementById("zotero-patent-ocr-item");
  if (existing) existing.remove();
}

function onShutdown() {
  for (const win of Zotero.getMainWindows()) {
    const existing = win.document.getElementById("zotero-patent-ocr-item");
    if (existing) existing.remove();
  }
  addon.data.alive = false;
  // @ts-expect-error
  delete Zotero[addon.data.config.addonInstance];
}

async function onNotify(event: string, type: string, ids: Array<string | number>, extraData: any) {
  Zotero.debug(`[${config.addonName}] notify ${event} ${type}`);
}

async function onPrefsEvent(type: string, data: any) {}
function onShortcuts(type: string) {}

function registerMenuItem(win: any) {
  try {
    const doc = win.document;

    // Listen at document level for ALL popupshowing events.
    // This avoids timing issues with lazily-created menu elements.
    doc.addEventListener("popupshowing", (event: Event) => {
      const popup = event.target as Element;
      if (popup.id !== "zotero-itemmenu") return;
      if (doc.getElementById("zotero-patent-ocr-item")) return;
      const menuitem = (doc as any).createXULElement("menuitem");
      menuitem.setAttribute("id", "zotero-patent-ocr-item");
      menuitem.setAttribute("label", "Convert to Searchable PDF");
      menuitem.setAttribute("accesskey", "O");
      menuitem.setAttribute("icon", "chrome://zotero-patent/content/icons/favicon.svg");
      menuitem.addEventListener("command", () => onConvertOCR());
      popup.appendChild(menuitem);
      Zotero.debug(`[${config.addonName}] Menu item registered (${popup.children.length} total children)`);
    });

    Zotero.debug(`[${config.addonName}] Document-level popupshowing listener attached`);
  } catch (e: any) {
    Zotero.debug(`[${config.addonName}] registerMenuItem error: ${e.message}`);
  }
}

async function onConvertOCR() {
  const ZoteroPane = (Zotero as any).getActiveZoteroPane();
  const items: any[] = ZoteroPane.getSelectedItems();
  const pdfItems = items.filter((item: any) => item.attachmentMIMEType === "application/pdf");

  if (pdfItems.length === 0) {
    showProgress("No PDF items selected", "warning");
    return;
  }

  const ocrPath = (Zotero as any).Prefs.get("zotero-patent.ocrpath") || detectOcrPath();
  const language = (Zotero as any).Prefs.get("zotero-patent.language") || "eng";
  const deskew = (Zotero as any).Prefs.get("zotero-patent.deskew") !== false;

  const { Subprocess } = ChromeUtils.importESModule("resource://gre/modules/Subprocess.sys.mjs");

  for (const item of pdfItems) {
    const inputPath = item.getFilePath();
    if (!inputPath) continue;
    const outputPath = inputPath.replace(".pdf", ".ocr.pdf");

    const args = ["--language", language, deskew ? "--deskew" : "--no-deskew", "-o", outputPath, inputPath];

    showProgress(`OCR: ${item.getDisplayTitle()}`, "default");

    try {
      const proc = await Subprocess.call({
        command: ocrPath,
        arguments: args,
        stderr: "stdout", // merge stderr into stdout for easier reading
      });

      let output = "";
      let chunk;
      while ((chunk = await proc.stdout.readString())) {
        output += chunk;
      }
      const { exitCode } = await proc.wait();

      if (exitCode === 0) {
        await item.replaceFile(outputPath);
        showProgress(`OCR done: ${item.getDisplayTitle()}`, "success");
      } else {
        showProgress(`OCR failed (exit ${exitCode}): ${output}`, "error");
      }
    } catch (e: any) {
      showProgress(`Error: ${e.message}`, "error");
    }
  }
}

function showProgress(text: string, type: "default" | "success" | "error" | "warning" = "default") {
  new (addon.data.ztoolkit.ProgressWindow as any)(config.addonName, { closeOnClick: true })
    .createLine({ text, type })
    .show();
}

function detectOcrPath(): string {
  if (Zotero.isMac) return "/usr/local/bin/ocrmypdf";
  if (Zotero.isWin) return "ocrmypdf";
  return "/usr/bin/ocrmypdf";
}

export default { onStartup, onShutdown, onMainWindowLoad, onMainWindowUnload, onNotify, onPrefsEvent, onShortcuts };
