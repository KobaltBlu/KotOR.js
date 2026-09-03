/**
 * Selection announcements and reduced-motion helpers for module workbench a11y.
 *
 * @file moduleEditorA11y.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function describeSelection(
  count: number,
  primaryLabel?: string,
): string {
  if (count <= 0) {
    return "Nothing selected";
  }
  if (count === 1) {
    return `Selected ${primaryLabel || "1 object"}`;
  }
  return `Selected ${count} objects${primaryLabel ? `, primary ${primaryLabel}` : ""}`;
}
