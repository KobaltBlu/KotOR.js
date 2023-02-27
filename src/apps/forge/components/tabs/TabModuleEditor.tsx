import React from "react";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { LayoutContainerProvider } from "../../context/LayoutContainerContext";
import { LayoutContainer } from "../LayoutContainer";
import { TabModuleEditorState } from "../../states/tabs/TabModuleEditorState";

export const TabModuleEditor = function(props: BaseTabProps){
  const tab: TabModuleEditorState = props.tab as TabModuleEditorState;

  const southPanel = (
    <></>
  );

  const eastPanel = (
    <></>
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer southContent={southPanel} southSize={140} eastContent={eastPanel}>
        {tab.ui3DRendererView}
      </LayoutContainer>
    </LayoutContainerProvider>
  )
}
