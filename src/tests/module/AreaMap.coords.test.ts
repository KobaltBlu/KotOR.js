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

/**
 * Live / export-backed Map structs for N/E/S/W × K1/TSL.
 * Calibration from exports/k1|k2/module/<mod>/area/<are>.are.json
 * (see docs/minimap-axis-validation.md).
 */
interface LiveAreaMapFixture {
  id: string;
  gameKey: GameEngineType;
  northAxis: MapNorthAxis;
  mapResX: number;
  mapZoom: number;
  worldPt1X: number;
  worldPt1Y: number;
  worldPt2X: number;
  worldPt2Y: number;
  mapPt1X: number;
  mapPt1Y: number;
  mapPt2X: number;
  mapPt2Y: number;
  /** Sample world point (live PC or world midpoint). */
  sample: { x: number; y: number };
  /** Optional live note samples with expected retail pixels. */
  notes?: { label: string; x: number; y: number; pixel: { x: number; y: number } }[];
}

/** K1 Endar Spire command deck — WEST. Sample = live PC → retail (206, 91). */
const K1_END_M01AA_WEST: LiveAreaMapFixture = {
  id: "K1 end_m01aa/m01aa WEST",
  gameKey: GameEngineType.KOTOR,
  northAxis: MapNorthAxis.WEST,
  mapResX: 15,
  mapZoom: 1,
  worldPt1X: 15.399999618530273,
  worldPt1Y: 16.799999237060547,
  worldPt2X: 34.400001525878906,
  worldPt2Y: 158,
  mapPt1X: 0.08179999887943268,
  mapPt1Y: 0.32589998841285706,
  mapPt2X: 0.9363999962806702,
  mapPt2Y: 0.5073999762535095,
  sample: { x: 18.760656898601805, y: 80.883888121043 },
};

/** K1 Taris Upper City North — NORTH. */
const K1_TAR_M02AA_NORTH: LiveAreaMapFixture = {
  id: "K1 tar_m02aa/m02aa NORTH",
  gameKey: GameEngineType.KOTOR,
  northAxis: MapNorthAxis.NORTH,
  mapResX: 24,
  mapZoom: 1,
  worldPt1X: 87.4000015258789,
  worldPt1Y: 87.5999984741211,
  worldPt2X: 143,
  worldPt2Y: 143,
  mapPt1X: 0.37049999833107,
  mapPt1Y: 0.755599975585938,
  mapPt2X: 0.777300000190735,
  mapPt2Y: 0.0926000028848648,
  sample: { x: (87.4000015258789 + 143) / 2, y: (87.5999984741211 + 143) / 2 },
};

/** K1 Dantooine grove — EAST. */
const K1_DANM15_EAST: LiveAreaMapFixture = {
  id: "K1 danm15/m15aa EAST",
  gameKey: GameEngineType.KOTOR,
  northAxis: MapNorthAxis.EAST,
  mapResX: 25,
  mapZoom: 1,
  worldPt1X: 119.199996948242,
  worldPt1Y: 182.899993896484,
  worldPt2X: 147.5,
  worldPt2Y: 69.5,
  mapPt1X: 0.572700023651123,
  mapPt1Y: 0.807399988174438,
  mapPt2X: 0.461400002241135,
  mapPt2Y: 0.0741000026464462,
  sample: { x: (119.199996948242 + 147.5) / 2, y: (182.899993896484 + 69.5) / 2 },
};

/**
 * K1 Manaan docking bay — EAST (live MenuMap pin regression).
 * Note pixels captured vs retail GetMapPixelFromWorldCoord path.
 */
const K1_MANM26AD_EAST: LiveAreaMapFixture = {
  id: "K1 manm26ad/m26ad EAST",
  gameKey: GameEngineType.KOTOR,
  northAxis: MapNorthAxis.EAST,
  mapResX: 1,
  mapZoom: 1,
  worldPt1X: 152,
  worldPt1Y: 133,
  worldPt2X: 342.5,
  worldPt2Y: 239.39999389648438,
  mapPt1X: 0.8841000199317932,
  mapPt1Y: 0.3630000054836273,
  mapPt2X: 0.4113999903202057,
  mapPt2Y: 0.8111000061035156,
  sample: { x: 247.91461211568202, y: 164.48047338083558 },
  notes: [
    { label: "Ebon Hawk", x: 253.69683837890625, y: 177.67965698242188, pixel: { x: 278, y: 140 } },
    { label: "Sith Hangar", x: 337.5826416015625, y: 185.6248779296875, pixel: { x: 186, y: 149 } },
    { label: "Private Hangar", x: 422.2376403808594, y: 172.18551635742188, pixel: { x: 94, y: 134 } },
    { label: "Manaan - West Central", x: 340.1349792480469, y: 208.68331909179688, pixel: { x: 184, y: 174 } },
  ],
};

