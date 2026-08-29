/**
 * Persistent module-editor workspace layout / camera preferences.
 *
 * @file ModuleWorkspaceState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface ModuleWorkspaceLayout {
  eastSize: number;
  westSize: number;
  southSize: number;
  eastOpen: boolean;
  westOpen: boolean;
  southOpen: boolean;
  westPanel: "hierarchy" | "assets";
  southPanel: "problems" | "output";
}

export interface ModuleCameraBookmark {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface ModuleWorkspaceState {
  layout: ModuleWorkspaceLayout;
  bookmarks: ModuleCameraBookmark[];
  lastTool: string;
  transformSpace: "local" | "world";
}

export const DEFAULT_MODULE_WORKSPACE: ModuleWorkspaceState = {
  layout: {
    eastSize: 350,
    westSize: 260,
    southSize: 180,
    eastOpen: true,
    westOpen: true,
    southOpen: true,
    westPanel: "hierarchy",
    southPanel: "problems",
  },
  bookmarks: [],
  lastTool: "select",
  transformSpace: "world",
};

export function sanitizeModuleWorkspace(value: unknown): ModuleWorkspaceState {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const layoutRaw = (raw.layout && typeof raw.layout === "object" ? raw.layout : {}) as Record<string, unknown>;
  const bookmarks = Array.isArray(raw.bookmarks) ? raw.bookmarks : [];
  return {
    layout: {
      eastSize: clampNumber(layoutRaw.eastSize, DEFAULT_MODULE_WORKSPACE.layout.eastSize, 200, 700),
      westSize: clampNumber(layoutRaw.westSize, DEFAULT_MODULE_WORKSPACE.layout.westSize, 180, 500),
      southSize: clampNumber(layoutRaw.southSize, DEFAULT_MODULE_WORKSPACE.layout.southSize, 100, 400),
      eastOpen: layoutRaw.eastOpen !== false,
      westOpen: layoutRaw.westOpen !== false,
      southOpen: layoutRaw.southOpen !== false,
      westPanel: layoutRaw.westPanel === "assets" ? "assets" : "hierarchy",
      southPanel: layoutRaw.southPanel === "output" ? "output" : "problems",
    },
    bookmarks: bookmarks
      .filter((item) => item && typeof item === "object")
      .map((item: any, index: number) => ({
        id: String(item.id || `bookmark-${index}`),
        label: String(item.label || `Bookmark ${index + 1}`),
        position: toVec3(item.position),
        target: toVec3(item.target),
      }))
      .slice(0, 20),
    lastTool: typeof raw.lastTool === "string" ? raw.lastTool : DEFAULT_MODULE_WORKSPACE.lastTool,
    transformSpace: raw.transformSpace === "local" ? "local" : "world",
  };
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toVec3(value: unknown): [number, number, number] {
  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]) || 0, Number(value[1]) || 0, Number(value[2]) || 0];
  }
  return [0, 0, 0];
}
