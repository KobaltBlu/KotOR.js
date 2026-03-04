import { faArrowPointer, faCircle, faCircleNodes, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";

import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { SceneGraphTreeView } from "@/apps/forge/components/SceneGraphTreeView";
import { UI3DOverlayComponent } from "@/apps/forge/components/UI3DOverlayComponent";
import { UI3DRendererView } from "@/apps/forge/components/UI3DRendererView";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { TabPTHEditorState } from "@/apps/forge/states/tabs";
import { createScopedLogger, LogScope } from "@/utility/Logger";



const log = createScopedLogger(LogScope.Forge);

interface UI3DToolPaletteProps {
  tab: TabPTHEditorState;
}

const UI3DToolPalette: React.FC<UI3DToolPaletteProps> = (props) => {
  const tab = props.tab;
  const [controlMode, setControlMode] = useState<number>(tab.controlMode ?? 0);

  log.trace('UI3DToolPalette render', 'controlMode=', controlMode);

  const onControlModeChange = () => {
    log.debug('UI3DToolPalette onControlModeChange', 'tab.controlMode=', tab.controlMode);
    setControlMode(tab.controlMode);
  };

  useEffect( () => {
    tab.addEventListener('onControlModeChange', onControlModeChange);
    return () => {
      tab.removeEventListener('onControlModeChange', onControlModeChange);
    };
  });

  return (
    <div className="UI3DToolPalette" style={{ marginTop: '25px' }}>
      <ul>
        <li className={`${controlMode == 0 ? 'selected' : ''}`} onClick={(_e) => { log.trace('TabPTHEditor setControlMode 0 (Select Point)'); tab.setControlMode(0); }}>
          <a title="Select Point">
            <span className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faArrowPointer} size='lg' color="white" />
            </span>
          </a>
        </li>
        <li className={`${controlMode == 1 ? 'selected' : ''}`} onClick={(_e) => { log.trace('TabPTHEditor setControlMode 1 (Add Point)'); tab.setControlMode(1); }}>
          <a title="Add Point">
            <span className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faCircle} size='lg' color="green" />
              <FontAwesomeIcon icon={faPlus} size='sm' color="white" />
            </span>
          </a>
        </li>
        <li className={`${controlMode == 2 ? 'selected' : ''}`} onClick={(_e) => { log.trace('TabPTHEditor setControlMode 2 (Add Connection)'); tab.setControlMode(2); }}>
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
  log.trace('TabPTHEditor render');
  const tab: TabPTHEditorState = props.tab as TabPTHEditorState;

  const eastPanel = (<>
    <SceneGraphTreeView manager={tab.ui3DRenderer.sceneGraphManager} />
  </>);

  return (
    <LayoutContainerProvider>
      <LayoutContainer eastContent={eastPanel}>
        <UI3DRendererView context={tab.ui3DRenderer} showMenuBar={true}>
          <UI3DOverlayComponent context={tab.ui3DRenderer}></UI3DOverlayComponent>
          <UI3DToolPalette tab={tab} />
        </UI3DRendererView>
      </LayoutContainer>
    </LayoutContainerProvider>
  );
};
