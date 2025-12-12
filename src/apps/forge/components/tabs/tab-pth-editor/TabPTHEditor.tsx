import React, { useEffect, useState } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { TabPTHEditorState } from "../../../states/tabs";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import { LayoutContainer } from "../../LayoutContainer/LayoutContainer";
import { UI3DRendererView } from "../../UI3DRendererView";
import { UI3DOverlayComponent } from "../../UI3DOverlayComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle, faCircleNodes, faPlus } from "@fortawesome/free-solid-svg-icons";
import { SceneGraphTreeView } from "../../SceneGraphTreeView";


const UI3DToolPalette = function(props: any){
  const tab = props.tab as TabPTHEditorState;
  const [controlMode, setControlMode] = useState<any>(0);

  const onControlModeChange = () => {
    setControlMode(tab.controlMode);
  };

  useEffect( () => {
    tab.addEventListener('onControlModeChange', onControlModeChange);
    return () => {
      tab.removeEventListener('onControlModeChange', onControlModeChange);
    };
  });

  return (
    <div className="UI3DToolPalette">
      <ul>
        <li className={`${controlMode == 0 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(0)}>
          <a title="Add Point">
            <span className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faCircle} size='lg' color="green" />
              <FontAwesomeIcon icon={faPlus} size='sm' color="white" />
            </span>
          </a>
        </li>
        <li className={`${controlMode == 1 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(1)}>
          <a title="Add Connection">
            <span className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faCircleNodes} size='lg' color="yellow" />
              <FontAwesomeIcon icon={faPlus} size='sm' color="white" />
            </span>
          </a>
        </li>
      </ul>
    </div>
  );
}

export const TabPTHEditor = function(props: BaseTabProps){
  const tab: TabPTHEditorState = props.tab as TabPTHEditorState;

  const eastPanel = (<>
    <SceneGraphTreeView manager={tab.ui3DRenderer.sceneGraphManager} />
  </>);

  return (
    <LayoutContainerProvider>
      <LayoutContainer eastContent={eastPanel}>
        <UI3DRendererView context={tab.ui3DRenderer}>
          <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
          <UI3DToolPalette tab={tab} />
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
  );
};
