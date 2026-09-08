import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { MapNorthAxis } from "@/enums/engine/MapNorthAxis";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import {
  AreaMap,
  AREA_MAP_LOGICAL_SIZE_TSL,
  AREA_MAP_LOGICAL_SIZE_K1,
} from "@/module/AreaMap";

/** Live TSL scene Map corners (NorthAxis=SOUTH). Expected pixels use retail floor(uv*size+0.5). */
const LIVE_TSL_SOUTH = {
  northAxis: MapNorthAxis.SOUTH,
  mapResX: 24,
  mapZoom: 1,
  worldPt1X: 2.6500000953674316,
  worldPt1Y: -126.83999633789062,
  worldPt2X: 89.8499984741211,
  worldPt2Y: 97.88999938964844,
  mapPt1X: 0.7839999794960022,
  mapPt1Y: 0.6420000195503235,
  mapPt2X: 0.2460000067949295,
  mapPt2Y: 0.2150000035762787,
  pc: { x: 2.6319277773757, y: -62.99151798317822 },
  expectedPixel: { x: 371, y: 189 },
};

function applyMapFields(areaMap: AreaMap, fields: Partial<AreaMap> & {
  northAxis: number;
  worldPt1X: number;
  worldPt1Y: number;
  worldPt2X: number;
  worldPt2Y: number;
  mapPt1X: number;
  mapPt1Y: number;
  mapPt2X: number;
  mapPt2Y: number;
}){
  areaMap.northAxis = fields.northAxis;
  areaMap.worldPt1X = fields.worldPt1X;
  areaMap.worldPt1Y = fields.worldPt1Y;
  areaMap.worldPt2X = fields.worldPt2X;
  areaMap.worldPt2Y = fields.worldPt2Y;
  areaMap.mapPt1X = fields.mapPt1X;
  areaMap.mapPt1Y = fields.mapPt1Y;
  areaMap.mapPt2X = fields.mapPt2X;
  areaMap.mapPt2Y = fields.mapPt2Y;
  areaMap.mapResX = fields.mapResX ?? 24;
  areaMap.mapZoom = fields.mapZoom ?? 1;
  areaMap.init();
}

