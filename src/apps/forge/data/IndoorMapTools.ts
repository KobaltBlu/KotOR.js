import * as THREE from 'three';

import { Kit } from '@/apps/forge/data/IndoorKit';
import { loadKits } from '@/apps/forge/data/IndoorKitLoader';
import { IndoorMap, IndoorMapRoom } from '@/apps/forge/data/IndoorMap';
import { cloneWalkmesh, applyWalkmeshTransform } from '@/apps/forge/data/IndoorWalkmesh';
import { OdysseyWalkMesh } from '@/apps/forge/KotOR';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { AreaMap } from '@/module/AreaMap';
import { ModuleArea } from '@/module/ModuleArea';
import { CExoLocString } from '@/resource/CExoLocString';
import { ERFObject } from '@/resource/ERFObject';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { LYTObject } from '@/resource/LYTObject';
import { ResourceTypes } from '@/resource/ResourceTypes';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';

export type IndoorBuildOptions = {
  outputPath: string;
  moduleId?: string;
  loadscreenBuffer?: Uint8Array | null;
};

const toColorInt = (color: { r: number; g: number; b: number }): number => {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return (r << 16) | (g << 8) | b;
};

const buildVisBuffer = (rooms: Map<string, string[]>): Uint8Array => {
  const data = new BinaryWriter();
  const entries = Array.from(rooms.entries());
  entries.forEach(([roomName, linkedRooms], index) => {
    data.writeChars(`${roomName} ${linkedRooms.length}`);
    data.writeByte(13);
    data.writeByte(10);
    linkedRooms.forEach((linked, linkIndex) => {
      data.writeChars(`  ${linked}`);
      if (index < entries.length - 1 || linkIndex < linkedRooms.length - 1) {
        data.writeByte(13);
        data.writeByte(10);
      }
    });
  });
  return data.buffer;
};

