import React, { useState } from "react";
import { SceneGraphTreeView } from "../../SceneGraphTreeView";
import { SceneGraphNode } from "../../../SceneGraphNode";
import { TabLIPEditorState } from "../../../states/tabs/tab-lip-editor/TabLIPEditorState";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { LIPKeyFrame } from "../../../../../interface/resource/LIPKeyFrame";
import { Form } from "react-bootstrap";
import { TabLIPEditorOptionsState } from "../../../states/tabs/tab-lip-editor/TabLIPEditorOptionsState";
import { LIPShapeLabels } from "../../../data/LIPShapeLabels";

export const TabLIPEditorOptions = function(props: any){
  const tab: TabLIPEditorOptionsState = props.tab;
  const parentTab: TabLIPEditorState = props.parentTab;
  const [nodes, setNodes] = useState<SceneGraphNode[]>(tab.sceneGraphNodes);
  const [selectedFrame, setSelectedFrame] = useState<LIPKeyFrame>(parentTab.selected_frame);

  const onLIPLoaded = () => {
  }

  const onKeyFrameSelect = () => {
    setSelectedFrame(parentTab.selected_frame);
  };

  useEffectOnce(() => {
    parentTab.addEventListener('onLIPLoaded', onLIPLoaded);
    parentTab.addEventListener('onKeyFrameSelect', onKeyFrameSelect);
    return () => {
      parentTab.addEventListener('onLIPLoaded', onLIPLoaded);
      parentTab.removeEventListener('onKeyFrameSelect', onKeyFrameSelect);
    }
  });

  const onKeyFrameShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    let shape = parseInt(e.target.value);
    parentTab.selected_frame.shape = !isNaN(shape) ? shape : 0;
    parentTab.selectKeyFrame(parentTab.selected_frame);
  }

  return (
    <>
      <div className="title"><b>LIP Nodes</b></div>
      <SceneGraphTreeView manager={parentTab.ui3DRenderer.sceneGraphManager}></SceneGraphTreeView>
      <div className="title"><b>Keyframe</b></div>
      {
        !!selectedFrame ? (
          <div className="selected-keyframe-edit-options">
            <b>Mouth Shape</b>
            <Form.Select onChange={onKeyFrameShapeChange} defaultValue={selectedFrame.shape}>
              {
                LIPShapeLabels.map( (label: string, i: number) => {
                  return <option value={i} selected={selectedFrame.shape == i}>{label}</option>
                })
              }
            </Form.Select>
          </div>
        ) : (
          <></>
        )
      }
    </>
  );
}