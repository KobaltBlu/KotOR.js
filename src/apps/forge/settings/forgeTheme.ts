/**
 * Forge color themes: built-in palettes, resolve, and live CSS apply.
 *
 * @file forgeTheme.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GameEngineType } from "@/enums/engine";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { ConfigClient } from "@/utility/ConfigClient";

type ForgeKotORRuntime = {
  ApplicationProfile?: typeof ApplicationProfile;
  ConfigClient?: typeof ConfigClient;
};

function forgeKotORRuntime(): ForgeKotORRuntime | undefined {
  if (typeof globalThis === "undefined") {
    return undefined;
  }
  return (globalThis as { KotOR?: ForgeKotORRuntime }).KotOR;
}

/** Prefer the webpack-external KotOR singleton; Forge bundles a second copy of these modules. */
function activeApplicationProfile(): typeof ApplicationProfile {
  return forgeKotORRuntime()?.ApplicationProfile || ApplicationProfile;
}

function activeConfigClient(): typeof ConfigClient {
  return forgeKotORRuntime()?.ConfigClient || ConfigClient;
}

export type ForgeColorScheme = "dark" | "light";
export type ForgeGameThemeKey = "KOTOR" | "TSL";
export type ForgeThemeId = string;

export const FORGE_THEME_COLOR_KEYS = [
  "bg",
  "bg-elevated",
  "bg-panel",
  "bg-input",
  "bg-hover",
  "bg-active",
  "bg-overlay",
  "text",
  "text-muted",
  "text-bright",
  "text-disabled",
  "border",
  "border-subtle",
  "accent",
  "accent-hover",
  "accent-muted",
  "danger",
  "danger-hover",
  "success",
] as const;

export type ForgeThemeColorKey = typeof FORGE_THEME_COLOR_KEYS[number];
export type ForgeThemeColors = Record<ForgeThemeColorKey, string>;

export type ForgeThemeColorGroup = "Background" | "Text" | "Borders" | "Accent" | "Status";

export interface ForgeThemeTokenMeta {
  key: ForgeThemeColorKey;
  group: ForgeThemeColorGroup;
  label: string;
  description: string;
}

export interface ForgeThemeDefinition {
  id: ForgeThemeId;
  name: string;
  type: ForgeColorScheme;
  builtIn: boolean;
  parentId?: string;
  colors: ForgeThemeColors;
}

export interface ForgeThemeByGame {
  KOTOR: ForgeThemeId;
  TSL: ForgeThemeId;
}

export interface ResolvedForgeTheme {
  id: ForgeThemeId;
  name: string;
  type: ForgeColorScheme;
  builtIn: boolean;
  parentId?: string;
  colors: ForgeThemeColors;
}

export interface ForgeThemeFile {
  schema: "kotor.js.forge-theme";
  schemaVersion: number;
  id?: string;
  name: string;
  type: ForgeColorScheme;
  parentId?: string;
  colors: ForgeThemeColors;
}

export const FORGE_THEME_BY_GAME_KEY = "Forge.themeByGame";
export const FORGE_USER_THEMES_KEY = "Forge.userThemes";
export const FORGE_THEME_CUSTOMIZATIONS_KEY = "Forge.themeCustomizations";
export const FORGE_THEME_MIGRATED_KEY = "Forge.themeMigrated";
export const FORGE_THEME_CHANGE_EVENT = "forge-theme-change";
export const FORGE_THEME_FILE_SCHEMA = "kotor.js.forge-theme";
export const FORGE_THEME_FILE_VERSION = 1;

export const DEFAULT_THEME_BY_GAME: ForgeThemeByGame = {
  KOTOR: "kotor-dark",
  TSL: "tsl-dark",
};

