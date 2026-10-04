import { OdysseyWalkMeshType } from "@core/enums/odyssey/OdysseyWalkMeshType";
import type { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import { BinaryReader } from "@core/binary/BinaryReader";
import { prepareFloat } from "./odysseyModelAsciiHelpers";

/**
 * Odyssey WalkMesh ASCII format (KotOR.js).
 *
 * Human-readable dump of WOK / PWK / DWK binary walkmeshes. Field layout mirrors
 * the on-disk 136-byte header and payload sections so values can round-trip.
 *
 * Example:
 *   # Odyssey WalkMesh ASCII
 *   fileType WOK
 *   version V1.0
 *   walkMeshType aabb
 *   position 0.0 0.0 0.0
 *   ...
 *   verts N
 *     x y z
 *   faces N
 *     a b c
 *   materials N
 *     surfaceIndex
 *   normals N
 *     x y z
 *   coefficients N
 *     planeCoeff
 *   aabbs N
 *     minX minY minZ maxX maxY maxZ faceIdx unknownFixedAt4 mostSignificantPlane leftNodeOffset rightNodeOffset
 *   adjacency N
 *     edgeSlotA edgeSlotB edgeSlotC   # raw int32 triples (-1 = boundary)
 *   edges N
 *     edgeIndex transition
 *   perimeters N
 *     edgeIndex
 *   endwalkmesh
 */

const NL = "\r\n";

export interface ExportOdysseyWalkMeshAsciiOptions {
  /** Optional resref / label written as a comment. */
  name?: string;
  /** Resource extension hint (wok|pwk|dwk) for the header comment. */
  extension?: string;
}

function walkMeshTypeToAscii(type: number): string {
  switch (type) {
    case OdysseyWalkMeshType.NONE:
      return "none";
    case OdysseyWalkMeshType.AABB:
      return "aabb";
    default:
      return String(type | 0);
  }
}

function vec3Line(x: number, y: number, z: number): string {
  return `${prepareFloat(x)} ${prepareFloat(y)} ${prepareFloat(z)}`;
}

/**
 * Export a walkmesh ASCII document from an already-parsed {@link OdysseyWalkMesh}.
 * Adjacency values are reconstructed as faceIndex*3 (side info may be lost if
 * the binary parser discarded edge-slot remainders). Prefer
 * {@link exportOdysseyWalkMeshAsciiFromBuffer} when fidelity matters.
 */
export function exportOdysseyWalkMeshAscii(
  wok: OdysseyWalkMesh,
  options: ExportOdysseyWalkMeshAsciiOptions = {},
): string {
  const h = wok.header || {};
  const lines: string[] = [];

  lines.push("# Odyssey WalkMesh ASCII");
  if (options.name) lines.push(`# name ${options.name}`);
  if (options.extension) lines.push(`# type ${options.extension}`);
  lines.push(`fileType ${(h.fileType || "WOK ").toString().trimEnd()}`);
  lines.push(`version ${(h.version || "V1.0").toString().trimEnd()}`);
  lines.push(`walkMeshType ${walkMeshTypeToAscii(h.walkMeshType ?? 0)}`);
  lines.push(`unknownEntry ${h.unknownEntry ?? 0}`);

  const pos = h.position || { x: 0, y: 0, z: 0 };
  lines.push(`position ${vec3Line(pos.x, pos.y, pos.z)}`);
  lines.push(
    `relativeUsePosition1 ${vec3Line(wok.relativeUsePosition1.x, wok.relativeUsePosition1.y, wok.relativeUsePosition1.z)}`,
  );
  lines.push(
    `relativeUsePosition2 ${vec3Line(wok.relativeUsePosition2.x, wok.relativeUsePosition2.y, wok.relativeUsePosition2.z)}`,
  );
  lines.push(
    `absoluteUsePosition1 ${vec3Line(wok.absoluteUsePosition1.x, wok.absoluteUsePosition1.y, wok.absoluteUsePosition1.z)}`,
  );
  lines.push(
    `absoluteUsePosition2 ${vec3Line(wok.absoluteUsePosition2.x, wok.absoluteUsePosition2.y, wok.absoluteUsePosition2.z)}`,
  );

  lines.push(`verts ${wok.vertices.length}`);
  for (const v of wok.vertices) {
    lines.push(`  ${vec3Line(v.x, v.y, v.z)}`);
  }

  lines.push(`faces ${wok.faces.length}`);
  for (const f of wok.faces) {
    lines.push(`  ${f.a} ${f.b} ${f.c}`);
  }

  lines.push(`materials ${wok.walkTypes.length}`);
  for (const m of wok.walkTypes) {
    lines.push(`  ${m | 0}`);
  }

  lines.push(`normals ${wok.normals.length}`);
  for (const n of wok.normals) {
    lines.push(`  ${vec3Line(n.x, n.y, n.z)}`);
  }

  lines.push(`coefficients ${wok.facePlaneCoefficients.length}`);
  for (const c of wok.facePlaneCoefficients) {
    lines.push(`  ${prepareFloat(c)}`);
  }

  lines.push(`aabbs ${wok.aabbNodes.length}`);
  for (const node of wok.aabbNodes) {
    const min = node.box.min;
    const max = node.box.max;
    lines.push(
      `  ${vec3Line(min.x, min.y, min.z)} ${vec3Line(max.x, max.y, max.z)} ${node.faceIdx | 0} ${node.unknownFixedAt4 ?? 0} ${node.mostSignificantPlane | 0} ${node.leftNodeOffset | 0} ${node.rightNodeOffset | 0}`,
    );
  }

  const adj = wok.walkableFacesEdgesAdjacencyMatrix || [];
  lines.push(`adjacency ${adj.length}`);
  for (let i = 0; i < adj.length; i++) {
    const row = adj[i] || [-1, -1, -1];
    // Reconstruct approximate on-disk edge slots (face*3); side remainder may be 0.
    const a = row[0] >= 0 ? row[0] * 3 : -1;
    const b = row[1] >= 0 ? row[1] * 3 : -1;
    const c = row[2] >= 0 ? row[2] * 3 : -1;
    lines.push(`  ${a} ${b} ${c}`);
  }

  const edgeEntries = Array.from(wok.edges?.entries?.() || []).sort((a, b) => a[0] - b[0]);
  lines.push(`edges ${edgeEntries.length}`);
  for (const [index, edge] of edgeEntries) {
    lines.push(`  ${index | 0} ${edge.transition | 0}`);
  }

  lines.push(`perimeters ${wok.perimeters.length}`);
  for (const p of wok.perimeters) {
    lines.push(`  ${p.edge | 0}`);
  }

  lines.push("endwalkmesh");
  return lines.join(NL) + NL;
}

/**
 * Export walkmesh ASCII directly from a binary WOK/PWK/DWK buffer.
 * Preserves raw adjacency edge-slot integers from disk.
 */
export function exportOdysseyWalkMeshAsciiFromBuffer(
  buffer: Uint8Array,
  options: ExportOdysseyWalkMeshAsciiOptions = {},
): string {
  if (!buffer?.length) {
    throw new Error("Empty walkmesh buffer");
  }

  const r = new BinaryReader(buffer);
  const fileType = r.readChars(4);
  const version = r.readChars(4);
  const walkMeshType = r.readUInt32();
  const relativeUsePosition1 = { x: r.readSingle(), y: r.readSingle(), z: r.readSingle() };
  const relativeUsePosition2 = { x: r.readSingle(), y: r.readSingle(), z: r.readSingle() };
  const absoluteUsePosition1 = { x: r.readSingle(), y: r.readSingle(), z: r.readSingle() };
  const absoluteUsePosition2 = { x: r.readSingle(), y: r.readSingle(), z: r.readSingle() };
  const position = { x: r.readSingle(), y: r.readSingle(), z: r.readSingle() };
  const verticesCount = r.readUInt32();
  const offsetToVertices = r.readUInt32();
  const facesCount = r.readUInt32();
  const offsetToFaces = r.readUInt32();
  const offsetToWalkTypes = r.readUInt32();
  const offsetToNormalizedInvertedNormals = r.readUInt32();
  const offsetToFacePlanesCoefficien = r.readUInt32();
  const aabbCount = r.readUInt32();
  const offsetToAABBs = r.readUInt32();
  const unknownEntry = r.readUInt32();
  const adjacencyCount = r.readUInt32();
  const offsetToAdjacency = r.readUInt32();
  const edgesCount = r.readUInt32();
  const offsetToEdges = r.readUInt32();
  const perimetersCount = r.readUInt32();
  const offsetToPerimeters = r.readUInt32();

  const lines: string[] = [];
  lines.push("# Odyssey WalkMesh ASCII");
  if (options.name) lines.push(`# name ${options.name}`);
  if (options.extension) lines.push(`# type ${options.extension}`);
  lines.push(`fileType ${fileType.trimEnd()}`);
  lines.push(`version ${version.trimEnd()}`);
  lines.push(`walkMeshType ${walkMeshTypeToAscii(walkMeshType)}`);
  lines.push(`unknownEntry ${unknownEntry}`);
  lines.push(`position ${vec3Line(position.x, position.y, position.z)}`);
  lines.push(
    `relativeUsePosition1 ${vec3Line(relativeUsePosition1.x, relativeUsePosition1.y, relativeUsePosition1.z)}`,
  );
  lines.push(
    `relativeUsePosition2 ${vec3Line(relativeUsePosition2.x, relativeUsePosition2.y, relativeUsePosition2.z)}`,
  );
  lines.push(
    `absoluteUsePosition1 ${vec3Line(absoluteUsePosition1.x, absoluteUsePosition1.y, absoluteUsePosition1.z)}`,
  );
  lines.push(
    `absoluteUsePosition2 ${vec3Line(absoluteUsePosition2.x, absoluteUsePosition2.y, absoluteUsePosition2.z)}`,
  );

  r.seek(offsetToVertices);
  lines.push(`verts ${verticesCount}`);
  for (let i = 0; i < verticesCount; i++) {
    lines.push(`  ${vec3Line(r.readSingle(), r.readSingle(), r.readSingle())}`);
  }

  r.seek(offsetToFaces);
  lines.push(`faces ${facesCount}`);
  for (let i = 0; i < facesCount; i++) {
    lines.push(`  ${r.readInt32()} ${r.readInt32()} ${r.readInt32()}`);
  }

  r.seek(offsetToWalkTypes);
  lines.push(`materials ${facesCount}`);
  for (let i = 0; i < facesCount; i++) {
    lines.push(`  ${r.readInt32()}`);
  }

  r.seek(offsetToNormalizedInvertedNormals);
  lines.push(`normals ${facesCount}`);
  for (let i = 0; i < facesCount; i++) {
    lines.push(`  ${vec3Line(r.readSingle(), r.readSingle(), r.readSingle())}`);
  }

  r.seek(offsetToFacePlanesCoefficien);
  lines.push(`coefficients ${facesCount}`);
  for (let i = 0; i < facesCount; i++) {
    lines.push(`  ${prepareFloat(r.readSingle())}`);
  }

  r.seek(offsetToAABBs);
  lines.push(`aabbs ${aabbCount}`);
  for (let i = 0; i < aabbCount; i++) {
    const minX = r.readSingle();
    const minY = r.readSingle();
    const minZ = r.readSingle();
    const maxX = r.readSingle();
    const maxY = r.readSingle();
    const maxZ = r.readSingle();
    const faceIdx = r.readInt32();
    const unknownFixedAt4 = r.readInt32();
    const mostSignificantPlane = r.readInt32();
    const leftNodeOffset = r.readInt32();
    const rightNodeOffset = r.readInt32();
    lines.push(
      `  ${vec3Line(minX, minY, minZ)} ${vec3Line(maxX, maxY, maxZ)} ${faceIdx} ${unknownFixedAt4} ${mostSignificantPlane} ${leftNodeOffset} ${rightNodeOffset}`,
    );
  }

  r.seek(offsetToAdjacency);
  lines.push(`adjacency ${adjacencyCount}`);
  for (let i = 0; i < adjacencyCount; i++) {
    lines.push(`  ${r.readInt32()} ${r.readInt32()} ${r.readInt32()}`);
  }

  r.seek(offsetToEdges);
  lines.push(`edges ${edgesCount}`);
  for (let i = 0; i < edgesCount; i++) {
    lines.push(`  ${r.readInt32()} ${r.readInt32()}`);
  }

  r.seek(offsetToPerimeters);
  lines.push(`perimeters ${perimetersCount}`);
  for (let i = 0; i < perimetersCount; i++) {
    lines.push(`  ${r.readInt32()}`);
  }

  lines.push("endwalkmesh");
  return lines.join(NL) + NL;
}
