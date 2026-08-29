import React, { useEffect, useState } from "react";
import type { TabModuleEditorState } from "@/apps/forge/states/tabs/TabModuleEditorState";
import type { ValidationIssue, ValidationReport } from "@/apps/forge/module-editor/validation/ModuleValidationTypes";

export interface ModuleProblemsPanelProps {
  tab: TabModuleEditorState;
}

export const ModuleProblemsPanel: React.FC<ModuleProblemsPanelProps> = ({ tab }) => {
  const [report, setReport] = useState<ValidationReport | undefined>(tab.lastValidation);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onDone = (next: ValidationReport) => {
      setReport(next);
      setBusy(false);
    };
    tab.addEventListener("onValidationCompleted", onDone);
    return () => {
      tab.removeEventListener("onValidationCompleted", onDone);
    };
  }, [tab]);

  const onRun = () => {
    setBusy(true);
    void tab.validateModule().finally(() => setBusy(false));
  };

  const onFocusIssue = (issue: ValidationIssue) => {
    if (!issue.objectUuid || !tab.module?.area) {
      return;
    }
    const objects = [
      ...(tab.module.area.creatures || []),
      ...(tab.module.area.doors || []),
      ...(tab.module.area.placeables || []),
      ...(tab.module.area.triggers || []),
      ...(tab.module.area.encounters || []),
      ...(tab.module.area.waypoints || []),
      ...(tab.module.area.sounds || []),
      ...(tab.module.area.stores || []),
      ...(tab.module.area.items || []),
    ];
    const match = objects.find((object: any) =>
      String(object.uuid || object.tag || object.templateResRef) === issue.objectUuid
      || (issue.objectTag && String(object.tag || "").toLowerCase() === issue.objectTag.toLowerCase())
    );
    if (match) {
      tab.selectGameObject(match);
    }
  };

  return (
    <div className="module-problems-panel" role="region" aria-label="Module problems">
      <div className="module-problems-panel__header">
        <strong>Problems</strong>
        <span className="module-problems-panel__counts">
          {report
            ? `${report.errorCount} errors · ${report.warningCount} warnings · ${report.infoCount} info`
            : "Not validated yet"}
        </span>
        <button type="button" className="forge-btn forge-btn--sm forge-btn--primary" disabled={busy} onClick={onRun}>
          {busy ? "Validating…" : "Validate"}
        </button>
      </div>
      {!report || report.issues.length === 0 ? (
        <div className="module-problems-panel__empty">
          {report ? "No issues found." : "Run validation to check ResRefs, tags, scripts, and geometry."}
        </div>
      ) : (
        <ul className="module-problems-panel__list">
          {report.issues.map((issue) => (
            <li key={issue.id}>
              <button
                type="button"
                className={`module-problems-panel__issue module-problems-panel__issue--${issue.severity}`}
                onClick={() => onFocusIssue(issue)}
                title={issue.fixHint || issue.message}
              >
                <span className="module-problems-panel__severity">{issue.severity}</span>
                <span className="module-problems-panel__message">{issue.message}</span>
                {issue.resource || issue.objectTag ? (
                  <span className="module-problems-panel__meta">
                    {issue.resource || issue.objectTag}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
