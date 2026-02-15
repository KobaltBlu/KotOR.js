/**
 * Binary MDL/MDX reader for KotOR.
 * Parses binary MDL (and optional MDX) into MDL data structures.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * @file MDLBinaryReader.ts
 * @license GPL-3.0
 */

import type { MDLAABBNode, MDLAnimation, MDLColor, MDLController, MDLControllerRow, MDLEmitter, MDLEvent, MDLFace, MDLLight, MDLMesh, MDLReference, MDLWalkmesh, Vector2, Vector3, Vector4 } from '@/resource/MDLData';
import { MDL, MDLNode } from '@/resource/MDLData';
import { MDLClassification, MDLDynamicType, MDLNodeFlags, MDLNodeType } from '@/resource/MDLTypes';

const GEOM_HEADER_SIZE = 0x50;
const MODEL_HEADER_SIZE = 0xc4;
const NODE_HEADER_SIZE = 80;
const GEOM_TYPE_ROOT = 2;
const GEOM_TYPE_ANIM = 5;
const K1_FP0 = 0x413670;
const K1_FP1 = 0x405520;
const K2_FP0 = 0x416310;
const K2_FP1 = 0x405600;

/** Minimal buffer reader (little-endian). Offsets are relative to buffer start; MDL uses +12 base. */
class BufferReader {
  private view: DataView;
  private base: number;
  offset: number;

  constructor(buffer: Uint8Array, baseOffset = 0) {
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    this.base = baseOffset;
    this.offset = baseOffset;
  }

  get size(): number {
    return this.view.byteLength;
  }

  seek(pos: number): void {
    this.offset = this.base + pos;
  }

  get position(): number {
    return this.offset - this.base;
  }

  ensure(byteCount: number): boolean {
    return this.offset + byteCount <= this.view.byteLength;
  }

  readUint8(): number {
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }
  readInt8(): number {
    const v = this.view.getInt8(this.offset);
    this.offset += 1;
    return v;
  }
  readUint16(): number {
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }
  readInt16(): number {
    const v = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return v;
  }
  readUint32(): number {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }
  readInt32(): number {
    const v = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }
  readFloat32(): number {
    const v = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return v;
  }
  readVector3(): Vector3 {
    return {
      x: this.readFloat32(),
      y: this.readFloat32(),
      z: this.readFloat32()
    };
  }
  readVector4(): Vector4 {
    const w = this.readFloat32();
    const x = this.readFloat32();
    const y = this.readFloat32();
    const z = this.readFloat32();
    return { x, y, z, w };
  }
  readVector2(): Vector2 {
    return { x: this.readFloat32(), y: this.readFloat32() };
  }
  readStringNull(maxLen: number): string {
    const start = this.offset;
    let end = start;
    while (end - start < maxLen && end < this.view.byteLength && this.view.getUint8(end) !== 0) end++;
    const slice = new Uint8Array(this.view.buffer, this.view.byteOffset + start, end - start);
    this.offset = start + maxLen;
    return new TextDecoder('ascii', { fatal: false }).decode(slice).replace(/\0+$/, '');
  }
  readBytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = this.view.getUint8(this.offset + i);
    this.offset += n;
    return out;
  }
}

function readI32AsU32(r: BufferReader): number {
  const v = r.readInt32();
  return v < 0 ? 0xffffffff : v;
}

export interface MDLBinaryReaderOptions {
  /** Skip controllers and animations for fast load. */
  fastLoad?: boolean;
  /** Optional MDX buffer (geometry); if not provided, mesh data may be minimal. */
  mdxBuffer?: Uint8Array;
}

/**
 * Load an MDL from binary buffer. First 4 bytes zero indicate binary MDL.
 * Offsets in the file are relative to the start of the data block; the reader skips the first 12 bytes.
 */
