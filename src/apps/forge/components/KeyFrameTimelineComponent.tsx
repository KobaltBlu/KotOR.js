import React, { useState } from "react";
import { Form } from "react-bootstrap";
import * as KotOR from "../KotOR";
import { TabModelViewerState } from "../states/tabs/TabModelViewerState";
import { useEffectOnce } from "../helpers/UseEffectOnce";

export const KeyFrameTimelineComponent = function(props: any){
  const tab: TabModelViewerState = props.tab;

  const [currentAnimation, setCurrentAnimation] = useState<KotOR.OdysseyModelAnimation>();
  const [selectedAnimationIndex, setSelectedAnimationIndex] = useState<number>(tab.selectedAnimationIndex);

  const [animations, setAnimations] = useState<KotOR.OdysseyModelAnimation[]>([]);
  const [timelineZoom, setTimelineZoom] = useState<number>(tab.timelineZoom);
  const [timelineOffset, setTimelineOffset] = useState<number>(tab.timelineOffset);
  const [looping, setLooping] = useState<boolean>(tab.looping);

  const onEditorFileLoad = function(){
    setAnimations( tab.model.odysseyAnimations );
    setCurrentAnimation( tab.model.odysseyAnimations[0] );
  };

  const onKeyFrameTrackZoomIn = function(){
    setTimelineZoom(tab.timelineZoom);
  };

  const onKeyFrameTrackZoomOut = function(){
    setTimelineZoom(tab.timelineZoom);
  };

  const onAnimationChange = function(){
    setCurrentAnimation(tab.currentAnimation);
    setSelectedAnimationIndex(tab.selectedAnimationIndex);
    if(tab.currentAnimation){
      tab.playAnimation();
    }
  };

  const onLoopChange = function(){
    setLooping(tab.looping);
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    tab.addEventListener('onKeyFrameTrackZoomIn', onKeyFrameTrackZoomIn);
    tab.addEventListener('onKeyFrameTrackZoomOut', onKeyFrameTrackZoomOut);
    tab.addEventListener('onAnimationChange', onAnimationChange);
    tab.addEventListener('onLoopChange', onLoopChange);
    return () => { //destructor
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener('onKeyFrameTrackZoomIn', onKeyFrameTrackZoomIn);
      tab.removeEventListener('onKeyFrameTrackZoomOut', onKeyFrameTrackZoomOut);
      tab.removeEventListener('onAnimationChange', onAnimationChange);
      tab.removeEventListener('onLoopChange', onLoopChange);
    }
  });

  const timestamps: JSX.Element[] = [];

  const onBtnZoomIn = function(){
    tab.keyframeTrackZoomIn();
  };

  const onBtnZoomOut = function(){
    tab.keyframeTrackZoomOut();
  };

  const onBtnPlayPause = function(){
    tab.playAnimation();
  };

  const onBtnStop = function(){
    tab.stopAnimation();
  };

  const onCheckboxLoopChange = function(e: React.ChangeEvent<HTMLInputElement>){
    tab.setLooping(e.target.checked);
    setLooping(e.target.checked);
  }

  const onSelectAnimationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    let index = parseInt(e.target.value);
    tab.setAnimationByIndex(index);
  }

  if(currentAnimation){
    //Build timeline second markers
    let factor = 10;

    if(timelineZoom < 250){
      factor = 30;
    }

    if(timelineZoom <= 150){
      factor = 60;
    }

    let nthTime = factor/60;
    let count = Math.ceil(Math.ceil(currentAnimation.length) / nthTime);

    for(let i = 0; i <= count; i++){
      let s = factor * i;
      timestamps.push(
        <span style={{
          position: 'absolute',
          left: timelineOffset + ((nthTime * i) * timelineZoom),
          width: 30,
          marginLeft: -15,
          textAlign: 'center'
        }}>{ (s-(s%=60))/60+(9<s?':':':0')+s }</span>
      )
    }
  }

  return (
    <>
      <div className="keyframe-controls">
        <div className="keyframe-controls-left">
          <Form.Select onChange={onSelectAnimationChange} defaultValue={0} value={selectedAnimationIndex}>
            {
              animations.map( (animation, index) => {
                return <option value={index} selected={selectedAnimationIndex == index}>{animation.name}</option>
              })
            }
          </Form.Select>
          &nbsp;<i className="fa-solid fa-rotate"></i>
          &nbsp;<input type="checkbox" checked={looping} onChange={onCheckboxLoopChange} />
        </div>
        <div className="keyframe-controls-center">
          {/* <a title="Delete Keyframe" className="fa-solid fa-trash"></a> */}
          {/* <a title="Previous Keyframe" className="fa-solid fa-chevron-left"></a> */}
          <a title="Play/Pause" className="fa-solid fa-play" onClick={ (e) => onBtnPlayPause() }></a>
          <a title="Stop" className="fa-solid fa-stop" onClick={ (e) => onBtnStop() }></a>
          {/* <a title="Next Keyframe" className="fa-solid fa-chevron-right"></a> */}
          {/* <a title="Add Keyframe" className="fa-solid fa-plus"></a> */}
        </div>
        <div className="keyframe-controls-right">
          <a title="Timeline Zoom In" className="fa-solid fa-magnifying-glass-plus" onClick={ (e) => onBtnZoomIn() }></a>
          <a title="Timeline Zoom Out" className="fa-solid fa-magnifying-glass-minus" onClick={ (e) => onBtnZoomOut() }></a>
        </div>
      </div>
      <div className="keyframe-bar">
        <canvas style={{ position: 'absolute', bottom: 0 }}></canvas>
        <div className="keyframe-time-track">{ timestamps }</div>
        <div className="keyframe-track">
          {(
            currentAnimation ? currentAnimation.nodes.map( (node, index) => {
              return <AnimationNodeTimelineComponent key={`keyframe-node-${index}`} node={node} timelineZoom={timelineZoom} timelineOffset={timelineOffset} />
            }) : <></>
          )}
        </div>
        <div className="keyframe-track-seeker">
          <div className="seeker-thumb"></div>
        </div>
      </div>
    </>
  );

}

