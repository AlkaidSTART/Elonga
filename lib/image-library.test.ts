import { beforeEach, describe, expect, it } from "vitest";
import {
  buildLibraryImageCaption,
  buildLibraryImageName,
  computeImageFingerprint,
  filterImageLibraryItems,
  formatImageDimensions,
  getLibraryItemProcessBadge,
} from "@/lib/image-library";
import { useImageLibraryStore } from "@/store/useImageLibraryStore";

describe("image-library helpers", () => {
  it("builds readable names and captions for mosaic and stylize outputs", () => {
    expect(buildLibraryImageName("community_photo.png", "mosaic")).toBe("community_photo_打码");
    expect(buildLibraryImageName("scene.jpg", "stylize", "ghibli")).toBe("scene_清新绘本");
    expect(buildLibraryImageName(undefined, "stylize")).toBe("工坊图片_二维风格");
    expect(buildLibraryImageCaption("图书角活动.webp", "mosaic")).toBe("图书角活动");
    expect(buildLibraryImageCaption(undefined, "mosaic")).toBe("隐私脱敏现场配图");
    expect(buildLibraryImageCaption(undefined, "stylize")).toBe("二维风格化配图");
  });

  it("computes deterministic fingerprints and distinguishes source or payload", () => {
    const dataA = `data:image/png;base64,${"A".repeat(2000)}`;
    const dataB = `data:image/png;base64,${"B".repeat(2000)}`;

    expect(computeImageFingerprint(dataA, "mosaic")).toBe(
      computeImageFingerprint(dataA, "mosaic"),
    );
    expect(computeImageFingerprint(dataA, "mosaic")).not.toBe(
      computeImageFingerprint(dataA, "stylize"),
    );
    expect(computeImageFingerprint(dataA, "mosaic")).not.toBe(
      computeImageFingerprint(dataB, "mosaic"),
    );
  });

  it("formats dimensions and process badges accurately", () => {
    expect(formatImageDimensions(960, 640)).toBe("960×640");
    expect(formatImageDimensions(0, 0)).toBe("未知尺寸");

    expect(
      getLibraryItemProcessBadge({
        id: "1",
        name: "a",
        caption: "a",
        dataUrl: "data:image/png;base64,abc",
        width: 100,
        height: 100,
        source: "mosaic",
        redactionCount: 3,
        fingerprint: "fp1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe("智能打码 · 3 处");

    expect(
      getLibraryItemProcessBadge({
        id: "2",
        name: "b",
        caption: "b",
        dataUrl: "data:image/png;base64,def",
        width: 100,
        height: 100,
        source: "stylize",
        stylePreset: "watercolor",
        fingerprint: "fp2",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe("二维风格 · 水彩手绘");
  });

  it("filters items by source and keyword query", () => {
    const items = [
      {
        id: "1",
        name: "图书角交接单_打码",
        caption: "乡村小学物资核验",
        dataUrl: "data:image/png;base64,111",
        width: 960,
        height: 640,
        source: "mosaic" as const,
        fingerprint: "fp1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "2",
        name: "河道净滩_水彩手绘",
        caption: "周末志愿者现场",
        dataUrl: "data:image/png;base64,222",
        width: 1200,
        height: 800,
        source: "stylize" as const,
        stylePreset: "watercolor" as const,
        fingerprint: "fp2",
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ];

    expect(filterImageLibraryItems(items, { source: "mosaic" })).toHaveLength(1);
    expect(filterImageLibraryItems(items, { source: "stylize" })[0].id).toBe("2");
    expect(filterImageLibraryItems(items, { query: "水彩" })[0].id).toBe("2");
    expect(filterImageLibraryItems(items, { query: "物资核验" })[0].id).toBe("1");
  });
});

describe("useImageLibraryStore", () => {
  beforeEach(() => {
    useImageLibraryStore.getState().clearImages();
  });

  it("saves images, deduplicates identical outputs, updates, deletes, and manages workflow import queue", () => {
    const store = useImageLibraryStore.getState();

    const first = store.saveImage({
      name: "现场照片_打码",
      caption: "公益活动现场",
      dataUrl: "data:image/png;base64,identical_payload",
      width: 960,
      height: 640,
      source: "mosaic",
      redactionCount: 2,
    });
    expect(first.created).toBe(true);
    expect(useImageLibraryStore.getState().items).toHaveLength(1);

    // Duplicate save with identical payload & source should be deduplicated
    const duplicate = useImageLibraryStore.getState().saveImage({
      name: "现场照片_打码",
      caption: "公益活动现场",
      dataUrl: "data:image/png;base64,identical_payload",
      width: 960,
      height: 640,
      source: "mosaic",
      redactionCount: 2,
    });
    expect(duplicate.created).toBe(false);
    expect(duplicate.item.id).toBe(first.item.id);
    expect(useImageLibraryStore.getState().items).toHaveLength(1);

    // Update name and caption
    useImageLibraryStore.getState().updateImage(first.item.id, {
      name: "新名称",
      caption: "更新后的图注",
    });
    expect(useImageLibraryStore.getState().items[0].name).toBe("新名称");
    expect(useImageLibraryStore.getState().items[0].caption).toBe("更新后的图注");

    // Queue and consume workflow import IDs
    useImageLibraryStore.getState().queueImportToWorkflow([first.item.id, first.item.id]);
    expect(useImageLibraryStore.getState().pendingImportIds).toEqual([first.item.id]);
    expect(useImageLibraryStore.getState().consumePendingImportIds()).toEqual([first.item.id]);
    expect(useImageLibraryStore.getState().pendingImportIds).toEqual([]);

    // Delete also removes from pendingImportIds
    useImageLibraryStore.getState().queueImportToWorkflow([first.item.id]);
    useImageLibraryStore.getState().deleteImage(first.item.id);
    expect(useImageLibraryStore.getState().items).toHaveLength(0);
    expect(useImageLibraryStore.getState().pendingImportIds).toEqual([]);
  });
});
