import React, { useEffect, useState } from "react"
import { useApp } from "../context/AppContext";
import { ScriptBrowserWindow } from "./ScriptBrowserWindow";
import { ScriptInstanceWindow } from "./ScriptInstanceWindow";
import { LayoutContainer } from "./LayoutContainer";
import { MenuTop } from "./MenuTop";


export const ScriptDebugger = () => {

  const westContent = (
    <ScriptBrowserWindow />
  );

  return (
  <div className="script-debugger app-container">
    <MenuTop />
    <div id="container" className="script-debugger-container">
      <LayoutContainer westContent={westContent} westSize={250} southContent={<></>}>
        <ScriptInstanceWindow />
      </LayoutContainer>
    </div>
  </div>);
}