export function readMDLFromBinaryBuffer(
  buffer: Uint8Array,
  options: MDLBinaryReaderOptions = {}
): MDL {
  const { fastLoad = false, mdxBuffer } = options;
  const reader = new BufferReader(buffer, 12);

  const mdl = new MDL();

  // Model header: 80-byte geometry block + model_type, subclass, padding, fog, child_model_count, ...
  const geomFp0 = reader.readUint32();
  const geomFp1 = reader.readUint32();
  mdl.name = reader.readStringNull(32);
  const rootNodeOffset = reader.readUint32();
  let nodeCount = reader.readUint32();
  if (nodeCount > 0x7fffffff) nodeCount = 0x7fffffff;
  reader.readBytes(28);
  const geometryType = reader.readUint8();
  reader.readBytes(3);

  const modelType = reader.readUint8();
  const subclass = reader.readUint8();
  reader.readUint8();
  mdl.fog = reader.readUint8() !== 0;
  reader.readUint32(); // child_model_count
  const offsetToAnimations = reader.readUint32();
  let animationCount = reader.readUint32();
  if (animationCount > 0x7fffffff) animationCount = 0x7fffffff;
  reader.readUint32(); // animation_count2
  reader.readUint32(); // parent_model_pointer
  mdl.bmin = reader.readVector3();
  mdl.bmax = reader.readVector3();
  mdl.radius = reader.readFloat32();
  mdl.animationScale = reader.readFloat32();
  mdl.supermodel = reader.readStringNull(32);
  reader.readUint32(); // offset_to_super_root
  reader.readUint32(); // mdx_data_buffer_offset
  reader.readUint32(); // mdx_size
  reader.readUint32(); // mdx_offset
  const offsetToNameOffsets = reader.readUint32();
  let nameOffsetsCount = reader.readUint32();
  if (nameOffsetsCount > 0x7fffffff) nameOffsetsCount = 0x7fffffff;
  reader.readUint32(); // name_offsets_count2

  mdl.classification = modelType as MDLClassification;
  mdl.classificationUnk1 = subclass;

  const names = loadNames(reader, buffer, offsetToNameOffsets, nameOffsetsCount, offsetToAnimations);
  const order2nameIndex: number[] = [];
  getNodeOrder(reader, buffer, rootNodeOffset, order2nameIndex);

  mdl.root = loadNode(reader, buffer, mdxBuffer ?? null, rootNodeOffset, null, names, fastLoad);

  if (!fastLoad && offsetToAnimations > 0 && animationCount > 0) {
    reader.seek(offsetToAnimations);
    const animOffsets: number[] = [];
    for (let i = 0; i < animationCount; i++) animOffsets.push(reader.readUint32());
    for (const animOff of animOffsets) {
      if (animOff === 0 || animOff === 0xffffffff) continue;
      const anim = loadAnimation(reader, buffer, animOff, names);
      if (anim) mdl.anims.push(anim);
    }
  }

  return mdl;
}

function loadNames(
  reader: BufferReader,
  buffer: Uint8Array,
  nameIndexesOffset: number,
  nameIndexesCount: number,
  offsetToAnimations: number
): string[] {
  if (nameIndexesCount <= 0 || nameIndexesOffset + nameIndexesCount * 4 > buffer.length) return [];
  reader.seek(nameIndexesOffset);
  const indexes: number[] = [];
  for (let i = 0; i < nameIndexesCount; i++) {
    indexes.push(reader.readInt32());
  }
  const namesStart = nameIndexesOffset + nameIndexesCount * 4;
  const namesSize = offsetToAnimations - namesStart;
  if (namesSize <= 0) return [];
  const namesRaw = buffer.subarray(namesStart, namesStart + namesSize);
  const names: string[] = [];
  let pos = 0;
  for (let i = 0; i < nameIndexesCount && pos < namesRaw.length; i++) {
    let end = pos;
    while (end < namesRaw.length && namesRaw[end] !== 0) end++;
    names.push(new TextDecoder('ascii', { fatal: false }).decode(namesRaw.subarray(pos, end)));
    pos = end + 1;
  }
  return names;
}

