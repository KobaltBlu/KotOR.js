import React, { useState } from "react";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { TabScriptFindReferencesState, TextReferenceMatch } from "../../../states/tabs/TabScriptFindReferencesState";
import { TabTextEditorState } from "../../../states/tabs/TabTextEditorState";

export const TabScriptFindReferences = function(props: any){
  const tab: TabScriptFindReferencesState = props.tab;
  const parentTab: TabTextEditorState | undefined = props.parentTab;

  const [results, setResults] = useState<TextReferenceMatch[]>([]);

  const onSetResults = (matches: TextReferenceMatch[] = []) => {
    setResults([...(matches || [])]);
  };

  useEffectOnce(() => {
    tab.addEventListener("onSetResults", onSetResults);
    return () => {
      tab.removeEventListener("onSetResults", onSetResults);
    };
  });

  const onResultClick = (match: TextReferenceMatch) => {
    if (parentTab?.editor) {
      parentTab.editor.setPosition({
        lineNumber: Math.max(1, match.line),
        column: Math.max(1, match.column),
      });
      parentTab.editor.revealLineInCenter(match.line);
      parentTab.editor.focus();
    }
  };

  return (
    <div className="tab-pane-content scroll-y error-list">
      <div className="error-list__header">
        <div className="error-list__title">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <span>References</span>
        </div>
        <div className="error-list__counts" aria-live="polite">
          <span className="error-list__pill error-list__pill--info">
            {results.length} Matches
          </span>
        </div>
      </div>

      {!results.length ? (
        <div className="error-list__empty">
          {parentTab
            ? "No references found."
            : "Open a script (File → New → NW Script) and use Find References from the editor to search for symbol usages."}
        </div>
      ) : (
        <div className="error-list__items">
          {results.map((match, index) => (
            <button
              type="button"
              key={`${match.line}-${match.column}-${index}`}
              className="error-list__row error-list__row--info"
              onClick={() => onResultClick(match)}
              title={`Go to line ${match.line}, column ${match.column}`}
            >
              <span className="error-list__icon" aria-hidden="true">
                <i className="fa-solid fa-location-crosshairs"></i>
              </span>
              <span className="error-list__body">
                <span className="error-list__message">Line {match.line}, Col {match.column}</span>
                <span className="error-list__meta">
                  <span className="error-list__meta-item error-list__location">{match.lineText}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
