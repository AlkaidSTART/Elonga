import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { PlatformId } from "@/lib/platforms";
import type { DouyinTrendInsights } from "@/lib/skills/types";

export interface DocumentImageItem {
  id: string;
  name: string;
  caption: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface AssembledDocument {
  title: string;
  platform: PlatformId;
  platformName: string;
  topic: string;
  body: string;
  tags: string[];
  hook?: string;
  algorithmTips: string[];
  trendInsights?: DouyinTrendInsights;
  images: DocumentImageItem[];
  createdAt: number;
}

export type DocumentBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; image: DocumentImageItem };

/**
 * Interleave body paragraphs and processed images into a balanced article flow.
 */
export function buildDocumentBlocks(doc: AssembledDocument): DocumentBlock[] {
  const paragraphs = doc.body
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const images = doc.images;
  if (images.length === 0) {
    return paragraphs.map((text) => ({ type: "paragraph", text }));
  }
  if (paragraphs.length === 0) {
    return images.map((image) => ({ type: "image", image }));
  }

  const blocks: DocumentBlock[] = [];
  const step = Math.max(1, Math.floor(paragraphs.length / images.length));
  let imgIdx = 0;

  paragraphs.forEach((text, idx) => {
    blocks.push({ type: "paragraph", text });
    const shouldInsertAfter =
      imgIdx < images.length &&
      ((idx + 1) % step === 0 || idx === paragraphs.length - 1);
    if (shouldInsertAfter) {
      blocks.push({ type: "image", image: images[imgIdx] });
      imgIdx += 1;
    }
  });

  while (imgIdx < images.length) {
    blocks.push({ type: "image", image: images[imgIdx] });
    imgIdx += 1;
  }

  return blocks;
}

function sanitizeFileName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .slice(0, 48);
  return cleaned || `elonga-article-${Date.now()}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export assembled document as Markdown (.md).
 */
export function exportDocumentAsMarkdown(doc: AssembledDocument) {
  const blocks = buildDocumentBlocks(doc);
  const lines: string[] = [];

  lines.push(`# ${doc.title}`);
  lines.push("");
  lines.push(
    `> 分发平台：${doc.platformName} | 创作主题：${doc.topic} | 生成时间：${new Date(
      doc.createdAt
    ).toLocaleString("zh-CN")}`
  );
  lines.push("");

  for (const block of blocks) {
    if (block.type === "paragraph") {
      lines.push(block.text);
      lines.push("");
    } else {
      const alt = block.image.caption || block.image.name || "配图";
      lines.push(`![${alt}](${block.image.dataUrl})`);
      if (block.image.caption) {
        lines.push(`*图注：${block.image.caption}*`);
      }
      lines.push("");
    }
  }

  if (doc.tags.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(doc.tags.map((t) => `#${t.replace(/^#/, "")}`).join(" "));
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], {
    type: "text/markdown;charset=utf-8",
  });
  triggerBlobDownload(blob, `${sanitizeFileName(doc.title)}.md`);
}

async function imageUrlToPngBytes(
  dataUrl: string,
  fallbackW: number,
  fallbackH: number
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("图片转换失败"));
    el.src = dataUrl;
  });

  const w = img.naturalWidth || fallbackW || 800;
  const h = img.naturalHeight || fallbackH || 600;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 上下文创建失败");
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG 编码失败"))),
      "image/png"
    );
  });

  const arrayBuffer = await blob.arrayBuffer();
  return {
    bytes: new Uint8Array(arrayBuffer),
    width: w,
    height: h,
  };
}

/**
 * Export assembled document as Word (.docx).
 */
