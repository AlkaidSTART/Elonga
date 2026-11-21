export type AutoRedactCategory = "text" | "face" | "qrcode";

export interface DetectedRegion {
  id: string;
  category: AutoRedactCategory;
  label: string;
  rect: { x: number; y: number; w: number; h: number };
  confidence: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
}

function clampRect(
  x: number,
  y: number,
  w: number,
  h: number,
  maxW: number,
  maxH: number
) {
  const x1 = Math.max(0, Math.floor(x));
  const y1 = Math.max(0, Math.floor(y));
  const x2 = Math.min(maxW, Math.ceil(x + w));
  const y2 = Math.min(maxH, Math.ceil(y + h));
  return { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
}

function iou(a: Box, b: Box): number {
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(a.x + a.w, b.x + b.w);
  const iy2 = Math.min(a.y + a.h, b.y + b.h);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  if (inter === 0) return 0;
  return inter / (a.w * a.h + b.w * b.h - inter);
}

function mergeOverlappingBoxes(boxes: Box[], iouThreshold = 0.25): Box[] {
  const sorted = [...boxes].sort((a, b) => b.w * b.h - a.w * a.h);
  const kept: Box[] = [];
  for (const box of sorted) {
    let merged = false;
    for (let i = 0; i < kept.length; i++) {
      if (iou(kept[i], box) > iouThreshold) {
        const x1 = Math.min(kept[i].x, box.x);
        const y1 = Math.min(kept[i].y, box.y);
        const x2 = Math.max(kept[i].x + kept[i].w, box.x + box.w);
        const y2 = Math.max(kept[i].y + kept[i].h, box.y + box.h);
        kept[i] = {
          x: x1,
          y: y1,
          w: x2 - x1,
          h: y2 - y1,
          score: Math.max(kept[i].score, box.score),
        };
        merged = true;
        break;
      }
    }
    if (!merged) kept.push(box);
  }
  return kept;
}

/**
 * Find connected components on a binary mask (0 or 1) using iterative BFS.
 */
function findConnectedComponents(
  mask: Uint8Array,
  w: number,
  h: number,
  minArea: number
) {
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const components: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    area: number;
  }[] = [];

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const startIdx = rowOffset + x;
      if (mask[startIdx] === 0 || visited[startIdx]) continue;

      let head = 0;
      let tail = 0;
      queue[tail++] = startIdx;
      visited[startIdx] = 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;

      while (head < tail) {
        const idx = queue[head++];
        const cx = idx % w;
        const cy = (idx - cx) / w;
        area++;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // 4-connected neighbors
        if (cx > 0) {
          const n = idx - 1;
          if (mask[n] && !visited[n]) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
        if (cx < w - 1) {
          const n = idx + 1;
          if (mask[n] && !visited[n]) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
        if (cy > 0) {
          const n = idx - w;
          if (mask[n] && !visited[n]) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
        if (cy < h - 1) {
          const n = idx + w;
          if (mask[n] && !visited[n]) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
      }

      if (area >= minArea) {
        components.push({ minX, minY, maxX, maxY, area });
      }
    }
  }

  return components;
}

/**
 * Local text-line / dense-character block detector using horizontal gradient + morphological dilation.
 */
function detectTextRegionsLocal(
  data: Uint8ClampedArray,
  w: number,
  h: number
): Box[] {
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    gray[i] = Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
  }

  // Horizontal & vertical stroke gradient
  const edge = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const idx = row + x;
      const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
      const gy = Math.abs(gray[idx + w] - gray[idx - w]);
      // Text strokes have strong horizontal transitions
      if (gx > 34 || (gx > 22 && gy > 22)) {
        edge[idx] = 1;
      }
    }
  }

  // Morphological horizontal dilation to merge characters into text lines
  const dilateX = Math.max(7, Math.round(w * 0.018));
  const dilateY = Math.max(1, Math.round(h * 0.003));
  const horiz = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    const row = y * w;
    let count = 0;
    for (let x = 0; x < w; x++) {
      if (edge[row + x]) count++;
      if (x - dilateX * 2 - 1 >= 0 && edge[row + x - dilateX * 2 - 1]) {
        count--;
      }
      const center = x - dilateX;
      if (center >= 0 && count > 0) {
        horiz[row + center] = 1;
      }
    }
  }

  const dilated = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let count = 0;
    for (let y = 0; y < h; y++) {
      if (horiz[y * w + x]) count++;
      if (y - dilateY * 2 - 1 >= 0 && horiz[(y - dilateY * 2 - 1) * w + x]) {
        count--;
      }
      const center = y - dilateY;
      if (center >= 0 && count > 0) {
        dilated[center * w + x] = 1;
      }
    }
  }

  const minArea = Math.max(140, Math.round(w * h * 0.00045));
  const comps = findConnectedComponents(dilated, w, h, minArea);

  const boxes: Box[] = [];
  for (const c of comps) {
    const bw = c.maxX - c.minX + 1;
    const bh = c.maxY - c.minY + 1;
    const aspect = bw / Math.max(1, bh);

    // Filter out huge background contours or tiny noise
    if (bh < 8 || bh > h * 0.16) continue;
    if (bw < 24 || bw > w * 0.85) continue;
    if (aspect < 1.35) continue;

    // Verify internal stroke density (text has high edge density inside its box)
    let edgeHits = 0;
    for (let y = c.minY; y <= c.maxY; y++) {
      const row = y * w;
      for (let x = c.minX; x <= c.maxX; x++) {
        if (edge[row + x]) edgeHits++;
      }
    }
    const edgeRatio = edgeHits / (bw * bh);
    if (edgeRatio < 0.07 || edgeRatio > 0.62) continue;

    const padX = Math.max(4, Math.round(bh * 0.25));
    const padY = Math.max(3, Math.round(bh * 0.18));
    boxes.push({
      x: Math.max(0, c.minX - padX),
      y: Math.max(0, c.minY - padY),
      w: Math.min(w, c.maxX + padX) - Math.max(0, c.minX - padX),
      h: Math.min(h, c.maxY + padY) - Math.max(0, c.minY - padY),
      score: Math.min(0.95, 0.55 + edgeRatio),
    });
  }

  return mergeOverlappingBoxes(boxes, 0.2);
}

