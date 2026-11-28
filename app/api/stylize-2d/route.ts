import { NextResponse } from "next/server";
import { sanitizeExternalUrl } from "@/lib/url-safety";
import type { Style2DPreset } from "@/store/useImageStudioStore";

const STYLE_PROMPTS: Record<Style2DPreset, string> = {
  anime:
    "Transform this image into a high-quality 2D Japanese anime illustration style with clean ink lineart, cel shading, vibrant yet balanced colors, and crisp anime aesthetics. Preserve the original composition and subject.",
  ghibli:
    "Transform this image into a warm 2D hand-painted Studio Ghibli-inspired storybook illustration style, soft sunlight, lush painterly brushwork, gentle atmospheric depth, and clean 2D character/scene lines.",
  cel: {
    toString: () => "",
  } as unknown as string,
  watercolor:
    "Transform this image into a clean 2D watercolor and ink illustration style, delicate translucent color washes, expressive fine linework, and airy paper texture.",
};

STYLE_PROMPTS.cel =
  "Transform this image into a crisp 2D flat cel-shaded vector illustration style, bold clean outlines, simplified flat color blocks, and modern editorial 2D art direction.";

interface StylizeRequest {
  imageBase64: string;
  stylePreset: Style2DPreset;
  stylePrompt?: string;
  strength?: number;
  modelConfig?: {
    apiKey?: string;
    baseUrl?: string;
    imageModel?: string;
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StylizeRequest;
    const { imageBase64, stylePreset, stylePrompt, modelConfig } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "缺少图片数据" }, { status: 400 });
    }

    const apiKey =
      modelConfig?.apiKey?.trim() ||
      process.env.IMAGE_API_KEY ||
      process.env.ARK_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    if (!apiKey) {
      return NextResponse.json({ fallback: true, mode: "local" });
    }

    const baseUrl = (
      modelConfig?.baseUrl?.trim() ||
      process.env.IMAGE_BASE_URL ||
      process.env.ARK_BASE_URL ||
      "https://ark.cn-beijing.volces.com/api/v3"
    ).replace(/\/+$/, "");
    const model =
      modelConfig?.imageModel?.trim() ||
      process.env.IMAGE_MODEL ||
      "doubao-seedream-3-0-t2i-250415";

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: "image/png" });

    const finalPrompt = [
      STYLE_PROMPTS[stylePreset] || STYLE_PROMPTS.anime,
      stylePrompt?.trim() ? `Additional details: ${stylePrompt.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const formData = new FormData();
    formData.append("image", blob, "input.png");
    formData.append("model", model);
    formData.append("prompt", finalPrompt);
    formData.append("size", "1024x1024");

    const response = await fetch(`${baseUrl}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        {
          error: `图像大模型调用失败 (${response.status}): ${errText.slice(0, 200)}`,
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    const first = data?.data?.[0];
    if (first?.b64_json) {
      return NextResponse.json({
        imageUrl: `data:image/png;base64,${first.b64_json}`,
        mode: "ai",
      });
    }
    if (first?.url) {
      const safeUrl = sanitizeExternalUrl(String(first.url));
      if (!safeUrl) {
        return NextResponse.json({ error: "图像大模型返回的图片链接不安全" }, { status: 502 });
      }
      return NextResponse.json({
        imageUrl: safeUrl,
        mode: "ai",
      });
    }

    return NextResponse.json({ error: "图像大模型未返回有效的图片结果" }, { status: 502 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: `二维风格化处理失败: ${message}` }, { status: 500 });
  }
}
