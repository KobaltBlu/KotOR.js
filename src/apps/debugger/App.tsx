import React from "react"

import { ScriptDebugger } from "@/apps/debugger/components/ScriptDebugger";
import { useApp } from "@/apps/debugger/context/AppContext";


export const App = () => {
  const _appContext = useApp();
  

  return (
  <div>
    <ScriptDebugger />
  </div>);
}