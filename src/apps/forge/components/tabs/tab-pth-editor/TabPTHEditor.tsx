import React from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { TabPTHEditorState } from "../../../states/tabs";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import { LayoutContainer } from "../../LayoutContainer/LayoutContainer";
import { UI3DRendererView } from "../../UI3DRendererView";
import { UI3DOverlayComponent } from "../../UI3DOverlayComponent";

export const TabPTHEditor = function(props: BaseTabProps){
  const tab: TabPTHEditorState = props.tab as TabPTHEditorState;
  const eastPanel = (<>
    <h1>Pathfinding Editor</h1>
  </>);
  const southPanel = (<>
    <h1>Pathfinding Editor</h1> 
  </>);
  return (
    <LayoutContainerProvider>
      <LayoutContainer eastContent={eastPanel}>
        <UI3DRendererView context={tab.ui3DRenderer}>
          <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
  );
};