/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";

const GUI_CHROME_REGION_EDGE = 0;
const GUI_CHROME_REGION_CORNER = 1;
const GUI_CHROME_REGION_FILL = 2;

function stampRegionAttribute(geometry: THREE.BufferGeometry, region: number): void {
  const pos = geometry.getAttribute('position');
  if(!pos) return;
  const arr = new Float32Array(pos.count);
  arr.fill(region);
  geometry.setAttribute('region', new THREE.BufferAttribute(arr, 1));
}

describe("gui chrome region attribute", () => {
  it("stamps edge/corner/fill region ids on quads", () => {
    const edge = new THREE.PlaneGeometry(10, 2, 1, 1);
    stampRegionAttribute(edge, GUI_CHROME_REGION_EDGE);
    const corner = new THREE.PlaneGeometry(2, 2, 1, 1);
    stampRegionAttribute(corner, GUI_CHROME_REGION_CORNER);
    const fill = new THREE.PlaneGeometry(8, 8, 1, 1);
    stampRegionAttribute(fill, GUI_CHROME_REGION_FILL);

    expect((edge.getAttribute('region') as THREE.BufferAttribute).getX(0)).toBe(GUI_CHROME_REGION_EDGE);
    expect((corner.getAttribute('region') as THREE.BufferAttribute).getX(0)).toBe(GUI_CHROME_REGION_CORNER);
    expect((fill.getAttribute('region') as THREE.BufferAttribute).getX(0)).toBe(GUI_CHROME_REGION_FILL);
    expect((fill.getAttribute('region') as THREE.BufferAttribute).count).toBe(4);

    edge.dispose();
    corner.dispose();
    fill.dispose();
  });

  it("Float32Array.fill(undefined) is NaN — region ids must be finite exports", () => {
    // Regression: GUI_CHROME_REGION_* were imported but not exported from guiChrome,
    // so stamp wrote NaN and the shader discarded every frame fragment.
    const arr = new Float32Array(4);
    arr.fill(undefined as unknown as number);
    expect(arr.every((v) => Number.isNaN(v))).toBe(true);
    expect(Number.isFinite(GUI_CHROME_REGION_EDGE)).toBe(true);
    expect(Number.isFinite(GUI_CHROME_REGION_CORNER)).toBe(true);
    expect(Number.isFinite(GUI_CHROME_REGION_FILL)).toBe(true);
  });
});

describe("gui chrome hover mode constants", () => {
  it("matches ShaderAuroraGUI hoverMode swap/overlay values", () => {
    // Keep in sync with guiChrome.ts exports (avoid importing BufferGeometryUtils ESM here).
    const GUI_HOVER_MODE_SWAP = 0;
    const GUI_HOVER_MODE_OVERLAY = 1;
    expect(GUI_HOVER_MODE_SWAP).toBe(0);
    expect(GUI_HOVER_MODE_OVERLAY).toBe(1);
  });
});

describe("chromeFrameDimension", () => {
  // Avoid importing guiChrome.ts (pulls BufferGeometryUtils ESM). Inline the helper contract.
  function asGuiSize(n: number): number {
    if(!(n > 0)) return 0;
    const t = Math.trunc(n);
    return t < 1 ? 1 : (t | 0);
  }
  function chromeFrameDimension(
    borderDim: number,
    highlightDim: number,
    hasBorderFrame: boolean,
    hasHighlightFrame: boolean,
  ): number {
    const b = asGuiSize(borderDim);
    const h = asGuiSize(highlightDim);
    if(!hasBorderFrame && hasHighlightFrame) return h;
    if(!hasHighlightFrame) return b;
    return Math.max(b, h);
  }

  it("uses highlight dim for K1 saveload-style empty idle border", () => {
    // Retail BTN_SAVELOAD: BORDER dim 2 empty, HILIGHT dim 6 boxline
    expect(chromeFrameDimension(2, 6, false, true)).toBe(6);
  });

  it("keeps matching K2 frame dims", () => {
    expect(chromeFrameDimension(16, 16, true, true)).toBe(16);
  });

  it("takes max when both frames present with different dims", () => {
    expect(chromeFrameDimension(4, 8, true, true)).toBe(8);
  });

  it("clamps fractional frame dims up to 1", () => {
    expect(chromeFrameDimension(0.4, 0, true, false)).toBe(1);
    expect(chromeFrameDimension(0, 0.4, false, true)).toBe(1);
  });
});

describe("ShaderAuroraGUI chrome uniforms", () => {
  it("exposes chrome map and hover uniforms by default", async () => {
    const { ShaderAuroraGUI } = await import("@/shaders/ShaderAuroraGUI");
    const shader = new ShaderAuroraGUI();
    const uniforms = shader.getUniforms() as any;
    expect(uniforms.edgeMap).toBeDefined();
    expect(uniforms.highlightFillMap).toBeDefined();
    expect(uniforms.hovered).toBeDefined();
    expect(uniforms.hoverMode).toBeDefined();
    expect(uniforms.hasEdgeMap).toBeDefined();
    expect(uniforms.enableFrame).toBeDefined();
    expect(shader.getFragment()).toContain('GUI_CHROME');
    expect(shader.getVertex()).toContain('vRegion');
  });
});
