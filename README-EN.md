# 复制图文增强版 (Copy Image Text Plus)

Copy Image Text Plus is an Obsidian plugin that allows users to copy note content, including text and local images, to the clipboard while maintaining formatting. It can also export note content as HTML files.

## Features

- Supports two copy modes:
  - Copy text and images (rich text format): Suitable for Word, WeChat public account editor, etc.
  - Copy as Markdown format: Suitable for other Markdown editors
- Automatically convert Obsidian images to inline base64 format (rich text mode) or standard Markdown image links (Markdown mode)
- **New:** Supports exporting note content to HTML files for easy viewing or sharing in browsers.
- Maintain Markdown formatting, including headers, bold, italic, code blocks, etc.
- Specially optimized for display in WeChat public account editor

## Usage

1. Open a note in Obsidian
2. Select the text you want to copy (if no selection, the entire document will be copied)
3. Use the command palette to execute one of the following commands:
   - "Copy text and images (rich text)": Copy as rich text format
   - "Copy as Markdown format": Copy as standard Markdown format
4. Paste the content in the target application

Tip: You can set hotkeys for these two commands in Obsidian Settings under "Hotkeys" for more convenient use.

## Installation

### BRAT beta installation

1. Install and enable `Obsidian42 - BRAT` in Obsidian.
2. Open the command palette and run `BRAT: Add a beta plugin for testing`.
3. Enter the repository URL:

```text
https://github.com/jihaohaaaa/obsidian-copy-image-text
```

4. BRAT installs `main.js` and `manifest.json` from the GitHub Release.

### Manual installation

1. Download `main.js` and `manifest.json` from the latest Release.
2. Place them in your vault:

```text
<vault>/.obsidian/plugins/jihao-copy-image-text/
```

3. Restart Obsidian or reload the plugin, then enable it in the community plugins settings.

### Community plugin installation

After the plugin is listed in the Obsidian community plugin directory, install it with:

1. Open Obsidian Settings
2. Go to "Third-party plugins" settings page
3. Make sure "Safe mode" is turned off
4. Click "Browse community plugins"
5. Search for "Copy Image Text Plus"
6. Click "Install"
7. After installation, enable the plugin

## Development Notes

This plugin is developed with TypeScript and uses Node.js with npm. Prefer the repository `.node-version` and `packageManager` settings. The bundler is Vite.

Common commands:

```bash
npm install
npm run dev
npm run build
npm run check
npm run format
```

Install to a specific local vault:

```bash
npm run build
npm run install:local -- "/path/to/your-vault"
```

Bump the version:

```bash
npm run version:bump -- 1.1.13
npm install --package-lock-only
```

Create a GitHub Release for BRAT:

```bash
npm run release:github -- 1.1.13
```

The compiled `main.js` file is not committed to version control, but it is uploaded as a GitHub Release asset.

## Notes

- Image size is limited to 10MB, images exceeding this size will not be copied
- Some special formatting may not be fully preserved in certain target applications
- Please ensure you have the right to copy and share the images contained in your notes
- Tips for using Markdown format copy:
  - If you want to publish your document to GitHub or blog platforms, follow these steps:
    1. Use an editor that supports image bed upload (e.g., Typora + PicList)
    2. Upload the images in your document to an image bed (tested in Typora)
    3. This will convert your images to online links
    4. Then you can simply copy the entire document, as all images are now online links
  - Obsidian might have similar image bed upload plugins available (untested)

## Feedback and Support

If you encounter any issues or have suggestions for improvement, please raise an issue in the GitHub repository:

https://github.com/jihaohaaaa/obsidian-copy-image-text/issues

## License

This plugin is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

This plugin is based on [msgk239/obsidian-copy-image-text](https://github.com/msgk239/obsidian-copy-image-text), originally developed by msgk and distributed under the MIT License.

## Author

Maintained by jihaohaaaa.

## Version

Current version: 1.1.14
