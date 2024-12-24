import React, { ChangeEvent, useEffect, useState } from "react"
import { BaseTabProps } from "../../interfaces/BaseTabProps"
import { useEffectOnce } from "../../helpers/UseEffectOnce";

import { TabGUIEditorState, TabGUIEditorStateEventListenerTypes } from "../../states/tabs";

import * as KotOR from "../../KotOR";
// import { Form, InputGroup } from "react-bootstrap";
import { LayoutContainer } from "../LayoutContainer";
import { LayoutContainerProvider } from "../../context/LayoutContainerContext";
import { UI3DRendererView } from "../UI3DRendererView";
// import { UI3DOverlayComponent } from "../UI3DOverlayComponent";

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
      const maxScale = 5;
      const minScale = 0.1;
      if(e.deltaY < 0){
        tmpCanvasScale += 0.25;
      }else{
        tmpCanvasScale -= 0.25;
      }
      tmpCanvasScale = Math.max(Math.min(tmpCanvasScale, maxScale), minScale);
      menu?.tGuiPanel.widget.scale.setScalar(tmpCanvasScale);
    }
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>('onEditorFileLoad', onEditorFileLoad);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>('onNodeSelected', onNodeSelected);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>('onNodeAdded', onNodeAdded);
    tab.addEventListener<TabGUIEditorStateEventListenerTypes>('onNodeRemoved', onNodeRemoved);

    return () => { //destructor
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>('onNodeSelected', onNodeSelected);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>('onNodeAdded', onNodeAdded);
      tab.removeEventListener<TabGUIEditorStateEventListenerTypes>('onNodeRemoved', onNodeRemoved);
    };
  })

  return (
    <>
      <LayoutContainerProvider>
        <LayoutContainer /*southContent={southPanel} southSize={140} eastContent={eastPanel}*/>
          <UI3DRendererView context={tab.ui3DRenderer} onMouseWheel={onMouseWheel}>
            {/* <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent> */}
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
    </>
  )
}