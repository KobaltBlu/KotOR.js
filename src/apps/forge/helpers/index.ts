/**
 * Forge helpers – re-exports for convenient imports.
 */

export { stripJsonComments } from "./JsonUtils";
export { pathParse, type ParsedPath } from "./PathParse";
export { useEffectOnce } from "./UseEffectOnce";
export { sanitizeResRef, clampByte, clampWord, createNumberFieldHandler } from "./UTxEditorHelpers";
export {
  createEmptyErfHeader,
  createEmptyModHeader,
  cloneModuleFromBuffer,
  type CloneModuleOptions,
} from "./CloneModule";
export { extractErfToFolder, type ExtractErfToFolderOptions } from "./ExtractErfToFolder";
export { saveResourceToOverride, type SaveToOverrideOptions } from "./SaveToOverride";
export { buildRimBuffer, saveResourceToRim, type SaveToRimOptions } from "./SaveToRim";
export { humanReadableSize, getNums, clamp } from "./FormatUtils";
export {
  isModFile,
  isErfFile,
  isSavFile,
  isAnyErfTypeFile,
  isRimFile,
  isCapsuleFile,
} from "./CapsuleUtils";
export { addResourceToErf, type AddResourceToErfOptions } from "./AddResourceToErf";
export { compileNssToNcs, decompileNcsToNss, type ScriptCompileResult } from "./ScriptCompiler";
export {
  processAudioToLIP,
  getAudioDuration,
  createLIPFromDuration,
  type LIPBatchProcessorOptions,
  type LIPBatchProcessorResult,
} from "./LIPBatchProcessor";
export { listModuleFiles, type ModuleFileEntry } from "./ListModuleFiles";
export {
  loadFromCapsuleBuffer,
  type CapsuleResourceEntry,
  type LoadFromCapsuleResult,
} from "./LoadFromCapsule";
export {
  searchReferences,
  searchProjectReferences,
  searchGameReferencesByName,
  flattenResourceNodes,
  countOccurrencesInBuffer,
  countOccurrencesInText,
  findAllReferencesInText,
  getWordAtIndex,
  findResrefReferences,
  findFieldValueReferences,
  findScriptReferences,
  findTagReferences,
  findTemplateResrefReferences,
  findConversationReferences,
  findStrRefReferences,
  createKeyResources,
  type ReferenceScope,
  type ReferenceHit,
  type ReferenceSearchOptions,
} from "./ReferenceFinder";
export type {
  ReferenceFileResource,
  ReferenceSearchResult,
  ReferenceFinderOptions,
  ReferenceFinderResrefOptions,
  TextReferenceMatch,
} from "./ReferenceFinderCore";
