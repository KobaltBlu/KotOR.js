import React from "react";
import { LayoutContainerProvider } from "../../context/LayoutContainerContext";
import { LayoutContainer } from "../LayoutContainer";
import { TabModelViewerState } from "../../states/tabs/TabModelViewerState";
import { KeyFrameTimelineComponent } from "../KeyFrameTimelineComponent";
import { ModelViewerSidebarComponent } from "../ModelViewerSidebarComponent";

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
        {tab.ui3DRendererView}
      </LayoutContainer>
    </LayoutContainerProvider>
  );
}