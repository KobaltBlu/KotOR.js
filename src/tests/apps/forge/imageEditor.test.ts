import { describe, expect, test } from "@jest/globals";
import {
  DEFAULT_ENCODE_POLICY,
  addLayer,
  buildTpcExportBuffer,
  createUntitledDocument,
  flattenDocument,
  flipDocumentHorizontal,
  floodFill,
  getActiveLayer,
  setSelectionRect,
} from "@/apps/forge/image";

function putPixel(doc: ReturnType<typeof createUntitledDocument>, x: number, y: number, r: number, g: number, b: number, a: number): void {
  const layer = getActiveLayer(doc);
  if (!layer) return;
  const i = (y * doc.width + x) * 4;
  layer.pixels[i] = r;
  layer.pixels[i + 1] = g;
  layer.pixels[i + 2] = b;
  layer.pixels[i + 3] = a;
}

function pixel(flat: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const i = (y * width + x) * 4;
  return [flat[i], flat[i + 1], flat[i + 2], flat[i + 3]];
}

describe("image document", () => {
  test("untitled document is 256x256 and transparent", () => {
    const doc = createUntitledDocument();
    expect(doc.width).toBe(256);
    expect(doc.height).toBe(256);
    expect(doc.layers.length).toBe(1);
    const flat = flattenDocument(doc);
    expect(flat.length).toBe(256 * 256 * 4);
    expect(flat[3]).toBe(0);
  });

  test("flattens two overlapping layers", () => {
    const doc = createUntitledDocument(2, 2);
    putPixel(doc, 0, 0, 255, 0, 0, 255);
    const upper = addLayer(doc, "Green");
    const i = 0;
    upper.pixels[i] = 0;
    upper.pixels[i + 1] = 255;
    upper.pixels[i + 2] = 0;
    upper.pixels[i + 3] = 255;
    const flat = flattenDocument(doc);
    expect(pixel(flat, 2, 0, 0)).toEqual([0, 255, 0, 255]);
    expect(pixel(flat, 2, 1, 0)[3]).toBe(0);
  });
});

describe("image tools and ops", () => {
  test("fill paints matching pixels", () => {
    const doc = createUntitledDocument(4, 1);
    const layer = getActiveLayer(doc);
    floodFill(layer!, doc, 0, 0, { r: 10, g: 20, b: 30, a: 255 }, 0);
    const flat = flattenDocument(doc);
    expect(pixel(flat, 4, 0, 0)).toEqual([10, 20, 30, 255]);
    expect(pixel(flat, 4, 3, 0)).toEqual([10, 20, 30, 255]);
  });

  test("fill respects a rectangular selection", () => {
    const doc = createUntitledDocument(4, 1);
    setSelectionRect(doc, { x: 1, y: 0, w: 1, h: 1 });
    floodFill(getActiveLayer(doc)!, doc, 1, 0, { r: 255, g: 0, b: 0, a: 255 }, 32);
    const flat = flattenDocument(doc);
    expect(pixel(flat, 4, 1, 0)).toEqual([255, 0, 0, 255]);
    expect(pixel(flat, 4, 0, 0)[3]).toBe(0);
    expect(pixel(flat, 4, 2, 0)[3]).toBe(0);
  });

  test("flip horizontal moves a pixel across", () => {
    const doc = createUntitledDocument(4, 2);
    putPixel(doc, 0, 0, 255, 128, 0, 255);
    flipDocumentHorizontal(doc);
    const flat = flattenDocument(doc);
    expect(pixel(flat, 4, 3, 0)).toEqual([255, 128, 0, 255]);
    expect(pixel(flat, 4, 0, 0)[3]).toBe(0);
  });
});

describe("TPC export", () => {
  test("writes TXI text after the mip payload", () => {
    const rgba = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 32;
      rgba[i + 1] = 64;
      rgba[i + 2] = 96;
      rgba[i + 3] = 255;
    }
    const buf = buildTpcExportBuffer(
      rgba,
      16,
      16,
      "proceduretype cycle\nnumx 4",
      DEFAULT_ENCODE_POLICY,
    );
    const width = buf[8] | (buf[9] << 8);
    const height = buf[10] | (buf[11] << 8);
    expect(width).toBe(16);
    expect(height).toBe(16);
    const text = Buffer.from(buf).toString("latin1");
    expect(text).toContain("proceduretype cycle");
    expect(text).toContain("numx 4");
  });
});
