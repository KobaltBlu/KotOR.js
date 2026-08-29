/**
 * Module / project validation types.
 *
 * @file ModuleValidationTypes.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationCategory =
  | "resref"
  | "tag"
  | "template"
  | "dlg"
  | "jrl"
  | "tlk"
  | "script"
  | "geometry"
  | "lyt"
  | "vis"
  | "pth"
  | "wok"
  | "export"
  | "other";

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  resource?: string;
  field?: string;
  objectUuid?: string;
  objectTag?: string;
  fixHint?: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  ranAt: number;
  durationMs: number;
}

export function emptyValidationReport(durationMs = 0): ValidationReport {
  return {
    issues: [],
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    ranAt: Date.now(),
    durationMs,
  };
}

export function summarizeIssues(issues: ValidationIssue[], durationMs: number): ValidationReport {
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  for (const issue of issues) {
    if (issue.severity === "error") errorCount += 1;
    else if (issue.severity === "warning") warningCount += 1;
    else infoCount += 1;
  }
  return {
    issues,
    errorCount,
    warningCount,
    infoCount,
    ranAt: Date.now(),
    durationMs,
  };
}