export const FORGE_THEME_TOKENS: ForgeThemeTokenMeta[] = [
  { key: "bg", group: "Background", label: "Workbench", description: "Main editor background" },
  { key: "bg-elevated", group: "Background", label: "Elevated", description: "Cards, menus, and raised surfaces" },
  { key: "bg-panel", group: "Background", label: "Panel", description: "Nested lists and secondary panels" },
  { key: "bg-input", group: "Background", label: "Input", description: "Text fields and selects" },
  { key: "bg-hover", group: "Background", label: "Hover", description: "Row and control hover fill" },
  { key: "bg-active", group: "Background", label: "Active", description: "Pressed and selected chrome" },
  { key: "bg-overlay", group: "Background", label: "Overlay", description: "Modal and drag-drop dimmer" },
  { key: "text", group: "Text", label: "Foreground", description: "Default text" },
  { key: "text-muted", group: "Text", label: "Muted", description: "Secondary labels and placeholders" },
  { key: "text-bright", group: "Text", label: "Bright", description: "Headings and emphasis" },
  { key: "text-disabled", group: "Text", label: "Disabled", description: "Inactive controls" },
  { key: "border", group: "Borders", label: "Border", description: "Default strokes" },
  { key: "border-subtle", group: "Borders", label: "Subtle border", description: "Dividers and inset edges" },
  { key: "accent", group: "Accent", label: "Accent", description: "Links, focus, and selected chrome" },
  { key: "accent-hover", group: "Accent", label: "Accent hover", description: "Accent on hover" },
  { key: "accent-muted", group: "Accent", label: "Accent muted", description: "Selection wash and highlights" },
  { key: "danger", group: "Status", label: "Danger", description: "Destructive actions" },
  { key: "danger-hover", group: "Status", label: "Danger hover", description: "Destructive hover" },
  { key: "success", group: "Status", label: "Success", description: "Positive status" },
];

const DARK_SURFACES: Omit<ForgeThemeColors, "accent" | "accent-hover" | "accent-muted"> = {
  bg: "#1c1c1c",
  "bg-elevated": "#252525",
  "bg-panel": "#2d2d2d",
  "bg-input": "#222222",
  "bg-hover": "#333333",
  "bg-active": "#3a3a3a",
  "bg-overlay": "rgba(0, 0, 0, 0.55)",
  text: "#d4d4d4",
  "text-muted": "#9a9a9a",
  "text-bright": "#f2f2f2",
  "text-disabled": "#6a6a6a",
  border: "#3a3a3a",
  "border-subtle": "#2a2a2a",
  danger: "#c75050",
  "danger-hover": "#d96a6a",
  success: "#3d9a55",
};

const LIGHT_SURFACES: Omit<ForgeThemeColors, "accent" | "accent-hover" | "accent-muted"> = {
  bg: "#f3f3f3",
  "bg-elevated": "#ffffff",
  "bg-panel": "#ececec",
  "bg-input": "#ffffff",
  "bg-hover": "#e8e8e8",
  "bg-active": "#dddddd",
  "bg-overlay": "rgba(0, 0, 0, 0.35)",
  text: "#333333",
  "text-muted": "#6a6a6a",
  "text-bright": "#1a1a1a",
  "text-disabled": "#9a9a9a",
  border: "#d4d4d4",
  "border-subtle": "#e4e4e4",
  danger: "#c75050",
  "danger-hover": "#a33d3d",
  success: "#2e7d3a",
};

const ACCENT_NEUTRAL = {
  accent: "#007acc",
  "accent-hover": "#1c8adb",
  "accent-muted": "rgba(0, 122, 204, 0.22)",
};

const ACCENT_KOTOR = {
  accent: "#3a8fd4",
  "accent-hover": "#4ea3e8",
  "accent-muted": "rgba(58, 143, 212, 0.22)",
};

const ACCENT_TSL = {
  accent: "rgb(26, 178, 140)",
  "accent-hover": "rgb(45, 200, 160)",
  "accent-muted": "rgba(26, 178, 140, 0.22)",
};

function palette(
  id: ForgeThemeId,
  name: string,
  type: ForgeColorScheme,
  surfaces: Omit<ForgeThemeColors, "accent" | "accent-hover" | "accent-muted">,
  accent: Pick<ForgeThemeColors, "accent" | "accent-hover" | "accent-muted">,
): ForgeThemeDefinition {
  return {
    id,
    name,
    type,
    builtIn: true,
    colors: { ...surfaces, ...accent },
  };
}

