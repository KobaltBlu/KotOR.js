/**
 * Forge data – reference search config, 2DA registry, extract options, wiki mapping, help.
 * Re-exports for convenient imports (e.g. import { getAllSearchableFileTypes, TwoDARegistry } from "@/apps/forge/data").
 */

export {
  SCRIPT_FIELDS,
  TAG_FIELDS,
  TEMPLATE_RESREF_FIELDS,
  CONVERSATION_FIELDS,
  ITEMLIST_FIELDS,
  DLG_SCRIPT_PATHS,
  DLG_CONDITION_PATHS,
  SCRIPT_FIELD_TYPES,
  TAG_FIELD_TYPES,
  TEMPLATE_RESREF_FIELD_TYPES,
  CONVERSATION_FIELD_TYPES,
  ITEMLIST_FIELD_TYPES,
  getScriptFieldsForType,
  getTagFieldsForType,
  getTemplateResrefFieldsForType,
  getConversationFieldsForType,
  getItemListFieldsForType,
  getAllSearchableFileTypes,
} from "@/apps/forge/data/ReferenceSearchConfig";

export {
  TwoDARegistry,
  TWODA_CANONICAL_RESNAMES,
  getTwoDAResname,
  type TwoDARegistryKey,
} from "@/apps/forge/data/TwoDARegistry";

export {
  DEFAULT_EXTRACT_OPTIONS,
  type ExtractOptions,
} from "@/apps/forge/data/ExtractOptions";

export {
  WIKI_BASE_URL,
  EDITOR_WIKI_MAP_BY_TAB,
  EDITOR_WIKI_MAP_BY_EXTENSION,
  getWikiDocForTab,
  getWikiDocUrlForTab,
} from "@/apps/forge/data/EditorWikiMapping";

export {
  HELP_INTRODUCTION,
  HELP_TOOLS,
  HELP_TUTORIALS,
  HELP_FOLDERS,
  getHelpDocUrl,
  type HelpDocument,
  type HelpFolder,
} from "@/apps/forge/data/HelpContents";

export { LIPShapeLabels } from "@/apps/forge/data/LIPShapeLabels";
export { RECENT_FILES_MAX, RECENT_PROJECTS_MAX } from "@/apps/forge/data/ForgeConstants";

export {
  RESOURCE_ICON_BY_EXTENSION,
  RESOURCE_ICON_PATH_PREFIX,
  getResourceIconId,
  getResourceIconPath,
} from "@/apps/forge/data/ForgeResourceIcons";

export * from "@/apps/forge/data/IndoorBuilderConstants";
export * from "@/apps/forge/data/IndoorTypes";
export * from "@/apps/forge/data/IndoorKit";
export * from "@/apps/forge/data/IndoorKitLoader";
export * from "@/apps/forge/data/IndoorKitPreview";
export * from "@/apps/forge/data/IndoorWalkmesh";
export * from "@/apps/forge/data/IndoorMap";
export * from "@/apps/forge/data/IndoorMapTools";
export * from "@/apps/forge/data/IndoorCli";
