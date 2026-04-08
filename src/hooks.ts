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
  const existing = win.document.getElementById("zotero-ocrmypdf-item");
  if (existing) existing.remove();
}

function onShutdown() {
  for (const win of Zotero.getMainWindows()) {
    const existing = win.document.getElementById("zotero-ocrmypdf-item");
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
      if (doc.getElementById("zotero-ocrmypdf-item")) return;
      const menuitem = (doc as any).createXULElement("menuitem");
      menuitem.setAttribute("id", "zotero-ocrmypdf-item");
      menuitem.setAttribute("label", "Convert to Searchable PDF");
      menuitem.setAttribute("accesskey", "O");
      menuitem.setAttribute("icon", "chrome://zotero-ocrmypdf/content/icons/favicon.svg");
      menuitem.addEventListener("command", () => onConvertOCR());
      popup.appendChild(menuitem);
      Zotero.debug(`[${config.addonName}] Menu item registered (${popup.children.length} total children)`);
    });

    const toolsMenu = doc.getElementById("menu_ToolsPopup");
    if (toolsMenu && !doc.getElementById("zotero-ocrmypdf-settings-item")) {
      const sep = (doc as any).createXULElement("menuseparator");
      sep.id = "zotero-ocrmypdf-settings-sep";
      const settingsItem = (doc as any).createXULElement("menuitem");
      settingsItem.id = "zotero-ocrmypdf-settings-item";
      settingsItem.setAttribute("label", `${config.addonName} Settings`);
      settingsItem.setAttribute("accesskey", "S");
      settingsItem.addEventListener("command", () => openSettings());
      toolsMenu.appendChild(sep);
      toolsMenu.appendChild(settingsItem);
    }

    Zotero.debug(`[${config.addonName}] Document-level popupshowing listener attached`);
  } catch (e: any) {
    Zotero.debug(`[${config.addonName}] registerMenuItem error: ${e.message}`);
  }
}

