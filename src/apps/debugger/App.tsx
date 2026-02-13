import React from "react"

import { ScriptDebugger } from "./components/ScriptDebugger";
import { useApp } from "./context/AppContext";


export const App = () => {
  const appContext = useApp();
  

  return (
  <div>
    <ScriptDebugger />
  </div>);
}