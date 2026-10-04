/**
 * Re-exports shared runtime snapshot helpers.
 * Scene Overview map/inspector code imports from here; Module Inspector uses `@/inspect/runtimeSnapshots` directly.
 */
export {
  collectOverviewEntries,
  computeOverviewBounds,
  DEFAULT_KIND_FILTERS,
  dumpLiveGff,
  flattenGffFromRoot,
  flattenGffTemplate,
  getObjectKind,
  INSPECTOR_DEFAULT_OPEN,
  kindTypeName,
  objectListToMapPins,
  overviewEntryToMapPin,
  OVERVIEW_KIND_COLORS,
  OVERVIEW_KIND_LABELS,
  OVERVIEW_PC_COLOR,
  OVERVIEW_PARTY_RING,
  snapshotGlobals,
  snapshotLiveObject,
  snapshotModuleAreaInfo,
  snapshotObjectList,
} from "@apps/game/KotOR";

export type {
  GffTreeNode,
  GlobalsSnapshotEntry,
  GlobalsSnapshotValue,
  InspectorRow,
  InspectorSection,
  LiveObjectSnapshot,
  ModuleAreaSnapshot,
  ObjectListEntry,
  OverviewBounds,
  OverviewEntry,
  OverviewObjectKind,
  SceneMapPin,
  SnapshotObjectListOptions,
} from "@apps/game/KotOR";
