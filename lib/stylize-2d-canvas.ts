import type { Style2DPreset } from "@/store/useImageStudioStore";

interface PresetConfig {
  levels: number;
  saturationBoost: number;
  edgeThreshold: number;
  warmth: number;
  edgeDarkness: number;
}

const PRESET_CONFIGS: Record<Style2DPreset, PresetConfig> = {
  anime: {
    levels: 7,
    saturationBoost: 1.28,
    edgeThreshold: 44,
    warmth: 6,
    edgeDarkness: 0.78,
  },
  ghibli: {
    levels: 9,
    saturationBoost: 1.22,
    edgeThreshold: 54,
    warmth: 14,
    edgeDarkness: 0.55,
  },
  cel: {
    levels: 5,
    saturationBoost: 1.35,
    edgeThreshold: 38,
    warmth: 0,
    edgeDarkness: 0.9,
  },
  watercolor: {
    levels: 11,
    saturationBoost: 1.15,
    edgeThreshold: 62,
    warmth: 10,
    edgeDarkness: 0.42,
  },
};

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Local Canvas 2D anime/cel-shading fallback pipeline:
 * 1. Downscale-upscale smoothing to flatten micro-textures
 * 2. Color quantization + saturation/warmth grading
 * 3. Sobel edge detection for crisp 2D ink outlines
 */
export async function stylizeImage2DLocal(
  imageDataUrl: string,
  preset: Style2DPreset,
  strength: number
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("无法加载图片进行二维风格化"));
    el.src = imageDataUrl;
  });

  const maxDim = 1024;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 初始化失败");

  // Step 1: Smooth micro-textures via gentle blur
  ctx.filter = `blur(${Math.max(1, Math.round(strength * 2.2))}px)`;
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = "none";

  const smoothed = ctx.getImageData(0, 0, w, h);
  const src = smoothed.data;

  // Also grab original sharp pixels for edge detection
  const sharpCanvas = document.createElement("canvas");
  sharpCanvas.width = w;
  sharpCanvas.height = h;
  const sharpCtx = sharpCanvas.getContext("2d")!;
  sharpCtx.drawImage(img, 0, 0, w, h);
  const sharpData = sharpCtx.getImageData(0, 0, w, h).data;

  const cfg = PRESET_CONFIGS[preset];
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    lum[i] =
      0.299 * sharpData[idx] +
      0.587 * sharpData[idx + 1] +
      0.114 * sharpData[idx + 2];
  }

  const out = ctx.createImageData(w, h);
  const dst = out.data;
  const step = 255 / Math.max(2, cfg.levels - 1);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const idx = i * 4;

      let r = src[idx];
      let g = src[idx + 1];
      let b = src[idx + 2];

      // Quantize colors for cel-shaded look
      const qr = Math.round(r / step) * step;
      const qg = Math.round(g / step) * step;
      const qb = Math.round(b / step) * step;

      r = r * (1 - strength) + qr * strength;
      g = g * (1 - strength) + qg * strength;
      b = b * (1 - strength) + qb * strength;

      // Boost saturation
      const avg = (r + g + b) / 3;
      r = clamp(avg + (r - avg) * cfg.saturationBoost + cfg.warmth);
      g = clamp(avg + (g - avg) * cfg.saturationBoost + cfg.warmth * 0.4);
      b = clamp(avg + (b - avg) * cfg.saturationBoost - cfg.warmth * 0.3);

      // Sobel edge detection
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
        const tl = lum[(y - 1) * w + (x - 1)];
        const t = lum[(y - 1) * w + x];
        const tr = lum[(y - 1) * w + (x + 1)];
        const l = lum[y * w + (x - 1)];
        const ri = lum[y * w + (x + 1)];
        const bl = lum[(y + 1) * w + (x - 1)];
        const bo = lum[(y + 1) * w + x];
        const br = lum[(y + 1) * w + (x + 1)];

        const gx = -tl - 2 * l - bl + tr + 2 * ri + br;
        const gy = -tl - 2 * t - tr + bl + 2 * bo + br;
        const mag = Math.sqrt(gx * gx + gy * gy);

        if (mag > cfg.edgeThreshold) {
          const edgeAlpha = Math.min(
            cfg.edgeDarkness,
            ((mag - cfg.edgeThreshold) / 140) * cfg.edgeDarkness
          );
          // Deep ink blue-slate tone instead of harsh pure black
          r = r * (1 - edgeAlpha) + 26 * edgeAlpha;
          g = g * (1 - edgeAlpha) + 28 * edgeAlpha;
          b = b * (1 - edgeAlpha) + 42 * edgeAlpha;
        }
      }

      dst[idx] = clamp(r);
      dst[idx + 1] = clamp(g);
      dst[idx + 2] = clamp(b);
      dst[idx + 3] = sharpData[idx + 3];
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL("image/png");
}
