import React, { useState } from "react"
import { useEffectOnce } from "../../../helpers/UseEffectOnce"
import { TabScriptErrorLogState, TabTextEditorState } from "../../../states/tabs";

export const TabScriptErrorLog = function(props: any){
  const tab: TabScriptErrorLogState = props.tab;
  const parentTab: TabTextEditorState = props.parentTab;

  const [errors, setErrors] = useState<any[]>([]);

  const onSetErrors = (errors: any[] = []) => {
    setErrors([...errors]);
  }

  useEffectOnce( () => { //constructor
    tab.addEventListener('onSetErrors', onSetErrors);
    return () => { //deconstructor
      tab.removeEventListener('onSetErrors', onSetErrors);
    };
  });

  const onErrorClick = (e: React.MouseEvent<HTMLDivElement>, error: any) => {
    e.preventDefault();
    if(parentTab.editor){
      parentTab.editor.setPosition({
        lineNumber: error.startLineNumber, 
        column: error.startColumn
      });
      parentTab.editor.revealLineInCenter(error.startLineNumber);
    }
  }

  return (
    <div className="tab-pane-content scroll-y error-list">
      {
        errors.map( (error, index) => {
          return (
            <div className="script-error" onClick={(e) => {onErrorClick(e, error)}}>
              <span className="icon">
                <i className="fa-solid fa-circle-xmark"></i>
              </span>
              <span className="message">{error.message}</span>
              <span className="line-column">[{error.startLineNumber}, {error.startColumn}]</span>
            </div>
          )
        })
      }
    </div>
  )
}

