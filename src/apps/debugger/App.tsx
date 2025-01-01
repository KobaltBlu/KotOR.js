import React from "react"
import { useApp } from "./context/AppContext";
import { ScriptDebugger } from "./components/ScriptDebugger";


export const App = () => {
  const appContext = useApp();
  

  return (
  <div>
    <ScriptDebugger />
  </div>);
}