/**
 * Local face/skin-cluster detector using YCbCr skin-tone segmentation + aspect/edge verification.
 */
function detectFaceRegionsLocal(
  data: Uint8ClampedArray,
  w: number,
  h: number
): Box[] {
  const skin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    if (r > 60 && g > 40 && b > 20 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
      skin[i] = 1;
    }
  }

  const minFaceArea = Math.max(400, Math.round(w * h * 0.002));
  const comps = findConnectedComponents(skin, w, h, minFaceArea);

  const boxes: Box[] = [];
  for (const c of comps) {
    const bw = c.maxX - c.minX + 1;
    const bh = c.maxY - c.minY + 1;
    const aspect = bw / Math.max(1, bh);
    const fillRatio = c.area / (bw * bh);

    if (bw < 24 || bh < 24) continue;
    if (bw > w * 0.6 || bh > h * 0.7) continue;
    if (aspect < 0.55 || aspect > 1.5 || fillRatio < 0.38) continue;

    // Check internal luminance variance (faces have eyes/mouth contrast, unlike flat surfaces)
    let sum = 0;
    let sumSq = 0;
    let samples = 0;
    for (let y = c.minY; y <= c.maxY; y += 2) {
      for (let x = c.minX; x <= c.maxX; x += 2) {
        const p = (y * w + x) * 4;
        const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        sum += lum;
        sumSq += lum * lum;
        samples++;
      }
    }
    if (samples === 0) continue;
    const mean = sum / samples;
    const variance = sumSq / samples - mean * mean;
    if (variance < 180) continue;

    boxes.push({
      x: c.minX,
      y: c.minY,
      w: bw,
      h: bh,
      score: 0.72,
    });
  }

  return mergeOverlappingBoxes(boxes, 0.3);
}

/**
 * Automatically detect sensitive regions on an image locally using browser APIs + Canvas pixel analysis.
 */
export async function detectSensitiveRegionsLocal(
  img: HTMLImageElement,
  categories: AutoRedactCategory[]
): Promise<DetectedRegion[]> {
  if (categories.length === 0 || img.width === 0 || img.height === 0) {
    return [];
  }

  const results: DetectedRegion[] = [];
  const win = window as unknown as {
    FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
    };
    BarcodeDetector?: new (opts?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ boundingBox: DOMRectReadOnly; rawValue?: string }>>;
    };
  };

  // 1. Browser-native BarcodeDetector for QR codes / barcodes
  if (categories.includes("qrcode") && typeof win.BarcodeDetector === "function") {
    try {
      const detector = new win.BarcodeDetector({
        formats: ["qr_code", "code_128", "code_39", "ean_13", "data_matrix"],
      });
      const codes = await detector.detect(img);
      codes.forEach((code, idx) => {
        const b = code.boundingBox;
        results.push({
          id: `auto_qr_${Date.now()}_${idx}`,
          category: "qrcode",
          label: "二维码 / 条码",
          rect: clampRect(b.x - 6, b.y - 6, b.width + 12, b.height + 12, img.width, img.height),
          confidence: 0.96,
        });
      });
    } catch {
      // Ignore unsupported format errors
    }
  }

  // 2. Browser-native FaceDetector if available
  let nativeFaceUsed = false;
  if (categories.includes("face") && typeof win.FaceDetector === "function") {
    try {
      const detector = new win.FaceDetector({ fastMode: true, maxDetectedFaces: 12 });
      const faces = await detector.detect(img);
      nativeFaceUsed = true;
      faces.forEach((face, idx) => {
        const b = face.boundingBox;
        results.push({
          id: `auto_face_${Date.now()}_${idx}`,
          category: "face",
          label: "人脸区域",
          rect: clampRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8, img.width, img.height),
          confidence: 0.94,
        });
      });
    } catch {
      nativeFaceUsed = false;
    }
  }

  // 3. Downscaled Canvas pixel analysis for text lines & fallback face detection
  const needText = categories.includes("text");
  const needFallbackFace = categories.includes("face") && !nativeFaceUsed;

  if (needText || needFallbackFace) {
    const maxDim = 720;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const sw = Math.max(1, Math.round(img.width * scale));
    const sh = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0, sw, sh);
      const imageData = ctx.getImageData(0, 0, sw, sh);

      if (needText) {
        const textBoxes = detectTextRegionsLocal(imageData.data, sw, sh);
        textBoxes.forEach((box, idx) => {
          results.push({
            id: `auto_text_${Date.now()}_${idx}`,
            category: "text",
            label: "文字 / 隐私信息",
            rect: clampRect(
              box.x / scale,
              box.y / scale,
              box.w / scale,
              box.h / scale,
              img.width,
              img.height
            ),
            confidence: box.score,
          });
        });
      }

      if (needFallbackFace) {
        const faceBoxes = detectFaceRegionsLocal(imageData.data, sw, sh);
        faceBoxes.forEach((box, idx) => {
          results.push({
            id: `auto_face_${Date.now()}_${idx}`,
            category: "face",
            label: "疑似人脸区域",
            rect: clampRect(
              box.x / scale,
              box.y / scale,
              box.w / scale,
              box.h / scale,
              img.width,
              img.height
            ),
            confidence: box.score,
          });
        });
      }
    }
  }

  return results;
}
