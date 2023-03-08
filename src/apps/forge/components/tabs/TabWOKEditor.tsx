import React, { useEffect, useState } from "react";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { TabWOKEditorState } from "../../states/tabs";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { UI3DRendererView } from "../UI3DRendererView";
import { LayoutContainerProvider } from "../../context/LayoutContainerContext";
import { LayoutContainer } from "../LayoutContainer";

import * as KotOR from "../../KotOR";
import { SectionContainer } from "../SectionContainer";

export const TabWOKEditor = function(props: BaseTabProps) {
  const tab: TabWOKEditorState = props.tab as TabWOKEditorState;
  const [walkmesh, setWalkmesh] = useState<KotOR.OdysseyWalkMesh>();

  const onEditorFileLoad = () => {
    setWalkmesh(tab.wok);
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    return () => { //destructor
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
    };
  })

  const eastPanel = (
    <WOKSidebarComponent tab={tab} walkmesh={walkmesh} />
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer eastContent={eastPanel}>
        <UI3DRendererView context={tab.ui3DRenderer} />
      </LayoutContainer>
    </LayoutContainerProvider>
  )
}

const WOKSidebarComponent = function(props: any){
  const tab: TabWOKEditorState = props.tab as TabWOKEditorState;

  const [walkmesh, setWalkmesh] = useState<KotOR.OdysseyWalkMesh>(props.walkmesh);
  const [selectedFace, setSelectedFace] = useState<KotOR.OdysseyFace3>();
  const [render, rerender] = useState<boolean>();

  const onFaceSelected = (face: KotOR.OdysseyFace3) => {
    setSelectedFace(face);
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener('onFaceSelected', onFaceSelected);
    return () => { //destructor
      tab.removeEventListener('onFaceSelected', onFaceSelected);
    };
  });

  useEffect( () => {
    console.log('update', selectedFace);
    rerender(!render);
  }, [selectedFace]);

  return (
    <>
      <SectionContainer name="Selected Face" slim={true}>
        <div>
          <b>Face Index:</b> {walkmesh?.faces.indexOf(selectedFace as any)}
        </div>
        <div>
          <b>Walk Type:</b> { selectedFace ? selectedFace.walkIndex : -1 }
        </div>
      </SectionContainer>
      <SectionContainer name="Adjacent Walkable Faces" slim={true}>
        <div>
          <b>a:</b> {selectedFace?.adjacent[0]}
        </div>
        <div>
          <b>b:</b> {selectedFace?.adjacent[1]}
        </div>
        <div>
          <b>c:</b> {selectedFace?.adjacent[2]}
        </div>
      </SectionContainer>
      <SectionContainer name={`Surface Material: [${selectedFace?.surfacemat.label}]`} slim={true}>
        <div>
          <b>Index:</b> {selectedFace?.walkIndex ? selectedFace.walkIndex : -1} <br />
        </div>
        <div>
          <b>Walkable:</b> {selectedFace?.surfacemat.walk ? 'true' : 'false'} <br />
        </div>
        <div>
          <b>Blocks LOS:</b> {selectedFace?.surfacemat.lineOfSight ? 'true' : 'false'} <br />
        </div>
        <div>
          <b>Grass:</b> {selectedFace?.surfacemat.grass ? 'true' : 'false'} <br />
        </div>
        <div>
          <b>Sound:</b> {selectedFace?.surfacemat.sound} <br />
        </div>
      </SectionContainer>
    </>
  )

}