export const BUILTIN_FORGE_THEMES: ForgeThemeDefinition[] = [
  palette("dark", "Dark", "dark", DARK_SURFACES, ACCENT_NEUTRAL),
  palette("light", "Light", "light", LIGHT_SURFACES, ACCENT_NEUTRAL),
  palette("kotor-dark", "KotOR Dark", "dark", DARK_SURFACES, ACCENT_KOTOR),
  palette("kotor-light", "KotOR Light", "light", LIGHT_SURFACES, ACCENT_KOTOR),
  palette("tsl-dark", "TSL Dark", "dark", DARK_SURFACES, ACCENT_TSL),
  palette("tsl-light", "TSL Light", "light", LIGHT_SURFACES, ACCENT_TSL),
];

const BUILTIN_BY_ID: Record<string, ForgeThemeDefinition> = {};
for (let i = 0; i < BUILTIN_FORGE_THEMES.length; i++) {
  const theme = BUILTIN_FORGE_THEMES[i];
  BUILTIN_BY_ID[theme.id] = theme;
}

type ThemeChangeListener = (theme: ResolvedForgeTheme) => void;
const themeListeners: ThemeChangeListener[] = [];
let appliedColorScheme: ForgeColorScheme = "dark";
let appliedThemeId: ForgeThemeId = DEFAULT_THEME_BY_GAME.KOTOR;

function cloneColors(colors: ForgeThemeColors): ForgeThemeColors {
  const out = {} as ForgeThemeColors;
  for (let i = 0; i < FORGE_THEME_COLOR_KEYS.length; i++) {
    const key = FORGE_THEME_COLOR_KEYS[i];
    out[key] = colors[key];
  }
  return out;
}

function isThemeId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isColorScheme(value: unknown): value is ForgeColorScheme {
  return value === "dark" || value === "light";
}

function isGameThemeKey(value: unknown): value is ForgeGameThemeKey {
  return value === "KOTOR" || value === "TSL";
}

export function forgeCssVar(key: ForgeThemeColorKey): string {
  return `--forge-${key}`;
}

export function isForgeThemeColorKey(value: unknown): value is ForgeThemeColorKey {
  return typeof value === "string" && FORGE_THEME_COLOR_KEYS.indexOf(value as ForgeThemeColorKey) !== -1;
}

export function readUserThemes(): ForgeThemeDefinition[] {
  const value = activeConfigClient().get(FORGE_USER_THEMES_KEY);
  if (!Array.isArray(value)) {
    return [];
  }
  const out: ForgeThemeDefinition[] = [];
  for (let i = 0; i < value.length; i++) {
    const entry = parseUserTheme(value[i]);
    if (entry) {
      out.push(entry);
    }
  }
  return out;
}

function parseUserTheme(value: unknown): ForgeThemeDefinition | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (!isThemeId(raw.id) || typeof raw.name !== "string" || !isColorScheme(raw.type)) {
    return null;
  }
  const parent = BUILTIN_BY_ID[String(raw.parentId || "")] || BUILTIN_BY_ID.dark;
  const colors = cloneColors(parent.colors);
  if (raw.colors && typeof raw.colors === "object" && !Array.isArray(raw.colors)) {
    const overlay = raw.colors as Record<string, unknown>;
    for (let i = 0; i < FORGE_THEME_COLOR_KEYS.length; i++) {
      const key = FORGE_THEME_COLOR_KEYS[i];
      if (typeof overlay[key] === "string" && overlay[key]) {
        colors[key] = overlay[key] as string;
      }
    }
  }
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    builtIn: false,
    parentId: typeof raw.parentId === "string" ? raw.parentId : parent.id,
    colors,
  };
}

export function listForgeThemes(): ForgeThemeDefinition[] {
  return BUILTIN_FORGE_THEMES.concat(readUserThemes());
}

export function getForgeThemeDefinition(id: ForgeThemeId): ForgeThemeDefinition {
  const builtIn = BUILTIN_BY_ID[id];
  if (builtIn) {
    return builtIn;
  }
  const userThemes = readUserThemes();
  for (let i = 0; i < userThemes.length; i++) {
    if (userThemes[i].id === id) {
      return userThemes[i];
    }
  }
  return BUILTIN_BY_ID[DEFAULT_THEME_BY_GAME.KOTOR];
}

