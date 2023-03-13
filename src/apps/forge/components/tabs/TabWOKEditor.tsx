import React, { useEffect, useState } from "react";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { TabWOKEditorControlMode, TabWOKEditorState } from "../../states/tabs";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { UI3DRendererView } from "../UI3DRendererView";
import { LayoutContainerProvider } from "../../context/LayoutContainerContext";
import { LayoutContainer } from "../LayoutContainer";

import * as KotOR from "../../KotOR";
import { SectionContainer } from "../SectionContainer";
import { Button, ButtonGroup } from "react-bootstrap";

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
        <UI3DToolPalette tab={tab} />
      </LayoutContainer>
    </LayoutContainerProvider>
  )
}

const UI3DToolPalette = function(props: any){
  const tab = props.tab as TabWOKEditorState;
  const [controlMode, setControlMode] = useState<TabWOKEditorControlMode>(TabWOKEditorControlMode.FACE);

  const onControlModeChange = () => {
    setControlMode(tab.controlMode);
  };

  useEffectOnce( () => {
    tab.addEventListener('onControlModeChange', onControlModeChange);
    return () => {
      tab.removeEventListener('onControlModeChange', onControlModeChange);
    };
  });

  return (
    <div className="UI3DToolPalette">
      <ul>
        <li className={`${controlMode == 0 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(0)}><a title="Face Mode"><i className="fa-solid fa-cube"></i></a></li>
        <li className={`${controlMode == 1 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(1)}><a title="Vertex Mode"><i className="fa-solid fa-vector-square"></i></a></li>
        <li className={`${controlMode == 2 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(2)}><a title="Edge Mode"><i className="fa-solid fa-circle-nodes"></i></a></li>
      </ul>
    </div>
  );
}

const WOKSidebarComponent = function(props: any){
  const tab: TabWOKEditorState = props.tab as TabWOKEditorState;

  const [walkmesh, setWalkmesh] = useState<KotOR.OdysseyWalkMesh>(props.walkmesh);
  const [selectedFace, setSelectedFace] = useState<KotOR.OdysseyFace3>();
  const [render, rerender] = useState<boolean>();
  const [controlMode, setControlMode] = useState<TabWOKEditorControlMode>(TabWOKEditorControlMode.FACE);

  const onFaceSelected = (face: KotOR.OdysseyFace3) => {
    setSelectedFace(face);
  };

  const onControlModeChange = () => {
    setControlMode(tab.controlMode);
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener('onFaceSelected', onFaceSelected);
    tab.addEventListener('onControlModeChange', onControlModeChange);
    return () => { //destructor
      tab.removeEventListener('onFaceSelected', onFaceSelected);
      tab.removeEventListener('onControlModeChange', onControlModeChange);
    };
  });

  useEffect( () => {
    console.log('update', selectedFace);
    rerender(!render);
  }, [selectedFace]);

  return (
    <>
      <SectionContainer name="Mode" slim={true}>
        <ButtonGroup aria-label="Basic example">
          <Button variant="secondary" active={controlMode == 0} onClick={(e) => tab.setControlMode(0)}>Face</Button>
          <Button variant="secondary" active={controlMode == 1} onClick={(e) => tab.setControlMode(1)}>Vertex</Button>
          <Button variant="secondary" active={controlMode == 2} onClick={(e) => tab.setControlMode(2)}>Edge</Button>
        </ButtonGroup>
      </SectionContainer>
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
