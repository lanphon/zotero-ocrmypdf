# Zotero ocrmypdf

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

1. Download the latest `.xpi` from the [Releases](https://github.com/lanphon/zotero-ocrmypdf/releases) page

2. In Zotero, go to **Tools > Add-ons**, click the gear icon, and select **Install Add-on From File**

3. Select the downloaded `.xpi` file

Or build from source:
   ```bash
   npm install
   npm run build
   ```
   The built `.xpi` will be at `builds/zotero-ocrmypdf.xpi`

## Usage

1. Select one or more PDF attachments in Zotero
2. Right-click and select "Convert to Searchable PDF", or use the toolbar button
3. The PDF will be processed and replaced with the OCR'd version

## Configuration

In Zotero's config editor (`about:config`), you can set:

- `zotero-ocrmypdf.ocrpath`: Path to ocrmypdf executable (auto-detected by default)
- `zotero-ocrmypdf.language`: OCR language code (default: "eng")
- `zotero-ocrmypdf.deskew`: Enable deskewing (default: true)

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
