/**
 * Forge host implementation for NSS language providers.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssForgeHost.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { loadNssSourceBuffer, resolveIncludesForNss } from "@/apps/forge/helpers/ForgeNWScriptCompile";
import { normalizeNssIncludeResref } from "@/apps/forge/helpers/nssIncludeResref";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ResourceTypes } from "@/resource/ResourceTypes";
import type * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import type { NssEditorTabLike, NssLanguageHost, ProjectNssFile } from "./nssLanguageHost";

function isNssTab(tab: any): tab is NssEditorTabLike {
  return !!tab && typeof tab.show === "function" && tab.resolvedIncludes instanceof Map;
}

export function createForgeNssLanguageHost(): NssLanguageHost {
  return {
    getEngineTypes: () => ForgeState.nwScriptParser?.engine_types ?? [],

    findTabForModel: (model: monacoEditor.editor.ITextModel) => {
      return (ForgeState.tabManager?.tabs || []).find((tab: any) => {
        return isNssTab(tab) && tab.editor?.getModel() === model;
      }) as NssEditorTabLike | undefined;
    },

    listNssTabs: () => {
      return (ForgeState.tabManager?.tabs || []).filter(isNssTab);
    },

    listProjectNss: async () => {
      const files: ProjectNssFile[] = [];
      if (!ProjectFileSystem.hasRoot()) {
        return files;
      }
      let entries: string[] = [];
      try {
        entries = await ProjectFileSystem.readdir("", { recursive: true });
      } catch {
        return files;
      }
      const decoder = new TextDecoder();
      for (const entry of entries) {
        if (!entry.toLowerCase().endsWith(".nss")) continue;
        try {
          const buffer = await ProjectFileSystem.readFile(entry);
          const posix = entry.replace(/\\/g, "/");
          const base = posix.split("/").pop() || entry;
          files.push({
            path: entry,
            resref: base.replace(/\.nss$/i, ""),
            text: decoder.decode(buffer),
          });
        } catch {
          // skip unreadable project files
        }
      }
      return files;
    },

    openNss: (resref: string, buffer?: Uint8Array) => {
      FileTypeManager.onOpenFile({
        resref: normalizeNssIncludeResref(resref) || resref,
        reskey: ResourceTypes.nss,
        buffer,
      });
    },

    getNwscriptBuffer: () => ForgeState.nwscript_nss,

    loadNssBuffer: async (resref: string) => {
      try {
        return await loadNssSourceBuffer(resref);
      } catch {
        return undefined;
      }
    },

    writeProjectFile: async (path: string, text: string) => {
      try {
        return await ProjectFileSystem.writeFile(path, new TextEncoder().encode(text));
      } catch {
        return false;
      }
    },

    resolveIncludes: async (text: string) => {
      try {
        return await resolveIncludesForNss(text);
      } catch {
        return new Map<string, string>();
      }
    },
  };
}
