import React, { useState } from "react";

import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabScriptCompileLogState, TabTextEditorState } from "@/apps/forge/states/tabs";

export const TabScriptCompileLog = function(props: any){
  const tab: TabScriptCompileLogState = props.tab;
  const parentTab: TabTextEditorState = props.parentTab;

  const [logs, setLogs] = useState<any[]>([]);

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
        logs.map( (log) => {
          return (
            <div className="script-log">
              <span className="message">{log.message}</span>
            </div>
          )
        })
      }
    </div>
  );

}