export function readThemeCustomizations(): Record<string, Partial<ForgeThemeColors>> {
  const value = activeConfigClient().get(FORGE_THEME_CUSTOMIZATIONS_KEY);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, Partial<ForgeThemeColors>> = {};
  const ids = Object.keys(value as Record<string, unknown>);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const raw = (value as Record<string, unknown>)[id];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      continue;
    }
    const overlay: Partial<ForgeThemeColors> = {};
    const source = raw as Record<string, unknown>;
    for (let j = 0; j < FORGE_THEME_COLOR_KEYS.length; j++) {
      const key = FORGE_THEME_COLOR_KEYS[j];
      if (typeof source[key] === "string" && source[key]) {
        overlay[key] = source[key] as string;
      }
    }
    out[id] = overlay;
  }
  return out;
}

export function mergeThemeColors(
  base: ForgeThemeColors,
  overlay?: Partial<ForgeThemeColors> | null,
): ForgeThemeColors {
  const colors = cloneColors(base);
  if (!overlay) {
    return colors;
  }
  for (let i = 0; i < FORGE_THEME_COLOR_KEYS.length; i++) {
    const key = FORGE_THEME_COLOR_KEYS[i];
    if (typeof overlay[key] === "string" && overlay[key]) {
      colors[key] = overlay[key] as string;
    }
  }
  return colors;
}

export function resolveForgeTheme(id?: ForgeThemeId): ResolvedForgeTheme {
  const definition = getForgeThemeDefinition(id || getThemeIdForGame());
  const overlay = readThemeCustomizations()[definition.id];
  return {
    id: definition.id,
    name: definition.name,
    type: definition.type,
    builtIn: definition.builtIn,
    parentId: definition.parentId,
    colors: mergeThemeColors(definition.colors, overlay),
  };
}

export function migrateLegacyForgeAccent(forge: Record<string, any> | null | undefined): ForgeThemeByGame {
  const current = readThemeByGameFrom(forge);
  if (forge && forge.themeMigrated) {
    return current;
  }
  const accent = forge && forge.accent;
  if (accent === "kotor") {
    return { KOTOR: "kotor-dark", TSL: "kotor-dark" };
  }
  if (accent === "tsl") {
    return { KOTOR: "tsl-dark", TSL: "tsl-dark" };
  }
  return current;
}

function roundTripThemes(entries: ForgeThemeDefinition[]): Array<Record<string, unknown>> {
  return entries.map((theme) => ({
    id: theme.id,
    name: theme.name,
    type: theme.type,
    parentId: theme.parentId,
    colors: cloneColors(theme.colors),
  }));
}

export function ensureForgeThemeConfig(): ForgeThemeByGame {
  const forge = (activeConfigClient().get("Forge") as Record<string, any>) || {};
  if (forge.themeMigrated) {
    return readThemeByGameFrom(forge);
  }
  const mapped = migrateLegacyForgeAccent(forge);
  activeConfigClient().set(FORGE_THEME_BY_GAME_KEY, mapped);
  activeConfigClient().set(FORGE_THEME_MIGRATED_KEY, true);
  return mapped;
}

function readThemeByGameFrom(forge: Record<string, any> | null | undefined): ForgeThemeByGame {
  const raw = forge && forge.themeByGame;
  const kotor = raw && isThemeId(raw.KOTOR) ? raw.KOTOR : DEFAULT_THEME_BY_GAME.KOTOR;
  const tsl = raw && isThemeId(raw.TSL) ? raw.TSL : DEFAULT_THEME_BY_GAME.TSL;
  return { KOTOR: kotor, TSL: tsl };
}

export function getThemeByGame(): ForgeThemeByGame {
  return readThemeByGameFrom(activeConfigClient().get("Forge") as Record<string, any>);
}

export function gameKeyToThemeSlot(gameKey?: GameEngineType | string): ForgeGameThemeKey {
  const profile = activeApplicationProfile();
  const raw = gameKey ?? profile.GameKey ?? profile.key;
  if (raw === GameEngineType.TSL) {
    return "TSL";
  }
  if (raw === GameEngineType.KOTOR) {
    return "KOTOR";
  }
  return profile.resolveGameKey({ key: String(raw ?? "") }) === GameEngineType.TSL ? "TSL" : "KOTOR";
}