/** K1 Taris Undercity — SOUTH. */
const K1_TAR_M05AA_SOUTH: LiveAreaMapFixture = {
  id: "K1 tar_m05aa/m05aa SOUTH",
  gameKey: GameEngineType.KOTOR,
  northAxis: MapNorthAxis.SOUTH,
  mapResX: 32,
  mapZoom: 1,
  worldPt1X: 255.300003051758,
  worldPt1Y: 114.400001525879,
  worldPt2X: 179.199996948242,
  worldPt2Y: 202.899993896484,
  mapPt1X: 0.613600015640259,
  mapPt1Y: 0.414799988269806,
  mapPt2X: 0.359100013971329,
  mapPt2Y: 0.792599976062775,
  sample: { x: (255.300003051758 + 179.199996948242) / 2, y: (114.400001525879 + 202.899993896484) / 2 },
};

/** TSL Harbinger — SOUTH. */
const TSL_152HAR_SOUTH: LiveAreaMapFixture = {
  id: "TSL 152har/152har SOUTH",
  gameKey: GameEngineType.TSL,
  northAxis: MapNorthAxis.SOUTH,
  mapResX: 18,
  mapZoom: 1,
  worldPt1X: 8.14999961853027,
  worldPt1Y: 35.1399993896484,
  worldPt2X: 76.8499984741211,
  worldPt2Y: -42.1399993896484,
  mapPt1X: 0.307000011205673,
  mapPt1Y: 0.705999970436096,
  mapPt2X: 0.635999977588654,
  mapPt2Y: 0.120999999344349,
  sample: { x: (8.14999961853027 + 76.8499984741211) / 2, y: (35.1399993896484 + -42.1399993896484) / 2 },
};

/** TSL Ebon Hawk — NORTH. */
const TSL_001EBO_NORTH: LiveAreaMapFixture = {
  id: "TSL 001ebo/001ebo NORTH",
  gameKey: GameEngineType.TSL,
  northAxis: MapNorthAxis.NORTH,
  mapResX: 18,
  mapZoom: 1,
  worldPt1X: 50.1699981689453,
  worldPt1Y: 46.689998626709,
  worldPt2X: 38.1199989318848,
  worldPt2Y: 31.3700008392334,
  mapPt1X: 0.512000024318695,
  mapPt1Y: 0.504999995231628,
  mapPt2X: 0.435000002384186,
  mapPt2Y: 0.698000013828278,
  sample: { x: (50.1699981689453 + 38.1199989318848) / 2, y: (46.689998626709 + 31.3700008392334) / 2 },
};

/** TSL Telos — EAST. */
const TSL_232TEL_EAST: LiveAreaMapFixture = {
  id: "TSL 232tel/232tel EAST",
  gameKey: GameEngineType.TSL,
  northAxis: MapNorthAxis.EAST,
  mapResX: 24,
  mapZoom: 1,
  worldPt1X: 78.3300018310547,
  worldPt1Y: 57.0099983215332,
  worldPt2X: -72.7600021362305,
  worldPt2Y: 230.020004272461,
  mapPt1X: 0.354000002145767,
  mapPt1Y: 0.284000009298325,
  mapPt2X: 0.651000022888184,
  mapPt2Y: 0.958999991416931,
  sample: { x: (78.3300018310547 + -72.7600021362305) / 2, y: (57.0099983215332 + 230.020004272461) / 2 },
};

/** TSL Peragus — WEST. */
const TSL_102PER_WEST: LiveAreaMapFixture = {
  id: "TSL 102per/102per WEST",
  gameKey: GameEngineType.TSL,
  northAxis: MapNorthAxis.WEST,
  mapResX: 24,
  mapZoom: 1,
  worldPt1X: -14.8999996185303,
  worldPt1Y: 28.9500007629395,
  worldPt2X: -81.3499984741211,
  worldPt2Y: -85,
  mapPt1X: 0.528999984264374,
  mapPt1Y: 0.433999985456467,
  mapPt2X: 0.209000006318092,
  mapPt2Y: 0.061999998986721,
  sample: { x: (-14.8999996185303 + -81.3499984741211) / 2, y: (28.9500007629395 + -85) / 2 },
};

const LIVE_AXIS_FIXTURES: LiveAreaMapFixture[] = [
  K1_END_M01AA_WEST,
  K1_TAR_M02AA_NORTH,
  K1_DANM15_EAST,
  K1_MANM26AD_EAST,
  K1_TAR_M05AA_SOUTH,
  TSL_152HAR_SOUTH,
  TSL_001EBO_NORTH,
  TSL_232TEL_EAST,
  TSL_102PER_WEST,
];

