import React, { useEffect } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import { LayoutContainer } from "../../LayoutContainer/LayoutContainer";
import { TabModuleEditorState } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import { UI3DOverlayComponent } from "../../UI3DOverlayComponent";
import { ModuleEditorSidebarComponent } from "../../ModuleEditorSidebarComponent";

export const TabModuleEditor = function(props: BaseTabProps){
  const tab: TabModuleEditorState = props.tab as TabModuleEditorState;

  const onModuleLoaded = () => {
    console.log('module loaded');
  }

  useEffect(() => {
    tab.addEventListener('onModuleLoaded', onModuleLoaded);
    return () => {
      tab.removeEventListener('onModuleLoaded', onModuleLoaded);
    };
  }, []);

  const eastPanel = (
    <ModuleEditorSidebarComponent tab={tab} />
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer eastContent={eastPanel}>
        <UI3DRendererView context={tab.ui3DRenderer}>
          <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
  )
}

