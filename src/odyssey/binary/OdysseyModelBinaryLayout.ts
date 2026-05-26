/**
 * Odyssey MDL/MDX binary layout
 */

export const MDL_WRAPPER_SIZE = 12;

export const MDL_CONTENT_GEOMETRY_HEADER = 0x00;
export const MDL_GEOMETRY_HEADER_SIZE = 0x50;

export const MDL_CONTENT_MODEL_HEADER = 0x50;
export const MDL_MODEL_HEADER_SIZE = 0x74;

export const MDL_NODE_HEADER_SIZE = 0x50;
export const MDL_TRIMESH_EXTRA_SIZE = 0x14c;
export const MDL_ANIM_MESH_EXTRA_SIZE = 0x38;
export const MDL_ANIMATION_HEADER_SIZE = 0x88;

/** MDX sentinel floats after each mesh block (little-endian). */
export const MDX_SENTINEL_NON_SKIN = 10_000_000;
export const MDX_SENTINEL_SKIN = 1_000_000;

export const MDL_FN_PTR_K1_PC = 4_273_776;
export const MDL_FN_PTR_K2_PC = 4_285_200;
export const MDL_FN_PTR_K1_XBOX = 4_254_992;
export const MDL_FN_PTR_K2_XBOX = 4_285_872;

export const MDL_GEOMETRY_TYPE_MODEL = 2;
export const MDL_GEOMETRY_TYPE_ANIMATION = 5;

export const MDL_MAX_FACE_SIZE = 32;

/** Model header field offsets (content-relative). */
export const enum MdlModelHeaderOffset {
  Classification = 0x50,
  SubClassification = 0x51,
  Unknown52 = 0x52,
  AffectedByFog = 0x53,
  NumChildModels = 0x54,
  AnimationArr = 0x58,
  SupermodelRef = 0x64,
  BMin = 0x68,
  BMax = 0x74,
  Radius = 0x80,
  AnimationScale = 0x84,
  SupermodelName = 0x88,
  OffAnimRoot = 0xa8,
  PaddingAc = 0xac,
  MdxSize = 0xb0,
  MdxOffset = 0xb4,
  NameOffsetsPtr = 0xb8,
  NameCount = 0xbc,
}

/** Node header field offsets (node-relative). */
export const enum MdlNodeHeaderOffset {
  TypeFlags = 0x00,
  NodeNumber = 0x02,
  NameIndex = 0x04,
  Padding = 0x06,
  OffRoot = 0x08,
  OffParent = 0x0c,
  Position = 0x10,
  Orientation = 0x1c,
  ChildrenArr = 0x2c,
  CtrlKeyArr = 0x38,
  CtrlDataArr = 0x44,
}

/** TriMesh extra: MDX layout block starts at node+0x150 (extra+0x100). */
export const enum MdlTriMeshExtraOffset {
  MdxDataOffset = 0x144,
  VertArrayOffset = 0x148,
}

export function alignTo16(offset: number): number {
  return (offset + 15) & ~15;
}
