import type { IOdysseyControllerFrameGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import type { IOdysseyControllerGeneric } from "@core/interface/odyssey/controller/IOdysseyControllerGeneric";
import type { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { OdysseyControllerFactory } from "@engine/odyssey/controllers/OdysseyControllerFactory";
import type { OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import type { OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import type { OdysseyModelNodeAnimMesh } from "@engine/odyssey/OdysseyModelNodeAnimMesh";
import type { OdysseyModelNodeMesh } from "@engine/odyssey/OdysseyModelNodeMesh";

/** Decoded vertex attribute buffers shared by binary MDX and ASCII mesh ingest. */
export type DecodedMeshVertexAttributes = {
  vertices?: Float32Array;
  normals?: Float32Array;
  colors?: Float32Array;
  /** Up to four UV channels (2 floats per vertex). */
  tvectors?: (Float32Array | undefined)[];
  verticesCount?: number;
};

/** Decoded face storage shared by binary face tables and ASCII face lists. */
export type DecodedMeshFaces = {
  faceCount: number;
  faceIndices: Uint16Array;
  faceNormals: Float32Array;
  faceDistances: Float32Array;
  faceMaterialIndices: Uint32Array;
  faceAdjacent: Int16Array;
  faceSmoothingGroups?: Uint32Array;
  /** Draw-index buffer; defaults to a Uint32 copy of {@link faceIndices}. */
  indices?: Uint32Array;
};

/** K2 dirt / hologram mesh flags. */
export type DecodedMeshDirtFields = {
  dirtEnabled?: number;
  dirtTexture?: number;
  dirtCoordSpace?: number;
  hideInHolograms?: number;
};

/** AnimMesh sample arrays (time-sampled verts / tverts). */
export type DecodedAnimMeshSamples = {
  samplePeriod?: number;
  animVerts?: [number, number, number][];
  animTVerts?: [number, number, number][];
  dataPtr1Payload?: Float32Array;
  dataPtr1?: number;
  dataCount1?: number;
  padding24?: number;
  animVerticesPtr?: number;
  animTexVerticesPtr?: number;
  animVerticesCount?: number;
  animTexVerticesCount?: number;
};

/**
 * Initialize empty typed geometry buffers on a mesh node.
 * Both binary and ASCII ingest call this before filling attributes.
 */
export function initMeshGeometryDefaults(mesh: OdysseyModelNodeMesh): void {
  mesh.vertices = new Float32Array(0);
  mesh.normals = new Float32Array(0);
  mesh.colors = new Float32Array(0);
  mesh.tvectors = [
    new Float32Array(0),
    new Float32Array(0),
    new Float32Array(0),
    new Float32Array(0),
  ];
  mesh.texCords = [[], [], [], []];
  mesh.tangents = [[], [], [], []];
  mesh.indexArray = [];
  mesh.uvs = [];
  mesh.indices = new Uint32Array(0);
  mesh.faceCount = 0;
  mesh.clearFaceCache();
}

/** Copy decoded vertex / UV / color buffers onto the domain mesh. */
export function populateMeshVertexAttributes(
  mesh: OdysseyModelNodeMesh,
  attrs: DecodedMeshVertexAttributes,
): void {
  if (attrs.vertices) {
    mesh.vertices = attrs.vertices;
  }
  if (attrs.normals) {
    mesh.normals = attrs.normals;
  }
  if (attrs.colors) {
    mesh.colors = attrs.colors;
  }
  if (attrs.verticesCount !== undefined) {
    mesh.verticesCount = attrs.verticesCount;
  }
  if (attrs.tvectors) {
    if (!mesh.tvectors) {
      mesh.tvectors = [
        new Float32Array(0),
        new Float32Array(0),
        new Float32Array(0),
        new Float32Array(0),
      ];
    }
    for (let i = 0; i < 4 && i < attrs.tvectors.length; i++) {
      const channel = attrs.tvectors[i];
      if (channel) {
        mesh.tvectors[i] = channel;
      }
    }
  }
}

/** Assign typed face arrays; invalidates the lazy OdysseyFace3 cache. */
export function populateMeshFaces(
  mesh: OdysseyModelNodeMesh,
  faces: DecodedMeshFaces,
): void {
  const count = faces.faceCount | 0;
  mesh.faceCount = count;
  mesh.faceIndices = faces.faceIndices;
  mesh.faceNormals = faces.faceNormals;
  mesh.faceDistances = faces.faceDistances;
  mesh.faceMaterialIndices = faces.faceMaterialIndices;
  mesh.faceAdjacent = faces.faceAdjacent;
  if (faces.faceSmoothingGroups) {
    mesh.faceSmoothingGroups = faces.faceSmoothingGroups;
  } else {
    mesh.faceSmoothingGroups = undefined;
  }
  mesh.indices =
    faces.indices ??
    (count > 0 ? Uint32Array.from(faces.faceIndices) : new Uint32Array(0));
  mesh.clearFaceCache();
}

/** Apply K2 dirt / hologram flags when present in either ingest path. */
export function populateMeshDirtFields(
  mesh: OdysseyModelNodeMesh,
  dirt: DecodedMeshDirtFields,
): void {
  if (dirt.dirtEnabled !== undefined) mesh.dirtEnabled = dirt.dirtEnabled;
  if (dirt.dirtTexture !== undefined) mesh.dirtTexture = dirt.dirtTexture;
  if (dirt.dirtCoordSpace !== undefined) mesh.dirtCoordSpace = dirt.dirtCoordSpace;
  if (dirt.hideInHolograms !== undefined) mesh.hideInHolograms = dirt.hideInHolograms;
}

/** Populate AnimMesh sample fields from a decoded payload. */
export function populateAnimMeshFromDecoded(
  node: OdysseyModelNodeAnimMesh,
  decoded: DecodedAnimMeshSamples,
): void {
  if (decoded.samplePeriod !== undefined) node.samplePeriod = decoded.samplePeriod;
  if (decoded.animVerts) node.animVerts = decoded.animVerts;
  if (decoded.animTVerts) node.animTVerts = decoded.animTVerts;
  if (decoded.dataPtr1 !== undefined) node.dataPtr1 = decoded.dataPtr1;
  if (decoded.dataCount1 !== undefined) node.dataCount1 = decoded.dataCount1;
  if (decoded.dataPtr1Payload !== undefined) node.dataPtr1Payload = decoded.dataPtr1Payload;
  if (decoded.padding24 !== undefined) node.padding24 = decoded.padding24;
  if (decoded.animVerticesPtr !== undefined) node.animVerticesPtr = decoded.animVerticesPtr;
  if (decoded.animTexVerticesPtr !== undefined) node.animTexVerticesPtr = decoded.animTexVerticesPtr;
  if (decoded.animVerticesCount !== undefined) node.animVerticesCount = decoded.animVerticesCount;
  if (decoded.animTexVerticesCount !== undefined) {
    node.animTexVerticesCount = decoded.animTexVerticesCount;
  }
}

/**
 * Attach a controller built from a generic descriptor.
 * Shared by ASCII static keys and any non-binary attachment path.
 */
export function attachNodeController(
  node: OdysseyModelNode,
  generic: IOdysseyControllerGeneric,
): OdysseyController | undefined {
  const controller = OdysseyControllerFactory.From(generic);
  if (controller) {
    node.controllers.set(generic.type, controller);
  }
  return controller;
}

/** Convenience: single static frame controller (ASCII geometry / light / emitter keys). */
export function attachStaticController(
  node: OdysseyModelNode,
  type: OdysseyModelControllerType,
  columnCount: number,
  frames: IOdysseyControllerFrameGeneric[],
): OdysseyController | undefined {
  return attachNodeController(node, {
    type,
    nodeType: node.nodeType,
    frameCount: frames.length,
    timeKeyIndex: 0,
    dataValueIndex: 0,
    columnCount,
    data: frames,
  });
}

/**
 * Plane normal + distance for a triangle in a packed xyz vertex buffer.
 * Used when ASCII face lists omit binary plane tables.
 */
export function computeFacePlaneFromVertices(
  vertices: ArrayLike<number>,
  ia: number,
  ib: number,
  ic: number,
): { nx: number; ny: number; nz: number; distance: number } {
  const ax = vertices[ia * 3] || 0;
  const ay = vertices[ia * 3 + 1] || 0;
  const az = vertices[ia * 3 + 2] || 0;
  const bx = vertices[ib * 3] || 0;
  const by = vertices[ib * 3 + 1] || 0;
  const bz = vertices[ib * 3 + 2] || 0;
  const cx = vertices[ic * 3] || 0;
  const cy = vertices[ic * 3 + 1] || 0;
  const cz = vertices[ic * 3 + 2] || 0;

  const e1x = bx - ax;
  const e1y = by - ay;
  const e1z = bz - az;
  const e2x = cx - ax;
  const e2y = cy - ay;
  const e2z = cz - az;

  let nx = e1y * e2z - e1z * e2y;
  let ny = e1z * e2x - e1x * e2z;
  let nz = e1x * e2y - e1y * e2x;
  const lenSq = nx * nx + ny * ny + nz * nz;
  if (lenSq > 1e-20) {
    const inv = 1 / Math.sqrt(lenSq);
    nx *= inv;
    ny *= inv;
    nz *= inv;
  } else {
    nx = 0;
    ny = 0;
    nz = 0;
  }

  return {
    nx,
    ny,
    nz,
    distance: -(nx * ax + ny * ay + nz * az),
  };
}

/**
 * Build {@link DecodedMeshFaces} from per-face index / material / smoothing rows
 * and a vertex buffer (computes plane equations).
 */
export function buildDecodedFacesFromIndexRows(
  vertices: ArrayLike<number>,
  rows: ReadonlyArray<{
    a: number;
    b: number;
    c: number;
    materialIndex: number;
    smoothingGroup?: number;
  }>,
): DecodedMeshFaces {
  const count = rows.length;
  const faceIndices = new Uint16Array(count * 3);
  const faceNormals = new Float32Array(count * 3);
  const faceDistances = new Float32Array(count);
  const faceMaterialIndices = new Uint32Array(count);
  const faceAdjacent = new Int16Array(count * 3);
  let hasSmoothing = false;
  const faceSmoothingGroups = new Uint32Array(count);

  for (let i = 0; i < count; i++) {
    const row = rows[i];
    const a = row.a | 0;
    const b = row.b | 0;
    const c = row.c | 0;
    faceIndices[i * 3] = a;
    faceIndices[i * 3 + 1] = b;
    faceIndices[i * 3 + 2] = c;
    faceMaterialIndices[i] = row.materialIndex >>> 0;
    faceAdjacent[i * 3] = -1;
    faceAdjacent[i * 3 + 1] = -1;
    faceAdjacent[i * 3 + 2] = -1;

    const plane = computeFacePlaneFromVertices(vertices, a, b, c);
    faceNormals[i * 3] = plane.nx;
    faceNormals[i * 3 + 1] = plane.ny;
    faceNormals[i * 3 + 2] = plane.nz;
    faceDistances[i] = plane.distance;

    if (row.smoothingGroup !== undefined) {
      hasSmoothing = true;
      faceSmoothingGroups[i] = row.smoothingGroup >>> 0;
    }
  }

  const indices = new Uint32Array(count * 3);
  for (let i = 0; i < faceIndices.length; i++) {
    indices[i] = faceIndices[i];
  }

  return {
    faceCount: count,
    faceIndices,
    faceNormals,
    faceDistances,
    faceMaterialIndices,
    faceAdjacent,
    faceSmoothingGroups: hasSmoothing ? faceSmoothingGroups : undefined,
    indices,
  };
}
