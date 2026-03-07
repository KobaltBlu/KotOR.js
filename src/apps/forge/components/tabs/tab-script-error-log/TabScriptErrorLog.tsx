import React, { useMemo, useState } from "react"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import { useEffectOnce } from "../../../helpers/UseEffectOnce"
import { TabScriptErrorLogState, TabTextEditorState } from "../../../states/tabs";

export const TabScriptErrorLog = function(props: any){
  const tab: TabScriptErrorLogState = props.tab;
  const parentTab: TabTextEditorState = props.parentTab;

  const [errors, setErrors] = useState<monacoEditor.editor.IMarkerData[]>([]);

  const onSetErrors = (markers: monacoEditor.editor.IMarkerData[] = []) => {
    setErrors([...(markers || [])]);
  }

  useEffectOnce( () => { //constructor
    tab.addEventListener('onSetErrors', onSetErrors);
    return () => { //deconstructor
      tab.removeEventListener('onSetErrors', onSetErrors);
    };
  });

  const onErrorClick = (error: monacoEditor.editor.IMarkerData) => {
    const lineNumber = Math.max(1, error.startLineNumber || 1);
    const column = Math.max(1, error.startColumn || 1);
    if(parentTab.editor){
      parentTab.editor.setPosition({
        lineNumber,
        column
      });
      parentTab.editor.revealLineInCenter(lineNumber);
      parentTab.editor.focus();
    }
  }

  const severityConfig: Record<number, { label: string, icon: string, className: string }> = {
    [monacoEditor.MarkerSeverity.Error]:   { label: 'Error',   icon: 'fa-circle-xmark',        className: 'error' },
    [monacoEditor.MarkerSeverity.Warning]: { label: 'Warning', icon: 'fa-triangle-exclamation', className: 'warning' },
    [monacoEditor.MarkerSeverity.Info]:    { label: 'Info',    icon: 'fa-circle-info',         className: 'info' },
    [monacoEditor.MarkerSeverity.Hint]:    { label: 'Hint',    icon: 'fa-lightbulb',           className: 'hint' }
  };

  const errorCounts = useMemo(() => {
    return errors.reduce((acc, marker) => {
      if(marker.severity === monacoEditor.MarkerSeverity.Error) acc.errors += 1;
      else if(marker.severity === monacoEditor.MarkerSeverity.Warning) acc.warnings += 1;
      else if(marker.severity === monacoEditor.MarkerSeverity.Hint) acc.hints += 1;
      else acc.info += 1;
      return acc;
    }, { errors: 0, warnings: 0, info: 0, hints: 0 });
  }, [errors]);

  const getSeverityMeta = (severity?: number) => {
    return severityConfig[severity || monacoEditor.MarkerSeverity.Info] || severityConfig[monacoEditor.MarkerSeverity.Info];
  };

  const getCode = (code: monacoEditor.editor.IMarkerData['code']) => {
    if(!code) return '';
    if(typeof code === 'object'){
      return `${code.value ?? ''}`;
    }
    return `${code}`;
  };

  return (
    <div className="tab-pane-content scroll-y error-list">
      <div className="error-list__header">
        <div className="error-list__title">
          <i className="fa-regular fa-rectangle-list" aria-hidden="true"></i>
          <span>Problems</span>
        </div>
        <div className="error-list__counts" aria-live="polite">
          <span className="error-list__pill error-list__pill--error">
            <i className="fa-solid fa-circle-xmark" aria-hidden="true"></i>
            {errorCounts.errors} Errors
          </span>
          <span className="error-list__pill error-list__pill--warning">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            {errorCounts.warnings} Warnings
          </span>
          <span className="error-list__pill error-list__pill--info">
            <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
            {errorCounts.info + errorCounts.hints} Info
          </span>
        </div>
      </div>

      {
        !errors.length ? (
          <div className="error-list__empty">No problems have been detected.</div>
        ) : (
          <div className="error-list__items">
      {
        errors.map( (error, index) => {
          const severity = getSeverityMeta(error.severity);
          const code = getCode(error.code);
          return (
            <button
              type="button"
              key={`${error.startLineNumber}-${error.startColumn}-${index}`}
              className={`error-list__row error-list__row--${severity.className}`}
              onClick={() => {onErrorClick(error)}}
              title={`Go to line ${error.startLineNumber || 0}, column ${error.startColumn || 0}`}
            >
              <span className="error-list__icon" aria-hidden="true">
                <i className={`fa-solid ${severity.icon}`}></i>
              </span>
              <span className="error-list__body">
                <span className="error-list__message">{error.message}</span>
                <span className="error-list__meta">
                  <span className="error-list__meta-item error-list__severity">{severity.label}</span>
                  <span className="error-list__meta-item error-list__location">Ln {error.startLineNumber || 0}, Col {error.startColumn || 0}</span>
                  { code ? <span className="error-list__meta-item error-list__code">{code}</span> : null }
                  { error.source ? <span className="error-list__meta-item error-list__source">{error.source}</span> : null }
                </span>
              </span>
            </button>
          )
        })
      }
          </div>
        )
      }
    </div>
  )
}

