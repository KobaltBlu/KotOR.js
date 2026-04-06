import React, { useMemo } from "react";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { TabModelViewerState } from "@/apps/forge/states/tabs";
import { KeyFrameTimelineComponent } from "@/apps/forge/components/KeyFrameTimelineComponent";
import { ModelViewerSidebarComponent } from "@/apps/forge/components/ModelViewerSidebarComponent";
import { UI3DOverlayComponent } from "@/apps/forge/components/UI3DOverlayComponent";
import { UI3DRendererView, MenuItem } from "@/apps/forge/components/UI3DRendererView";
import { CameraView } from "@/apps/forge/UI3DRenderer";

export const TabModelViewer = function(props: any){
  const tab: TabModelViewerState = props.tab as TabModelViewerState;

  const menuItems: MenuItem[] = useMemo(() => [
    {
      label: 'File',
      children: [
        {
          label: 'Extract Model Assets',
          onClick: () => tab.extractModelAssets(),
        },
      ],
    },
    {
      label: 'View',
      children: [
        {
          label: 'Camera',
          children: [
            { label: 'Fit Camera to Scene', onClick: () => tab.ui3DRenderer.fitCameraToScene() },
            { separator: true },
            { label: 'Top View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Top) },
            { label: 'Bottom View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Bottom) },
            { label: 'Left View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Left) },
            { label: 'Right View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Right) },
            { label: 'Front View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Front) },
            { label: 'Back View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Back) },
            { label: 'Isometric View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Orthogonal) },
            { label: 'Default View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Default) },
          ],
        },
      ],
    },
  ], [tab]);

  const southPanel = (
    <KeyFrameTimelineComponent tab={tab} />
  );

  const eastPanel = (
    <ModelViewerSidebarComponent tab={tab} />
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer southContent={southPanel} southSize={140} eastContent={eastPanel}>
        <UI3DRendererView context={tab.ui3DRenderer} showMenuBar={true} menuItems={menuItems}>
          <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
  );
}
