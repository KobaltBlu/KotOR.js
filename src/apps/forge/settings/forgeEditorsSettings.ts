/**
 * Per-editor Forge settings bags under Forge.editors.*.
 *
 * @file forgeEditorsSettings.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ConfigClient } from "@/utility/ConfigClient";
import {
  asSettingsRecord,
  createForgeSettingsBag,
  sanitizeBoolean,
  sanitizeEnum,
  sanitizeInteger,
  sanitizeNumber,
} from "@/apps/forge/settings/forgeSettingsStore";
import type { TabAudioVisualId } from "@/apps/forge/components/tabs/tab-audio-player/tabAudioVisualizations";
import { TAB_AUDIO_VISUAL_IDS } from "@/apps/forge/components/tabs/tab-audio-player/tabAudioVisualizations";

export type ViewportLayerKey =
  | "lights"
  | "emitters"
  | "walkmeshes"
  | "trimesh"
  | "skin"
  | "dangly"
  | "saber"
  | "childModels"
  | "layout"
  | "ground";

export type ViewportLayerVisibility = Record<ViewportLayerKey, boolean>;

export const DEFAULT_VIEWPORT_LAYERS: ViewportLayerVisibility = {
  lights: true,
  emitters: true,
  walkmeshes: false,
  trimesh: true,
  skin: true,
  dangly: true,
  saber: true,
  childModels: true,
  layout: true,
  ground: true,
};

export const LIP_EDITOR_FALLBACK_HEAD = "p_bastilah";

export type HexOffsetDisplay = "hex" | "dec";
export type HexBytesPerRow = 8 | 16 | 32;
export type TwoDACellWrap = "clip" | "wrap";
export type DlgGraphLayout = "horizontal" | "vertical";
export type ImageFilterMode = "nearest" | "linear";
export type ImageDefaultZoom = "fit" | "100";

export interface ForgeHexSettings {
  offsetDisplay: HexOffsetDisplay;
  bytesPerRow: HexBytesPerRow;
  showAscii: boolean;
  uppercase: boolean;
}

export interface ForgeGffSettings {
  showType: boolean;
  showPreview: boolean;
  previewMaxLength: number;
}

export interface ForgeTwoDASettings {
  wrapCells: boolean;
  showRowLabel: boolean;
}

export interface ForgeTlkSettings {
  searchResultCap: number;
  autoplayVo: boolean;
}

export interface ForgeSsfSettings {
  autoplayOnSelect: boolean;
}

export interface ForgeViewportSettings {
  layers: ViewportLayerVisibility;
  windPower: 0 | 1 | 2;
  wokWireframe: boolean;
  wokGrid: boolean;
}

export type ModuleHelperType =
  | "creature"
  | "door"
  | "encounter"
  | "placeable"
  | "merchant"
  | "sound"
  | "trigger"
  | "waypoint";

export type ForgeModuleHelperVisibility = Record<ModuleHelperType, boolean>;

export interface ForgeModuleSettings {
  helpers: ForgeModuleHelperVisibility;
}

export interface ForgeBlueprintsSettings {
  show3DPreview: boolean;
  autoExpandLocString: boolean;
}

export interface ForgeDlgSettings {
  graphLayout: DlgGraphLayout;
}

export interface ForgeLipSettings {
  head: string;
}

export interface ForgeImageSettings {
  filter: ImageFilterMode;
  checkerboard: boolean;
  defaultZoom: ImageDefaultZoom;
}

export interface ForgeAudioSettings {
  volume: number;
  loop: boolean;
  visualization: TabAudioVisualId;
}

export interface ForgeGuiSettings {
  zoomStep: number;
  zoomMin: number;
  zoomMax: number;
}

export interface ForgeArchivesSettings {
  confirmExtractOverwrite: boolean;
}

export const DEFAULT_FORGE_HEX_SETTINGS: ForgeHexSettings = {
  offsetDisplay: "hex",
  bytesPerRow: 16,
  showAscii: true,
  uppercase: true,
};

export const DEFAULT_FORGE_GFF_SETTINGS: ForgeGffSettings = {
  showType: true,
  showPreview: true,
  previewMaxLength: 48,
};

export const DEFAULT_FORGE_TWODA_SETTINGS: ForgeTwoDASettings = {
  wrapCells: false,
  showRowLabel: true,
};

export const DEFAULT_FORGE_TLK_SETTINGS: ForgeTlkSettings = {
  searchResultCap: 500,
  autoplayVo: false,
};

export const DEFAULT_FORGE_SSF_SETTINGS: ForgeSsfSettings = {
  autoplayOnSelect: false,
};

export const DEFAULT_FORGE_VIEWPORT_SETTINGS: ForgeViewportSettings = {
  layers: { ...DEFAULT_VIEWPORT_LAYERS },
  windPower: 1,
  wokWireframe: true,
  wokGrid: true,
};

export const MODULE_HELPER_TYPES: ModuleHelperType[] = [
  "creature",
  "door",
  "encounter",
  "placeable",
  "merchant",
  "sound",
  "trigger",
  "waypoint",
];

export const DEFAULT_FORGE_MODULE_SETTINGS: ForgeModuleSettings = {
  helpers: {
    creature: true,
    door: true,
    encounter: true,
    placeable: true,
    merchant: true,
    sound: true,
    trigger: true,
    waypoint: true,
  },
};

export const DEFAULT_FORGE_BLUEPRINTS_SETTINGS: ForgeBlueprintsSettings = {
  show3DPreview: true,
  autoExpandLocString: false,
};

export const DEFAULT_FORGE_DLG_SETTINGS: ForgeDlgSettings = {
  graphLayout: "vertical",
};

export const DEFAULT_FORGE_LIP_SETTINGS: ForgeLipSettings = {
  head: LIP_EDITOR_FALLBACK_HEAD,
};

export const DEFAULT_FORGE_IMAGE_SETTINGS: ForgeImageSettings = {
  filter: "nearest",
  checkerboard: true,
  defaultZoom: "100",
};

export const DEFAULT_FORGE_AUDIO_SETTINGS: ForgeAudioSettings = {
  volume: 0.25,
  loop: false,
  visualization: "spectrum",
};

export const DEFAULT_FORGE_GUI_SETTINGS: ForgeGuiSettings = {
  zoomStep: 0.25,
  zoomMin: 0.1,
  zoomMax: 5,
};

export const DEFAULT_FORGE_ARCHIVES_SETTINGS: ForgeArchivesSettings = {
  confirmExtractOverwrite: true,
};

export const DEFAULT_FORGE_EDITORS = {
  hex: DEFAULT_FORGE_HEX_SETTINGS,
  gff: DEFAULT_FORGE_GFF_SETTINGS,
  twoda: DEFAULT_FORGE_TWODA_SETTINGS,
  tlk: DEFAULT_FORGE_TLK_SETTINGS,
  ssf: DEFAULT_FORGE_SSF_SETTINGS,
  viewport: DEFAULT_FORGE_VIEWPORT_SETTINGS,
  module: DEFAULT_FORGE_MODULE_SETTINGS,
  blueprints: DEFAULT_FORGE_BLUEPRINTS_SETTINGS,
  dlg: DEFAULT_FORGE_DLG_SETTINGS,
  lip: DEFAULT_FORGE_LIP_SETTINGS,
  image: DEFAULT_FORGE_IMAGE_SETTINGS,
  audio: DEFAULT_FORGE_AUDIO_SETTINGS,
  gui: DEFAULT_FORGE_GUI_SETTINGS,
  archives: DEFAULT_FORGE_ARCHIVES_SETTINGS,
};

const HEX_OFFSETS: HexOffsetDisplay[] = ["hex", "dec"];
const HEX_ROWS: HexBytesPerRow[] = [8, 16, 32];
const LAYER_KEYS: ViewportLayerKey[] = [
  "lights",
  "emitters",
  "walkmeshes",
  "trimesh",
  "skin",
  "dangly",
  "saber",
  "childModels",
  "layout",
  "ground",
];

function sanitizeBytesPerRow(value: unknown): HexBytesPerRow {
  const n = typeof value === "number" ? value : Number(value);
  return HEX_ROWS.indexOf(n as HexBytesPerRow) !== -1 ? n as HexBytesPerRow : 16;
}

function sanitizeLayers(value: unknown): ViewportLayerVisibility {
  const raw = asSettingsRecord(value);
  const next = { ...DEFAULT_VIEWPORT_LAYERS };
  for (let i = 0; i < LAYER_KEYS.length; i++) {
    const key = LAYER_KEYS[i];
    next[key] = sanitizeBoolean(raw[key], DEFAULT_VIEWPORT_LAYERS[key]);
  }
  return next;
}

function sanitizeWindPower(value: unknown): 0 | 1 | 2 {
  const n = Math.round(sanitizeNumber(value, 1, 0, 2));
  if (n === 0 || n === 1 || n === 2) {
    return n;
  }
  return 1;
}

function sanitizeHelpers(value: unknown): ForgeModuleHelperVisibility {
  const raw = asSettingsRecord(value);
  const next = { ...DEFAULT_FORGE_MODULE_SETTINGS.helpers };
  for (let i = 0; i < MODULE_HELPER_TYPES.length; i++) {
    const key = MODULE_HELPER_TYPES[i];
    next[key] = sanitizeBoolean(raw[key], DEFAULT_FORGE_MODULE_SETTINGS.helpers[key]);
  }
  return next;
}

function sanitizeHead(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_FORGE_LIP_SETTINGS.head;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed || DEFAULT_FORGE_LIP_SETTINGS.head;
}

export function sanitizeHexSettings(value: unknown): ForgeHexSettings {
  const raw = asSettingsRecord(value);
  return {
    offsetDisplay: sanitizeEnum(raw.offsetDisplay, HEX_OFFSETS, DEFAULT_FORGE_HEX_SETTINGS.offsetDisplay),
    bytesPerRow: sanitizeBytesPerRow(raw.bytesPerRow),
    showAscii: sanitizeBoolean(raw.showAscii, DEFAULT_FORGE_HEX_SETTINGS.showAscii),
    uppercase: sanitizeBoolean(raw.uppercase, DEFAULT_FORGE_HEX_SETTINGS.uppercase),
  };
}

export function sanitizeGffSettings(value: unknown): ForgeGffSettings {
  const raw = asSettingsRecord(value);
  return {
    showType: sanitizeBoolean(raw.showType, DEFAULT_FORGE_GFF_SETTINGS.showType),
    showPreview: sanitizeBoolean(raw.showPreview, DEFAULT_FORGE_GFF_SETTINGS.showPreview),
    previewMaxLength: sanitizeInteger(raw.previewMaxLength, DEFAULT_FORGE_GFF_SETTINGS.previewMaxLength, 8, 200),
  };
}

export function sanitizeTwoDASettings(value: unknown): ForgeTwoDASettings {
  const raw = asSettingsRecord(value);
  return {
    wrapCells: sanitizeBoolean(raw.wrapCells, DEFAULT_FORGE_TWODA_SETTINGS.wrapCells),
    showRowLabel: sanitizeBoolean(raw.showRowLabel, DEFAULT_FORGE_TWODA_SETTINGS.showRowLabel),
  };
}

export function sanitizeTlkSettings(value: unknown): ForgeTlkSettings {
  const raw = asSettingsRecord(value);
  return {
    searchResultCap: sanitizeInteger(raw.searchResultCap, DEFAULT_FORGE_TLK_SETTINGS.searchResultCap, 50, 5000),
    autoplayVo: sanitizeBoolean(raw.autoplayVo, DEFAULT_FORGE_TLK_SETTINGS.autoplayVo),
  };
}

export function sanitizeSsfSettings(value: unknown): ForgeSsfSettings {
  const raw = asSettingsRecord(value);
  return {
    autoplayOnSelect: sanitizeBoolean(raw.autoplayOnSelect, DEFAULT_FORGE_SSF_SETTINGS.autoplayOnSelect),
  };
}

export function sanitizeViewportSettings(value: unknown): ForgeViewportSettings {
  const raw = asSettingsRecord(value);
  return {
    layers: sanitizeLayers(raw.layers),
    windPower: sanitizeWindPower(raw.windPower),
    wokWireframe: sanitizeBoolean(raw.wokWireframe, DEFAULT_FORGE_VIEWPORT_SETTINGS.wokWireframe),
    wokGrid: sanitizeBoolean(raw.wokGrid, DEFAULT_FORGE_VIEWPORT_SETTINGS.wokGrid),
  };
}

export function sanitizeModuleSettings(value: unknown): ForgeModuleSettings {
  const raw = asSettingsRecord(value);
  return {
    helpers: sanitizeHelpers(raw.helpers),
  };
}

export function sanitizeBlueprintsSettings(value: unknown): ForgeBlueprintsSettings {
  const raw = asSettingsRecord(value);
  return {
    show3DPreview: sanitizeBoolean(raw.show3DPreview, DEFAULT_FORGE_BLUEPRINTS_SETTINGS.show3DPreview),
    autoExpandLocString: sanitizeBoolean(
      raw.autoExpandLocString,
      DEFAULT_FORGE_BLUEPRINTS_SETTINGS.autoExpandLocString,
    ),
  };
}

export function sanitizeDlgSettings(value: unknown): ForgeDlgSettings {
  const raw = asSettingsRecord(value);
  return {
    graphLayout: sanitizeEnum(raw.graphLayout, ["horizontal", "vertical"] as const, DEFAULT_FORGE_DLG_SETTINGS.graphLayout),
  };
}

export function sanitizeLipSettings(value: unknown): ForgeLipSettings {
  const raw = asSettingsRecord(value);
  return {
    head: sanitizeHead(raw.head),
  };
}

export function sanitizeImageSettings(value: unknown): ForgeImageSettings {
  const raw = asSettingsRecord(value);
  return {
    filter: sanitizeEnum(raw.filter, ["nearest", "linear"] as const, DEFAULT_FORGE_IMAGE_SETTINGS.filter),
    checkerboard: sanitizeBoolean(raw.checkerboard, DEFAULT_FORGE_IMAGE_SETTINGS.checkerboard),
    defaultZoom: sanitizeEnum(raw.defaultZoom, ["fit", "100"] as const, DEFAULT_FORGE_IMAGE_SETTINGS.defaultZoom),
  };
}

export function sanitizeAudioSettings(value: unknown): ForgeAudioSettings {
  const raw = asSettingsRecord(value);
  return {
    volume: sanitizeNumber(raw.volume, DEFAULT_FORGE_AUDIO_SETTINGS.volume, 0, 1),
    loop: sanitizeBoolean(raw.loop, DEFAULT_FORGE_AUDIO_SETTINGS.loop),
    visualization: sanitizeEnum(raw.visualization, TAB_AUDIO_VISUAL_IDS, DEFAULT_FORGE_AUDIO_SETTINGS.visualization),
  };
}

export function sanitizeGuiSettings(value: unknown): ForgeGuiSettings {
  const raw = asSettingsRecord(value);
  const zoomMin = sanitizeNumber(raw.zoomMin, DEFAULT_FORGE_GUI_SETTINGS.zoomMin, 0.05, 4);
  const zoomMax = sanitizeNumber(raw.zoomMax, DEFAULT_FORGE_GUI_SETTINGS.zoomMax, zoomMin, 16);
  return {
    zoomStep: sanitizeNumber(raw.zoomStep, DEFAULT_FORGE_GUI_SETTINGS.zoomStep, 0.05, 2),
    zoomMin,
    zoomMax,
  };
}

export function sanitizeArchivesSettings(value: unknown): ForgeArchivesSettings {
  const raw = asSettingsRecord(value);
  return {
    confirmExtractOverwrite: sanitizeBoolean(
      raw.confirmExtractOverwrite,
      DEFAULT_FORGE_ARCHIVES_SETTINGS.confirmExtractOverwrite,
    ),
  };
}

export const forgeHexSettings = createForgeSettingsBag({
  key: "Forge.editors.hex",
  eventName: "forge-hex-settings-change",
  defaults: DEFAULT_FORGE_HEX_SETTINGS,
  sanitize: sanitizeHexSettings,
});

export const forgeGffSettings = createForgeSettingsBag({
  key: "Forge.editors.gff",
  eventName: "forge-gff-settings-change",
  defaults: DEFAULT_FORGE_GFF_SETTINGS,
  sanitize: sanitizeGffSettings,
});

export const forgeTwoDASettings = createForgeSettingsBag({
  key: "Forge.editors.twoda",
  eventName: "forge-twoda-settings-change",
  defaults: DEFAULT_FORGE_TWODA_SETTINGS,
  sanitize: sanitizeTwoDASettings,
});

export const forgeTlkSettings = createForgeSettingsBag({
  key: "Forge.editors.tlk",
  eventName: "forge-tlk-settings-change",
  defaults: DEFAULT_FORGE_TLK_SETTINGS,
  sanitize: sanitizeTlkSettings,
});

export const forgeSsfSettings = createForgeSettingsBag({
  key: "Forge.editors.ssf",
  eventName: "forge-ssf-settings-change",
  defaults: DEFAULT_FORGE_SSF_SETTINGS,
  sanitize: sanitizeSsfSettings,
});

export const forgeViewportSettings = createForgeSettingsBag({
  key: "Forge.editors.viewport",
  eventName: "forge-viewport-settings-change",
  defaults: DEFAULT_FORGE_VIEWPORT_SETTINGS,
  sanitize: sanitizeViewportSettings,
});

export const forgeModuleSettings = createForgeSettingsBag({
  key: "Forge.editors.module",
  eventName: "forge-module-settings-change",
  defaults: DEFAULT_FORGE_MODULE_SETTINGS,
  sanitize: sanitizeModuleSettings,
});

export const forgeBlueprintsSettings = createForgeSettingsBag({
  key: "Forge.editors.blueprints",
  eventName: "forge-blueprints-settings-change",
  defaults: DEFAULT_FORGE_BLUEPRINTS_SETTINGS,
  sanitize: sanitizeBlueprintsSettings,
});

export const forgeDlgSettings = createForgeSettingsBag({
  key: "Forge.editors.dlg",
  eventName: "forge-dlg-settings-change",
  defaults: DEFAULT_FORGE_DLG_SETTINGS,
  sanitize: sanitizeDlgSettings,
});

export const forgeLipSettings = createForgeSettingsBag({
  key: "Forge.editors.lip",
  eventName: "forge-lip-settings-change",
  defaults: DEFAULT_FORGE_LIP_SETTINGS,
  sanitize: sanitizeLipSettings,
});

export const forgeImageSettings = createForgeSettingsBag({
  key: "Forge.editors.image",
  eventName: "forge-image-settings-change",
  defaults: DEFAULT_FORGE_IMAGE_SETTINGS,
  sanitize: sanitizeImageSettings,
});

export const forgeAudioSettings = createForgeSettingsBag({
  key: "Forge.editors.audio",
  eventName: "forge-audio-settings-change",
  defaults: DEFAULT_FORGE_AUDIO_SETTINGS,
  sanitize: sanitizeAudioSettings,
});

export const forgeGuiSettings = createForgeSettingsBag({
  key: "Forge.editors.gui",
  eventName: "forge-gui-settings-change",
  defaults: DEFAULT_FORGE_GUI_SETTINGS,
  sanitize: sanitizeGuiSettings,
});

export const forgeArchivesSettings = createForgeSettingsBag({
  key: "Forge.editors.archives",
  eventName: "forge-archives-settings-change",
  defaults: DEFAULT_FORGE_ARCHIVES_SETTINGS,
  sanitize: sanitizeArchivesSettings,
});

export function truncateGffPreview(text: string, maxLength = forgeGffSettings.get().previewMaxLength): string {
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(1, maxLength - 1))}…`;
}

export function resolvePersistedLipHead(
  storedHead: string | undefined,
  localStorageHead: string | undefined,
  fallback = LIP_EDITOR_FALLBACK_HEAD,
): string {
  const fromStore = typeof storedHead === "string" ? storedHead.trim().toLowerCase() : "";
  if (fromStore) {
    return fromStore;
  }
  const fromLocal = typeof localStorageHead === "string" ? localStorageHead.trim().toLowerCase() : "";
  if (fromLocal) {
    return fromLocal;
  }
  return fallback;
}

export function syncModuleHelpersToLegacyConfig(helpers: ForgeModuleHelperVisibility): void {
  const next: Record<string, { visible: boolean }> = {};
  for (let i = 0; i < MODULE_HELPER_TYPES.length; i++) {
    const key = MODULE_HELPER_TYPES[i];
    next[key] = { visible: helpers[key] };
  }
  ConfigClient.set("Editor.Module.Helpers", next);
}

export function setModuleSettings(patch: Partial<ForgeModuleSettings>): ForgeModuleSettings {
  const next = forgeModuleSettings.set(patch);
  syncModuleHelpersToLegacyConfig(next.helpers);
  return next;
}
