import React, { useState } from "react";
import { TabTextEditorState } from "@/apps/forge/states/tabs";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { NcsInspector } from "@/apps/forge/components/tabs/tab-ncs-inspector/NcsInspector";

export const TabScriptInspector = function(props: any){
  const parentTab: TabTextEditorState = props.parentTab;
  const [, forceRender] = useState(0);

  const refresh = () => forceRender((value) => value + 1);

  useEffectOnce(() => {
    parentTab.addEventListener('onCompile', refresh);
    parentTab.addEventListener('onEditorFileLoad', refresh);
    parentTab.addEventListener('onRevealNcs', refresh);
    return () => {
      parentTab.removeEventListener('onCompile', refresh);
      parentTab.removeEventListener('onEditorFileLoad', refresh);
      parentTab.removeEventListener('onRevealNcs', refresh);
    };
  });

  return (
    <NcsInspector
      bytes={parentTab.ncs || new Uint8Array(0)}
      script={parentTab.nwScript}
      recoveredFunctions={parentTab.recoveredFunctions}
      nssLineMap={parentTab.nssLineMap}
      revealCodeOffset={parentTab.revealNcsCodeOffset}
      fileName={parentTab.file?.getFilename?.()}
      editorFile={parentTab.file}
      compact
      onShowInNss={(line) => parentTab.revealNssLine(line)}
    />
  );
};
