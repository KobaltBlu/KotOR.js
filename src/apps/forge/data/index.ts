/**
 * Forge data – reference search config, 2DA registry, extract options, wiki mapping, help.
 * Re-exports for convenient imports (e.g. import { getAllSearchableFileTypes, TwoDARegistry } from "../data").
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
} from "./ReferenceSearchConfig";

export {
  TwoDARegistry,
  TWODA_CANONICAL_RESNAMES,
  getTwoDAResname,
  type TwoDARegistryKey,
} from "./TwoDARegistry";

export {
  DEFAULT_EXTRACT_OPTIONS,
  type ExtractOptions,
} from "./ExtractOptions";

export {
  WIKI_BASE_URL,
  EDITOR_WIKI_MAP_BY_TAB,
  EDITOR_WIKI_MAP_BY_EXTENSION,
  getWikiDocForTab,
  getWikiDocUrlForTab,
} from "./EditorWikiMapping";

export {
  HELP_INTRODUCTION,
  HELP_TOOLS,
  HELP_TUTORIALS,
  HELP_FOLDERS,
  getHelpDocUrl,
  type HelpDocument,
  type HelpFolder,
} from "./HelpContents";

export { LIPShapeLabels } from "./LIPShapeLabels";
export { RECENT_FILES_MAX, RECENT_PROJECTS_MAX } from "./ForgeConstants";
