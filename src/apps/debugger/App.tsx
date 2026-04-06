import React from "react"
import { useApp } from "@/apps/debugger/context/AppContext";
import { ScriptDebugger } from "@/apps/debugger/components/ScriptDebugger";


export const App = () => {
  const appContext = useApp();
  

  return (
  <div>
    <ScriptDebugger />
  </div>);
}