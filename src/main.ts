import {
  Editor,
  MarkdownFileInfo,
  Menu,
  Notice,
  Plugin,
  TAbstractFile,
  TFile,
  arrayBufferToBase64
} from 'obsidian';
import * as fs from 'fs/promises';
import {
  Marked,
  Renderer,
  RendererThis,
  Tokens,
  TokenizerAndRendererExtension,
  TokenizerThis
} from 'marked';

export default class CopyImageTextPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'copy-text',
      name: '复制文本和图片(富文本)',
      editorCallback: (editor: Editor, view: MarkdownFileInfo) =>
        this.copyTextAndImages(editor, view)
    });

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, info) =>
        this.addEditorContextMenuItems(menu, editor, info)
      )
    );

    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => this.addFileContextMenuItems(menu, file))
    );
  }

  private addEditorContextMenuItems(menu: Menu, editor: Editor, info: MarkdownFileInfo) {
    menu.addSeparator();

    menu.addItem((item) => {
      item
        .setTitle('复制文本和图片(富文本)')
        .setIcon('copy')
        .onClick(() => this.copyTextAndImages(editor, info));
    });
  }

  private addFileContextMenuItems(menu: Menu, file: TAbstractFile) {
    if (!(file instanceof TFile) || file.extension !== 'md') {
      return;
    }

    menu.addSeparator();

    menu.addItem((item) => {
      item
        .setTitle('复制文本和图片(富文本)')
        .setIcon('copy')
        .onClick(() => this.copyFileAsRichText(file));
    });
  }

  async copyTextAndImages(editor: Editor, view: MarkdownFileInfo) {
    try {
      const content = editor.getSelection() || editor.getValue();

      if (!view.file) {
        new Notice('无法获取当前文件信息，复制可能不完整');
        return;
      }

      await this.writeRichTextToClipboard(content);
      new Notice('内容已成功复制');
    } catch (error) {
      console.error('Copy Image Text: copy rich text failed', error);
      new Notice(`复制失败: ${this.getErrorMessage(error)}`);
    }
  }

  private async copyFileAsRichText(file: TFile) {
    try {
      const content = await this.app.vault.read(file);
      await this.writeRichTextToClipboard(content);
      new Notice('内容已成功复制');
    } catch (error) {
      console.error('Copy Image Text: copy file rich text failed', error);
      new Notice(`复制失败: ${this.getErrorMessage(error)}`);
    }
  }

  private async writeRichTextToClipboard(content: string) {
    const htmlContent = await this.convertToHtml(content);

    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([content], { type: 'text/plain' })
      })
    ]);
  }

  async convertToHtml(content: string): Promise<string> {
    const imageRegex = /!\[\[(.*?)\]\]/g;
    const externalImageRegex = /!\[.*?\]\((file:\/\/\/.+?)\)/g;

    const internalImageReplacements = await Promise.all(
      Array.from(content.matchAll(imageRegex)).map((match) => this.replaceImageWithBase64(match[1]))
    );

    let htmlContent = content;
    // 预处理：将连续的空行减少为单个空行，以美化生成的HTML
    htmlContent = htmlContent.replace(/\n\s*\n/g, '\n\n');
    internalImageReplacements.forEach(({ original, replacement }) => {
      htmlContent = htmlContent.replace(original, replacement);
    });

    const externalImageReplacements = await Promise.all(
      Array.from(htmlContent.matchAll(externalImageRegex)).map(
        (match) =>
          this.replaceExternalImageWithBase64(match[1], match[0]) as Promise<{
            original: string;
            replacement: string;
          }>
      )
    );

    externalImageReplacements.forEach(
      ({ original, replacement }: { original: string; replacement: string }) => {
        htmlContent = htmlContent.replace(original, replacement);
      }
    );

    const markdownParser = new Marked({
      async: false,
      breaks: true,
      gfm: true,
      renderer: this.createRichTextRenderer(),
      extensions: [this.createHighlightExtension()]
    });
    const markedContent = markdownParser.parse(htmlContent, { async: false });

    htmlContent = this.cleanAndFormatHtml(markedContent);
    return `<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: #333; line-height: 1.6;">${htmlContent}</div>`;
  }

  private createRichTextRenderer(): Renderer {
    const renderer = new Renderer();
    const plugin = this;

    renderer.heading = function (this: Renderer, { tokens, depth }: Tokens.Heading) {
      const fontSize = 28 - depth * 2;
      return `<h${depth} style="font-size: ${fontSize}px; font-weight: bold; margin: 10px 0;">${this.parser.parseInline(tokens)}</h${depth}>`;
    };

    renderer.hr = () => '<hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">';
    renderer.link = function (this: Renderer, { href, title, tokens }: Tokens.Link) {
      const titleAttr = title ? ` title="${plugin.escapeHtml(title)}"` : '';
      return `<a href="${plugin.escapeHtml(href)}"${titleAttr} style="color: #576b95; text-decoration: none;">${this.parser.parseInline(tokens)}</a>`;
    };
    renderer.image = ({ href, title, text }: Tokens.Image) => {
      const titleAttr = title ? ` title="${plugin.escapeHtml(title)}"` : '';
      return `<img src="${plugin.escapeHtml(href)}" alt="${plugin.escapeHtml(text)}"${titleAttr} style="max-width: 100%;">`;
    };
    renderer.list = function (this: Renderer, { ordered, start, items }: Tokens.List) {
      const tag = ordered ? 'ol' : 'ul';
      const startAttr = ordered && start !== 1 && start !== '' ? ` start="${start}"` : '';
      const body = items.map((item) => this.listitem(item)).join('');
      return `<${tag}${startAttr} style="margin: 8px 0 8px 24px; padding-left: 20px;">${body}</${tag}>`;
    };
    renderer.listitem = function (this: Renderer, item: Tokens.ListItem) {
      const checkbox = item.task
        ? `<input type="checkbox"${item.checked ? ' checked' : ''} disabled> `
        : '';
      return `<li style="margin: 4px 0;">${checkbox}${this.parser.parse(item.tokens)}</li>`;
    };
    renderer.codespan = ({ text }: Tokens.Codespan) =>
      `<code style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px;">${plugin.escapeHtml(text)}</code>`;
    renderer.code = ({ text, lang }: Tokens.Code) => {
      const language = lang || 'text';
      return `<pre data-lang="${plugin.escapeHtml(language)}" style="background-color: #f6f8fa; padding: 12px; border-radius: 4px; overflow-x: auto;"><code>${plugin.escapeHtml(text)}</code></pre>`;
    };

    return renderer;
  }

  private createHighlightExtension(): TokenizerAndRendererExtension {
    return {
      name: 'highlight',
      level: 'inline' as const,
      start(src: string): number | void {
        const index = src.indexOf('==');
        return index >= 0 ? index : undefined;
      },
      tokenizer(this: TokenizerThis, src: string) {
        const match = /^==([^=\n]+?)==/.exec(src);
        if (!match) {
          return undefined;
        }

        return {
          type: 'highlight',
          raw: match[0],
          text: match[1],
          tokens: this.lexer.inlineTokens(match[1])
        };
      },
      renderer(this: RendererThis, token: Tokens.Generic) {
        return `<span style="background-color: yellow;">${this.parser.parseInline(token.tokens || [])}</span>`;
      }
    };
  }

  private cleanAndFormatHtml(html: string): string {
    // 移除标签之间的多余空白，但保留标签内的内容
    html = html.replace(/>\s+</g, '><');

    // 移除连续的换行符，只保留一个
    html = html.replace(/\n\n+/g, '\n');

    // 移除开头和结尾的换行符
    html = html.trim();

    return html;
  }

  async replaceImageWithBase64(
    imagePath: string
  ): Promise<{ original: string; replacement: string }> {
    const original = `![[${imagePath}]]`;
    const normalizedImagePath = this.normalizeInternalImagePath(imagePath);

    try {
      const fileName = normalizedImagePath.split('/').pop() || normalizedImagePath;
      const imageFile = this.app.vault
        .getFiles()
        .find((f) => f.name.toLowerCase().includes(fileName.toLowerCase()));

      if (!imageFile) {
        return { original, replacement: `[图片未找到: ${normalizedImagePath}]` };
      }

      const stat = await this.app.vault.adapter.stat(imageFile.path);
      if (stat && stat.size > 10 * 1024 * 1024) {
        return { original, replacement: `[图片文件过大: ${normalizedImagePath}]` };
      }

      const imageArrayBuffer = await this.app.vault.readBinary(imageFile);
      const base64 = arrayBufferToBase64(imageArrayBuffer);
      const mimeType = this.getMimeType(normalizedImagePath);

      return {
        original,
        replacement: `<img src="data:${mimeType};base64,${base64}" alt="${normalizedImagePath}" style="max-width: 100%;">`
      };
    } catch (_error) {
      return { original, replacement: `[图片处理错误: ${normalizedImagePath}]` };
    }
  }

  private normalizeInternalImagePath(imagePath: string): string {
    return imagePath.split('|')[0].trim();
  }

  async replaceExternalImageWithBase64(
    imagePath: string,
    original?: string
  ): Promise<{ original: string; replacement: string }> {
    try {
      let filePath = imagePath.replace(/^file:\/\/\//, '');

      if (process.platform === 'win32') {
        filePath = filePath.replace(/\//g, '\\');
      }

      const imageBuffer = await fs.readFile(filePath);
      const base64 = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(filePath);

      return {
        original: original || `![](${imagePath})`,
        replacement: `<img src="data:${mimeType};base64,${base64}" alt="${imagePath}" style="max-width: 100%;">`
      };
    } catch (_error) {
      return {
        original: original || `![](${imagePath})`,
        replacement: `[外部图片处理错误: ${imagePath}]`
      };
    }
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'image/png';
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    return '未知错误，请查看控制台日志';
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/#/g, '&#35;'); // 转义 # 符号，防止在代码块中被误识别为标题
  }
}
