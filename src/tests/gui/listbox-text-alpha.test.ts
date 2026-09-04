/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";
import { applyProtoTemplateSkin } from "@/gui/listrow/applyProtoTemplateSkin";

describe("applyProtoTemplateSkin font bind", () => {
  it("sets material.map and USE_MAP so glyph alpha is available immediately", () => {
    const font = new THREE.Texture();
    const template = {
      guiFont: { name: "fnt_dialog16x16" },
      text: {
        texture: font,
        material: {
          uniforms: { map: { value: font } },
        },
      },
    } as any;

    const rowMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: null },
        alphaTest: { value: 1 },
      },
      defines: { GUI_SORT: "" },
    });
    const row = {
      guiFont: undefined,
      text: {
        texture: undefined,
        material: rowMat,
      },
    } as any;

    applyProtoTemplateSkin(row, template);

    expect(row.guiFont).toBe(template.guiFont);
    expect(row.text.texture).toBe(font);
    expect(rowMat.uniforms.map.value).toBe(font);
    expect((rowMat as any).map).toBe(font);
    expect(rowMat.defines.USE_MAP).toBe("");
    expect(rowMat.defines.USE_UV).toBe("");
    expect(rowMat.alphaTest).toBe(0);
    expect(rowMat.transparent).toBe(true);
  });
});

describe("TextureLoader.enQueue cache-hit onLoad order", () => {
  it("does not invoke onLoad until material.map is assigned", async () => {
    // Load TextureLoader + three in one module graph so instanceof ShaderMaterial matches.
    jest.resetModules();
    jest.doMock("@/three/odyssey/OdysseyMaterialBuilder", () => ({
      OdysseyMaterialBuilder: {
        applyTXIToMaterial: jest.fn(() => Promise.resolve()),
      },
    }));
    jest.doMock("@/loaders/TPCLoader", () => ({
      TPCLoader: jest.fn().mockImplementation(() => ({ fetch: jest.fn() })),
    }));
    jest.doMock("@/loaders/TGALoader", () => ({
      TGALoader: jest.fn().mockImplementation(() => ({
        fetch: jest.fn(),
        TextureLoader: undefined,
      })),
    }));

    const THREE2 = await import("three");
    const { TextureLoader } = await import("@/loaders/TextureLoader");
    const { TextureType } = await import("@/enums/loaders/TextureType");

    const name = "fnt_test_dialog";
    const cached = new THREE2.Texture() as any;
    TextureLoader.guiTextures.set(name, cached);

    const material = new THREE2.ShaderMaterial({
      uniforms: {
        map: { value: null },
      },
      defines: { GUI_SORT: "" },
    });

    let onLoadCalls = 0;
    let mapAtOnLoad: THREE.Texture | null | undefined;

    TextureLoader.enQueue(name, material, TextureType.TEXTURE, () => {
      onLoadCalls++;
      mapAtOnLoad = (material as any).map;
    });

    // Premature sync onLoad was the listbox opaque-text flash.
    expect(onLoadCalls).toBe(0);
    expect((material as any).map).toBeFalsy();

    for (let i = 0; i < 16 && onLoadCalls === 0; i++) {
      await Promise.resolve();
    }

    expect(onLoadCalls).toBe(1);
    expect(mapAtOnLoad).toBe(cached);
    expect((material as any).map).toBe(cached);

    TextureLoader.guiTextures.delete(name);
  });
});
