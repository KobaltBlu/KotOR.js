/**
 * Typed accessors for Forge text / NSS editor settings.
 *
 * @file forgeEditorSettings.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ConfigClient } from "@/utility/ConfigClient";

export const FORGE_EDITOR_SETTINGS_KEY = "Forge.editor";
export const FORGE_EDITOR_SETTINGS_CHANGE_EVENT = "forge-editor-settings-change";

export const FORGE_EDITOR_TAB_SIZES = [2, 4, 8] as const;
export const FORGE_EDITOR_FONT_SIZE_MIN = 8;
export const FORGE_EDITOR_FONT_SIZE_MAX = 32;

export type ForgeEditorTabSize = (typeof FORGE_EDITOR_TAB_SIZES)[number];
export type ForgeEditorWordWrap = "off" | "on";
export type ForgeEditorLineNumbers = "on" | "off" | "relative";
export type ForgeEditorRenderWhitespace = "none" | "selection" | "all";

export interface ForgeEditorSettings {
  fontFamily: string;
  fontSize: number;
  fontLigatures: boolean;
  tabSize: ForgeEditorTabSize;
  insertSpaces: boolean;
  wordWrap: ForgeEditorWordWrap;
  minimap: boolean;
  lineNumbers: ForgeEditorLineNumbers;
  renderWhitespace: ForgeEditorRenderWhitespace;
  scrollBeyondLastLine: boolean;
  mouseWheelZoom: boolean;
}

export interface ForgeMonacoEditorOptions {
  fontFamily: string;
  fontSize: number;
  fontLigatures: boolean;
  wordWrap: ForgeEditorWordWrap;
  minimap: { enabled: boolean };
  lineNumbers: ForgeEditorLineNumbers;
  renderWhitespace: ForgeEditorRenderWhitespace;
  scrollBeyondLastLine: boolean;
  mouseWheelZoom: boolean;
}

export interface ForgeMonacoModelOptions {
  tabSize: number;
  insertSpaces: boolean;
  detectIndentation: false;
}

export const DEFAULT_FORGE_EDITOR_SETTINGS: ForgeEditorSettings = {
  fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
  fontSize: 14,
  fontLigatures: false,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: "off",
  minimap: true,
  lineNumbers: "on",
  renderWhitespace: "selection",
  scrollBeyondLastLine: true,
  mouseWheelZoom: false,
};

const WORD_WRAP_VALUES: ForgeEditorWordWrap[] = ["off", "on"];
const LINE_NUMBER_VALUES: ForgeEditorLineNumbers[] = ["on", "off", "relative"];
const RENDER_WHITESPACE_VALUES: ForgeEditorRenderWhitespace[] = ["none", "selection", "all"];

type EditorSettingsListener = (settings: ForgeEditorSettings) => void;

const listeners: EditorSettingsListener[] = [];

function isTabSize(value: unknown): value is ForgeEditorTabSize {
  return value === 2 || value === 4 || value === 8;
}

function sanitizeFontFamily(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_FORGE_EDITOR_SETTINGS.fontFamily;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_FORGE_EDITOR_SETTINGS.fontFamily;
  }
  return trimmed;
}

function sanitizeFontSize(value: unknown): number {
  const size = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(size)) {
    return DEFAULT_FORGE_EDITOR_SETTINGS.fontSize;
  }
  const rounded = Math.round(size);
  if (rounded < FORGE_EDITOR_FONT_SIZE_MIN) {
    return FORGE_EDITOR_FONT_SIZE_MIN;
  }
  if (rounded > FORGE_EDITOR_FONT_SIZE_MAX) {
    return FORGE_EDITOR_FONT_SIZE_MAX;
  }
  return rounded;
}

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

function sanitizeEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  if (typeof value === "string" && allowed.indexOf(value as T) !== -1) {
    return value as T;
  }
  return fallback;
}

export function sanitizeEditorSettings(value: unknown): ForgeEditorSettings {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    fontFamily: sanitizeFontFamily(raw.fontFamily),
    fontSize: sanitizeFontSize(raw.fontSize),
    fontLigatures: sanitizeBoolean(raw.fontLigatures, DEFAULT_FORGE_EDITOR_SETTINGS.fontLigatures),
    tabSize: isTabSize(raw.tabSize) ? raw.tabSize : DEFAULT_FORGE_EDITOR_SETTINGS.tabSize,
    insertSpaces: sanitizeBoolean(raw.insertSpaces, DEFAULT_FORGE_EDITOR_SETTINGS.insertSpaces),
    wordWrap: sanitizeEnum(raw.wordWrap, WORD_WRAP_VALUES, DEFAULT_FORGE_EDITOR_SETTINGS.wordWrap),
    minimap: sanitizeBoolean(raw.minimap, DEFAULT_FORGE_EDITOR_SETTINGS.minimap),
    lineNumbers: sanitizeEnum(raw.lineNumbers, LINE_NUMBER_VALUES, DEFAULT_FORGE_EDITOR_SETTINGS.lineNumbers),
    renderWhitespace: sanitizeEnum(
      raw.renderWhitespace,
      RENDER_WHITESPACE_VALUES,
      DEFAULT_FORGE_EDITOR_SETTINGS.renderWhitespace,
    ),
    scrollBeyondLastLine: sanitizeBoolean(
      raw.scrollBeyondLastLine,
      DEFAULT_FORGE_EDITOR_SETTINGS.scrollBeyondLastLine,
    ),
    mouseWheelZoom: sanitizeBoolean(raw.mouseWheelZoom, DEFAULT_FORGE_EDITOR_SETTINGS.mouseWheelZoom),
  };
}

export function getEditorSettings(): ForgeEditorSettings {
  return sanitizeEditorSettings(ConfigClient.get(FORGE_EDITOR_SETTINGS_KEY));
}

export function setEditorSettings(patch: Partial<ForgeEditorSettings>): ForgeEditorSettings {
  const next = sanitizeEditorSettings({
    ...getEditorSettings(),
    ...patch,
  });
  ConfigClient.set(FORGE_EDITOR_SETTINGS_KEY, next);
  notifyEditorSettingsChange(next);
  return next;
}

export function toMonacoEditorOptions(settings?: ForgeEditorSettings): ForgeMonacoEditorOptions {
  const resolved = settings || getEditorSettings();
  return {
    fontFamily: resolved.fontFamily,
    fontSize: resolved.fontSize,
    fontLigatures: resolved.fontLigatures,
    wordWrap: resolved.wordWrap,
    minimap: { enabled: resolved.minimap },
    lineNumbers: resolved.lineNumbers,
    renderWhitespace: resolved.renderWhitespace,
    scrollBeyondLastLine: resolved.scrollBeyondLastLine,
    mouseWheelZoom: resolved.mouseWheelZoom,
  };
}

export function toMonacoModelOptions(settings?: ForgeEditorSettings): ForgeMonacoModelOptions {
  const resolved = settings || getEditorSettings();
  return {
    tabSize: resolved.tabSize,
    insertSpaces: resolved.insertSpaces,
    detectIndentation: false,
  };
}

export function addForgeEditorSettingsListener(listener: EditorSettingsListener): void {
  if (listeners.indexOf(listener) === -1) {
    listeners.push(listener);
  }
}

export function removeForgeEditorSettingsListener(listener: EditorSettingsListener): void {
  const index = listeners.indexOf(listener);
  if (index >= 0) {
    listeners.splice(index, 1);
  }
}

function notifyEditorSettingsChange(settings: ForgeEditorSettings): void {
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](settings);
  }
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(FORGE_EDITOR_SETTINGS_CHANGE_EVENT, { detail: settings }));
  }
}