function getNodeOrder(reader: BufferReader, buffer: Uint8Array, startNode: number, order2nameIndex: number[]): void {
  const off = startNode + 12;
  if (off + 6 > buffer.length) return;
  reader.seek(off + 4);
  const nameIndex = reader.readUint16();
  order2nameIndex.push(nameIndex);
  reader.seek(off + 44);
  const childArrayOffset = reader.readUint32();
  let childArrayLength = reader.readUint32();
  if (childArrayLength > 0x7fffffff) childArrayLength = 0x7fffffff;
  if (childArrayLength > 0 && childArrayOffset !== 0 && childArrayOffset !== 0xffffffff) {
    reader.seek(childArrayOffset + 12);
    for (let i = 0; i < childArrayLength; i++) {
      const co = reader.readUint32();
      if (co !== 0 && co !== 0xffffffff) getNodeOrder(reader, buffer, co, order2nameIndex);
    }
  }
}

function loadNode(
  reader: BufferReader,
  buffer: Uint8Array,
  mdxBuffer: Uint8Array | null,
  offset: number,
  parent: MDLNode | null,
  names: string[],
  fastLoad: boolean
): MDLNode {
  reader.seek(offset + 12);
  const typeId = reader.readUint16();
  reader.readUint16();
  const nodeId = reader.readUint16();
  reader.readUint16();
  reader.readUint32();
  const offsetToParent = reader.readUint32();
  const position = reader.readVector3();
  const orientation = reader.readVector4();
  const offsetToChildren = reader.readUint32();
  let childrenCount = reader.readUint32();
  if (childrenCount > 0x7fffffff) childrenCount = 0x7fffffff;
  reader.readUint32();
  const offsetToControllers = reader.readUint32();
  const controllerCount = reader.readUint32();
  reader.readUint32();
  const offsetToControllerData = reader.readUint32();
  let controllerDataLength = reader.readUint32();
  if (controllerDataLength > 0x7fffffff) controllerDataLength = 0x7fffffff;
  reader.readUint32();

  const node = new MDLNode();
  node.nodeId = nodeId;
  node.name = nodeId >= 0 && nodeId < names.length ? names[nodeId] : '';
  node.position = position;
  node.orientation = orientation;
  node.parentId = offsetToParent >= 0 ? -1 : -1;

  if (typeId & MDLNodeFlags.Aabb) node.nodeType = MDLNodeType.Aabb;
  if (typeId & MDLNodeFlags.Light) node.nodeType = MDLNodeType.Light;
  if (typeId & MDLNodeFlags.Emitter) node.nodeType = MDLNodeType.Emitter;
  if (typeId & MDLNodeFlags.Reference) node.nodeType = MDLNodeType.Reference;
  if (typeId & MDLNodeFlags.Mesh) node.nodeType = MDLNodeType.Trimesh;
  if (typeId & MDLNodeFlags.Skin) node.nodeType = MDLNodeType.Skin;
  if (typeId & MDLNodeFlags.Dangly) node.nodeType = MDLNodeType.Danglymesh;
  if (typeId & MDLNodeFlags.Saber) node.nodeType = MDLNodeType.Saber;

  if (typeId & MDLNodeFlags.Mesh) {
    node.mesh = readTrimeshHeader(reader, buffer, mdxBuffer);
    if (typeId & MDLNodeFlags.Aabb && node.mesh && reader.ensure(4)) {
      const aabbOff = reader.readInt32();
      if (aabbOff > 0) {
        node.aabb = { aabbs: readAABBTree(reader, buffer, aabbOff) };
      }
    }
  }
  if (typeId & MDLNodeFlags.Skin) {
    node.skin = readSkinHeader(reader, buffer);
  }
  if (typeId & MDLNodeFlags.Light) {
    node.light = readLightHeader(reader, buffer);
  }
  if (typeId & MDLNodeFlags.Emitter) {
    node.emitter = readEmitterHeader(reader, buffer);
  }
  if (typeId & MDLNodeFlags.Reference) {
    node.reference = readReferenceHeader(reader, buffer);
  }
  if (typeId & MDLNodeFlags.Dangly && node.mesh) {
    node.dangly = readDanglyHeader(reader, buffer);
  }

  const childOffsets: number[] = [];
  if (childrenCount > 0 && offsetToChildren !== 0 && offsetToChildren !== 0xffffffff) {
    const loc = offsetToChildren + 12;
    if (loc + childrenCount * 4 <= buffer.length) {
      reader.seek(offsetToChildren);
      for (let i = 0; i < childrenCount; i++) childOffsets.push(reader.readUint32());
    }
  }
  for (const co of childOffsets) {
    if (co === 0 || co === 0xffffffff) continue;
    const child = loadNode(reader, buffer, mdxBuffer, co, node, names, fastLoad);
    node.children.push(child);
  }

  if (!fastLoad && controllerCount > 0 && offsetToControllerData !== 0 && offsetToControllerData !== 0xffffffff) {
    node.controllers = readControllers(reader, buffer, offsetToControllers, controllerCount, offsetToControllerData, controllerDataLength);
  }

  return node;
}

