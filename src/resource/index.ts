/**
 * KotOR.js resource format modules.
 * Re-exports resource classes and format helpers (TPC auto-detect, WAV obfuscation, etc.).
 */

export { BIFObject } from '@/resource/BIFObject';
export { CExoLocString } from '@/resource/CExoLocString';
export { CExoLocSubString } from '@/resource/CExoLocSubString';
export { DLGNode } from '@/resource/DLGNode';
export type { DLGObjectScripts } from '@/resource/DLGObject';
export { DLGObject } from '@/resource/DLGObject';
export { ERFObject } from '@/resource/ERFObject';
export { GFFField } from '@/resource/GFFField';
export type { GFFFieldValue } from '@/resource/GFFField';
export { GFFObject } from '@/resource/GFFObject';
export type { GFFFieldTableEntry, GFFStructTableEntry } from '@/resource/GFFObject';
export { GFFStruct, coerceGFFToNumber, coerceGFFToString, coerceGFFToBoolean } from '@/resource/GFFStruct';
export { KEYObject } from '@/resource/KEYObject';
export { LIPObject } from '@/resource/LIPObject';
export { LTRObject } from '@/resource/LTRObject';
export { LYTObject } from '@/resource/LYTObject';
export type {
  MDLAABBNode,
  MDLAnimation,
  MDLBoneVertex,
  MDLColor,
  MDLConstraint,
  MDLController,
  MDLControllerRow,
  MDLDangly,
  MDLEmitter,
  MDLEvent,
  MDLFace,
  MDLLight,
  MDLMesh,
  MDLReference,
  MDLSaber,
  MDLSkin,
  MDLWalkmesh,
  Vector2,
  Vector3,
  Vector4,
} from '@/resource/MDLData';
export { MDL, MDLNode } from '@/resource/MDLData';
export {
  bytesMDL,
  detectMDLFormat,
  readMDL,
  readMDLFast,
  readMDLFromAsciiBuffer,
  writeMDL,
  writeMDLToAsciiBuffer,
} from '@/resource/MDLAuto';
export type { ReadMDLOptions, WriteMDLOptions } from '@/resource/MDLAuto';
export { readMDLFromBinaryBuffer, type MDLBinaryReaderOptions } from '@/resource/MDLBinaryReader';
export {
  MDLBlendType,
  MDLClassification,
  MDLDynamicType,
  MDLEmitterFlags,
  MDLEmitterType,
  MDLGeometryType,
  MDLLightFlags,
  MDLNodeFlags,
  MDLNodeType,
  MDLRenderType,
  MDLSaberFlags,
  MDLTrimeshFlags,
  MDLTrimeshProps,
  MDLControllerType,
  MDLUpdateType,
} from '@/resource/MDLTypes';
export type { MDLFormat } from '@/resource/MDLTypes';
export { readResourceFromBuffer, resourceToBytes } from '@/resource/ResourceAuto';
export type { ReadResourceResult, ResourceToBytesFormat } from '@/resource/ResourceAuto';
export {
  detectResourceTypeFromBuffer,
  getResourceTypeFromExtension,
  resolveResourceType,
} from '@/resource/ResourceHeuristics';
export { ResourceTypeInfo } from '@/resource/ResourceTypeInfo';
export { ResourceTypes } from '@/resource/ResourceTypes';
export { RIMObject } from '@/resource/RIMObject';
export { SSFObject } from '@/resource/SSFObject';
export { TGAObject } from '@/resource/TGAObject';
export { TLKObject } from '@/resource/TLKObject';
export { TLKString } from '@/resource/TLKString';
export type { TLKStringDBRow } from '@/resource/TLKString';
export {
  detectTPCFormat,
  isTPCBuffer,
  readTPCFromBuffer,
  TPCObject,
  writeTPCToBuffer,
} from '@/resource/TPCObject';
export type { TPCDetectedFormat, TPCDDSResult, TPCMipmap, WriteTPCFormat } from '@/resource/TPCObject';
export {
  detectTwoDAFormat,
  readTwoDAFromBuffer,
  TWODA_BLANK,
  TwoDAObject,
  TwoDARow,
  writeTwoDAToBuffer,
} from '@/resource/TwoDAObject';
export type { TwoDAFormat, TwoDARowData, WriteTwoDAFormat } from '@/resource/TwoDAObject';
export { readTXIFromBuffer, TXI, writeTXIToBuffer } from '@/resource/TXI';
export { readVISFromBuffer, VISObject, writeVISToBuffer } from '@/resource/VISObject';
export {
  DeobfuscationResult,
  detectAudioFormat,
  deobfuscateAudio,
  obfuscateAudio,
  SFX_HEADER_LEN,
  SFX_MAGIC,
  VO_HEADER_LEN,
  WAVObject,
  WAVType,
} from '@/resource/WAVObject';