describe("AreaMap engine coordinates", () => {
  let previousGameKey: GameEngineType;

  beforeEach(() => {
    previousGameKey = ApplicationProfile.GameKey;
  });

  afterEach(() => {
    ApplicationProfile.GameKey = previousGameKey;
  });

  test("NorthAxis transform matches engine Initialize / GetMapPixelFromWorldCoord", () => {
    expect(AreaMap.transformWorldByNorthAxis(3, 5, MapNorthAxis.NORTH)).toEqual({ x: 3, y: 5 });
    expect(AreaMap.transformWorldByNorthAxis(3, 5, MapNorthAxis.EAST)).toEqual({ x: -3, y: -5 });
    expect(AreaMap.transformWorldByNorthAxis(3, 5, MapNorthAxis.SOUTH)).toEqual({ x: 5, y: -3 });
    expect(AreaMap.transformWorldByNorthAxis(3, 5, MapNorthAxis.WEST)).toEqual({ x: -5, y: 3 });
  });

  test("uvToLogicalPixel uses retail floor(uv * size + 0.5), not trunc", () => {
    const { width, height } = AREA_MAP_LOGICAL_SIZE_TSL;
    // Live MapPts where trunc and round diverge
    expect(AreaMap.uvToLogicalPixel(LIVE_TSL_SOUTH.mapPt1X, width)).toBe(461);
    expect(Math.trunc(LIVE_TSL_SOUTH.mapPt1X * width)).toBe(460);
    expect(AreaMap.uvToLogicalPixel(LIVE_TSL_SOUTH.mapPt1Y, height)).toBe(189);
    expect(Math.trunc(LIVE_TSL_SOUTH.mapPt1Y * height)).toBe(188);
    expect(AreaMap.uvToLogicalPixel(LIVE_TSL_SOUTH.mapPt2X, width)).toBe(145);
    expect(Math.trunc(LIVE_TSL_SOUTH.mapPt2X * width)).toBe(144);
  });

  test("live TSL SOUTH scene maps PC to engine pixels (371, 189)", () => {
    ApplicationProfile.GameKey = GameEngineType.TSL;
    const areaMap = new AreaMap();
    applyMapFields(areaMap, LIVE_TSL_SOUTH);

    const pix = areaMap.toMapPixels(LIVE_TSL_SOUTH.pc.x, LIVE_TSL_SOUTH.pc.y);
    expect(pix.valid).toBe(true);
    expect(pix.x).toBe(LIVE_TSL_SOUTH.expectedPixel.x);
    expect(pix.y).toBe(LIVE_TSL_SOUTH.expectedPixel.y);

    const uv = areaMap.toMapCoordinates(LIVE_TSL_SOUTH.pc.x, LIVE_TSL_SOUTH.pc.y);
    expect(uv.x).toBeCloseTo(LIVE_TSL_SOUTH.expectedPixel.x / AREA_MAP_LOGICAL_SIZE_TSL.width, 5);
    // Display Y is flipped vs pixels (AurGUI top-origin → Three.js bottom-origin)
    expect(uv.y).toBeCloseTo(1 - LIVE_TSL_SOUTH.expectedPixel.y / AREA_MAP_LOGICAL_SIZE_TSL.height, 5);
  });

  test("display UV Y-flip leaves raw pixels unchanged", () => {
    ApplicationProfile.GameKey = GameEngineType.TSL;
    const areaMap = new AreaMap();
    applyMapFields(areaMap, LIVE_TSL_SOUTH);
    const pix = areaMap.toMapPixels(LIVE_TSL_SOUTH.pc.x, LIVE_TSL_SOUTH.pc.y);
    const uv = areaMap.toMapCoordinates(LIVE_TSL_SOUTH.pc.x, LIVE_TSL_SOUTH.pc.y);
    expect(pix.y).toBe(189);
    expect(uv.y).not.toBeCloseTo(pix.y / AREA_MAP_LOGICAL_SIZE_TSL.height, 5);
    expect(uv.y + pix.y / AREA_MAP_LOGICAL_SIZE_TSL.height).toBeCloseTo(1, 5);
  });

  test("NORTH: worldPt1 maps near mapPt1 pixels", () => {
    ApplicationProfile.GameKey = GameEngineType.TSL;
    const areaMap = new AreaMap();
    applyMapFields(areaMap, {
      ...LIVE_TSL_SOUTH,
      northAxis: MapNorthAxis.NORTH,
    });

    const pix = areaMap.toMapPixels(LIVE_TSL_SOUTH.worldPt1X, LIVE_TSL_SOUTH.worldPt1Y);
    const mp1x = AreaMap.uvToLogicalPixel(LIVE_TSL_SOUTH.mapPt1X, AREA_MAP_LOGICAL_SIZE_TSL.width);
    const mp1y = AreaMap.uvToLogicalPixel(LIVE_TSL_SOUTH.mapPt1Y, AREA_MAP_LOGICAL_SIZE_TSL.height);
    expect(pix.x).toBe(mp1x);
    expect(pix.y).toBe(mp1y);
    expect(pix.valid).toBe(true);
  });

  test.each([
    [GameEngineType.KOTOR, AREA_MAP_LOGICAL_SIZE_K1],
    [GameEngineType.TSL, AREA_MAP_LOGICAL_SIZE_TSL],
  ] as const)("synthetic calibration %s: worldPt1 → mapPt1 for all NorthAxis", (gameKey, logical) => {
    ApplicationProfile.GameKey = gameKey;
    const axes = [
      MapNorthAxis.NORTH,
      MapNorthAxis.EAST,
      MapNorthAxis.SOUTH,
      MapNorthAxis.WEST,
    ];

    for(const axis of axes){
      const areaMap = new AreaMap();
      applyMapFields(areaMap, {
        northAxis: axis,
        mapResX: 32,
        worldPt1X: 10,
        worldPt1Y: 20,
        worldPt2X: 110,
        worldPt2Y: 120,
        mapPt1X: 0.25,
        mapPt1Y: 0.25,
        mapPt2X: 0.75,
        mapPt2Y: 0.75,
      });

      const pix1 = areaMap.toMapPixels(10, 20);
      const expectedX = AreaMap.uvToLogicalPixel(0.25, logical.width);
      const expectedY = AreaMap.uvToLogicalPixel(0.25, logical.height);
      expect(pix1.valid).toBe(true);
      expect(pix1.x).toBe(expectedX);
      expect(pix1.y).toBe(expectedY);

      const pix2 = areaMap.toMapPixels(110, 120);
      expect(pix2.valid).toBe(true);
      expect(pix2.x).toBe(AreaMap.uvToLogicalPixel(0.75, logical.width));
      expect(pix2.y).toBe(AreaMap.uvToLogicalPixel(0.75, logical.height));

      // Interior midpoint stays in-bounds
      const mid = areaMap.toMapPixels(60, 70);
      expect(mid.valid).toBe(true);
      expect(mid.x).toBeGreaterThanOrEqual(0);
      expect(mid.y).toBeGreaterThanOrEqual(0);
      expect(mid.x).toBeLessThanOrEqual(logical.width);
      expect(mid.y).toBeLessThanOrEqual(logical.height);
    }
  });

  test("EAST / WEST / SOUTH transforms stay in-bounds for worldPt1", () => {
    ApplicationProfile.GameKey = GameEngineType.TSL;
    for(const axis of [MapNorthAxis.EAST, MapNorthAxis.SOUTH, MapNorthAxis.WEST]){
      const areaMap = new AreaMap();
      applyMapFields(areaMap, {
        ...LIVE_TSL_SOUTH,
        northAxis: axis,
      });
      const pix = areaMap.toMapPixels(LIVE_TSL_SOUTH.worldPt1X, LIVE_TSL_SOUTH.worldPt1Y);
      expect(pix.valid).toBe(true);
      expect(pix.x).toBeGreaterThanOrEqual(0);
      expect(pix.y).toBeGreaterThanOrEqual(0);
      expect(pix.x).toBeLessThanOrEqual(AREA_MAP_LOGICAL_SIZE_TSL.width);
      expect(pix.y).toBeLessThanOrEqual(AREA_MAP_LOGICAL_SIZE_TSL.height);
    }
  });

  test("K1 logical bounds use 440x256", () => {
    ApplicationProfile.GameKey = GameEngineType.KOTOR;
    const areaMap = new AreaMap();
    applyMapFields(areaMap, {
      northAxis: MapNorthAxis.NORTH,
      mapResX: 32,
      worldPt1X: 0,
      worldPt1Y: 0,
      worldPt2X: 100,
      worldPt2Y: 100,
      mapPt1X: 0,
      mapPt1Y: 0,
      mapPt2X: 1,
      mapPt2Y: 1,
    });

    const atOrigin = areaMap.toMapPixels(0, 0);
    expect(atOrigin).toEqual({ x: 0, y: 0, valid: true });

    const atFar = areaMap.toMapPixels(100, 100);
    expect(atFar.x).toBe(AREA_MAP_LOGICAL_SIZE_K1.width);
    expect(atFar.y).toBe(AREA_MAP_LOGICAL_SIZE_K1.height);
    expect(atFar.valid).toBe(true);
  });

  test("generateResY uses game aspect (K1 256/440, TSL 294/588)", () => {
    ApplicationProfile.GameKey = GameEngineType.KOTOR;
    const k1 = new AreaMap();
    k1.mapResX = 32;
    k1.generateResY();
    expect(k1.mapResY).toBe(Math.floor((32 * 256) / 440));

    ApplicationProfile.GameKey = GameEngineType.TSL;
    const tsl = new AreaMap();
    tsl.mapResX = 24;
    tsl.generateResY();
    expect(tsl.mapResY).toBe(Math.floor((24 * 294) / 588));
  });

  test("FromStruct FLOAT MapPt keeps UV; INT MapPt normalizes by logical size", () => {
    ApplicationProfile.GameKey = GameEngineType.TSL;
    const { width, height } = AREA_MAP_LOGICAL_SIZE_TSL;

    const floatStruct = new GFFStruct(14);
    floatStruct.addField(new GFFField(GFFDataType.FLOAT, "MapPt1X")).setValue(0.5);
    floatStruct.addField(new GFFField(GFFDataType.FLOAT, "MapPt1Y")).setValue(0.25);
    floatStruct.addField(new GFFField(GFFDataType.FLOAT, "MapPt2X")).setValue(0.75);
    floatStruct.addField(new GFFField(GFFDataType.FLOAT, "MapPt2Y")).setValue(0.5);
    floatStruct.addField(new GFFField(GFFDataType.INT, "MapResX")).setValue(24);
    floatStruct.addField(new GFFField(GFFDataType.INT, "MapZoom")).setValue(1);
    floatStruct.addField(new GFFField(GFFDataType.INT, "NorthAxis")).setValue(0);
    floatStruct.addField(new GFFField(GFFDataType.FLOAT, "WorldPt1X")).setValue(0);
    floatStruct.addField(new GFFField(GFFDataType.FLOAT, "WorldPt1Y")).setValue(0);
    floatStruct.addField(new GFFField(GFFDataType.FLOAT, "WorldPt2X")).setValue(10);
    floatStruct.addField(new GFFField(GFFDataType.FLOAT, "WorldPt2Y")).setValue(10);

    const fromFloat = AreaMap.FromStruct(floatStruct);
    expect(fromFloat).toBeDefined();
    expect(fromFloat!.mapPt1X).toBeCloseTo(0.5);
    expect(fromFloat!.mapPt1Y).toBeCloseTo(0.25);

    const intStruct = new GFFStruct(14);
    intStruct.addField(new GFFField(GFFDataType.INT, "MapPt1X")).setValue(294);
    intStruct.addField(new GFFField(GFFDataType.INT, "MapPt1Y")).setValue(147);
    intStruct.addField(new GFFField(GFFDataType.INT, "MapPt2X")).setValue(588);
    intStruct.addField(new GFFField(GFFDataType.INT, "MapPt2Y")).setValue(294);
    intStruct.addField(new GFFField(GFFDataType.INT, "MapResX")).setValue(24);
    intStruct.addField(new GFFField(GFFDataType.INT, "MapZoom")).setValue(1);
    intStruct.addField(new GFFField(GFFDataType.INT, "NorthAxis")).setValue(0);
    intStruct.addField(new GFFField(GFFDataType.FLOAT, "WorldPt1X")).setValue(0);
    intStruct.addField(new GFFField(GFFDataType.FLOAT, "WorldPt1Y")).setValue(0);
    intStruct.addField(new GFFField(GFFDataType.FLOAT, "WorldPt2X")).setValue(10);
    intStruct.addField(new GFFField(GFFDataType.FLOAT, "WorldPt2Y")).setValue(10);

    const fromInt = AreaMap.FromStruct(intStruct);
    expect(fromInt).toBeDefined();
    expect(fromInt!.mapPt1X).toBeCloseTo(294 / width);
    expect(fromInt!.mapPt1Y).toBeCloseTo(147 / height);
    expect(fromInt!.mapPt2X).toBeCloseTo(588 / width);
    expect(fromInt!.mapPt2Y).toBeCloseTo(294 / height);
  });

  test("toGridPixels matches engine GetGridPixelFromMapPixel", () => {
    ApplicationProfile.GameKey = GameEngineType.TSL;
    const areaMap = new AreaMap();
    applyMapFields(areaMap, LIVE_TSL_SOUTH);

    const grid = areaMap.toGridPixels(371, 189);
    expect(grid.valid).toBe(true);
    expect(grid.x).toBe(Math.trunc(371 / (AREA_MAP_LOGICAL_SIZE_TSL.width / LIVE_TSL_SOUTH.mapResX) + 0.5));
    expect(grid.y).toBe(Math.trunc(189 / (AREA_MAP_LOGICAL_SIZE_TSL.height / areaMap.mapResY) + 0.5));
  });
});
