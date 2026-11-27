/**
 * Bulk-read interleaved MDX vertex attributes into typed arrays.
 * Prefer one pass over a contiguous MDX node slice when stride is valid.
 */

function dataViewFor(buffer: Uint8Array): DataView {
  return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Read `components` floats per vertex at `attrOffset` within each `stride` record.
 */
export function readMdxInterleavedFloats(
  mdxBuffer: Uint8Array,
  nodeDataOffset: number,
  stride: number,
  attrOffset: number,
  vertexCount: number,
  components: number,
): Float32Array {
  const out = new Float32Array(vertexCount * components);
  if (vertexCount <= 0 || stride <= 0 || attrOffset < 0) {
    return out;
  }
  const view = dataViewFor(mdxBuffer);
  const end = mdxBuffer.byteLength;
  for (let i = 0; i < vertexCount; i++) {
    const base = nodeDataOffset + i * stride + attrOffset;
    for (let c = 0; c < components; c++) {
      const off = base + c * 4;
      out[i * components + c] = off + 4 <= end ? view.getFloat32(off, true) : 0;
    }
  }
  return out;
}

/**
 * Read 9 floats (tangent / bitangent / normal) into three separate arrays.
 */
export function readMdxTangentBlock(
  mdxBuffer: Uint8Array,
  nodeDataOffset: number,
  stride: number,
  attrOffset: number,
  vertexCount: number,
): { tangents: Float32Array; bitangents: Float32Array; normals: Float32Array } {
  const tangents = new Float32Array(vertexCount * 3);
  const bitangents = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  if (vertexCount <= 0 || stride <= 0 || attrOffset < 0) {
    return { tangents, bitangents, normals };
  }
  const view = dataViewFor(mdxBuffer);
  const end = mdxBuffer.byteLength;
  for (let i = 0; i < vertexCount; i++) {
    const base = nodeDataOffset + i * stride + attrOffset;
    const o = i * 3;
    for (let c = 0; c < 3; c++) {
      const tOff = base + c * 4;
      const bOff = base + 12 + c * 4;
      const nOff = base + 24 + c * 4;
      tangents[o + c] = tOff + 4 <= end ? view.getFloat32(tOff, true) : 0;
      bitangents[o + c] = bOff + 4 <= end ? view.getFloat32(bOff, true) : 0;
      normals[o + c] = nOff + 4 <= end ? view.getFloat32(nOff, true) : 0;
    }
  }
  return { tangents, bitangents, normals };
}
