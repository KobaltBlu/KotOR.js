import { GFFObject } from "../../../resource/GFFObject";
import { GFFField } from "../../../resource/GFFField";
import { GFFStruct } from "../../../resource/GFFStruct";
import { GFFDataType } from "../../../enums/resource/GFFDataType";
import { KEYManager } from "../../../managers/KEYManager";
import { ResourceTypes } from "../../../resource/ResourceTypes";
import { KEYObject } from "../../../resource/KEYObject";
import {
  getScriptFieldsForType,
  getTagFieldsForType,
  getTemplateResrefFieldsForType,
  getConversationFieldsForType,
  SCRIPT_FIELD_TYPES,
  TAG_FIELD_TYPES,
  TEMPLATE_RESREF_FIELD_TYPES,
  CONVERSATION_FIELD_TYPES,
} from "../data/ReferenceSearchConfig";

export interface ReferenceFileResource {
  resRef: string;
  resType: number;
  extension: string;
  containerPath?: string;
  getData(): Promise<Uint8Array>;
}

export interface ReferenceSearchResult {
  fileResource: ReferenceFileResource;
  fieldPath: string;
  matchedValue: string;
  fileType: string;
  byteOffset?: number;
}

export interface ReferenceFinderOptions {
  partialMatch?: boolean;
  caseSensitive?: boolean;
  filePattern?: string | null;
  fileTypes?: Set<string> | null;
  /** When set, called per resource to get field names for that file type. */
  getFieldNamesForResource?: (resource: ReferenceFileResource) => Set<string> | null;
  logger?: (message: string) => void;
}

export interface ReferenceFinderResrefOptions extends ReferenceFinderOptions {
  fieldNames?: Set<string> | null;
  /** When set, used to get field names per file type (e.g. from ReferenceSearchConfig). */
  fieldNamesForType?: (fileType: string) => Set<string> | null;
  fieldTypes?: Set<GFFDataType> | null;
  searchNcs?: boolean;
}

export interface TextReferenceMatch {
  line: number;
  column: number;
  lineText: string;
}

const DEFAULT_STRING_FIELD_TYPES = new Set<GFFDataType>([
  GFFDataType.CEXOSTRING,
  GFFDataType.RESREF,
]);

const DEFAULT_RESREF_FIELD_TYPES = new Set<GFFDataType>([GFFDataType.RESREF]);
const GFF_EXTENSIONS = new Set<string>([
  "ARE",
  "DLG",
  "FAC",
  "GIT",
  "IFO",
  "JRL",
  "UTC",
  "UTD",
  "UTE",
  "UTI",
  "UTM",
  "UTP",
  "UTS",
  "UTT",
  "UTW",
  "GFF",
]);

const gffCache = new Map<string, GFFObject | null>();
const bufferCache = new Map<string, Uint8Array>();
const MAX_CACHE_ENTRIES = 50;
const MAX_GFF_CACHE_BYTES = 1 * 1024 * 1024;

function setCacheValue<T>(cache: Map<string, T>, key: string, value: T): void {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
}

function getResourceCacheKey(resource: ReferenceFileResource): string {
  return `${resource.containerPath ?? ""}::${resource.resRef.toLowerCase()}::${resource.resType}`;
}

async function getResourceBuffer(resource: ReferenceFileResource): Promise<Uint8Array> {
  const key = getResourceCacheKey(resource);
  if (bufferCache.has(key)) {
    return bufferCache.get(key) as Uint8Array;
  }
  const buffer = await resource.getData();
  if (buffer && buffer.length <= 10 * 1024 * 1024) {
    setCacheValue(bufferCache, key, buffer);
  }
  return buffer;
}

export function countOccurrencesInBuffer(
  buffer: Uint8Array,
  needle: Uint8Array
): number {
  if (!buffer?.length || !needle?.length) return 0;
  if (needle.length > buffer.length) return 0;

  let count = 0;
  outer: for (let i = 0; i <= buffer.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (buffer[i + j] !== needle[j]) continue outer;
    }
    count++;
    i += needle.length - 1;
  }
  return count;
}

export function countOccurrencesInText(
  text: string,
  query: string,
  caseSensitive: boolean
): number {
  if (!text || !query) return 0;
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  if (!needle.length) return 0;

  let count = 0;
  let idx = 0;
  while (true) {
    idx = haystack.indexOf(needle, idx);
    if (idx === -1) break;
    count++;
    idx += needle.length;
  }
  return count;
}

