import {
  detectSensitiveRegionsLocal,
  type AutoRedactCategory,
  type DetectedRegion,
} from "@/lib/auto-redact";
import { renderRedactedCanvas } from "@/lib/mosaic-canvas";
import { stylizeImage2DLocal } from "@/lib/stylize-2d-canvas";
import type { RedactionAction, Style2DPreset } from "@/store/useImageStudioStore";
import type { ModelConfig } from "@/store/useWorkbenchStore";

export interface ImageProcessingOptions {
  enableRedact: boolean;
  redactCategories: AutoRedactCategory[];
  enableStylize: boolean;
  stylePreset: Style2DPreset;
  stylePrompt?: string;
  stylizeStrength?: number;
}

export interface ImageProcessingResult {
  processedUrl: string;
  notes: string[];
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = dataUrl;
  });
}

async function runAutoRedact(
  dataUrl: string,
  width: number,
  height: number,
  categories: AutoRedactCategory[],
  modelConfig: ModelConfig,
): Promise<{ url: string; note: string }> {
  const activeCategories: AutoRedactCategory[] =
    categories.length > 0 ? categories : ["text", "face", "qrcode"];

  let regions: DetectedRegion[] = [];
  let mode: "ai" | "local" = "local";

  try {
    const res = await fetch("/api/auto-redact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: dataUrl,
        width,
        height,
        categories: activeCategories,
        modelConfig: {
          apiKey: modelConfig.textApiKey,
          baseUrl: modelConfig.textBaseUrl,
          port: modelConfig.textPort,
          endpointPath: modelConfig.textEndpointPath,
          apiFormat: modelConfig.textApiFormat,
          model: modelConfig.textModel,
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.fallback && Array.isArray(data.regions)) {
        regions = data.regions;
        mode = "ai";
      }
    }
  } catch {
    // Fallback to local detection
  }

  const img = await loadImageElement(dataUrl);

  if (mode === "local") {
    regions = await detectSensitiveRegionsLocal(img, activeCategories);
  }

  if (regions.length === 0) {
    return { url: dataUrl, note: "未检测到敏感隐私区域" };
  }

  const actions: RedactionAction[] = regions.map((r) => ({
    id: r.id,
    type: "stackblur",
    shape: "rect",
    intensity: 20,
    brushSize: 32,
    rect: r.rect,
    source: "auto",
    label: r.label,
    category: r.category,
  }));

  const canvas = document.createElement("canvas");
  canvas.width = img.width || width;
  canvas.height = img.height || height;
  renderRedactedCanvas(canvas, img, actions, false);

  return {
    url: canvas.toDataURL("image/png"),
    note: `已打码 ${regions.length} 处隐私区域 (${mode === "ai" ? "AI" : "本地"})`,
  };
}

async function runStylize2D(
  dataUrl: string,
  preset: Style2DPreset,
  stylePrompt: string,
  strength: number,
  modelConfig: ModelConfig,
): Promise<{ url: string; note: string }> {
  try {
    const res = await fetch("/api/stylize-2d", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: dataUrl,
        stylePreset: preset,
        stylePrompt,
        strength,
        modelConfig: {
          apiKey: modelConfig.imageApiKey,
          baseUrl: modelConfig.imageBaseUrl,
          port: modelConfig.imagePort,
          endpointPath: modelConfig.imageEndpointPath,
          imageModel: modelConfig.imageModel,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.fallback && data.imageUrl) {
        return { url: data.imageUrl, note: `已完成 ${preset} 二维风格化 (AI)` };
      }
    }
  } catch {
    // Fallback to local canvas stylizer
  }

  const localUrl = await stylizeImage2DLocal(dataUrl, preset, strength);
  return { url: localUrl, note: `已完成 ${preset} 二维风格化 (本地)` };
}

/**
 * Process a single workflow image sequentially (auto-redact -> 2D stylize).
 */
export async function processWorkflowImage(
  originalUrl: string,
  width: number,
  height: number,
  options: ImageProcessingOptions,
  modelConfig: ModelConfig,
): Promise<ImageProcessingResult> {
  let currentUrl = originalUrl;
  const notes: string[] = [];

  if (options.enableRedact) {
    const redacted = await runAutoRedact(
      currentUrl,
      width,
      height,
      options.redactCategories,
      modelConfig,
    );
    currentUrl = redacted.url;
    notes.push(redacted.note);
  }

  if (options.enableStylize) {
    const stylized = await runStylize2D(
      currentUrl,
      options.stylePreset,
      options.stylePrompt ?? "",
      options.stylizeStrength ?? 0.65,
      modelConfig,
    );
    currentUrl = stylized.url;
    notes.push(stylized.note);
  }

  if (notes.length === 0) {
    notes.push("保留原图");
  }

  return {
    processedUrl: currentUrl,
    notes,
  };
}
