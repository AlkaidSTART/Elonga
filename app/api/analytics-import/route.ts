import { NextResponse } from "next/server";
import { decodeCsvBuffer, parseMetricsCsv } from "@/lib/metrics-import";
import type { PlatformId } from "@/lib/platforms";

const VALID_PLATFORMS = new Set<PlatformId>(["douyin", "toutiao", "xiaohongshu", "wechat"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

function resolveDefaultPlatform(raw: unknown): PlatformId {
  return VALID_PLATFORMS.has(raw as PlatformId) ? (raw as PlatformId) : "douyin";
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let rawText = "";
    let defaultPlatform: PlatformId = "douyin";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      defaultPlatform = resolveDefaultPlatform(formData.get("defaultPlatform"));
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "请上传有效的 CSV 或 TSV 报表文件" }, { status: 400 });
      }
      if (file.size === 0) {
        return NextResponse.json({ error: "上传的文件为空" }, { status: 400 });
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "报表文件大小不能超过 5MB" }, { status: 413 });
      }

      const buffer = await file.arrayBuffer();
      rawText = decodeCsvBuffer(buffer);
    } else {
      const body = (await req.json()) as { text?: string; defaultPlatform?: string };
      rawText = typeof body.text === "string" ? body.text : "";
      defaultPlatform = resolveDefaultPlatform(body.defaultPlatform);

      if (!rawText.trim()) {
        return NextResponse.json({ error: "请提供需要解析的表格文本内容" }, { status: 400 });
      }
      if (rawText.length > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "表格内容过大，请控制在 5MB 以内" }, { status: 413 });
      }
    }

    const parsed = parseMetricsCsv(rawText, defaultPlatform);
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: `解析报表失败: ${message}` }, { status: 500 });
  }
}