const AnimationNodeTimelineComponent = function(props: any){
  const node: KotOR.OdysseyModelAnimationNode = props.node;
  const timelineZoom = props.timelineZoom;
  const timelineOffset = props.timelineOffset;

  return (
    <>
    <div className="keyframe-track-wrapper node" style={{ display: 'flex' }}>
      <div className="track-label" style={{ width: timelineOffset }}>
        <i className="fa-regular fa-square"></i> {node.name}
      </div>
      <div className="track-keyframes" style={{ position: 'relative' }}>
      </div>
    </div>
      {
        [...node.controllers.entries()].map( (value, index) => {
          return <ControllerTimelineComponent key={`keyframe-controller-${value[0]}-${index}`} controller={value[1]} timelineZoom={timelineZoom} timelineOffset={timelineOffset} />
        })
      }
    </>
  );
}

const ControllerTimelineComponent = function(props: any) {
  const controller: KotOR.OdysseyController = props.controller;
  const timelineZoom = props.timelineZoom;
  const timelineOffset = props.timelineOffset;

  return (
    <div className="keyframe-track-wrapper controller" style={{ display: 'flex' }}>
      <div className="track-label" style={{ width: timelineOffset }}>
        <i className="fa-solid fa-circle"></i> {KotOR.OdysseyModelControllerType[controller.type]}
      </div>
      <div className="track-keyframes" style={{ position: 'relative' }}>
        {
          controller.data.map( (keyframe) => {
            return (
              <div className="keyframe" style={{ left: keyframe.time * timelineZoom }} >
                <i className="fa-solid fa-diamond"></i>
              </div>
            );
          })
        }
      </div>
    </div>
  );

}