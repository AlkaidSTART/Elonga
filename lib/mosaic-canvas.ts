import * as StackBlur from "stackblur-canvas";
import type { RedactionAction } from "@/store/useImageStudioStore";

function getBoundingBox(action: RedactionAction, canvasW: number, canvasH: number) {
  const strokePad = action.shape === "brush" ? action.brushSize / 2 : 0;
  const pad = Math.ceil(strokePad + action.intensity * 1.5 + 8);
  if (action.shape === "rect" && action.rect) {
    const x1 = Math.max(0, Math.floor(Math.min(action.rect.x, action.rect.x + action.rect.w) - pad));
    const y1 = Math.max(0, Math.floor(Math.min(action.rect.y, action.rect.y + action.rect.h) - pad));
    const x2 = Math.min(canvasW, Math.ceil(Math.max(action.rect.x, action.rect.x + action.rect.w) + pad));
    const y2 = Math.min(canvasH, Math.ceil(Math.max(action.rect.y, action.rect.y + action.rect.h) + pad));
    return { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
  }

  const pts = action.points ?? [];
  if (pts.length === 0) return { x: 0, y: 0, w: 1, h: 1 };

  let minX = pts[0].x;
  let minY = pts[0].y;
  let maxX = pts[0].x;
  let maxY = pts[0].y;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const x1 = Math.max(0, Math.floor(minX - pad));
  const y1 = Math.max(0, Math.floor(minY - pad));
  const x2 = Math.min(canvasW, Math.ceil(maxX + pad));
  const y2 = Math.min(canvasH, Math.ceil(maxY + pad));
  return { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
}

function drawActionMask(
  maskCtx: CanvasRenderingContext2D,
  action: RedactionAction,
  offsetX: number,
  offsetY: number
) {
  maskCtx.fillStyle = "#000000";
  maskCtx.strokeStyle = "#000000";

  if (action.shape === "rect" && action.rect) {
    const rx = action.rect.w >= 0 ? action.rect.x : action.rect.x + action.rect.w;
    const ry = action.rect.h >= 0 ? action.rect.y : action.rect.y + action.rect.h;
    maskCtx.fillRect(
      rx - offsetX,
      ry - offsetY,
      Math.abs(action.rect.w),
      Math.abs(action.rect.h)
    );
    return;
  }

  const pts = action.points ?? [];
  if (pts.length === 0) return;

  if (action.shape === "lasso") {
    if (pts.length < 3) return;
    maskCtx.beginPath();
    maskCtx.moveTo(pts[0].x - offsetX, pts[0].y - offsetY);
    for (let i = 1; i < pts.length; i++) {
      maskCtx.lineTo(pts[i].x - offsetX, pts[i].y - offsetY);
    }
    maskCtx.closePath();
    maskCtx.fill();
    return;
  }

  maskCtx.lineCap = "round";
  maskCtx.lineJoin = "round";
  maskCtx.lineWidth = action.brushSize;

  if (pts.length === 1) {
    maskCtx.beginPath();
    maskCtx.arc(
      pts[0].x - offsetX,
      pts[0].y - offsetY,
      action.brushSize / 2,
      0,
      Math.PI * 2
    );
    maskCtx.fill();
    return;
  }

  maskCtx.beginPath();
  maskCtx.moveTo(pts[0].x - offsetX, pts[0].y - offsetY);
  for (let i = 1; i < pts.length; i++) {
    maskCtx.lineTo(pts[i].x - offsetX, pts[i].y - offsetY);
  }
  maskCtx.stroke();
}

export function applyRedactionAction(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  action: RedactionAction
) {
  if (action.type === "solid") {
    ctx.save();
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#1e293b";
    if (action.shape === "rect" && action.rect) {
      const rx = action.rect.w >= 0 ? action.rect.x : action.rect.x + action.rect.w;
      const ry = action.rect.h >= 0 ? action.rect.y : action.rect.y + action.rect.h;
      ctx.fillRect(rx, ry, Math.abs(action.rect.w), Math.abs(action.rect.h));
    } else if (action.shape === "lasso" && action.points && action.points.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (action.points && action.points.length > 0) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = action.brushSize;
      if (action.points.length === 1) {
        ctx.beginPath();
        ctx.arc(action.points[0].x, action.points[0].y, action.brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  const box = getBoundingBox(action, canvasW, canvasH);
  if (box.w <= 0 || box.h <= 0) return;

  const effectCanvas = document.createElement("canvas");
  effectCanvas.width = box.w;
  effectCanvas.height = box.h;
  const effectCtx = effectCanvas.getContext("2d");
  if (!effectCtx) return;

  effectCtx.drawImage(
    ctx.canvas,
    box.x,
    box.y,
    box.w,
    box.h,
    0,
    0,
    box.w,
    box.h
  );

  if (action.type === "stackblur") {
    const radius = Math.max(2, Math.min(60, Math.round(action.intensity)));
    StackBlur.canvasRGBA(effectCanvas, 0, 0, box.w, box.h, radius);
  } else if (action.type === "pixelate") {
    const block = Math.max(4, Math.round(action.intensity * 0.9));
    const smallW = Math.max(1, Math.floor(box.w / block));
    const smallH = Math.max(1, Math.floor(box.h / block));
    const tiny = document.createElement("canvas");
    tiny.width = smallW;
    tiny.height = smallH;
    const tinyCtx = tiny.getContext("2d");
    if (tinyCtx) {
      tinyCtx.imageSmoothingEnabled = false;
      tinyCtx.drawImage(effectCanvas, 0, 0, smallW, smallH);
      effectCtx.imageSmoothingEnabled = false;
      effectCtx.clearRect(0, 0, box.w, box.h);
      effectCtx.drawImage(tiny, 0, 0, smallW, smallH, 0, 0, box.w, box.h);
    }
  }

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = box.w;
  maskCanvas.height = box.h;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) return;

  drawActionMask(maskCtx, action, box.x, box.y);
  maskCtx.globalCompositeOperation = "source-in";
  maskCtx.drawImage(effectCanvas, 0, 0);

  ctx.drawImage(maskCanvas, box.x, box.y);
}

export function renderRedactedCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  actions: RedactionAction[],
  showOriginal = false
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (showOriginal) return;

  for (const action of actions) {
    applyRedactionAction(ctx, canvas.width, canvas.height, action);
  }
}
