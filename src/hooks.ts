import { config } from "../package.json";

// ── Lifecycle hooks ───────────────────────────────────────────────────────────

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: Window): Promise<void> {
  const doc = win.document;

  // Register context menu: inject a menuitem into the item-context-menu popup
  const popup = doc.getElementById("zotero-itemmenu");
  if (popup) {
    const menuitem = doc.createXULElement("menuitem");
    menuitem.setAttribute("id", "zotero-patent-ocr-item");
    menuitem.setAttribute("label", "Convert to Searchable PDF");
    menuitem.setAttribute("accesskey", "O");
    menuitem.setAttribute(
      "icon",
      `chrome://${config.addonRef}/content/icons/favicon.svg`,
    );
    menuitem.addEventListener("command", () => onConvertOCR());
    popup.appendChild(menuitem);
  }

  // Register keyboard shortcut: Ctrl+Shift+O on the main window
  win.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "O") {
        e.preventDefault();
        onConvertOCR();
      }
    },
    false,
  );
}

async function onMainWindowUnload(win: Window): Promise<void> {
  // Remove injected menuitem
  const doc = win.document;
  const menuitem = doc.getElementById("zotero-patent-ocr-item");
  if (menuitem) menuitem.remove();
}

function onShutdown(): void {
  addon.data.alive = false;
  // @ts-expect-error
  delete Zotero[addon.data.config.addonInstance];
}

async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // @ts-expect-error
  addon.data.ztoolkit?.basicOptions?.log?.prefix;
  Zotero.debug(`[${config.addonName}] notify ${event} ${type}`);
}

async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  // no-op
}

function onShortcuts(type: string) {
  // no-op
}

// ── OCR ─────────────────────────────────────────────────────────────────────

async function onConvertOCR() {
  const ZoteroPane = (Zotero as any).getActiveZoteroPane();
  const items: any[] = ZoteroPane.getSelectedItems();
  const pdfItems = items.filter(
    (item: any) => item.attachmentMIMEType === "application/pdf",
  );

  if (pdfItems.length === 0) {
    showProgress("No PDF items selected", "warning");
    return;
  }

  const ocrPath =
    (Zotero as any).Prefs.get("zotero-patent.ocrpath") || detectOcrPath();
  const language =
    (Zotero as any).Prefs.get("zotero-patent.language") || "eng";
  const deskew = (Zotero as any).Prefs.get("zotero-patent.deskew") !== false;

  for (const item of pdfItems) {
    const inputPath = item.getFilePath();
    if (!inputPath) continue;

    const outputPath = inputPath.replace(".pdf", ".ocr.pdf");

    const args = [
      "--language", language,
      deskew ? "--deskew" : "--no-deskew",
      "-o", outputPath,
      inputPath,
    ];

    showProgress(`OCR: ${item.getDisplayTitle()}`, "default");

    try {
      const { stdout, stderr, exitCode } = await Zotero.File.execAsync(
        ocrPath,
        args,
      );
      if (exitCode === 0) {
        await item.replaceFile(outputPath);
        showProgress(`OCR done: ${item.getDisplayTitle()}`, "success");
      } else {
        showProgress(`OCR failed: ${stderr || "unknown error"}`, "error");
      }
    } catch (e: any) {
      showProgress(`Error: ${e.message}`, "error");
    }
  }
}

function showProgress(
  text: string,
  type: "default" | "success" | "error" | "warning" = "default",
) {
  new (addon.data.ztoolkit.ProgressWindow as any)(config.addonName, {
    closeOnClick: true,
  })
    .createLine({ text, type })
    .show();
}

function detectOcrPath(): string {
  if (Zotero.isMac) return "/usr/local/bin/ocrmypdf";
  if (Zotero.isWin) return "ocrmypdf";
  return "/usr/bin/ocrmypdf";
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
};
