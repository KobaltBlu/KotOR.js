import React from 'react';

import { KeyFrameTimelineComponent } from '@/apps/forge/components/KeyFrameTimelineComponent';
import { LayoutContainer } from '@/apps/forge/components/LayoutContainer/LayoutContainer';
import { ModelViewerSidebarComponent } from '@/apps/forge/components/ModelViewerSidebarComponent';
import { UI3DOverlayComponent } from '@/apps/forge/components/UI3DOverlayComponent';
import { UI3DRendererView } from '@/apps/forge/components/UI3DRendererView';
import { LayoutContainerProvider } from '@/apps/forge/context/LayoutContainerContext';
import type { TabModelViewerState } from '@/apps/forge/states/tabs';

export interface TabModelViewerProps {
  tab: TabModelViewerState;
}

export const TabModelViewer: React.FC<TabModelViewerProps> = (props) => {
  const tab = props.tab;

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
