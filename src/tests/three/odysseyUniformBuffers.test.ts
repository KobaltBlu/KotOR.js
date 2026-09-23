import * as THREE from "three";
import { OdysseyUniformBuffers } from "@/three/odyssey/OdysseyUniformBuffers";
import { MAX_ODYSSEY_LIGHTS } from "@/shaders/chunks/OdysseyLighting";
import { MAX_ODYSSEY_SHADOW_MAPS } from "@/shaders/chunks/OdysseyShadow";

describe("OdysseyUniformBuffers std140 packs", () => {
  test("layout float counts are stable", () => {
    const counts = OdysseyUniformBuffers.getLayoutFloatCounts();
    expect(counts.lighting).toBe(4 * 4 + 4 + 2 * 4 + MAX_ODYSSEY_LIGHTS * 4 * 2);
    expect(counts.shadow).toBe(
      MAX_ODYSSEY_SHADOW_MAPS * 16 +
        MAX_ODYSSEY_SHADOW_MAPS * 4 +
        4 * 4 +
        5 * 4
    );
    expect(counts.wind).toBe(2 * 4 + 4 + 16 * 4 + 16 * 4);
  });

  test("packLighting writes ambient and light slots", () => {
    const ubo = OdysseyUniformBuffers.lightingGlobal;
    const pos = Array.from({ length: MAX_ODYSSEY_LIGHTS }, () => new THREE.Vector4());
    const col = Array.from({ length: MAX_ODYSSEY_LIGHTS }, () => new THREE.Vector4());
    pos[0].set(1, 2, 3, 4);
    col[0].set(0.5, 0.25, 0.125, 1);
    OdysseyUniformBuffers.packLighting(ubo, {
      ambient: new THREE.Color(0.1, 0.2, 0.3),
      sunAmbient: new THREE.Color(0, 0, 0),
      sun: new THREE.Color(1, 1, 1),
      sunDir: new THREE.Vector3(0, 0, 1),
      numLights: 1,
      headEnabled: false,
      headAmbient: new THREE.Color(0, 0, 0),
      headDiffuse: new THREE.Color(0, 0, 0),
      lightPos: pos,
      lightColor: col,
    });
    expect(ubo.data[0]).toBeCloseTo(0.1, 5);
    expect(ubo.data[1]).toBeCloseTo(0.2, 5);
    expect(ubo.data[2]).toBeCloseTo(0.3, 5);
    // numLights at float offset 16
    expect(ubo.data[16]).toBe(1);
    // first light pos after head block: 16+4+8 = 28
    expect(ubo.data[28]).toBe(1);
    expect(ubo.data[29]).toBe(2);
    expect(ubo.data[30]).toBe(3);
    expect(ubo.data[31]).toBe(4);
  });

  test("packShadow writes map active and strength vec4", () => {
    const matrices = Array.from({ length: MAX_ODYSSEY_SHADOW_MAPS }, () => new THREE.Matrix4());
    const worlds = Array.from({ length: MAX_ODYSSEY_SHADOW_MAPS }, () => new THREE.Vector3(9, 8, 7));
    OdysseyUniformBuffers.packShadow({
      matrices,
      lightWorlds: worlds,
      strengths: [0.5, 0, 0, 0],
      influences: [10, 0, 0, 0],
      actives: [1, 0, 0, 0],
      distantFactors: [0.25, 0, 0, 0],
      mapSizeX: 512,
      mapSizeY: 512,
      beamingAlpha: 0,
      mapActive: 1,
      lightCount: 1,
      soft: 0,
      constantBias: 0.001,
      slopeBias: 0.002,
      softTexelLocal: 1,
      softTexelDistant: 1,
      softDepthLocal: 1,
      softDepthDistant: 1,
      fadeStart: 0.5,
      fadeStartSoft: 0.4,
      edgeFade: 0.05,
      edgeFadeSoft: 0.1,
      floorBiasScale: 0.15,
      contactNormalZ: 0.5,
      minVertexColor: 0.2,
    });
    const d = OdysseyUniformBuffers.shadow.data;
    // After mat4[4] (64) + lightWorld[4] (16) = 80 → strength vec4
    expect(d[80]).toBeCloseTo(0.5, 5);
    expect(d[84]).toBeCloseTo(10, 5);
    expect(d[88]).toBe(1);
    // scalars start at 80+16 = 96
    expect(d[96]).toBe(512);
    expect(d[97]).toBe(512);
    expect(d[99]).toBe(1); // mapActive
  });

  test("resolveMaterialProgram prefers currentProgram (Three r149)", () => {
    const current = { program: {} as WebGLProgram };
    const legacy = { program: {} as WebGLProgram };
    expect(
      OdysseyUniformBuffers.resolveMaterialProgram({
        currentProgram: current,
        program: legacy,
      })
    ).toBe(current.program);

    const mapEntry = { program: {} as WebGLProgram };
    const programs = new Map([["key", mapEntry]]);
    expect(
      OdysseyUniformBuffers.resolveMaterialProgram({
        programs,
      })
    ).toBe(mapEntry.program);

    expect(OdysseyUniformBuffers.resolveMaterialProgram(null)).toBeUndefined();
  });
});
