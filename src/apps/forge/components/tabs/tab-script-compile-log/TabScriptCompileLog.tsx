import React, { useState } from 'react';

import { useEffectOnce } from '../../../helpers/UseEffectOnce';
import type { TabScriptCompileLogState, TabTextEditorState } from '../../../states/tabs';

export interface ScriptCompileLogEntry {
  message: string;
}

export interface TabScriptCompileLogProps {
  tab: TabScriptCompileLogState;
  parentTab: TabTextEditorState;
}

export const TabScriptCompileLog: React.FC<TabScriptCompileLogProps> = (props) => {
  const tab = props.tab;
  const parentTab = props.parentTab;

  const [logs, setLogs] = useState<ScriptCompileLogEntry[]>([]);

  const onCompile = () => {
    // console.log('onCompile');
  };

  useEffectOnce( () => {
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

