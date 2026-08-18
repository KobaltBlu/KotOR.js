/**
 * Persist Forge NCS Inspector layout preferences.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ncsInspectorConfig.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ConfigClient } from "@/utility/ConfigClient";

export type NcsInspectorLayoutMode = "split" | "assembly" | "bytecode";

const LAYOUT_KEY = "Editor.NcsInspector.layoutMode";
const FUNCTIONS_KEY = "Editor.NcsInspector.showFunctions";
const DETAILS_KEY = "Editor.NcsInspector.showDetails";
const DRAWER_OPEN_KEY = "Editor.NcsInspector.drawerOpen";
const DRAWER_WIDTH_KEY = "Editor.NcsInspector.drawerWidth";
const EXPERIENCE_VERSION = 2;
const EXPERIENCE_DEFAULTS: Record<string, unknown> = {
  layoutMode: "assembly",
  showFunctions: false,
  showDetails: false,
  drawerOpen: false,
  drawerWidth: 440,
};

function readInspector(): Record<string, unknown> {
  const value = ConfigClient.get("Editor.NcsInspector");
  return value && typeof value === "object" ? { ...value } : {};
}

function notifyInspectorChange(): void {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("forge-ncs-inspector-settings-change"));
  }
}

function writeInspector(patch: Record<string, unknown>): void {
  ConfigClient.set("Editor.NcsInspector", {
    ...(hasCurrentExperience() ? readInspector() : EXPERIENCE_DEFAULTS),
    ...patch,
    experienceVersion: EXPERIENCE_VERSION,
  });
  notifyInspectorChange();
}

function hasCurrentExperience(): boolean {
  return ConfigClient.get("Editor.NcsInspector.experienceVersion") === EXPERIENCE_VERSION;
}

export function getNcsInspectorLayoutMode(): NcsInspectorLayoutMode {
  if (!hasCurrentExperience()) return "assembly";
  const mode = ConfigClient.get(LAYOUT_KEY, "assembly") as string;
  if (mode === "assembly" || mode === "bytecode" || mode === "split") {
    return mode;
  }
  return "split";
}

export function setNcsInspectorLayoutMode(mode: NcsInspectorLayoutMode): void {
  writeInspector({ layoutMode: mode });
}

export function getNcsInspectorShowFunctions(defaultValue = false): boolean {
  if (!hasCurrentExperience()) return false;
  const value = ConfigClient.get(FUNCTIONS_KEY, defaultValue);
  return value !== false;
}

export function setNcsInspectorShowFunctions(show: boolean): void {
  writeInspector({ showFunctions: show });
}

export function getNcsInspectorShowDetails(defaultValue = false): boolean {
  if (!hasCurrentExperience()) return false;
  const value = ConfigClient.get(DETAILS_KEY, defaultValue);
  return value !== false;
}

export function setNcsInspectorShowDetails(show: boolean): void {
  writeInspector({ showDetails: show });
}

export function getNcsInspectorDrawerOpen(defaultValue = false): boolean {
  if (!hasCurrentExperience()) return false;
  const value = ConfigClient.get(DRAWER_OPEN_KEY, defaultValue);
  return value === true;
}

export function setNcsInspectorDrawerOpen(open: boolean): void {
  writeInspector({ drawerOpen: open });
}

export function getNcsInspectorDrawerWidth(defaultValue = 440): number {
  if (!hasCurrentExperience()) return defaultValue;
  const value = Number(ConfigClient.get(DRAWER_WIDTH_KEY, defaultValue));
  return Number.isFinite(value) ? Math.max(320, Math.min(value, 900)) : defaultValue;
}

export function setNcsInspectorDrawerWidth(width: number): void {
  writeInspector({ drawerWidth: Math.max(320, Math.min(Math.round(width), 900)) });
}