export async function exportDocumentAsDocx(doc: AssembledDocument) {
  const blocks = buildDocumentBlocks(doc);
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: doc.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: `分发平台：${doc.platformName}   |   创作主题：${doc.topic}   |   ${new Date(
            doc.createdAt
          ).toLocaleDateString("zh-CN")}`,
          color: "64748B",
          size: 20,
        }),
      ],
    })
  );

  for (const block of blocks) {
    if (block.type === "paragraph") {
      children.push(
        new Paragraph({
          spacing: { after: 200, line: 340 },
          children: [
            new TextRun({
              text: block.text,
              size: 24,
            }),
          ],
        })
      );
    } else {
      try {
        const { bytes, width, height } = await imageUrlToPngBytes(
          block.image.dataUrl,
          block.image.width,
          block.image.height
        );
        const maxWidth = 520;
        const scale = Math.min(1, maxWidth / Math.max(1, width));
        const targetW = Math.round(width * scale);
        const targetH = Math.round(height * scale);

        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 100 },
            children: [
              new ImageRun({
                type: "png",
                data: bytes,
                transformation: {
                  width: targetW,
                  height: targetH,
                },
              }),
            ],
          })
        );

        if (block.image.caption) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 220 },
              children: [
                new TextRun({
                  text: block.image.caption,
                  italics: true,
                  color: "64748B",
                  size: 20,
                }),
              ],
            })
          );
        }
      } catch {
        children.push(
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: `[图片: ${block.image.caption || block.image.name}]`,
                color: "64748B",
                size: 20,
              }),
            ],
          })
        );
      }
    }
  }

  if (doc.tags.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 240 },
        children: [
          new TextRun({
            text: doc.tags.map((t) => `#${t.replace(/^#/, "")}`).join("  "),
            color: "059669",
            size: 22,
          }),
        ],
      })
    );
  }

  const wordDoc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(wordDoc);
  triggerBlobDownload(blob, `${sanitizeFileName(doc.title)}.docx`);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Export assembled document as PDF via clean native print-to-PDF iframe
 * (ensures crisp Chinese vector typography and embedded images).
 */
export function exportDocumentAsPdf(doc: AssembledDocument) {
  const blocks = buildDocumentBlocks(doc);

  const bodyHtml = blocks
    .map((block) => {
      if (block.type === "paragraph") {
        return `<p class="paragraph">${escapeHtml(block.text)}</p>`;
      }
      const caption = block.image.caption
        ? `<figcaption>${escapeHtml(block.image.caption)}</figcaption>`
        : "";
      return `<figure><img src="${block.image.dataUrl}" alt="${escapeHtml(
        block.image.caption || block.image.name
      )}" />${caption}</figure>`;
    })
    .join("\n");

  const tagsHtml =
    doc.tags.length > 0
      ? `<div class="tags">${doc.tags
          .map((t) => `<span>#${escapeHtml(t.replace(/^#/, ""))}</span>`)
          .join("")}</div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(doc.title)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      color: #171717;
      line-height: 1.75;
      margin: 0;
      padding: 0;
      font-size: 14px;
    }
    .header {
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 22px;
      line-height: 1.35;
      margin: 0 0 8px 0;
      color: #0a0a0a;
    }
    .meta {
      font-size: 12px;
      color: #737373;
    }
    .paragraph {
      margin: 0 0 14px 0;
      white-space: pre-wrap;
      text-align: justify;
    }
    figure {
      margin: 18px 0;
      text-align: center;
      page-break-inside: avoid;
    }
    figure img {
      max-width: 100%;
      max-height: 420px;
      border-radius: 8px;
      object-fit: contain;
    }
    figcaption {
      margin-top: 6px;
      font-size: 12px;
      color: #737373;
    }
    .tags {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #e5e5e5;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tags span {
      font-size: 12px;
      color: #047857;
      background: #ecfdf5;
      padding: 3px 10px;
      border-radius: 999px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(doc.title)}</h1>
    <div class="meta">分发平台：${escapeHtml(doc.platformName)} · 主题：${escapeHtml(
    doc.topic
  )} · ${new Date(doc.createdAt).toLocaleString("zh-CN")}</div>
  </div>
  ${bodyHtml}
  ${tagsHtml}
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  const triggerPrint = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  };

  const imgs = Array.from(iframeDoc.images);
  if (imgs.length === 0) {
    setTimeout(triggerPrint, 120);
  } else {
    Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.onload = () => res();
              img.onerror = () => res();
            })
      )
    ).then(() => setTimeout(triggerPrint, 120));
  }
}