export function getThemeIdForGame(gameKey?: GameEngineType | string): ForgeThemeId {
  const map = getThemeByGame();
  return map[gameKeyToThemeSlot(gameKey)];
}

export function setThemeForGame(gameKey: ForgeGameThemeKey | GameEngineType | string, themeId: ForgeThemeId, apply = true): void {
  const slot = gameKeyToThemeSlot(gameKey);
  const next = { ...getThemeByGame(), [slot]: themeId };
  activeConfigClient().set(FORGE_THEME_BY_GAME_KEY, next);
  if (apply && !designerPreviewActive && slot === gameKeyToThemeSlot()) {
    applyForgeTheme(themeId);
  }
}

let designerPreviewActive = false;
let designerPreviewThemeId: ForgeThemeId | null = null;

export function isForgeThemeDesignerPreviewActive(): boolean {
  return designerPreviewActive;
}

export function getForgeThemeDesignerPreviewId(): ForgeThemeId | null {
  return designerPreviewThemeId;
}

export function beginForgeThemeDesignerPreview(themeId?: ForgeThemeId): ForgeThemeId {
  designerPreviewActive = true;
  designerPreviewThemeId = themeId || getThemeIdForGame();
  applyForgeTheme(designerPreviewThemeId);
  return designerPreviewThemeId;
}

export function setForgeThemeDesignerPreview(themeId: ForgeThemeId): void {
  designerPreviewActive = true;
  designerPreviewThemeId = themeId;
  applyForgeTheme(themeId);
}

export function endForgeThemeDesignerPreview(): void {
  const wasActive = designerPreviewActive;
  designerPreviewActive = false;
  designerPreviewThemeId = null;
  if (wasActive) {
    applyForgeTheme(getThemeIdForGame());
  }
}

function shouldLiveApplyTheme(themeId: ForgeThemeId): boolean {
  if (designerPreviewActive) {
    return themeId === designerPreviewThemeId;
  }
  return themeId === getThemeIdForGame();
}

export function getForgeColorScheme(): ForgeColorScheme {
  if (typeof document !== "undefined" && document.documentElement) {
    const value = document.documentElement.getAttribute("data-forge-color-scheme");
    if (value === "light" || value === "dark") {
      return value;
    }
  }
  return appliedColorScheme;
}

export function getAppliedForgeThemeId(): ForgeThemeId {
  return appliedThemeId;
}

export function getMonacoThemeForLanguage(languageId: string): string {
  const light = getForgeColorScheme() === "light";
  switch (languageId) {
    case "lyt":
      return light ? "lyt-light" : "lyt-dark";
    case "txi":
      return light ? "txi-light" : "txi-dark";
    case "nwscript":
      return light ? "nwscript-light" : "nwscript-dark";
    default:
      return light ? "vs" : "vs-dark";
  }
}

export function addForgeThemeChangeListener(listener: ThemeChangeListener): void {
  if (themeListeners.indexOf(listener) === -1) {
    themeListeners.push(listener);
  }
}

export function removeForgeThemeChangeListener(listener: ThemeChangeListener): void {
  const index = themeListeners.indexOf(listener);
  if (index >= 0) {
    themeListeners.splice(index, 1);
  }
}

function notifyThemeChange(theme: ResolvedForgeTheme): void {
  for (let i = 0; i < themeListeners.length; i++) {
    themeListeners[i](theme);
  }
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(FORGE_THEME_CHANGE_EVENT, { detail: theme }));
  }
}