function readTrimeshHeader(reader: BufferReader, buffer: Uint8Array, mdxBuffer: Uint8Array | null): MDLMesh {
  const start = reader.position;
  reader.readUint32();
  reader.readUint32();
  const offsetToFaces = reader.readUint32();
  let facesCount = reader.readUint32();
  if (facesCount > 0x7fffffff) facesCount = 0x7fffffff;
  reader.readUint32();
  const bbMin = reader.readVector3();
  const bbMax = reader.readVector3();
  const radius = reader.readFloat32();
  const average = reader.readVector3();
  const diffuse = reader.readVector3();
  const ambient = reader.readVector3();
  const transparencyHint = reader.readUint32();
  const texture1 = reader.readStringNull(32);
  const texture2 = reader.readStringNull(32);
  reader.readBytes(24);
  const offsetToIndicesCounts = reader.readUint32();
  reader.readUint32();
  reader.readUint32();
  const offsetToIndicesOffset = reader.readUint32();
  reader.readUint32();
  reader.readUint32();
  const offsetToCounters = reader.readUint32();
  reader.readUint32();
  reader.readUint32();
  reader.readBytes(12);
  reader.readBytes(8);
  reader.readInt32();
  reader.readVector2();
  reader.readFloat32();
  reader.readFloat32();
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  readI32AsU32(reader);
  const vertexCount = reader.readUint16();
  reader.readUint16();
  const hasLightmap = reader.readUint8();
  const rotateTexture = reader.readUint8();
  const background = reader.readUint8();
  const hasShadow = reader.readUint8();
  const beaming = reader.readUint8();
  const render = reader.readUint8();
  const k2 = buffer.length >= 340;
  if (k2) {
    reader.readUint8();
    reader.readUint8();
    reader.readInt16();
    reader.readInt16();
    reader.readUint32();
    reader.readUint32();
    reader.readUint32();
  } else {
    reader.readUint16();
  }
  reader.readFloat32();
  reader.readUint32();
  reader.readUint32();
  const verticesOffset = reader.readUint32();

  const mesh: MDLMesh = {
    texture1,
    texture2,
    transparencyHint,
    hasLightmap: hasLightmap !== 0,
    rotateTexture: rotateTexture !== 0,
    backgroundGeometry: background !== 0,
    shadow: hasShadow !== 0,
    beaming: beaming !== 0,
    render: render !== 0,
    dirtEnabled: false,
    dirtTexture: 0,
    dirtCoordinateSpace: 0,
    diffuse,
    ambient,
    bbMin,
    bbMax,
    radius,
    average,
    area: 0,
    vertexPositions: [],
    vertexNormals: [],
    vertexUv1: [],
    vertexUv2: [],
    faces: []
  };

  if (offsetToFaces !== 0 && offsetToFaces !== 0xffffffff && facesCount > 0) {
    const loc = offsetToFaces + 12;
    if (loc + facesCount * 12 <= buffer.length) {
      reader.seek(offsetToFaces);
      for (let i = 0; i < facesCount; i++) {
        mesh.faces.push({
          v1: reader.readUint16(),
          v2: reader.readUint16(),
          v3: reader.readUint16(),
          t1: -1,
          t2: -1,
          t3: -1,
          material: 0,
          smoothgroup: 0
        });
      }
    }
  }
  if (verticesOffset !== 0 && verticesOffset !== 0xffffffff && vertexCount > 0) {
    const loc = verticesOffset + 12;
    if (loc + vertexCount * 12 <= buffer.length) {
      reader.seek(verticesOffset);
      for (let i = 0; i < vertexCount; i++) mesh.vertexPositions.push(reader.readVector3());
    }
  }
  return mesh;
}

