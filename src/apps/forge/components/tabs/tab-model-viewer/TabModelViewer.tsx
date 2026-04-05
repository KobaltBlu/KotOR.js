import React from "react";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { TabModelViewerState } from "@/apps/forge/states/tabs";
import { KeyFrameTimelineComponent } from "@/apps/forge/components/KeyFrameTimelineComponent";
import { ModelViewerSidebarComponent } from "@/apps/forge/components/ModelViewerSidebarComponent";
import { UI3DOverlayComponent } from "@/apps/forge/components/UI3DOverlayComponent";
import { UI3DRendererView } from "@/apps/forge/components/UI3DRendererView";

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
