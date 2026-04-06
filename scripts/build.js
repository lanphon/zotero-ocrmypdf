const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

// Load plugin config from project root package.json (not scripts/ package.json)
let config;
try {
  config = require("path").resolve(__dirname, "..", "package.json");
  config = require(config).config; // fallback to project root config
} catch (e) {
  // If anything goes wrong, leave config undefined and continue
  config = {};
}

async function build() {
  // Clean builds directory
  const buildsDir = "./builds";
  if (fs.existsSync(buildsDir)) {
    fs.rmSync(buildsDir, { recursive: true });
  }
  fs.mkdirSync(buildsDir);

  // Copy addon to builds
  copyDir("./addon", "./builds/addon");

  // Build TypeScript
  await esbuild.build({
    entryPoints: ["./src/index.ts"],
    bundle: true,
    outfile: "./builds/addon/chrome/content/scripts/index.js",
    format: "iife",
    globalName: "ZoteroPatentOCR",
    target: "firefox60",
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV !== "production",
  });

  console.log("Build complete!");
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

build().catch(console.error);
