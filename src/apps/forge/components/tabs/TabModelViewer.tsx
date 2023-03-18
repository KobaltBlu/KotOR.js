import React from "react";
import { LayoutContainerProvider } from "../../context/LayoutContainerContext";
import { LayoutContainer } from "../LayoutContainer";
import { TabModelViewerState } from "../../states/tabs";
import { KeyFrameTimelineComponent } from "../KeyFrameTimelineComponent";
import { ModelViewerSidebarComponent } from "../ModelViewerSidebarComponent";
import { UI3DOverlayComponent } from "../UI3DOverlayComponent";
import { UI3DRendererView } from "../UI3DRendererView";

export const TabModelViewer = function(props: any){
  const tab: TabModelViewerState = props.tab as TabModelViewerState;

  const southPanel = (
    <KeyFrameTimelineComponent tab={tab} />
  );

  const eastPanel = (
    <ModelViewerSidebarComponent tab={tab} />
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer southContent={southPanel} southSize={140} eastContent={eastPanel}>
        <UI3DRendererView context={tab.ui3DRenderer}>
          <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
  );
}