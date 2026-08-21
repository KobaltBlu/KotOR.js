import { TLKString } from "@/resource/TLKString";
import { TLKObject } from "@/resource/TLKObject";
import { GameFileSystem } from "@/utility/GameFileSystem";

export interface TLKSearchOptions {
  /** Case-insensitive text matching. Default: `true`. */
  caseInsensitive?: boolean;
  /** Stop after collecting this many results. Omit for no limit. */
  limit?: number;
  /** Also match against the SoundResRef field. Default: `false`. */
  includeResRef?: boolean;
}

export interface TLKSearchResult {
  index: number;
  text: string;
}

/**
 * Search a talk-table string array.
 *
 * - Numeric-only query returns the entry at that string ID directly.
 * - Otherwise performs a linear text scan with optional case folding and limit.
 * - Uses cached lowercase haystacks on each {@link TLKString} to avoid per-scan
 *   `getDisplayText()` regex / `toLowerCase()` allocations.
 */
export function searchTLKStrings(
  strings: TLKString[],
  query: string,
  options: TLKSearchOptions = {},
): TLKSearchResult[] {
  const {
    caseInsensitive = true,
    limit,
    includeResRef = false,
  } = options;

  const trimmed = query.trim();
  if (!trimmed) return [];

  if (/^\d+$/.test(trimmed)) {
    const id = parseInt(trimmed, 10);
    const entry = strings[id];
    if (entry) {
      return [{ index: id, text: entry.getDisplayText() }];
    }
    return [];
  }

  const needle = caseInsensitive ? trimmed.toLowerCase() : trimmed;
  const results: TLKSearchResult[] = [];

  for (let i = 0, len = strings.length; i < len; i++) {
    const entry = strings[i];
    const haystack = caseInsensitive ? entry.getSearchTextLower() : entry.getSearchText();
    let matched = haystack.indexOf(needle) >= 0;

    if (!matched && includeResRef) {
      const resRef = caseInsensitive ? entry.getSearchResRefLower() : entry.getSearchResRef();
      matched = resRef.length > 0 && resRef.indexOf(needle) >= 0;
    }

    if (matched) {
      results.push({ index: i, text: entry.getDisplayText() });
      if (limit !== undefined && results.length >= limit) break;
    }
  }

  return results;
}

/**
 * TLKManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TLKManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TLKManager {

  static TLKStrings: TLKString[] = [];
  static TLKObject: TLKObject;

  static async LoadTalkTable(): Promise<TLKObject> {
    const buffer = await GameFileSystem.readFile('dialog.tlk');
    TLKManager.TLKObject = new TLKObject();
    TLKManager.TLKObject.loadFromBuffer(buffer);
    TLKManager.TLKStrings = TLKManager.TLKObject.TLKStrings;
    return TLKManager.TLKObject;
  }

  static GetStringById(index: number = 0): TLKString {
    return TLKManager.TLKStrings[index];
  }

  /**
   * Search the talk table.
   *
   * - If `query` is a non-negative integer string (e.g. "12345"), returns the
   *   entry at that string ID directly — no text scan needed.
   * - Otherwise performs a linear text scan with optional case folding and a
   *   `limit` that causes early exit once enough matches are collected.
   *
   * @param query      Search term or string ID.
   * @param options    Search options (see TLKSearchOptions).
   */
  static Search(query: string, options: TLKSearchOptions = {}): TLKSearchResult[] {
    return searchTLKStrings(TLKManager.TLKStrings, query, options);
  }

}
