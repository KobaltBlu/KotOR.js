/**
 * Forge helpers – re-exports for convenient imports.
 */

export { stripJsonComments } from "@/apps/forge/helpers/JsonUtils";
export { pathParse, type ParsedPath } from "@/apps/forge/helpers/PathParse";
export { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
export { sanitizeResRef, clampByte, clampWord, createNumberFieldHandler } from "@/apps/forge/helpers/UTxEditorHelpers";
export {
  createEmptyErfHeader,
  createEmptyModHeader,
  cloneModuleFromBuffer,
  type CloneModuleOptions,
} from "@/apps/forge/helpers/CloneModule";
export { extractErfToFolder, type ExtractErfToFolderOptions } from "@/apps/forge/helpers/ExtractErfToFolder";
export { saveResourceToOverride, type SaveToOverrideOptions } from "@/apps/forge/helpers/SaveToOverride";
export { buildRimBuffer, saveResourceToRim, type SaveToRimOptions } from "@/apps/forge/helpers/SaveToRim";
export { humanReadableSize, getNums, clamp } from "@/apps/forge/helpers/FormatUtils";
export {
  isModFile,
  isErfFile,
  isSavFile,
  isAnyErfTypeFile,
  isRimFile,
  isCapsuleFile,
} from "@/apps/forge/helpers/CapsuleUtils";
export { addResourceToErf, type AddResourceToErfOptions } from "@/apps/forge/helpers/AddResourceToErf";
export { compileNssToNcs, decompileNcsToNss, type ScriptCompileResult } from "@/apps/forge/helpers/ScriptCompiler";
export {
  processAudioToLIP,
  getAudioDuration,
  createLIPFromDuration,
  type LIPBatchProcessorOptions,
  type LIPBatchProcessorResult,
} from "@/apps/forge/helpers/LIPBatchProcessor";
export { listModuleFiles, type ModuleFileEntry } from "@/apps/forge/helpers/ListModuleFiles";
export {
  loadFromCapsuleBuffer,
  type CapsuleResourceEntry,
  type LoadFromCapsuleResult,
} from "@/apps/forge/helpers/LoadFromCapsule";
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
} from "@/apps/forge/helpers/ReferenceFinder";
export type {
  ReferenceFileResource,
  ReferenceSearchResult,
  ReferenceFinderOptions,
  ReferenceFinderResrefOptions,
  TextReferenceMatch,
} from "@/apps/forge/helpers/ReferenceFinderCore";