export function getWordAtIndex(text: string, index: number): string {
  if (!text || index < 0 || index >= text.length) return "";
  const left = text.slice(0, index + 1);
  const right = text.slice(index);
  const leftMatch = left.match(/[A-Za-z0-9_]+$/);
  const rightMatch = right.match(/^[A-Za-z0-9_]+/);
  const leftPart = leftMatch ? leftMatch[0] : "";
  const rightPart = rightMatch ? rightMatch[0] : "";
  const word = `${leftPart}${rightPart}`;
  return word.trim();
}

export function findAllReferencesInText(text: string, token: string): TextReferenceMatch[] {
  if (!text || !token) return [];
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "g");

  const matches: TextReferenceMatch[] = [];
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      matches.push({
        line: lineIndex + 1,
        column: match.index + 1,
        lineText: line.trim(),
      });
    }
  }
  return matches;
}

function normalizeSearchValue(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLowerCase();
}

function isValueMatch(
  value: string,
  searchValue: string,
  partialMatch: boolean,
  caseSensitive: boolean
): boolean {
  const normalizedValue = normalizeSearchValue(value, caseSensitive);
  const normalizedSearch = normalizeSearchValue(searchValue, caseSensitive);
  if (!normalizedSearch.length) return false;
  if (partialMatch) {
    return normalizedValue.includes(normalizedSearch);
  }
  return normalizedValue === normalizedSearch;
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

function shouldSearchResource(
  resource: ReferenceFileResource,
  filePattern?: string | null,
  fileTypes?: Set<string> | null
): boolean {
  const fileType = resource.extension.toUpperCase();
  if (fileTypes && fileTypes.size > 0 && !fileTypes.has(fileType)) {
    return false;
  }
  if (filePattern) {
    const matcher = globToRegExp(filePattern);
    const target = resource.containerPath || resource.extension;
    if (!matcher.test(target)) {
      return false;
    }
  }
  return true;
}

function getGffFieldValue(field: GFFField): string | null {
  const value = field.getValue();
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  return null;
}

function walkGffStruct(
  struct: GFFStruct,
  onField: (field: GFFField, fieldPath: string) => void,
  pathPrefix: string = ""
): void {
  const fields = struct.getFields?.() || [];
  for (const field of fields) {
    const fieldPath = pathPrefix ? `${pathPrefix}.${field.label}` : field.label;
    onField(field, fieldPath);

    if (field.type === GFFDataType.STRUCT) {
      const child = field.getFieldStruct?.();
      if (child) {
        walkGffStruct(child, onField, fieldPath);
      }
    } else if (field.type === GFFDataType.LIST) {
      const children = field.getChildStructs?.() || [];
      children.forEach((child, index) => {
        walkGffStruct(child, onField, `${fieldPath}[${index}]`);
      });
    }
  }
}

async function searchGffForValue(
  resource: ReferenceFileResource,
  searchValue: string,
  options: Required<Pick<ReferenceFinderOptions, "partialMatch" | "caseSensitive">> & {
    fieldNames?: Set<string> | null;
    fieldTypes: Set<GFFDataType>;
    fileType: string;
    logger?: (message: string) => void;
  }
): Promise<ReferenceSearchResult[]> {
  const buffer = await getResourceBuffer(resource);
  if (!buffer?.length) return [];

  const cacheKey = getResourceCacheKey(resource);
  let gff = gffCache.get(cacheKey);
  if (gff === undefined) {
    try {
      gff = new GFFObject(buffer);
      if (buffer.length <= MAX_GFF_CACHE_BYTES) {
        setCacheValue(gffCache, cacheKey, gff);
      }
    } catch {
      setCacheValue(gffCache, cacheKey, null);
      return [];
    }
  }

  if (!gff || !gff.RootNode) return [];

  const results: ReferenceSearchResult[] = [];
  walkGffStruct(gff.RootNode, (field, fieldPath) => {
    if (options.fieldNames && options.fieldNames.size > 0 && !options.fieldNames.has(field.label)) {
      return;
    }
    if (!options.fieldTypes.has(field.type)) {
      return;
    }
    const value = getGffFieldValue(field);
    if (!value) return;
    if (!isValueMatch(value, searchValue, options.partialMatch, options.caseSensitive)) {
      return;
    }
    if (options.logger) {
      options.logger(`Found ${searchValue} in ${resource.resRef}.${resource.extension} at ${fieldPath}`);
    }
    results.push({
      fileResource: resource,
      fieldPath,
      matchedValue: value,
      fileType: options.fileType,
    });
  });

  return results;
}

function findStringOffsetsInBuffer(
  buffer: Uint8Array,
  searchValue: string,
  caseSensitive: boolean
): number[] {
  if (!buffer?.length || !searchValue?.length) return [];
  const text = new TextDecoder("latin1").decode(buffer);
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? searchValue : searchValue.toLowerCase();
  const offsets: number[] = [];
  let index = 0;
  while (true) {
    index = haystack.indexOf(needle, index);
    if (index === -1) break;
    offsets.push(index);
    index += needle.length;
  }
  return offsets;
}

async function searchNcsForString(
  resource: ReferenceFileResource,
  searchValue: string,
  options: Required<Pick<ReferenceFinderOptions, "partialMatch" | "caseSensitive">> & {
    logger?: (message: string) => void;
  }
): Promise<ReferenceSearchResult[]> {
  const buffer = await getResourceBuffer(resource);
  if (!buffer?.length) return [];

  if (!options.partialMatch) {
    const offsets = findStringOffsetsInBuffer(buffer, searchValue, options.caseSensitive);
    return offsets.map((offset) => ({
      fileResource: resource,
      fieldPath: "(NCS bytecode)",
      matchedValue: searchValue,
      fileType: "NCS",
      byteOffset: offset,
    }));
  }

  const text = new TextDecoder("latin1").decode(buffer);
  const haystack = options.caseSensitive ? text : text.toLowerCase();
  const needle = options.caseSensitive ? searchValue : searchValue.toLowerCase();
  if (!needle.length) return [];

  const offsets = findStringOffsetsInBuffer(buffer, needle, true);
  return offsets.map((offset) => ({
    fileResource: resource,
    fieldPath: "(NCS bytecode)",
    matchedValue: text.substr(offset, needle.length),
    fileType: "NCS",
    byteOffset: offset,
  }));
}

export async function findResrefReferences(
  resources: ReferenceFileResource[],
  resref: string,
  options: ReferenceFinderResrefOptions = {}
): Promise<ReferenceSearchResult[]> {
  const {
    partialMatch = false,
    caseSensitive = false,
    filePattern = null,
    fileTypes = null,
    fieldNames = null,
    fieldNamesForType = null,
    fieldTypes = DEFAULT_RESREF_FIELD_TYPES,
    searchNcs = false,
    logger,
  } = options;

  if (!resref?.trim()) return [];

  const results: ReferenceSearchResult[] = [];
  for (const resource of resources) {
    if (!shouldSearchResource(resource, filePattern, fileTypes)) {
      continue;
    }

    const fileType = resource.extension.toUpperCase();
    if (fileType === "NCS" && searchNcs) {
      results.push(
        ...(await searchNcsForString(resource, resref, {
          partialMatch,
          caseSensitive,
          logger,
        }))
      );
      continue;
    }

    if (fileType === "NCS") {
      continue;
    }

    if (!GFF_EXTENSIONS.has(fileType)) {
      continue;
    }

    const namesForType = fieldNamesForType?.(fileType);
    const effectiveFieldNames =
      namesForType != null && namesForType.size > 0 ? namesForType : fieldNames;

    results.push(
      ...(await searchGffForValue(resource, resref, {
        partialMatch,
        caseSensitive,
        fieldNames: effectiveFieldNames,
        fieldTypes,
        fileType,
        logger,
      }))
    );
  }

  return results;
}

export async function findFieldValueReferences(
  resources: ReferenceFileResource[],
  searchValue: string,
  options: ReferenceFinderOptions & {
    fieldNames?: Set<string> | null;
    fieldTypes?: Set<GFFDataType> | null;
  } = {}
): Promise<ReferenceSearchResult[]> {
  const {
    partialMatch = false,
    caseSensitive = false,
    filePattern = null,
    fileTypes = null,
    fieldNames = null,
    fieldTypes = DEFAULT_STRING_FIELD_TYPES,
    logger,
  } = options;

  if (!searchValue?.trim()) return [];

  const results: ReferenceSearchResult[] = [];
  for (const resource of resources) {
    if (!shouldSearchResource(resource, filePattern, fileTypes)) {
      continue;
    }
    if (resource.extension.toUpperCase() === "NCS") {
      continue;
    }

    if (!GFF_EXTENSIONS.has(resource.extension.toUpperCase())) {
      continue;
    }

    results.push(
      ...(await searchGffForValue(resource, searchValue, {
        partialMatch,
        caseSensitive,
        fieldNames,
        fieldTypes,
        fileType: resource.extension.toUpperCase(),
        logger,
      }))
    );
  }

  return results;
}

export async function findScriptReferences(
  resources: ReferenceFileResource[],
  scriptResref: string,
  options: ReferenceFinderResrefOptions = {}
): Promise<ReferenceSearchResult[]> {
  const useConfig = options.fieldNames === undefined || options.fieldNames === null;
  const scriptFieldTypes = options.fieldTypes ?? SCRIPT_FIELD_TYPES;
  if (!useConfig) {
    return findResrefReferences(resources, scriptResref, {
      ...options,
      fieldTypes: scriptFieldTypes,
      searchNcs: options.searchNcs ?? true,
    });
  }
  const results: ReferenceSearchResult[] = [];
  for (const resource of resources) {
    const fileType = resource.extension.toUpperCase();
    const fieldNames = getScriptFieldsForType(fileType);
    if (fileType === "DLG") {
      results.push(
        ...(await findResrefReferences([resource], scriptResref, {
          ...options,
          fieldNames: fieldNames.size > 0 ? fieldNames : null,
          fieldTypes: scriptFieldTypes,
          searchNcs: options.searchNcs ?? true,
        }))
      );
    } else if (fileType === "NCS" && (options.searchNcs ?? true)) {
      results.push(
        ...(await findResrefReferences([resource], scriptResref, {
          ...options,
          fieldNames: null,
          fieldTypes: scriptFieldTypes,
          searchNcs: true,
        }))
      );
    } else if (fieldNames.size > 0 || fileType === "NCS") {
      results.push(
        ...(await findResrefReferences([resource], scriptResref, {
          ...options,
          fieldNames: fieldNames.size > 0 ? fieldNames : null,
          fieldTypes: scriptFieldTypes,
          searchNcs: options.searchNcs ?? true,
        }))
      );
    }
  }
  return results;
}

export async function findTagReferences(
  resources: ReferenceFileResource[],
  tag: string,
  options: ReferenceFinderOptions & { fieldNamesForType?: (fileType: string) => Set<string> | null } = {}
): Promise<ReferenceSearchResult[]> {
  const fieldNamesForType =
    (options as { fieldNamesForType?: (fileType: string) => Set<string> | null }).fieldNamesForType ?? getTagFieldsForType;
  const results: ReferenceSearchResult[] = [];
  for (const resource of resources) {
    const fileType = resource.extension.toUpperCase();
    const fieldNames = fieldNamesForType(fileType);
    if (fieldNames.size === 0) continue;
    results.push(
      ...(await findFieldValueReferences([resource], tag, {
        ...options,
        fieldNames,
        fieldTypes: TAG_FIELD_TYPES,
      }))
    );
  }
  return results;
}

export async function findTemplateResrefReferences(
  resources: ReferenceFileResource[],
  templateResref: string,
  options: ReferenceFinderResrefOptions = {}
): Promise<ReferenceSearchResult[]> {
  const useConfig = options.fieldNames === undefined || options.fieldNames === null;
  const templateFieldTypes = options.fieldTypes ?? TEMPLATE_RESREF_FIELD_TYPES;
  if (!useConfig) {
    return findResrefReferences(resources, templateResref, {
      ...options,
      fieldTypes: templateFieldTypes,
    });
  }
  const results: ReferenceSearchResult[] = [];
  for (const resource of resources) {
    const fileType = resource.extension.toUpperCase();
    const fieldNames = getTemplateResrefFieldsForType(fileType);
    if (fieldNames.size > 0) {
      results.push(
        ...(await findResrefReferences([resource], templateResref, {
          ...options,
          fieldNames,
          fieldTypes: templateFieldTypes,
        }))
      );
    }
  }
  return results;
}

export async function findConversationReferences(
  resources: ReferenceFileResource[],
  conversationResref: string,
  options: ReferenceFinderResrefOptions = {}
): Promise<ReferenceSearchResult[]> {
  return findResrefReferences(resources, conversationResref, {
    ...options,
    fieldNamesForType: options.fieldNamesForType ?? getConversationFieldsForType,
    fieldTypes: options.fieldTypes ?? CONVERSATION_FIELD_TYPES,
  });
}

export async function findStrRefReferences(
  resources: ReferenceFileResource[],
  strRef: number | string,
  options: ReferenceFinderOptions = {}
): Promise<ReferenceSearchResult[]> {
  const searchValue = typeof strRef === "number" ? strRef.toString() : strRef;
  return findFieldValueReferences(resources, searchValue, {
    ...options,
    fieldTypes: new Set([GFFDataType.STRREF]),
  });
}

export function createKeyResources(): ReferenceFileResource[] {
  const keys = KEYManager.Key?.keys || [];
  const resources: ReferenceFileResource[] = [];
  for (const key of keys) {
    const extension = ResourceTypes.getKeyByValue(key.resType) || "";
    resources.push({
      resRef: key.resRef,
      resType: key.resType,
      extension,
      containerPath:
        key?.resId != null
          ? KEYManager.Key?.bifs?.[KEYObject.getBIFIndex(key.resId)]?.filename
          : undefined,
      getData: async () => KEYManager.Key.getFileBuffer(key),
    });
  }
  return resources;
}
