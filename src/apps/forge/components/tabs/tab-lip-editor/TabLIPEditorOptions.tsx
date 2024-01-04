import React, { NewLifecycle, useEffect, useState } from "react";
import { SceneGraphTreeView } from "../../SceneGraphTreeView";
import { SceneGraphNode } from "../../../SceneGraphNode";
import { TabLIPEditorState, TabLIPEditorStateEventListenerTypes, TabLIPEditorOptionsState } from "../../../states/tabs";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { Button, Form } from "react-bootstrap";
import { SectionContainer } from "../../SectionContainer";

import * as KotOR from "../../../KotOR";

export const TabLIPEditorOptions = function(props: any){
  const tab: TabLIPEditorOptionsState = props.tab;
  const parentTab: TabLIPEditorState = props.parentTab;
  const [nodes, setNodes] = useState<SceneGraphNode[]>(tab.sceneGraphNodes);
  const [selectedFrame, setSelectedFrame] = useState<KotOR.ILIPKeyFrame>(parentTab.selected_frame);
  const [selectedHead, setSelectedHead] = useState<string>(parentTab.current_head);
  const [duration, setDuration] = useState<number>(parentTab.lip.duration);

  const onLIPLoaded = () => {

  };

  const onKeyFrameSelect = () => {
    setSelectedFrame(parentTab.selected_frame);
  };

  const onHeadChange = () => {
    setSelectedHead(parentTab.current_head);
  };

  const onDurationChange = (value: number = 0, update: boolean = false) => {
    if(update) parentTab.setDuration(value);
    setDuration(value);
  }

  useEffectOnce(() => {
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>('onLIPLoaded', onLIPLoaded);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameSelect', onKeyFrameSelect);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>('onHeadChange', onHeadChange);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>('onDurationChange', onDurationChange);
    return () => {
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onLIPLoaded', onLIPLoaded);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameSelect', onKeyFrameSelect);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onHeadChange', onHeadChange);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onDurationChange', onDurationChange);
    }
  });

  useEffect( () => {
    console.log('duration', 'change');
  }, [duration]);

  const onKeyFrameShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    let shape = parseInt(e.target.value);
    parentTab.selected_frame.shape = !isNaN(shape) ? shape : 0;
    parentTab.selectKeyFrame(parentTab.selected_frame);
  }

  const onPreviewHeadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    let head = (e.target.value);
    parentTab.loadHead(head);
  }

  const onImportPHNClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    parentTab.importPHN();
  }

  const onFitToKeyFrames = (e: React.MouseEvent<HTMLButtonElement>) => {
    parentTab.fitDurationToKeyFrames();
  }

  const heads = Object.values(KotOR.TwoDAManager.datatables.get('heads')?.rows);

  return (
    <>
      <SectionContainer name="LIP">
        <Form.Control type="number" step={0.01} pattern="[0-9]+([\.,][0-9]+)?" placeholder="Animation Duration" value={duration} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onDurationChange(parseFloat(e.target.value), true)} />
        <Button variant="info" onClick={onFitToKeyFrames}>Fit To Key Frames</Button>
      </SectionContainer>
      <SectionContainer name="LIP Nodes">
        <SceneGraphTreeView manager={parentTab.ui3DRenderer.sceneGraphManager}></SceneGraphTreeView>
      </SectionContainer>
      {/* <SectionContainer name="Key Frame">
        {
          !!selectedFrame ? (
            <div className="selected-keyframe-edit-options">
              <b>Mouth Shape</b>
              <Form.Select onChange={onKeyFrameShapeChange} value={selectedFrame.shape}>
                {
                  LIPShapeLabels.map( (label: string, i: number) => {
                    return <option value={i}>{label}</option>
                  })
                }
              </Form.Select>
            </div>
          ) : (
            <></>
          )
        }
      </SectionContainer> */}
      <SectionContainer name="Preview Head" slim={true}>
        {
          !!selectedFrame ? (
            <div className="selected-keyframe-head-options">
              <b>Heads</b>
              <Form.Select onChange={onPreviewHeadChange} value={selectedHead}>
                {
                  heads.map( (row: any, i: number) => {
                    const head = (row.head as string).toLocaleLowerCase();
                    return <option value={head}>{head}</option>
                  })
                }
              </Form.Select>
            </div>
          ) : (
            <></>
          )
        }
      </SectionContainer>
      <SectionContainer name="Utilities">
        <Button onClick={onImportPHNClick}>Import PHN</Button>
      </SectionContainer>
    </>
  );
}