export function applyForgeTheme(themeId?: ForgeThemeId): ResolvedForgeTheme {
  ensureForgeThemeConfig();
  const resolved = resolveForgeTheme(themeId || getThemeIdForGame());
  appliedThemeId = resolved.id;
  appliedColorScheme = resolved.type;

  if (typeof document === "undefined" || !document.documentElement) {
    notifyThemeChange(resolved);
    return resolved;
  }

  const root = document.documentElement;
  root.setAttribute("data-forge-theme", resolved.id);
  root.setAttribute("data-forge-color-scheme", resolved.type);
  root.removeAttribute("data-forge-accent");
  root.style.colorScheme = resolved.type;

  for (let i = 0; i < FORGE_THEME_COLOR_KEYS.length; i++) {
    const key = FORGE_THEME_COLOR_KEYS[i];
    root.style.setProperty(forgeCssVar(key), resolved.colors[key]);
  }
  root.style.setProperty("--forge-focus-ring", "0 0 0 1px var(--forge-accent)");
  root.style.setProperty(
    "--forge-shadow-menu",
    resolved.type === "light" ? "0 4px 12px rgba(0, 0, 0, 0.18)" : "0 4px 12px rgba(0, 0, 0, 0.45)",
  );

  notifyThemeChange(resolved);
  return resolved;
}

export function setThemeColor(themeId: ForgeThemeId, key: ForgeThemeColorKey, value: string): void {
  const customizations = readThemeCustomizations();
  const overlay = { ...(customizations[themeId] || {}), [key]: value };
  customizations[themeId] = overlay;
  activeConfigClient().set(FORGE_THEME_CUSTOMIZATIONS_KEY, customizations);
  if (shouldLiveApplyTheme(themeId)) {
    applyForgeTheme(themeId);
  }
}

export function resetThemeColor(themeId: ForgeThemeId, key: ForgeThemeColorKey): void {
  const customizations = readThemeCustomizations();
  const overlay = { ...(customizations[themeId] || {}) };
  delete overlay[key];
  if (Object.keys(overlay).length) {
    customizations[themeId] = overlay;
  } else {
    delete customizations[themeId];
  }
  activeConfigClient().set(FORGE_THEME_CUSTOMIZATIONS_KEY, customizations);
  if (shouldLiveApplyTheme(themeId)) {
    applyForgeTheme(themeId);
  }
}

export function resetThemeCustomizations(themeId: ForgeThemeId): void {
  const definition = getForgeThemeDefinition(themeId);
  const customizations = readThemeCustomizations();
  delete customizations[themeId];
  activeConfigClient().set(FORGE_THEME_CUSTOMIZATIONS_KEY, customizations);

  if (!definition.builtIn && definition.parentId) {
    const parent = getForgeThemeDefinition(definition.parentId);
    const userThemes = readUserThemes();
    for (let i = 0; i < userThemes.length; i++) {
      if (userThemes[i].id === themeId) {
        userThemes[i].colors = cloneColors(parent.colors);
        userThemes[i].type = parent.type;
      }
    }
    activeConfigClient().set(FORGE_USER_THEMES_KEY, roundTripThemes(userThemes));
  }

  if (shouldLiveApplyTheme(themeId)) {
    applyForgeTheme(themeId);
  }
}

export function duplicateForgeTheme(sourceId: ForgeThemeId, name?: string): ForgeThemeDefinition {
  const source = resolveForgeTheme(sourceId);
  const id = `user-${Date.now()}`;
  const entry: ForgeThemeDefinition = {
    id,
    name: name && name.trim() ? name.trim() : `${source.name} copy`,
    type: source.type,
    builtIn: false,
    parentId: source.builtIn ? source.id : (source.parentId || source.id),
    colors: cloneColors(source.colors),
  };
  const userThemes = readUserThemes();
  userThemes.push(entry);
  activeConfigClient().set(FORGE_USER_THEMES_KEY, roundTripThemes(userThemes));
  return entry;
}

export function canUninstallForgeTheme(themeId: ForgeThemeId): boolean {
  if (BUILTIN_BY_ID[themeId]) {
    return false;
  }
  const userThemes = readUserThemes();
  for (let i = 0; i < userThemes.length; i++) {
    if (userThemes[i].id === themeId) {
      return true;
    }
  }
  return false;
}

