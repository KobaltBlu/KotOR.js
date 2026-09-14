import React, { useMemo } from "react";
import { ActivityChrome } from "@/apps/debugger/components/ActivityChrome";
import { SceneActivity } from "@/apps/debugger/components/SceneActivity";
import { ModuleActivity } from "@/apps/debugger/components/ModuleActivity";
import { ObjectsActivity } from "@/apps/debugger/components/ObjectsActivity";
import { GlobalsActivity } from "@/apps/debugger/components/GlobalsActivity";
import { ScriptsActivity } from "@/apps/debugger/components/ScriptsActivity";
import { DialogActivity } from "@/apps/debugger/components/DialogActivity";
import { useApp } from "@/apps/debugger/context/AppContext";

export const ScriptDebugger = () => {
  const { activity, moduleSnapshot, selectedInstance: selectedInstanceTuple } = useApp();
  const [selectedInstance] = selectedInstanceTuple;

  const statusLeft = useMemo(() => {
    if(!moduleSnapshot?.loaded){
      return 'No module loaded';
    }
    const file = moduleSnapshot.moduleFilename || 'module';
    const area = moduleSnapshot.areaTag || moduleSnapshot.areaResRef || '—';
    return `${file} · ${area}`;
  }, [moduleSnapshot]);

  const statusRight = useMemo(() => {
    if(selectedInstance?.name){
      return `Paused: ${selectedInstance.name}`;
    }
    return '';
  }, [selectedInstance]);

  let body: React.ReactNode = null;
  switch(activity){
    case 'scene':
      body = <SceneActivity />;
      break;
    case 'module':
      body = <ModuleActivity />;
      break;
    case 'objects':
      body = <ObjectsActivity />;
      break;
    case 'globals':
      body = <GlobalsActivity />;
      break;
    case 'dialog':
      body = <DialogActivity />;
      break;
    case 'scripts':
    default:
      body = <ScriptsActivity />;
      break;
  }

  return (
    <ActivityChrome statusLeft={statusLeft} statusRight={statusRight}>
      {body}
    </ActivityChrome>
  );
};