function readAABBTree(reader: BufferReader, buffer: Uint8Array, offset: number): MDLAABBNode[] {
  const nodes: MDLAABBNode[] = [];
  if (offset <= 0 || offset + 40 > buffer.length) return nodes;
  reader.seek(offset);
  const bboxMin = reader.readVector3();
  const bboxMax = reader.readVector3();
  const leftChild = reader.readInt32();
  const rightChild = reader.readInt32();
  const faceIndex = reader.readInt32();
  const unknown = reader.readInt32();
  nodes.push({ bboxMin, bboxMax, faceIndex, leftChildOffset: leftChild, rightChildOffset: rightChild, unknown });
  if (faceIndex === -1) {
    if (leftChild !== 0) nodes.push(...readAABBTree(reader, buffer, leftChild));
    if (rightChild !== 0) nodes.push(...readAABBTree(reader, buffer, rightChild));
  }
  return nodes;
}

function readSkinHeader(reader: BufferReader, buffer: Uint8Array): import('./MDLData').MDLSkin {
  const mesh = readTrimeshHeader(reader, buffer, null) as import('./MDLData').MDLSkin;
  mesh.qbones = [];
  mesh.tbones = [];
  mesh.boneIndices = [];
  mesh.vertexBones = [];
  const offsetToQBone = reader.readUint32();
  const qboneCount = reader.readUint32();
  reader.readUint32();
  const offsetToTBone = reader.readUint32();
  const tboneCount = reader.readUint32();
  reader.readUint32();
  if (offsetToQBone && qboneCount > 0 && offsetToQBone + 12 + qboneCount * 16 <= buffer.length) {
    reader.seek(offsetToQBone + 12);
    for (let i = 0; i < qboneCount; i++) mesh.qbones.push(reader.readVector4());
  }
  if (offsetToTBone && tboneCount > 0 && offsetToTBone + 12 + tboneCount * 12 <= buffer.length) {
    reader.seek(offsetToTBone + 12);
    for (let i = 0; i < tboneCount; i++) mesh.tbones.push(reader.readVector3());
  }
  return mesh;
}

function readLightHeader(reader: BufferReader, buffer: Uint8Array): MDLLight {
  const ambientOnly = reader.readUint8() !== 0;
  const dynamicType = reader.readUint8();
  const affectDynamic = reader.readUint8() !== 0;
  const shadow = reader.readUint8() !== 0;
  const flare = reader.readUint8() !== 0;
  const lightPriority = reader.readUint8();
  const fadingLight = reader.readUint8() !== 0;
  const flareRadius = reader.readFloat32();
  return {
    ambientOnly,
    dynamicType,
    affectDynamic,
    shadow,
    flare,
    lightPriority,
    fadingLight,
    flareRadius,
    flareSizes: [],
    flarePositions: [],
    flareColorShaders: [],
    flareTextures: []
  };
}

function readEmitterHeader(reader: BufferReader, buffer: Uint8Array): MDLEmitter {
  return {
    deadSpace: 0,
    blastLength: 0,
    blastRadius: 0,
    blastSpeed: 0,
    branchCount: 0,
    controlPointSmoothing: 0,
    xGrid: 0,
    yGrid: 0,
    spawnType: 0,
    updateType: 0,
    renderType: 0,
    blendType: 0,
    texture: '',
    twinkleMin: 0,
    twinkleMax: 0,
    burstMultiplier: 0,
    lifeExpectancy: 0,
    midPoint: 0,
    spread: 0,
    mass: 0,
    velocity: 0,
    gravity: 0,
    drag: 0,
    randomVelocity: 0,
    sizeStart: 0,
    sizeMid: 0,
    sizeEnd: 0,
    sizeStartY: 0,
    sizeMidY: 0,
    sizeEndY: 0,
    colorStart: { r: 1, g: 1, b: 1, a: 1 },
    colorMid: { r: 1, g: 1, b: 1, a: 1 },
    colorEnd: { r: 1, g: 1, b: 1, a: 1 },
    alphaStart: 1,
    alphaMid: 1,
    alphaEnd: 1,
    alphaKey1: 0,
    alphaKey2: 0,
    alphaKey3: 0,
    percentStart: 0,
    percentMid: 0,
    percentEnd: 0,
    frameStart: 0,
    frameEnd: 0,
    fps: 0,
    birthrate: 0,
    randomBirthRate: 0,
    bounceCo: 0,
    combinetime: 0,
    flags: 0
  };
}

