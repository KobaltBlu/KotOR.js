import React, { useState } from 'react';

import { useEffectOnce } from '@/apps/forge/helpers/UseEffectOnce';
import type { TabScriptCompileLogState, TabTextEditorState } from '@/apps/forge/states/tabs';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const _log = createScopedLogger(LogScope.Forge);

export interface ScriptCompileLogEntry {
  message: string;
}

export interface TabScriptCompileLogProps {
  tab: TabScriptCompileLogState;
  parentTab: TabTextEditorState;
}

export const TabScriptCompileLog: React.FC<TabScriptCompileLogProps> = (_props) => {

  const [logs, _setLogs] = useState<ScriptCompileLogEntry[]>([]);


  useEffectOnce(() => {
    // parentTab.addEventListener('onCompile', onCompile);
    return () => {
      // parentTab.removeEventListener('onCompile', onCompile);
    }
  });

  return (
    <div className="tab-pane-content scroll-y log-list">
      {
        logs.map((entry, idx) => (
          <div key={idx} className="script-log">
            <span className="message">{entry.message}</span>
          </div>
        ))
      }
    </div>
  );

}

