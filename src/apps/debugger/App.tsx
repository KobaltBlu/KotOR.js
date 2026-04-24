import React from "react"
import { useApp } from "@/apps/debugger/context/AppContext";
import { ScriptDebugger } from "@/apps/debugger/components/ScriptDebugger";


export const App = () => {
  const _appContext = useApp();
  

  return (
  <div>
    <ScriptDebugger />
  </div>);
}