/**
 * KotOR.js resource format modules.
 * Re-exports resource classes and format helpers (TPC auto-detect, WAV obfuscation, etc.).
 */

export { BIFObject } from './BIFObject';
export { CExoLocString } from './CExoLocString';
export { CExoLocSubString } from './CExoLocSubString';
export { DLGNode } from './DLGNode';
export type { DLGObjectScripts } from './DLGObject';
export { DLGObject } from './DLGObject';
export { ERFObject } from './ERFObject';
export { GFFField } from './GFFField';
export type { GFFFieldValue } from './GFFField';
export { GFFObject } from './GFFObject';
export type { GFFFieldTableEntry, GFFStructTableEntry } from './GFFObject';
export { GFFStruct, coerceGFFToNumber, coerceGFFToString, coerceGFFToBoolean } from './GFFStruct';
export { KEYObject } from './KEYObject';
export { LIPObject } from './LIPObject';
export { LTRObject } from './LTRObject';
export { LYTObject } from './LYTObject';
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
} from './MDLData';
export { MDL, MDLNode } from './MDLData';
export {
  bytesMDL,
  detectMDLFormat,
  readMDL,
  readMDLFast,
  readMDLFromAsciiBuffer,
  writeMDL,
  writeMDLToAsciiBuffer,
} from './MDLAuto';
export type { ReadMDLOptions, WriteMDLOptions } from './MDLAuto';
export { readMDLFromBinaryBuffer, type MDLBinaryReaderOptions } from './MDLBinaryReader';
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
} from './MDLTypes';
export type { MDLFormat } from './MDLTypes';
export { readResourceFromBuffer, resourceToBytes } from './ResourceAuto';
export type { ReadResourceResult, ResourceToBytesFormat } from './ResourceAuto';
export {
  detectResourceTypeFromBuffer,
  getResourceTypeFromExtension,
  resolveResourceType,
} from './ResourceHeuristics';
export { ResourceTypeInfo } from './ResourceTypeInfo';
export { ResourceTypes } from './ResourceTypes';
export { RIMObject } from './RIMObject';
export { SSFObject } from './SSFObject';
export { TGAObject } from './TGAObject';
export { TLKObject } from './TLKObject';
export { TLKString } from './TLKString';
export type { TLKStringDBRow } from './TLKString';
export {
  detectTPCFormat,
  isTPCBuffer,
  readTPCFromBuffer,
  TPCObject,
  writeTPCToBuffer,
} from './TPCObject';
export type { TPCDetectedFormat, TPCDDSResult, TPCMipmap, WriteTPCFormat } from './TPCObject';
export {
  detectTwoDAFormat,
  readTwoDAFromBuffer,
  TWODA_BLANK,
  TwoDAObject,
  TwoDARow,
  writeTwoDAToBuffer,
} from './TwoDAObject';
export type { TwoDAFormat, TwoDARowData, WriteTwoDAFormat } from './TwoDAObject';
export { readTXIFromBuffer, TXI, writeTXIToBuffer } from './TXI';
export { readVISFromBuffer, VISObject, writeVISToBuffer } from './VISObject';
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
} from './WAVObject';