const computeBounds = (rooms: IndoorMapRoom[]): { min: THREE.Vector2; max: THREE.Vector2 } => {
  const min = new THREE.Vector2(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector2(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  rooms.forEach((room) => {
    const walkmesh = room.walkmesh();
    walkmesh.vertices.forEach((v) => {
      min.x = Math.min(min.x, v.x);
      min.y = Math.min(min.y, v.y);
      max.x = Math.max(max.x, v.x);
      max.y = Math.max(max.y, v.y);
    });
  });
  if (!Number.isFinite(min.x)) {
    min.set(0, 0);
    max.set(0, 0);
  }
  return { min, max };
};

const buildAreaMap = (indoorMap: IndoorMap): AreaMap => {
  const areaMap = new AreaMap();
  areaMap.setResX(440);
  const bounds = computeBounds(indoorMap.rooms);
  areaMap.worldPt1X = bounds.min.x;
  areaMap.worldPt1Y = bounds.min.y;
  areaMap.worldPt2X = bounds.max.x;
  areaMap.worldPt2Y = bounds.max.y;
  areaMap.mapPt1X = 0;
  areaMap.mapPt1Y = 0;
  areaMap.mapPt2X = 1;
  areaMap.mapPt2Y = 1;
  areaMap.mapZoom = 1;
  areaMap.generateMapData();
  return areaMap;
};

export const buildModFromIndoorMap = async (
  indoorMap: IndoorMap,
  kits: Kit[],
  options: IndoorBuildOptions
): Promise<Uint8Array> => {
  const moduleId = (options.moduleId || indoorMap.moduleId).toLowerCase();
  const erf = new ERFObject();
  erf.header.fileType = 'MOD ';

  const lyt = new LYTObject();
  lyt.rooms = [];

  const roomNames = new Map<IndoorMapRoom, string>();
  indoorMap.rooms.forEach((room, index) => {
    const roomName = `${moduleId}_room${index}`;
    roomNames.set(room, roomName);
    lyt.rooms.push({ name: roomName, position: room.position.clone() });
  });

  const visRooms: Map<string, string[]> = new Map();
  indoorMap.rooms.forEach((room) => {
    const roomName = roomNames.get(room);
    if (roomName === undefined) return;
    const visible: string[] = [];
    room.hooks.forEach((hookRoom) => {
      if (!hookRoom) return;
      const name = roomNames.get(hookRoom);
      if (name && !visible.includes(name)) {
        visible.push(name);
      }
    });
    visRooms.set(roomName, visible);
  });

  const area = new ModuleArea(moduleId);
  area.areaMap = buildAreaMap(indoorMap);
  area.name = moduleId;
  area.tag = moduleId.toUpperCase();
  area.dynamicAmbientColor = toColorInt(indoorMap.lighting);

  const { git, are } = area.save();
  are.FileType = 'ARE ';
  git.FileType = 'GIT ';

  const ifo = new GFFObject();
  ifo.FileType = 'IFO ';
  ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'Creature List'));
  const areaList = ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'Mod_Area_list'));
  areaList.addChildStruct(area.saveAreaListStruct());
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_ResRef')).setValue(moduleId);
  ifo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag')).setValue(moduleId.toUpperCase());
  const modName = new CExoLocString(-1);
  modName.addSubString(indoorMap.name.substrings.get(0) || moduleId, 0);
  ifo.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name')).setValue(modName);
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_Entry_Area')).setValue(moduleId);
  ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_X')).setValue(indoorMap.warpPoint.x);
  ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Y')).setValue(indoorMap.warpPoint.y);
  ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Z')).setValue(indoorMap.warpPoint.z);
  ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'Mod_Expan_List'));

  erf.addResource(moduleId, ResourceTypes.lyt, lyt.export());
  erf.addResource(moduleId, ResourceTypes.vis, buildVisBuffer(visRooms));
  erf.addResource(moduleId, ResourceTypes.are, are.getExportBuffer());
  erf.addResource(moduleId, ResourceTypes.git, git.getExportBuffer());
  erf.addResource('module', ResourceTypes.ifo, ifo.getExportBuffer());

  indoorMap.rooms.forEach((room, index) => {
    const resref = `${moduleId}_room${index}`;
    const kitComponent = room.component;
    const mdl = kitComponent.mdl;
    const mdx = kitComponent.mdx;
    erf.addResource(resref, ResourceTypes.mdl, mdl);
    erf.addResource(resref, ResourceTypes.mdx, mdx);

    const walkmesh = cloneWalkmesh(room.baseWalkmesh());
    applyWalkmeshTransform(walkmesh, {
      position: room.position,
      rotationDegrees: room.rotation,
      flipX: room.flipX,
      flipY: room.flipY,
    });
    erf.addResource(resref, ResourceTypes.wok, walkmesh.toExportBuffer());
  });

  kits.forEach((kit) => {
    kit.textures.forEach((data, name) => {
      erf.addResource(name.toLowerCase(), ResourceTypes.tga, data);
      const txi = kit.txis.get(name);
      if (txi && txi.length) {
        erf.addResource(name.toLowerCase(), ResourceTypes.txi, txi);
      }
    });
    kit.lightmaps.forEach((data, name) => {
      erf.addResource(name.toLowerCase(), ResourceTypes.tga, data);
      const txi = kit.txis.get(name);
      if (txi && txi.length) {
        erf.addResource(name.toLowerCase(), ResourceTypes.txi, txi);
      }
    });
  });

  if (options.loadscreenBuffer) {
    erf.addResource(`load_${moduleId}`, ResourceTypes.tga, options.loadscreenBuffer);
  }

  return erf.getExportBuffer();
};

export const buildModFromIndoorFile = async (
  indoorPath: string,
  kitsPath: string,
  options: IndoorBuildOptions
): Promise<Uint8Array> => {
  const kits = await loadKits(kitsPath);
  const raw = await fsReadFile(indoorPath);
  const map = new IndoorMap();
  map.load(raw, kits);
  if (options.moduleId) {
    map.moduleId = options.moduleId;
  }
  return buildModFromIndoorMap(map, kits, options);
};

const fsReadFile = async (filePath: string): Promise<Uint8Array> => {
  const fs = await import('fs');
  return new Uint8Array(fs.readFileSync(filePath));
};

const centroid = (points: THREE.Vector3[]): THREE.Vector3 => {
  if (!points.length) return new THREE.Vector3();
  const sum = points.reduce((acc, p) => acc.add(p), new THREE.Vector3());
  return sum.divideScalar(points.length);
};

