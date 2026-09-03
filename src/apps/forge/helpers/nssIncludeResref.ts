/**
 * Normalize and collect NWScript #include resrefs.
 *
 * @file nssIncludeResref.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

const NSS_INCLUDE_RE = /#include\s*"?([\w.]+)"?/gi;

/** `#include "k_inc_generic.nss"` → `k_inc_generic`. */
export function normalizeNssIncludeResref(raw: string): string {
  let value = String(raw || "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value.replace(/\.nss$/i, "").trim().toLowerCase();
}

export function collectNssIncludeResrefs(source: string): string[] {
  const seen = new Set<string>();
  const refs: string[] = [];
  const matches = String(source || "").matchAll(NSS_INCLUDE_RE);
  for (const match of matches) {
    const resref = normalizeNssIncludeResref(match[1] || "");
    if (!resref || seen.has(resref)) continue;
    seen.add(resref);
    refs.push(resref);
  }
  return refs;
}
