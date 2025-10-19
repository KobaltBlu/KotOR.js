import React from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import { LayoutContainer } from "../../LayoutContainer/LayoutContainer";
import { TabModuleEditorState } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import { UI3DOverlayComponent } from "../../UI3DOverlayComponent";

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
        <UI3DRendererView context={tab.ui3DRenderer}>
          <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
  )
}