function applyMapFields(areaMap: AreaMap, fields: LiveAreaMapFixture | (Partial<AreaMap> & {
  northAxis: number;
  worldPt1X: number;
  worldPt1Y: number;
  worldPt2X: number;
  worldPt2Y: number;
  mapPt1X: number;
  mapPt1Y: number;
  mapPt2X: number;
  mapPt2Y: number;
})){
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

function logicalSizeFor(gameKey: GameEngineType){
  return gameKey === GameEngineType.TSL
    ? AREA_MAP_LOGICAL_SIZE_TSL
    : AREA_MAP_LOGICAL_SIZE_K1;
}

/**
 * Independent retail GetMapPixelFromWorldCoord + display Y-flip.
 * Must stay in sync with AreaMap.toMapPixels / toMapCoordinates.
 */
function expectedRetail(
  fields: {
    northAxis: number;
    worldPt1X: number;
    worldPt1Y: number;
    worldPt2X: number;
    worldPt2Y: number;
    mapPt1X: number;
    mapPt1Y: number;
    mapPt2X: number;
    mapPt2Y: number;
  },
  x: number,
  y: number,
  width: number,
  height: number
): { pixel: { x: number; y: number }; uv: { x: number; y: number } } {
  const local = AreaMap.transformWorldByNorthAxis(x, y, fields.northAxis);
  const w1 = AreaMap.transformWorldByNorthAxis(fields.worldPt1X, fields.worldPt1Y, fields.northAxis);
  const w2 = AreaMap.transformWorldByNorthAxis(fields.worldPt2X, fields.worldPt2Y, fields.northAxis);
  const mapPt1Xpx = Math.trunc(fields.mapPt1X * width);
  const mapPt1Ypx = Math.trunc(fields.mapPt1Y * height);
  const mapPt2Xpx = Math.trunc(fields.mapPt2X * width);
  const mapPt2Ypx = Math.trunc(fields.mapPt2Y * height);
  const denomX = mapPt2Xpx - mapPt1Xpx;
  const denomY = mapPt2Ypx - mapPt1Ypx;
  const scaleX = (w2.x - w1.x) / denomX;
  const scaleY = (w2.y - w1.y) / denomY;
  const offsetX = w1.x - mapPt1Xpx * scaleX;
  const offsetY = w1.y - mapPt1Ypx * scaleY;
  const pixelX = Math.trunc((local.x - offsetX) / scaleX + 0.5);
  const pixelY = Math.trunc((local.y - offsetY) / scaleY + 0.5);
  return {
    pixel: { x: pixelX, y: pixelY },
    uv: { x: pixelX / width, y: 1 - (pixelY / height) },
  };
}

describe("AreaMap engine coordinates", () => {
  let previousGameKey: GameEngineType;

  beforeEach(() => {
    previousGameKey = ApplicationProfile.GameKey;
  });

  afterEach(() => {
    ApplicationProfile.GameKey = previousGameKey;
  });

  test.each(LIVE_AXIS_FIXTURES.map((f) => [f.id, f] as const))(
    "%s: toMapPixels / toMapCoordinates match retail at sample + corners",
    (_id, fixture) => {
      ApplicationProfile.GameKey = fixture.gameKey;
      const logical = logicalSizeFor(fixture.gameKey);
      const areaMap = new AreaMap();
      applyMapFields(areaMap, fixture);

      const points = [
        fixture.sample,
        { x: fixture.worldPt1X, y: fixture.worldPt1Y },
        { x: fixture.worldPt2X, y: fixture.worldPt2Y },
      ];

      for(const p of points){
        const expected = expectedRetail(fixture, p.x, p.y, logical.width, logical.height);
        const pix = areaMap.toMapPixels(p.x, p.y);
        expect(pix.x).toBe(expected.pixel.x);
        expect(pix.y).toBe(expected.pixel.y);

        const uv = areaMap.toMapCoordinates(p.x, p.y);
        expect(uv.x).toBeCloseTo(expected.uv.x, 5);
        expect(uv.y).toBeCloseTo(expected.uv.y, 5);
        expect(Number.isFinite(uv.x)).toBe(true);
        expect(Number.isFinite(uv.y)).toBe(true);
      }
    }
  );

  test.each(LIVE_AXIS_FIXTURES.map((f) => [f.id, f] as const))(
    "%s: sample UV maps into logical marker space",
    (_id, fixture) => {
      ApplicationProfile.GameKey = fixture.gameKey;
      const logical = logicalSizeFor(fixture.gameKey);
      const areaMap = new AreaMap();
      applyMapFields(areaMap, fixture);

      const uv = areaMap.toMapCoordinates(fixture.sample.x, fixture.sample.y);
      const sx = logical.width * uv.x;
      const sy = logical.height * uv.y;
      expect(Number.isFinite(sx)).toBe(true);
      expect(Number.isFinite(sy)).toBe(true);
      expect(areaMap.northAxis).toBe(fixture.northAxis);
      expect(areaMap.mapResY).toBe(
        Math.max(1, Math.floor((fixture.mapResX * logical.height) / logical.width))
      );
    }
  );

  test("K1 end_m01aa WEST live PC → retail pixels (206, 91)", () => {
    ApplicationProfile.GameKey = GameEngineType.KOTOR;
    const areaMap = new AreaMap();
    applyMapFields(areaMap, K1_END_M01AA_WEST);
    const pix = areaMap.toMapPixels(K1_END_M01AA_WEST.sample.x, K1_END_M01AA_WEST.sample.y);
    expect(pix.x).toBe(206);
    expect(pix.y).toBe(91);
    expect(pix.valid).toBe(true);
  });

  test("K1 manm26ad EAST live map notes match retail hangar pixels", () => {
    ApplicationProfile.GameKey = GameEngineType.KOTOR;
    const areaMap = new AreaMap();
    applyMapFields(areaMap, K1_MANM26AD_EAST);
    const { width, height } = AREA_MAP_LOGICAL_SIZE_K1;

    for(const note of K1_MANM26AD_EAST.notes!){
      const pix = areaMap.toMapPixels(note.x, note.y);
      expect(pix.x).toBe(note.pixel.x);
      expect(pix.y).toBe(note.pixel.y);
      expect(pix.valid).toBe(true);

      const uv = areaMap.toMapCoordinates(note.x, note.y);
      expect(uv.x).toBeCloseTo(note.pixel.x / width, 5);
      expect(uv.y).toBeCloseTo(1 - note.pixel.y / height, 5);
    }

    // Private Hangar must sit on the left of Ebon Hawk (not clustered top-right).
    const privateHangar = K1_MANM26AD_EAST.notes!.find((n) => n.label === "Private Hangar")!;
    const ebonHawk = K1_MANM26AD_EAST.notes!.find((n) => n.label === "Ebon Hawk")!;
    expect(privateHangar.pixel.x).toBeLessThan(ebonHawk.pixel.x);
  });

  test("worldPt1 maps to trunc(MapPt1) pixels; display UV Y-flips", () => {
    ApplicationProfile.GameKey = GameEngineType.KOTOR;
    const areaMap = new AreaMap();
    applyMapFields(areaMap, K1_TAR_M02AA_NORTH);
    const { width, height } = AREA_MAP_LOGICAL_SIZE_K1;
    const pix = areaMap.toMapPixels(K1_TAR_M02AA_NORTH.worldPt1X, K1_TAR_M02AA_NORTH.worldPt1Y);
    expect(pix.x).toBe(Math.trunc(K1_TAR_M02AA_NORTH.mapPt1X * width));
    expect(pix.y).toBe(Math.trunc(K1_TAR_M02AA_NORTH.mapPt1Y * height));

    const uv = areaMap.toMapCoordinates(K1_TAR_M02AA_NORTH.worldPt1X, K1_TAR_M02AA_NORTH.worldPt1Y);
    expect(uv.x).toBeCloseTo(pix.x / width, 5);
    expect(uv.y).toBeCloseTo(1 - pix.y / height, 5);
  });

  test("fixture matrix covers every NorthAxis for both games", () => {
    const byGame = new Map<GameEngineType, Set<MapNorthAxis>>();
    for(const f of LIVE_AXIS_FIXTURES){
      if(!byGame.has(f.gameKey)) byGame.set(f.gameKey, new Set());
      byGame.get(f.gameKey)!.add(f.northAxis);
    }
    for(const game of [GameEngineType.KOTOR, GameEngineType.TSL]){
      const axes = byGame.get(game);
      expect(axes?.has(MapNorthAxis.NORTH)).toBe(true);
      expect(axes?.has(MapNorthAxis.EAST)).toBe(true);
      expect(axes?.has(MapNorthAxis.SOUTH)).toBe(true);
      expect(axes?.has(MapNorthAxis.WEST)).toBe(true);
    }
  });

  test("NorthAxis transforms match retail GetMapPixelFromWorldCoord", () => {
    expect(AreaMap.transformWorldByNorthAxis(10, 20, MapNorthAxis.NORTH)).toEqual({ x: 10, y: 20 });
    expect(AreaMap.transformWorldByNorthAxis(10, 20, MapNorthAxis.EAST)).toEqual({ x: -10, y: -20 });
    expect(AreaMap.transformWorldByNorthAxis(10, 20, MapNorthAxis.SOUTH)).toEqual({ x: 20, y: -10 });
    expect(AreaMap.transformWorldByNorthAxis(10, 20, MapNorthAxis.WEST)).toEqual({ x: -20, y: 10 });
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
});