function openSettings() {
  const win = Zotero.getMainWindow();
  if (!win) return;
  const doc = win.document;

  const PREFIX = "zotero-ocrmypdf.";

  const existing = doc.getElementById("zotero-ocrmypdf-settings-panel");
  if (existing) { existing.remove(); }

  const panel = doc.createElement("div");
  panel.id = "zotero-ocrmypdf-settings-panel";
  panel.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    z-index: 99999; background: #fff; border: 1px solid #ccc; border-radius: 8px;
    padding: 20px; width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px;
  `;

  const overlay = doc.createElement("div");
  overlay.id = "zotero-ocrmypdf-settings-overlay";
  overlay.style.cssText = "position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.3);";
  overlay.addEventListener("click", () => { overlay.remove(); panel.remove(); }, { once: true });

  panel.innerHTML = `
    <div style="margin-bottom:12px;font-weight:600;font-size:15px;">PDF OCR (ocrmypdf) Settings</div>
    <div style="margin-bottom:6px;font-weight:500;">Languages</div>
    <input type="text" id="zotero-ocrmypdf-lang" value="${Zotero.Prefs.get(PREFIX + "language") || "eng"}"
      style="width:100%;padding:6px 8px;box-sizing:border-box;margin-bottom:4px;border:1px solid #ccc;border-radius:4px;"/>
    <div style="font-size:11px;color:#888;margin-bottom:12px;">e.g. eng, chi_sim+eng, deu+eng</div>
    <label style="display:flex;align-items:center;gap:6px;margin-bottom:16px;cursor:pointer;">
      <input type="checkbox" id="zotero-ocrmypdf-deskew" ${Zotero.Prefs.get(PREFIX + "deskew") !== false ? "checked" : ""}/>
      Deskew pages
    </label>
    <div style="display:flex;gap:6px;justify-content:flex-end;border-top:1px solid #eee;padding-top:12px;">
      <button id="zotero-ocrmypdf-reset" style="padding:6px 14px;border-radius:4px;border:1px solid #ccc;background:#f4f4f4;cursor:pointer;">Reset</button>
      <button id="zotero-ocrmypdf-close" style="padding:6px 14px;border-radius:4px;border:1px solid #ccc;background:#f4f4f4;cursor:pointer;">Cancel</button>
      <button id="zotero-ocrmypdf-save" style="padding:6px 14px;border-radius:4px;border:none;background:#4d90fe;color:#fff;cursor:pointer;">Save</button>
    </div>
  `;

  doc.body.appendChild(overlay);
  doc.body.appendChild(panel);

  const langInput = panel.querySelector("#zotero-ocrmypdf-lang") as HTMLInputElement;
  const deskewInput = panel.querySelector("#zotero-ocrmypdf-deskew") as HTMLInputElement;

  (panel.querySelector("#zotero-ocrmypdf-save") as HTMLElement).addEventListener("click", () => {
    Zotero.Prefs.set(PREFIX + "language", langInput.value.trim() || "eng");
    Zotero.Prefs.set(PREFIX + "deskew", deskewInput.checked);
    showProgress("Settings saved", "success");
    overlay.remove(); panel.remove();
  });

  (panel.querySelector("#zotero-ocrmypdf-close") as HTMLElement).addEventListener("click", () => { overlay.remove(); panel.remove(); });
  (panel.querySelector("#zotero-ocrmypdf-reset") as HTMLElement).addEventListener("click", () => {
    langInput.value = "eng"; deskewInput.checked = true;
  });

  langInput.focus();
}

async function onConvertOCR() {
  const ZoteroPane = (Zotero as any).getActiveZoteroPane();
  const items: any[] = ZoteroPane.getSelectedItems();
  const pdfItems = items.filter((item: any) => item.attachmentMIMEType === "application/pdf");

  if (pdfItems.length === 0) {
    showProgress("No PDF items selected", "warning");
    return;
  }

  const ocrPath = Zotero.Prefs.get("zotero-ocrmypdf.ocrpath") || await detectOcrPath();
  const language = Zotero.Prefs.get("zotero-ocrmypdf.language") || "eng";
  const deskew = Zotero.Prefs.get("zotero-ocrmypdf.deskew") !== false;

  const { Subprocess } = ChromeUtils.importESModule("resource://gre/modules/Subprocess.sys.mjs");

  for (const item of pdfItems) {
    const inputPath = item.getFilePath();
    if (!inputPath) continue;
    const outputPath = inputPath.replace(".pdf", ".ocr.pdf");

    // Newer ocrmypdf (v15+): input/output are positional, --force overwrites existing output
    const args = [inputPath, outputPath, "-l", language, deskew ? "--deskew" : "--no-deskew", "--force"];

    showProgress(`OCR: ${item.getDisplayTitle()}`, "default");

    try {
      Zotero.debug(`[${config.addonName}] Running: ${ocrPath} ${args.join(" ")}`);

      // Run through a login shell so ocrmypdf sees the same environment as the terminal
      const shell = Zotero.isWin ? "cmd" : (Zotero.isMac ? "/bin/zsh" : "/bin/bash");
      const cmdStr = [ocrPath, ...args].map((a) => `"${a}"`).join(" ");
      const shellArgs = Zotero.isWin
        ? ["/c", cmdStr]
        : ["-l", "-c", cmdStr];

      const proc = await Subprocess.call({
        command: shell,
        arguments: shellArgs,
        stdout: "pipe",
        stderr: "stdout",
        stdin: "close",
      });

      let output = "";
      let chunk;
      while ((chunk = await proc.stdout.readString())) {
        output += chunk;
      }
      const { exitCode } = await proc.wait();

      if (exitCode === 0) {
        // Zotero 7+: use attachmentPath setter to point the attachment to the new file
        item.attachmentPath = outputPath;
        await item.saveTx();
        showProgress(`OCR done: ${item.getDisplayTitle()}`, "success");
      } else {
        Zotero.debug(`[${config.addonName}] ocrmypdf stderr+stdout: ${output}`);
        showProgress(`OCR failed (exit ${exitCode}): ${output.substring(0, 200)}`, "error");
      }
    } catch (e: any) {
      Zotero.debug(`[${config.addonName}] ocrmypdf error: ${e.message}`);
      showProgress(`Error: ${e.message}`, "error");
    }
  }
}

function showProgress(text: string, type: "default" | "success" | "error" | "warning" = "default") {
  new (addon.data.ztoolkit.ProgressWindow as any)(config.addonName, { closeOnClick: true })
    .createLine({ text, type })
    .show();
}

async function detectOcrPath(): Promise<string> {
  const { Subprocess } = ChromeUtils.importESModule("resource://gre/modules/Subprocess.sys.mjs");

  try {
    // Use login shell to match user's terminal environment (PATH, aliases, etc.)
    const shell = Zotero.isWin ? "cmd" : (Zotero.isMac ? "/bin/zsh" : "/bin/bash");
    const shellArgs = Zotero.isWin
      ? ["/c", "where ocrmypdf"]
      : ["-l", "-c", "which ocrmypdf 2>/dev/null || type ocrmypdf 2>/dev/null"];

    // Subprocess.env REPLACES the entire environment — include all needed vars
    const env: Record<string, string> = {
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
      HOME: Services.env.get("HOME") || "",
      USER: Services.env.get("USER") || "",
      LANG: "en_US.UTF-8",
    };

    const proc = await Subprocess.call({
      command: shell,
      arguments: shellArgs,
      stdout: "pipe",
      stderr: "pipe",
      // Don't wait for stdin — close it immediately
      stdin: "close",
      env,
    });
    let output = "";
    let chunk;
    while ((chunk = await proc.stdout.readString())) {
      output += chunk;
    }
    await proc.wait();

    if (Zotero.isWin) {
      // `where` outputs path on each line — take first
      const path = output.split("\n")[0].trim();
      return path || "ocrmypdf";
    }

    // `which` or `type` output: /path/to/ocrmypdf or "ocrmypdf is /path/to/ocrmypdf"
    const line = output.split("\n")[0].trim();
    const match = line.match(/\/[\S]+$/);
    return match ? match[0] : "ocrmypdf";
  } catch {
    return "ocrmypdf";
  }
}

export default { onStartup, onShutdown, onMainWindowLoad, onMainWindowUnload, onNotify, onPrefsEvent, onShortcuts };
