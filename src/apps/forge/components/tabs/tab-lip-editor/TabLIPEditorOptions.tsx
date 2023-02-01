import React, { NewLifecycle, useState } from "react";
import { SceneGraphTreeView } from "../../SceneGraphTreeView";
import { SceneGraphNode } from "../../../SceneGraphNode";
import { TabLIPEditorState, TabLIPEditorStateEventListenerTypes } from "../../../states/tabs/tab-lip-editor/TabLIPEditorState";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { LIPKeyFrame } from "../../../../../interface/resource/LIPKeyFrame";
import { Form } from "react-bootstrap";
import { TabLIPEditorOptionsState } from "../../../states/tabs/tab-lip-editor/TabLIPEditorOptionsState";
import { LIPShapeLabels } from "../../../data/LIPShapeLabels";
import { SectionContainer } from "../../SectionContainer";

declare const KotOR: any;

export const TabLIPEditorOptions = function(props: any){
  const tab: TabLIPEditorOptionsState = props.tab;
  const parentTab: TabLIPEditorState = props.parentTab;
  const [nodes, setNodes] = useState<SceneGraphNode[]>(tab.sceneGraphNodes);
  const [selectedFrame, setSelectedFrame] = useState<LIPKeyFrame>(parentTab.selected_frame);
  const [selectedHead, setSelectedHead] = useState<string>(parentTab.current_head);

  const onLIPLoaded = () => {

  };

  const onKeyFrameSelect = () => {
    setSelectedFrame(parentTab.selected_frame);
  };

  const onHeadChange = () => {
    setSelectedHead(parentTab.current_head);
  };

  useEffectOnce(() => {
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>('onLIPLoaded', onLIPLoaded);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameSelect', onKeyFrameSelect);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>('onHeadChange', onHeadChange);
    return () => {
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onLIPLoaded', onLIPLoaded);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameSelect', onKeyFrameSelect);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onHeadChange', onHeadChange);
    }
  });

  const onKeyFrameShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    let shape = parseInt(e.target.value);
    parentTab.selected_frame.shape = !isNaN(shape) ? shape : 0;
    parentTab.selectKeyFrame(parentTab.selected_frame);
  }

  const onPreviewHeadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    let head = (e.target.value);
    parentTab.loadHead(head);
  }

  const heads = Object.values(KotOR.TwoDAManager.datatables.get('heads').rows);

  return (
    <>
      <SectionContainer name="LIP Nodes">
        <SceneGraphTreeView manager={parentTab.ui3DRenderer.sceneGraphManager}></SceneGraphTreeView>
      </SectionContainer>
      <SectionContainer name="Key Frame">
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
      </SectionContainer>
      <SectionContainer name="Preview Head">
        {
          !!selectedFrame ? (
            <div className="selected-keyframe-head-options">
              <b>Heads</b>
              <Form.Select onChange={onPreviewHeadChange} defaultValue={parentTab.current_head} value={selectedHead}>
                {
                  heads.map( (row: any, i: number) => {
                    const head = (row.head as string).toLocaleLowerCase();
                    return <option value={head} selected={selectedHead == head}>{head}</option>
                  })
                }
              </Form.Select>
            </div>
          ) : (
            <></>
          )
        }
      </SectionContainer>
    </>
  );
}