const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load plugin config from project root package.json (not scripts/ package.json)
let config;
try {
  const pkgPath = path.resolve(__dirname, "..", "package.json");
  config = require(pkgPath).config || {};
} catch (e) {
  config = {};
}

const addonName     = config.addonName     || "PDF OCR (ocrmypdf)";
const addonRef     = config.addonRef      || "zotero-ocrmypdf";
const addonID      = config.addonID        || "zotero-ocrmypdf@lanphon.github.com";
const addonInstance = config.addonInstance  || "PDFOCR";
const homepage     = config.homepage       || "https://github.com/lanphon/zotero-ocrmypdf";

async function build() {
  const buildsDir = "./builds";
  if (fs.existsSync(buildsDir)) {
    fs.rmSync(buildsDir, { recursive: true });
  }
  fs.mkdirSync(buildsDir);

  // 1. Copy addon skeleton
  copyDir("./addon", "./builds/addon");

  // 2. Bundle TypeScript
  await esbuild.build({
    entryPoints: ["./src/index.ts"],
    bundle: true,
    outfile: `./builds/addon/chrome/content/scripts/${addonRef}.js`,
    format: "iife",
    globalName: addonRef.replace(/-/g, "_").replace(/\s/g, "") + "Module",
    target: "firefox60",
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV !== "production",
  });

  // 3. Replace build-time tokens in built JS
  replaceInFile(
    `./builds/addon/chrome/content/scripts/${addonRef}.js`,
    {
      "__buildVersion__":    process.env.npm_package_version || "0.0.0",
      "__buildTime__":      new Date().toISOString(),
      "__addonName__":      addonName,
      "__addonRef__":       addonRef,
      "__addonID__":        addonID,
      "__addonInstance__":  addonInstance,
      // __env__ is used by the source; "development"|"production"
      "__env__":            process.env.NODE_ENV === "production" ? '"production"' : '"development"',
    }
  );

  // 4. Replace tokens in addon manifest / rdf files
  const addonDir = "./builds/addon";
  walkSync(addonDir, (filePath) => {
    const ext = path.extname(filePath);
    if ([".json", ".rdf", ".dtd", ".properties", ".js", ".xul", ".xhtml"].includes(ext)) {
      replaceInFile(filePath, {
        "__buildVersion__":   process.env.npm_package_version || "0.0.0",
        "__addonName__":     addonName,
        "__addonRef__":      addonRef,
        "__addonID__":       addonID,
        "__addonInstance__": addonInstance,
        "__homepage__":      homepage,
        "__updateURL__":     `https://github.com/lanphon/zotero-ocrmypdf/releases/latest/download/update.rdf`,
      });
    }
  });

  // 5. Post-process: fix deprecated ChromeUtils.import() → ChromeUtils.importESModule()
  const jsFile = `./builds/addon/chrome/content/scripts/${addonRef}.js`;
  if (fs.existsSync(jsFile)) {
    let js = fs.readFileSync(jsFile, "utf8");
    // Patch the _importESModule polyfill: ChromeUtils.import(path) → importESModule
    js = js.replace(
      /ChromeUtils\.import\(([^)]+)\)/g,
      (match, args) => `ChromeUtils.importESModule(${args}, { global: "contextual" })`,
    );
    fs.writeFileSync(jsFile, js, "utf8");
    console.log("  ✓ Patched ChromeUtils.import → importESModule");
  }

  // 6. Zip into .xpi (relative path from inside addon dir is ../)
  const xpiPath = path.join(buildsDir, `${addonRef}.xpi`);
  execSync(`cd ${buildsDir}/addon && zip -r ../${addonRef}.xpi .`, { stdio: "pipe" });

  console.log(`Build complete! → ${xpiPath}`);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    entry.isDirectory()
      ? copyDir(srcPath, destPath)
      : fs.copyFileSync(srcPath, destPath);
  }
}

function walkSync(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    entry.isDirectory() ? walkSync(full, fn) : fn(full);
  }
}

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, "utf8");
  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.split(placeholder).join(value);
  }
  fs.writeFileSync(filePath, content, "utf8");
}

build().catch(console.error);
