import React, { ChangeEvent, useEffect, useState } from "react"
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps"
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";

import { TabGUIEditorState, TabGUIEditorStateEventListenerTypes } from "@/apps/forge/states/tabs";

import * as KotOR from "@/apps/forge/KotOR";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { UI3DRendererView } from "@/apps/forge/components/UI3DRendererView";
import { UI3DRendererEventListenerTypes } from "@/apps/forge/UI3DRenderer";
import { forgeGuiSettings } from "@/apps/forge/settings/forgeEditorsSettings";
// import { UI3DOverlayComponent } from "@/apps/forge/components/UI3DOverlayComponent";

export const TabGUIEditor = function(props: BaseTabProps){

  const tab: TabGUIEditorState = props.tab as TabGUIEditorState;
  const [gff, setGFF] = useState<KotOR.GFFObject>();
  const [menu, setMenu] = useState<KotOR.GameMenu>();
  const [selectedNode, setSelectedNode] = useState<KotOR.GFFField|KotOR.GFFStruct>();
  const [render, rerender] = useState<boolean>(true);

  const onEditorFileLoad = function(tab: TabGUIEditorState){
    setGFF(tab.gff);
    setMenu(tab.menu);
  };

  const onNodeSelected = function(node: KotOR.GFFField|KotOR.GFFStruct){
    setSelectedNode(node);
    rerender(!render);
  };

  const onNodeAdded = function(arg: any){
    //todo
  };

  const onNodeRemoved = function(arg: any){
    //todo
  };

  const onMouseWheel = function(e: WheelEvent){
    if(!!e.ctrlKey){
      let tmpCanvasScale = menu?.tGuiPanel.widget.scale.x || 0;
      const gui = forgeGuiSettings.get();
      tmpCanvasScale += (e.deltaY < 0) ? gui.zoomStep : -gui.zoomStep;
      tmpCanvasScale = Math.max(Math.min(tmpCanvasScale, gui.zoomMax), gui.zoomMin);
      menu?.tGuiPanel.widget.scale.setScalar(tmpCanvasScale);
    }
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>('onEditorFileLoad', onEditorFileLoad);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>('onNodeSelected', onNodeSelected);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>('onNodeAdded', onNodeAdded);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>('onNodeRemoved', onNodeRemoved);
    tab.ui3DRenderer.addEventListener<UI3DRendererEventListenerTypes>('onMouseWheel', onMouseWheel);

    return () => { //destructor
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>('onNodeSelected', onNodeSelected);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>('onNodeAdded', onNodeAdded);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>('onNodeRemoved', onNodeRemoved);
      tab.ui3DRenderer.removeEventListener<UI3DRendererEventListenerTypes>('onMouseWheel', onMouseWheel);
    };
  })

  return (
    <>
      <LayoutContainerProvider>
        <LayoutContainer /*southContent={southPanel} southSize={140} eastContent={eastPanel}*/>
          <UI3DRendererView context={tab.ui3DRenderer}>
            {/* <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent> */}
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
    </>
  )
}