function readReferenceHeader(reader: BufferReader, buffer: Uint8Array): MDLReference {
  const modelName = reader.readStringNull(32);
  const reattachable = reader.readUint8() !== 0;
  return { modelName, reattachable };
}

function readDanglyHeader(reader: BufferReader, buffer: Uint8Array): import('./MDLData').MDLDangly {
  const displacement = reader.readFloat32();
  const tightness = reader.readFloat32();
  const period = reader.readFloat32();
  reader.readVector3();
  const constraintCount = reader.readInt32();
  const constraints: import('./MDLData').MDLConstraint[] = [];
  for (let i = 0; i < constraintCount; i++) {
    constraints.push({
      stiffness: reader.readFloat32(),
      period: reader.readFloat32(),
      length: reader.readFloat32()
    });
  }
  return { displacement, tightness, period, constraints };
}

function readControllers(
  reader: BufferReader,
  buffer: Uint8Array,
  offsetToControllers: number,
  controllerCount: number,
  offsetToControllerData: number,
  controllerDataLength: number
): MDLController[] {
  const list: MDLController[] = [];
  if (controllerCount <= 0 || offsetToControllerData === 0 || offsetToControllerData === 0xffffffff) return list;
  const dataStart = offsetToControllerData + 12;
  if (dataStart + controllerDataLength * 4 > buffer.length) return list;
  reader.seek(offsetToControllers);
  for (let i = 0; i < controllerCount; i++) {
    const rowCount = reader.readUint16();
    const keyOffset = reader.readUint16();
    const dataOffset = reader.readUint16();
    const columnCount = reader.readUint8();
    reader.readUint8();
    const rows: MDLControllerRow[] = [];
    const keyBase = offsetToControllerData + keyOffset;
    const dataBase = offsetToControllerData + dataOffset;
    for (let r = 0; r < rowCount; r++) {
      reader.seek(keyBase + r * 4);
      const time = reader.readFloat32();
      const data: number[] = [];
      for (let c = 0; c < columnCount; c++) {
        reader.seek(dataBase + (r * columnCount + c) * 4);
        data.push(reader.readFloat32());
      }
      rows.push({ time, data });
    }
    list.push({ controllerType: 0, isBezier: false, rows });
  }
  return list;
}

function loadAnimation(reader: BufferReader, buffer: Uint8Array, offset: number, names: string[]): MDLAnimation | null {
  reader.seek(offset + 12);
  reader.readUint32();
  reader.readUint32();
  reader.readStringNull(32);
  const duration = reader.readFloat32();
  const transition = reader.readFloat32();
  const root = reader.readStringNull(32);
  const offsetToEvents = reader.readUint32();
  let eventCount = reader.readUint32();
  if (eventCount > 0x7fffffff) eventCount = 0x7fffffff;
  reader.readUint32();
  reader.readUint32();
  const rootNodeOffset = reader.readUint32();
  let nodeCount = reader.readUint32();
  if (nodeCount > 0x7fffffff) nodeCount = 0x7fffffff;
  reader.readUint32();
  const events: MDLEvent[] = [];
  if (offsetToEvents > 0 && eventCount > 0) {
    reader.seek(offsetToEvents + 12);
    for (let i = 0; i < eventCount; i++) {
      events.push({ time: reader.readFloat32(), name: reader.readStringNull(32) });
    }
  }
  const rootNode = loadNode(reader, buffer, null, rootNodeOffset, null, names, false);
  return {
    name: '',
    rootModel: root,
    animLength: duration,
    transitionLength: transition,
    events,
    root: rootNode
  };
}