export function uninstallForgeTheme(themeId: ForgeThemeId): ForgeThemeId {
  if (BUILTIN_BY_ID[themeId]) {
    throw new Error("Built-in themes cannot be uninstalled.");
  }
  const userThemes = readUserThemes();
  const remaining: ForgeThemeDefinition[] = [];
  let found = false;
  for (let i = 0; i < userThemes.length; i++) {
    if (userThemes[i].id === themeId) {
      found = true;
      continue;
    }
    remaining.push(userThemes[i]);
  }
  if (!found) {
    throw new Error("This color theme is not installed.");
  }
  activeConfigClient().set(FORGE_USER_THEMES_KEY, roundTripThemes(remaining));

  const customizations = readThemeCustomizations();
  if (customizations[themeId]) {
    delete customizations[themeId];
    activeConfigClient().set(FORGE_THEME_CUSTOMIZATIONS_KEY, customizations);
  }

  const byGame = getThemeByGame();
  const remapped: ForgeThemeByGame = { ...byGame };
  if (remapped.KOTOR === themeId) {
    remapped.KOTOR = DEFAULT_THEME_BY_GAME.KOTOR;
  }
  if (remapped.TSL === themeId) {
    remapped.TSL = DEFAULT_THEME_BY_GAME.TSL;
  }
  if (remapped.KOTOR !== byGame.KOTOR || remapped.TSL !== byGame.TSL) {
    activeConfigClient().set(FORGE_THEME_BY_GAME_KEY, remapped);
  }

  const nextId = getThemeIdForGame();
  if (designerPreviewActive) {
    if (designerPreviewThemeId === themeId) {
      designerPreviewThemeId = nextId;
    }
    applyForgeTheme(designerPreviewThemeId || nextId);
  } else if (appliedThemeId === themeId) {
    applyForgeTheme(nextId);
  }
  return nextId;
}

export function colorToPickerValue(value: string): string {
  const hex = rgbToHex(value);
  return hex || "#808080";
}

