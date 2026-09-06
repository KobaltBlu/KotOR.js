import React from "react";
import { ScriptBrowserWindow } from "@/apps/debugger/components/ScriptBrowserWindow";
import { ScriptInstanceWindow } from "@/apps/debugger/components/ScriptInstanceWindow";
import { ScriptDebugSouthPane } from "@/apps/debugger/components/ScriptDebugSouthPane";
import { useApp } from "@/apps/debugger/context/AppContext";

export const ScriptsActivity: React.FC = () => {
  const { scriptNameFilter, stateRef } = useApp();
  const filterActive = scriptNameFilter.length > 0;

  return (
    <div className="inspector-activity scripts-activity">
      {filterActive && (
        <div className="scripts-filter-banner">
          <span>
            Filtered by object scripts:{' '}
            {scriptNameFilter.join(', ')}
          </span>
          <button
            type="button"
            className="inspector-refresh"
            onClick={() => stateRef.current?.setScriptNameFilter([])}
          >
            Clear filter
          </button>
        </div>
      )}
      <div className="scripts-activity-layout">
        <div className="scripts-activity-west">
          <ScriptBrowserWindow nameFilter={scriptNameFilter} />
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
