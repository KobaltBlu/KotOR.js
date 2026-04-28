import React, { useEffect, useState } from 'react';
import { useApp } from '@/apps/debugger/context/AppContext';
import { ScriptBrowserWindow } from '@/apps/debugger/components/ScriptBrowserWindow';
import { ScriptInstanceWindow } from '@/apps/debugger/components/ScriptInstanceWindow';
import { LayoutContainer } from '@/apps/debugger/components/LayoutContainer';
import { MenuTop } from '@/apps/debugger/components/MenuTop';

export const ScriptDebugger = () => {
  const westContent = <ScriptBrowserWindow />;

  return (
    <div className="script-debugger app-container">
      <MenuTop />
      <div id="container" className="script-debugger-container">
        <LayoutContainer westContent={westContent} westSize={250} southContent={<></>}>
          <ScriptInstanceWindow />
        </LayoutContainer>
      </div>
    </div>
  );
};