const applyFlip = (points: THREE.Vector3[], flipX: boolean, flipY: boolean): THREE.Vector3[] => {
  return points.map((p) => new THREE.Vector3(flipX ? -p.x : p.x, flipY ? -p.y : p.y, p.z));
};

const applyRotateZ = (points: THREE.Vector3[], rotationDeg: number): THREE.Vector3[] => {
  if (Math.abs(rotationDeg) < 1e-12) return points.map((p) => p.clone());
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return points.map((p) => new THREE.Vector3(p.x * cos - p.y * sin, p.x * sin + p.y * cos, p.z));
};

const applyTranslate = (points: THREE.Vector3[], translation: THREE.Vector3): THREE.Vector3[] => {
  return points.map((p) => p.clone().add(translation));
};

const rmsError = (a: THREE.Vector3[], b: THREE.Vector3[]): number => {
  if (a.length !== b.length || !a.length) return Number.POSITIVE_INFINITY;
  let acc = 0;
  for (let i = 0; i < a.length; i += 1) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    const dz = a[i].z - b[i].z;
    acc += dx * dx + dy * dy + dz * dz;
  }
  return Math.sqrt(acc / a.length);
};

export const inferRoomTransform = (
  baseVertices: THREE.Vector3[],
  instanceVertices: THREE.Vector3[],
  maxRms = 1e-3
): { flipX: boolean; flipY: boolean; rotationDeg: number; translation: THREE.Vector3; rmsError: number } | null => {
  if (baseVertices.length !== instanceVertices.length || !baseVertices.length) return null;
  const _baseCentroid = centroid(baseVertices);
  const instCentroid = centroid(instanceVertices);
  let best: {
    flipX: boolean;
    flipY: boolean;
    rotationDeg: number;
    translation: THREE.Vector3;
    rmsError: number;
  } | null = null;

  [false, true].forEach((flipX) => {
    [false, true].forEach((flipY) => {
      const flipped = applyFlip(baseVertices, flipX, flipY);
      const flippedCentroid = centroid(flipped);

      let aSum = 0;
      let bSum = 0;
      for (let i = 0; i < flipped.length; i += 1) {
        const p = flipped[i].clone().sub(flippedCentroid);
        const q = instanceVertices[i].clone().sub(instCentroid);
        aSum += p.x * q.x + p.y * q.y;
        bSum += p.x * q.y - p.y * q.x;
      }
      const rotationDeg = (Math.atan2(bSum, aSum) * 180) / Math.PI;
      const rotatedCentroid = applyRotateZ([flippedCentroid], rotationDeg)[0];
      const translation = instCentroid.clone().sub(rotatedCentroid);
      const transformed = applyTranslate(applyRotateZ(flipped, rotationDeg), translation);
      const err = rmsError(transformed, instanceVertices);
      if (err <= maxRms && (!best || err < best.rmsError)) {
        best = { flipX, flipY, rotationDeg, translation, rmsError: err };
      }
    });
  });

  return best;
};

export const inferRoomTransformWalkmesh = (
  baseWalkmesh: OdysseyWalkMesh,
  instanceWalkmesh: OdysseyWalkMesh,
  maxRms = 1e-3
): { flipX: boolean; flipY: boolean; rotationDeg: number; translation: THREE.Vector3; rmsError: number } | null => {
  if (!baseWalkmesh.faces.length || !instanceWalkmesh.faces.length) return null;
  const instanceVertices = instanceWalkmesh.vertices;
  let best: {
    flipX: boolean;
    flipY: boolean;
    rotationDeg: number;
    translation: THREE.Vector3;
    rmsError: number;
  } | null = null;
  [false, true].forEach((flipX) => {
    [false, true].forEach((flipY) => {
      const clone = cloneWalkmesh(baseWalkmesh);
      applyWalkmeshTransform(clone, {
        position: new THREE.Vector3(),
        rotationDegrees: 0,
        flipX,
        flipY,
      });
      const inferred = inferRoomTransform(clone.vertices, instanceVertices, maxRms);
      if (!inferred) return;
      if (!best || inferred.rmsError < best.rmsError) {
        best = { ...inferred, flipX, flipY };
      }
    });
  });
  return best;
};