function rgbToHex(value: string): string | null {
  const trimmed = (value || "").trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (hex) {
    if (hex[1].length === 3) {
      const a = hex[1][0];
      const b = hex[1][1];
      const c = hex[1][2];
      return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
    }
    return `#${hex[1]}`.toLowerCase();
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(trimmed);
  if (!rgb) {
    return null;
  }
  const r = clampByte(Number(rgb[1]));
  const g = clampByte(Number(rgb[2]));
  const b = clampByte(Number(rgb[3]));
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHexByte(value: number): string {
  const hex = value.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

export function slugifyThemeName(name: string): string {
  const slug = (name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "theme";
}

export function forgeThemeFileName(name: string): string {
  return `${slugifyThemeName(name)}.forge-theme.json`;
}

/**
 * File System Access picker extensions may only be "." plus A–Z / 0–9.
 * Keep suggesting `*.forge-theme.json`; the dialog matches on the trailing `.json`.
 */
const FORGE_THEME_FILE_PICKER_TYPES = [{
  description: "Forge Color Theme",
  accept: { "application/json": [".json"] },
}];

export function serializeForgeThemeFile(theme: ResolvedForgeTheme | ForgeThemeDefinition): ForgeThemeFile {
  return {
    schema: FORGE_THEME_FILE_SCHEMA,
    schemaVersion: FORGE_THEME_FILE_VERSION,
    id: theme.id,
    name: theme.name,
    type: theme.type,
    parentId: theme.parentId,
    colors: cloneColors(theme.colors),
  };
}

export function parseForgeThemeFile(value: unknown): ForgeThemeFile {
  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      throw new Error("Theme file is not valid JSON.");
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Theme file must be a JSON object.");
  }
  const source = raw as Record<string, unknown>;
  if (typeof source.schema === "string" && source.schema !== FORGE_THEME_FILE_SCHEMA) {
    throw new Error("This file is not a Forge color theme.");
  }
  if (typeof source.name !== "string" || !source.name.trim()) {
    throw new Error("Theme file is missing a name.");
  }
  if (!isColorScheme(source.type)) {
    throw new Error("Theme file type must be dark or light.");
  }
  const parent = BUILTIN_BY_ID[String(source.parentId || "")]
    || (source.type === "light" ? BUILTIN_BY_ID.light : BUILTIN_BY_ID.dark);
  const colors = cloneColors(parent.colors);
  const incoming = source.colors && typeof source.colors === "object" && !Array.isArray(source.colors)
    ? source.colors as Record<string, unknown>
    : {};
  let hasColor = false;
  for (let i = 0; i < FORGE_THEME_COLOR_KEYS.length; i++) {
    const key = FORGE_THEME_COLOR_KEYS[i];
    if (typeof incoming[key] === "string" && incoming[key]) {
      colors[key] = incoming[key] as string;
      hasColor = true;
    }
  }
  if (!hasColor) {
    throw new Error("Theme file has no color tokens.");
  }
  return {
    schema: FORGE_THEME_FILE_SCHEMA,
    schemaVersion: typeof source.schemaVersion === "number" ? source.schemaVersion : FORGE_THEME_FILE_VERSION,
    id: isThemeId(source.id) ? source.id : undefined,
    name: source.name.trim(),
    type: source.type,
    parentId: typeof source.parentId === "string" ? source.parentId : parent.id,
    colors,
  };
}

function uniqueUserThemeId(preferred: string): string {
  const used = new Set(listForgeThemes().map((theme) => theme.id));
  if (preferred && !BUILTIN_BY_ID[preferred] && !used.has(preferred)) {
    return preferred;
  }
  const base = slugifyThemeName(preferred || "theme");
  let id = `user-${base}`;
  let index = 2;
  while (used.has(id) || BUILTIN_BY_ID[id]) {
    id = `user-${base}-${index}`;
    index += 1;
  }
  return id;
}

export function installForgeTheme(file: ForgeThemeFile | string, apply = true): ForgeThemeDefinition {
  const parsed = parseForgeThemeFile(file);
  const existingUsers = readUserThemes();
  const preferredRaw = parsed.id || `user-${slugifyThemeName(parsed.name)}`;
  const preferred = /^[A-Za-z0-9._-]+$/.test(preferredRaw)
    ? preferredRaw
    : `user-${slugifyThemeName(preferredRaw)}`;
  const existingIndex = existingUsers.findIndex((theme) => theme.id === preferred);
  const canReplace = existingIndex >= 0 && !BUILTIN_BY_ID[preferred];
  const id = canReplace ? preferred : uniqueUserThemeId(preferred);
  const entry: ForgeThemeDefinition = {
    id,
    name: parsed.name,
    type: parsed.type,
    builtIn: false,
    parentId: parsed.parentId,
    colors: cloneColors(parsed.colors),
  };
  if (canReplace) {
    existingUsers[existingIndex] = entry;
  } else {
    existingUsers.push(entry);
  }
  activeConfigClient().set(FORGE_USER_THEMES_KEY, roundTripThemes(existingUsers));
  if (apply) {
    setThemeForGame(gameKeyToThemeSlot(), id, true);
  }
  return entry;
}

export async function exportForgeThemeToFile(themeId?: ForgeThemeId): Promise<boolean> {
  const theme = resolveForgeTheme(themeId);
  const payload = `${JSON.stringify(serializeForgeThemeFile(theme), null, 2)}\n`;
  const suggestedName = forgeThemeFileName(theme.name);
  const bytes = new TextEncoder().encode(payload);
  try {
    if (typeof window !== "undefined" && typeof window.showSaveFilePicker === "function") {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: FORGE_THEME_FILE_PICKER_TYPES,
      });
      const writable = await handle.createWritable();
      await writable.write(bytes);
      await writable.close();
      return true;
    }
    if (typeof document === "undefined") {
      return false;
    }
    const blob = new Blob([bytes], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = suggestedName;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      return false;
    }
    throw error;
  }
}

export async function installForgeThemeFromFile(apply = true): Promise<ForgeThemeDefinition | null> {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    let text = "";
    if (typeof window.showOpenFilePicker !== "function") {
      text = await pickThemeFileFallback();
      if (!text) {
        return null;
      }
      return installForgeTheme(text, apply);
    }
    const handles = await window.showOpenFilePicker({
      multiple: false,
      types: FORGE_THEME_FILE_PICKER_TYPES,
    });
    const handle = handles && handles[0];
    if (!handle) {
      return null;
    }
    const file = await handle.getFile();
    text = await file.text();
    return installForgeTheme(text, apply);
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      return null;
    }
    throw error;
  }
}

function pickThemeFileFallback(): Promise<string> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) {
        resolve("");
        return;
      }
      file.text().then(resolve).catch(() => resolve(""));
    };
    input.click();
  });
}
