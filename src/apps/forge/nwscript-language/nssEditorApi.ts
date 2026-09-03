/**
 * Cached translation-unit API model for the Forge NSS editor.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssEditorApi.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import {
  DEFAULT_LANGUAGE_SPEC,
  mergeTranslationUnit,
  parseEngineApi,
  type EngineApiModel,
  type LanguageSpecSource,
} from "./engineApiModel";

export class NssEditorApi {
  private engineSource: LanguageSpecSource = { ...DEFAULT_LANGUAGE_SPEC };
  private engineModel: EngineApiModel | undefined;
  private readonly documentCache = new Map<string, EngineApiModel>();

  setEngineSource(text: string, label = "nwscript.nss", availability = DEFAULT_LANGUAGE_SPEC.availability): void {
    this.engineSource = {
      label,
      availability,
      text: text ?? "",
      resref: "nwscript",
    };
    this.engineModel = undefined;
    this.documentCache.clear();
  }

  invalidate(): void {
    this.documentCache.clear();
  }

  getEngineModel(): EngineApiModel {
    if (!this.engineModel) {
      this.engineModel = parseEngineApi(this.engineSource);
    }
    return this.engineModel;
  }

  getModel(
    documentText: string,
    documentResref: string,
    includes: ReadonlyMap<string, string> | ReadonlyArray<{ resref: string; source: string }>,
    cacheKey?: string,
  ): EngineApiModel {
    const key = cacheKey ?? `${documentResref}|${documentText.length}|${includeKey(includes)}`;
    const cached = this.documentCache.get(key);
    if (cached) {
      return cached;
    }

    const isLanguageSpec = documentResref.toLowerCase() === "nwscript";
    const includeList = Array.isArray(includes)
      ? includes
      : [...includes.entries()].map(([resref, source]) => ({ resref, source }));

    const model = mergeTranslationUnit(
      this.getEngineModel(),
      documentText,
      documentResref,
      isLanguageSpec ? this.engineSource.label : `${documentResref}.nss`,
      includeList,
      isLanguageSpec,
    );
    this.documentCache.set(key, model);
    return model;
  }
}

function includeKey(
  includes: ReadonlyMap<string, string> | ReadonlyArray<{ resref: string; source: string }>,
): string {
  if (Array.isArray(includes)) {
    return includes.map((item) => `${item.resref}:${item.source.length}`).join(",");
  }
  return [...includes.entries()].map(([resref, source]) => `${resref}:${source.length}`).join(",");
}

export const nssEditorApi = new NssEditorApi();
