# Zotero Patent PDF OCR

A Zotero plugin to convert scanned PDFs to searchable PDFs using ocrmypdf.

## Features

- **Right-click context menu**: Right-click on a PDF item and select "Convert to Searchable PDF"
- **Toolbar button**: Click the toolbar button to OCR selected PDF(s)
- **Keyboard shortcut**: Press `Ctrl+Shift+O` to run OCR on selected PDFs

## Requirements

- [ocrmypdf](https://ocrmypdf.readthedocs.io/) must be installed on your system
  - **macOS**: `brew install ocrmypdf`
  - **Windows**: `pip install ocrmypdf`
  - **Linux**: `pip install ocrmypdf` or `apt install ocrmypdf`

## Installation

1. Build the plugin from source:
   ```bash
   npm install
   npm run build
   ```

2. The built `.xpi` file will be in the `builds` folder

3. In Zotero, go to **Tools > Add-ons**, click the gear icon, and select **Install Add-on From File**

4. Navigate to `builds/zotero-patent.xpi` and install

## Usage

1. Select one or more PDF attachments in Zotero
2. Right-click and select "Convert to Searchable PDF", or use the toolbar button
3. The PDF will be processed and replaced with the OCR'd version

## Configuration

In Zotero's config editor (`about:config`), you can set:

- `zotero-patent.ocrpath`: Path to ocrmypdf executable (auto-detected by default)
- `zotero-patent.language`: OCR language code (default: "eng")
- `zotero-patent.deskew`: Enable deskewing (default: true)

## Development

```bash
# Install dependencies
npm install

# Build development version
npm run build-dev

# Build production version
npm run build
```

## License

MIT
