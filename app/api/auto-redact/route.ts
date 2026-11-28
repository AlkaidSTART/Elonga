import { NextResponse } from "next/server";
import type { AutoRedactCategory, DetectedRegion } from "@/lib/auto-redact";

interface AutoRedactRequest {
  imageBase64: string;
  width: number;
  height: number;
  categories: AutoRedactCategory[];
  modelConfig?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
}

const CATEGORY_DESCRIPTIONS: Record<AutoRedactCategory, string> = {
  text: "sensitive text such as phone numbers, order IDs, addresses, license plates, ID card numbers, usernames, and emails",
  face: "human faces or portrait heads",
  qrcode: "QR codes, barcodes, or mini-program codes",
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AutoRedactRequest;
    const { imageBase64, width, height, categories, modelConfig } = body;

    if (!imageBase64 || !width || !height) {
      return NextResponse.json({ error: "缺少图片或尺寸数据" }, { status: 400 });
    }

    const apiKey =
      modelConfig?.apiKey?.trim() || process.env.VISION_API_KEY || process.env.OPENAI_API_KEY || "";

    // Only use remote vision detection if a vision API key is explicitly configured
    if (!apiKey) {
      return NextResponse.json({ fallback: true, mode: "local" });
    }

    const baseUrl = (
      modelConfig?.baseUrl?.trim() ||
      process.env.VISION_BASE_URL ||
      "https://api.openai.com/v1"
    ).replace(/\/+$/, "");

    const model = modelConfig?.model?.trim() || process.env.VISION_MODEL || "gpt-4o-mini";

    // Skip if configured model is known text-only DeepSeek chat
    if (model.toLowerCase().includes("deepseek-chat")) {
      return NextResponse.json({ fallback: true, mode: "local" });
    }

    const targetDesc = categories
      .map((c) => CATEGORY_DESCRIPTIONS[c])
      .filter(Boolean)
      .join("; ");

    const prompt = `Detect privacy-sensitive regions in this image (${targetDesc}).
Return ONLY a valid JSON array of objects with normalized coordinates in [0, 1000]:
[{"category":"text"|"face"|"qrcode","label":"short Chinese label","x":number,"y":number,"w":number,"h":number}]
If nothing is found, return [].`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ fallback: true, mode: "local" });
    }

    const data = await response.json();
    const rawText: string = data?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ fallback: true, mode: "local" });
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      category?: AutoRedactCategory;
      label?: string;
      x?: number;
      y?: number;
      w?: number;
      h?: number;
    }>;

    const regions: DetectedRegion[] = parsed
      .filter(
        (item) =>
          typeof item.x === "number" &&
          typeof item.y === "number" &&
          typeof item.w === "number" &&
          typeof item.h === "number" &&
          item.w > 0 &&
          item.h > 0,
      )
      .map((item, idx) => {
        const px = Math.max(0, Math.floor((item.x! / 1000) * width));
        const py = Math.max(0, Math.floor((item.y! / 1000) * height));
        const pw = Math.min(width - px, Math.ceil((item.w! / 1000) * width));
        const ph = Math.min(height - py, Math.ceil((item.h! / 1000) * height));
        const cat: AutoRedactCategory =
          item.category && categories.includes(item.category)
            ? item.category
            : categories[0] || "text";
        return {
          id: `auto_ai_${Date.now()}_${idx}`,
          category: cat,
          label: item.label || "敏感区域",
          rect: { x: px, y: py, w: Math.max(4, pw), h: Math.max(4, ph) },
          confidence: 0.9,
        };
      });

    return NextResponse.json({ regions, mode: "ai" });
  } catch {
    return NextResponse.json({ fallback: true, mode: "local" });
  }
}
