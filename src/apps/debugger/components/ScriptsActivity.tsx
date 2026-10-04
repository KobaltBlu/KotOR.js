import React from "react";
import { ScriptBrowserWindow } from "@apps/debugger/components/ScriptBrowserWindow";
import { ScriptInstanceWindow } from "@apps/debugger/components/ScriptInstanceWindow";
import { ScriptDebugSouthPane } from "@apps/debugger/components/ScriptDebugSouthPane";
import { useApp } from "@apps/debugger/context/AppContext";

export const ScriptsActivity: React.FC = () => {
  const { scriptOwnerFilter, stateRef, navigateHelper } = useApp();
  const filterActive = !!scriptOwnerFilter;
  const resourceError = scriptOwnerFilter?.resourceError;

  const bannerText = scriptOwnerFilter
    ? [
        scriptOwnerFilter.label || 'object',
        scriptOwnerFilter.tag ? `tag ${scriptOwnerFilter.tag}` : '',
        scriptOwnerFilter.objectId >= 0 ? `id ${scriptOwnerFilter.objectId}` : '',
        scriptOwnerFilter.scriptKey ? `slot ${scriptOwnerFilter.scriptKey}` : '',
        scriptOwnerFilter.resref ? `script ${scriptOwnerFilter.resref}` : '',
      ].filter(Boolean).join(' · ')
    : '';

  const showObject = () => {
    if(!scriptOwnerFilter || scriptOwnerFilter.objectId < 0){ return; }
    navigateHelper({
      activity: 'scene',
      objectId: scriptOwnerFilter.objectId,
      ownerTag: scriptOwnerFilter.tag,
      ownerLabel: scriptOwnerFilter.label,
      ownerKind: String(scriptOwnerFilter.kind || ''),
    });
  };

  return (
    <div className="inspector-activity scripts-activity">
      {filterActive && (
        <div className="scripts-filter-banner">
          <span>
            Filtered by {bannerText}
            {resourceError ? (
              <span className="scripts-filter-error"> · {resourceError}</span>
            ) : null}
          </span>
          <div className="scripts-filter-actions">
            {scriptOwnerFilter && scriptOwnerFilter.objectId >= 0 ? (
              <button
                type="button"
                className="inspector-refresh"
                onClick={showObject}
              >
                Show object
              </button>
            ) : null}
            <button
              type="button"
              className="inspector-refresh"
              onClick={() => stateRef.current?.setScriptOwnerFilter(null)}
            >
              Clear filter
            </button>
          </div>
        </div>
      )}
      <div className="scripts-activity-layout">
        <div className="scripts-activity-west">
          <ScriptBrowserWindow ownerFilter={scriptOwnerFilter} />
        </div>
        <div className="scripts-activity-center">
          <ScriptInstanceWindow />
        </div>
        <div className="scripts-activity-south">
          <ScriptDebugSouthPane />
        </div>
      </div>
    </div>
  );
};
