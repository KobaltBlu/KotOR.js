/**
 * Typed accessors for Forge application settings.
 *
 * @file forgeSettings.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ConfigClient } from "@/utility/ConfigClient";

export type DefaultEditorKind = "native" | "gff" | "hex" | "text";

export const FORGE_DEFAULT_EDITORS_KEY = "Forge.defaultEditors";

export const DEFAULT_EDITOR_LABELS: Record<DefaultEditorKind, string> = {
  native: "Native editor",
  gff: "GFF editor",
  hex: "Hex editor",
  text: "Text editor",
};

const EDITOR_KINDS: DefaultEditorKind[] = ["native", "gff", "hex", "text"];

export function isDefaultEditorKind(value: unknown): value is DefaultEditorKind {
  return typeof value === "string" && EDITOR_KINDS.indexOf(value as DefaultEditorKind) !== -1;
}

export function resolveDefaultEditorKind(ext: string, configured: unknown): DefaultEditorKind {
  const key = (ext || "").toLowerCase();
  if (!key) {
    return "native";
  }
  let kind: unknown = configured;
  if (kind && typeof kind === "object" && !Array.isArray(kind)) {
    kind = (kind as Record<string, unknown>)[key];
  }
  if (isDefaultEditorKind(kind)) {
    return kind;
  }
  return "native";
}

function readDefaultEditors(): Record<string, DefaultEditorKind> {
  const value = ConfigClient.get(FORGE_DEFAULT_EDITORS_KEY);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, DefaultEditorKind>) };
}

export function getDefaultEditor(ext: string): DefaultEditorKind {
  return resolveDefaultEditorKind(ext, readDefaultEditors());
}

export function setDefaultEditor(ext: string, kind: DefaultEditorKind): void {
  const key = (ext || "").toLowerCase();
  if (!key) {
    return;
  }
  const map = readDefaultEditors();
  if (kind === "native") {
    delete map[key];
  } else if (isDefaultEditorKind(kind)) {
    map[key] = kind;
  }
  ConfigClient.set(FORGE_DEFAULT_EDITORS_KEY, map);
}
