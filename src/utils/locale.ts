import { config } from "../../package.json";

export { initLocale, getString, getLocaleID };

/**
 * Initialize locale data — uses Fluent if available, falls back gracefully.
 */
function initLocale() {
  try {
    const l10n = new (typeof Localization === "undefined"
      ? ztoolkit.getGlobal("Localization")
      : Localization)([`${config.addonRef}-addon.ftl`], true);
    addon.data.locale = { current: l10n };
  } catch (e) {
    // Locale system unavailable — strings will return the key
    addon.data.locale = { current: null };
  }
}

function getString(key) {
  const prefix = `${config.addonRef}-${key}`;
  const locale = addon.data.locale?.current;
  if (!locale) return prefix;
  try {
    const msg = locale.formatMessagesSync([{ id: prefix }])[0];
    return msg?.value || prefix;
  } catch {
    return prefix;
  }
}

function getLocaleID(key) {
  return `${config.addonRef}-${key}`;
}
