/**
 * LocString helpers for the DLG editor (no NWScript loads).
 *
 * @file dlgLocString.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { CExoLocString } from "@/resource/CExoLocString";
import { CExoLocSubString } from "@/resource/CExoLocSubString";
import type { ForgeDLG } from "@/apps/forge/dlg/ForgeDLG";
import { getLocalizationSettings, pickLocStringOverride } from "@/apps/forge/settings/forgeLocalizationSettings";

export type DlgTlkLookup = (strRef: number) => string | undefined;

type ForgeTlkRuntime = {
  TLKManager?: {
    TLKStrings?: Array<{ Value?: string; getDisplayText?: () => string }>;
  };
};

function forgeKotORTlk(): ForgeTlkRuntime | undefined {
  if (typeof globalThis === "undefined") {
    return undefined;
  }
  return (globalThis as { KotOR?: ForgeTlkRuntime }).KotOR;
}

/** Live talk table from the webpack-external KotOR singleton (not a bundled copy). */
export function forgeTlkLookup(strRef: number): string | undefined {
  if (!(strRef >= 0)) {
    return undefined;
  }
  const entry = forgeKotORTlk()?.TLKManager?.TLKStrings?.[strRef];
  if (!entry) {
    return undefined;
  }
  if (typeof entry.getDisplayText === "function") {
    const display = entry.getDisplayText();
    if (display) {
      return display;
    }
  }
  const value = entry.Value;
  return value ? String(value) : undefined;
}

export function cloneLocString(src?: CExoLocString): CExoLocString {
  const out = new CExoLocString(src?.RESREF ?? -1);
  const strings = src?.getStrings() ?? [];
  for (let i = 0; i < strings.length; i++) {
    const sub = strings[i];
    out.addSubString(new CExoLocSubString(sub.GetStringID(), sub.str), i);
  }
  return out;
}

/** Embedded substring or a StrRef placeholder. Safe in tests (no TLK). */
export function locStringPreview(text?: CExoLocString): string {
  if (!text) {
    return "";
  }
  const override = pickLocStringOverride(text);
  if (override) {
    return override;
  }
  if (typeof text.RESREF === "number" && text.RESREF > -1) {
    return `{StrRef ${text.RESREF}}`;
  }
  return "";
}

/** Prefer embedded override, then a talk-table lookup, then a StrRef placeholder. */
export function resolveDlgLineText(
  text?: CExoLocString,
  lookup: DlgTlkLookup = forgeTlkLookup,
): string {
  if (!text) {
    return "";
  }
  const override = pickLocStringOverride(text);
  if (override) {
    return override;
  }
  if (typeof text.RESREF === "number" && text.RESREF > -1) {
    if (!getLocalizationSettings().previewStrRefFromTlk) {
      return `{StrRef ${text.RESREF}}`;
    }
    return lookup(text.RESREF) || `{StrRef ${text.RESREF}}`;
  }
  return "";
}

export function locStringIsEmpty(text?: CExoLocString): boolean {
  return locStringPreview(text).trim().length === 0;
}

export function formatDlgNodeLine(
  node: ForgeDLGNode | undefined,
  texts?: ReadonlyMap<string, string>,
): string {
  if (!node) {
    return "";
  }
  const cached = texts?.get(node.id);
  if (cached !== undefined) {
    return cached;
  }
  return resolveDlgLineText(node.text);
}

/** Resolve every node line once (open / mutate / undo) so the graph does not hit TLK per card. */
export function prefetchDlgNodeTexts(
  dlg: ForgeDLG,
  lookup: DlgTlkLookup = forgeTlkLookup,
): Map<string, string> {
  const texts = new Map<string, string>();
  const nodes = dlg.allNodes();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    texts.set(node.id, resolveDlgLineText(node.text, lookup));
  }
  return texts;
}
