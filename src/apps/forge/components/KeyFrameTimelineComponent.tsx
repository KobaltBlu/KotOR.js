import React, { useEffect, useRef, useState } from "react";
import { Form } from "react-bootstrap";
import * as KotOR from "../KotOR";
import { TabModelViewerState } from "../states/tabs";
import { useEffectOnce } from "../helpers/UseEffectOnce";

export const KeyFrameTimelineComponent = function(props: any){
  const tab: TabModelViewerState = props.tab;

  const [currentAnimation, setCurrentAnimation] = useState<KotOR.OdysseyModelAnimation>();
  const [selectedAnimationIndex, setSelectedAnimationIndex] = useState<number>(tab.selectedAnimationIndex);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [scrollHeight, setScrollHeight] = useState<number>(0);
  const [panelHeight, setPanelHeight] = useState<number>(0);
  const [seekPositionLeft, setSeekPositionLeft] = useState<number>(0);
  const waveformCanvasRef = useRef<HTMLCanvasElement>();
  const keyframeWindowRef = useRef<HTMLDivElement>();

  const [animations, setAnimations] = useState<KotOR.OdysseyModelAnimation[]>([]);
  const [timelineZoom, setTimelineZoom] = useState<number>(tab.timelineZoom);
  const [timelineOffset, setTimelineOffset] = useState<number>(tab.timelineOffset);
  const [looping, setLooping] = useState<boolean>(tab.looping);
  const [paused, setPaused] = useState<boolean>(tab.paused);

  const onEditorFileLoad = function(){
    setAnimations( tab.animations );
    setCurrentAnimation( tab.animations[0] );
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
  };

  const onLoopChange = function(){
    setLooping(tab.looping);
  };

  const onAnimate = function(){
    updateSeekerPosition();
  }

  const onPlay = function(){
    setPaused(false);
  }

  const onPause = function(){
    setPaused(true);
  }

  const panelObserver = new ResizeObserver((_elements: ResizeObserverEntry[]) => {
    setPanelHeight(keyframeWindowRef.current?.clientHeight || 0);
  });

  useEffectOnce( () => { //constructor
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    tab.addEventListener('onKeyFrameTrackZoomIn', onKeyFrameTrackZoomIn);
    tab.addEventListener('onKeyFrameTrackZoomOut', onKeyFrameTrackZoomOut);
    tab.addEventListener('onAnimationChange', onAnimationChange);
    tab.addEventListener('onLoopChange', onLoopChange);
    tab.addEventListener('onAnimate', onAnimate);
    tab.addEventListener('onPlay', onPlay);
    tab.addEventListener('onPause', onPause);
    return () => { //destructor
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener('onKeyFrameTrackZoomIn', onKeyFrameTrackZoomIn);
      tab.removeEventListener('onKeyFrameTrackZoomOut', onKeyFrameTrackZoomOut);
      tab.removeEventListener('onAnimationChange', onAnimationChange);
      tab.removeEventListener('onLoopChange', onLoopChange);
      tab.removeEventListener('onAnimate', onAnimate);
      tab.removeEventListener('onPlay', onPlay);
      tab.removeEventListener('onPause', onPause);
    }
  });

  useEffect( () => {
    setScrollHeight(keyframeWindowRef.current?.scrollHeight || 0);
    setScrollTop(keyframeWindowRef.current?.scrollTop || 0);
    setPanelHeight(keyframeWindowRef.current?.clientHeight || 0);
    if(keyframeWindowRef?.current) panelObserver.observe(keyframeWindowRef?.current);
  }, [keyframeWindowRef.current]);

  const timestamps: JSX.Element[] = [];

  const onBtnZoomIn = function(){
    tab.keyframeTrackZoomIn();
  };

  const onBtnZoomOut = function(){
    tab.keyframeTrackZoomOut();
  };

  const onBtnPlayPause = function(){
    if(paused){
      tab.play();
    }else{
      tab.pause();
    }
  };

  const onBtnStop = function(){
    tab.stopAnimation();
  };

  const onCheckboxLoopChange = function(e: React.ChangeEvent<HTMLInputElement>){
    tab.setLooping(e.target.checked);
    setLooping(e.target.checked);
  }

  const onSelectAnimationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(e.target.value);
    tab.setAnimationByIndex(index);
  }

  const updateSeekerPosition = () => {
    const seekPosition = (tab.getCurrentAnimationElapsed() * tab.timelineZoom);
    setSeekPositionLeft(seekPosition);
  }

  const onClickKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    if(waveformCanvasRef.current && waveformCanvasRef.current.parentElement){

      //Update the lips elapsed time based on the seekbar position
      const position = getTimelinePixelPositionRelativeToMouseEvent(e);
      const time = getTimelinePixelPositionAsTime(position);
      tab.seek(time);
      
      const seekPosition = (tab.getCurrentAnimationElapsed() * tab.timelineZoom);
      setSeekPositionLeft(seekPosition);
    }
  }

  const onMouseMoveKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    const position = getTimelinePixelPositionRelativeToMouseEvent(e);
    const time = getTimelinePixelPositionAsTime(position);
    if(tab.scrubbing){
      tab.seek(time);
      
      const seekPosition = (tab.getCurrentAnimationElapsed() * tab.timelineZoom);
      setSeekPositionLeft(seekPosition);
    
      tab.pause();
      clearTimeout(tab.scrubbingTimeout);
    }
    
    if(tab.dragging_frame){
      tab.dragging_frame.time = time;
      // setKeyFrames([...tab.lip.keyframes]);
    }
  }

  const onMouseDownKeyFrameWindow = (_e: React.MouseEvent<HTMLDivElement>) => {
    tab.dragging_frame = undefined;
    tab.scrubbing = true;
    tab.pause();
  }

  const onMouseUpKeyFrameWindow = (_e: React.MouseEvent<HTMLDivElement>) => {
    clearTimeout(tab.scrubbingTimeout);
    if(tab.scrubbing){
      tab.pause();
      const seekPosition = (tab.getCurrentAnimationElapsed() * tab.timelineZoom);
      setSeekPositionLeft(seekPosition);
    }
    tab.scrubbing = false;
    tab.dragging_frame = undefined;
  }

  const onScrollKeyFrameWindow = (e: React.UIEvent<HTMLDivElement>) => {
    if(e.target){
      setScrollTop((e.target as HTMLDivElement).scrollTop);
      setScrollHeight((e.target as HTMLDivElement).scrollHeight);
    }
  }

  const getTimelinePixelPositionRelativeToMouseEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if(waveformCanvasRef.current && waveformCanvasRef.current.parentElement){
      const keyframeWindowElement = waveformCanvasRef.current.parentElement;
      const bRect = keyframeWindowElement.getBoundingClientRect();

      const maxPixels = (tab.getCurrentAnimationLength() * tab.timelineZoom);
      
      const position = (e.pageX - 200 - bRect.left + keyframeWindowElement.scrollLeft);
      if(position < 0) return 0;
      if(position > maxPixels) return maxPixels;
      return position;
    }
    return 0;
  }

  const getTimelinePixelPositionAsTime = (position: number = 0) => {
    const percentage = position / (tab.getCurrentAnimationLength() * tab.timelineZoom);
    const time = tab.getCurrentAnimationLength() * percentage;
    if(time < 0) return 0;
    if(time > tab.getCurrentAnimationLength()) return tab.getCurrentAnimationLength();
    return time;
  };

  if(currentAnimation){
    //Build timeline second markers
    let factor = 10;

    if(timelineZoom < 250){
      factor = 30;
    }

    if(timelineZoom <= 150){
      factor = 60;
    }

    const nthTime = factor/60;
    const count = Math.ceil(Math.ceil(currentAnimation.length) / nthTime);

    for(let i = 0; i <= count; i++){
      let s = factor * i;
      const time = (s-(s%=60))/60+(9<s?':':':0')+s;
      timestamps.push(
        <span key={time} style={{
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
          <Form.Select onChange={onSelectAnimationChange} value={selectedAnimationIndex}>
            {
              animations.map( (animation, index) => {
                return <option key={`${index}-${animation.name}`} value={index}>{animation.name}</option>
              })
            }
          </Form.Select>
          &nbsp;<i className="fa-solid fa-rotate"></i>
          &nbsp;<input type="checkbox" checked={looping} onChange={onCheckboxLoopChange} />
        </div>
        <div className="keyframe-controls-center">
          {/* <a title="Delete Keyframe" className="fa-solid fa-trash"></a> */}
          {/* <a title="Previous Keyframe" className="fa-solid fa-chevron-left"></a> */}
          <a title={!paused ? `Pause` : `Play`} className={`fa-solid fa-${!paused ? `pause` : `play`}`} onClick={ (e) => onBtnPlayPause() }></a>
          <a title="Stop" className="fa-solid fa-stop" onClick={ (e) => onBtnStop() }></a>
          {/* <a title="Next Keyframe" className="fa-solid fa-chevron-right"></a> */}
          {/* <a title="Add Keyframe" className="fa-solid fa-plus"></a> */}
        </div>
        <div className="keyframe-controls-right">
          <a title="Timeline Zoom In" className="fa-solid fa-magnifying-glass-plus" onClick={ (e) => onBtnZoomIn() }></a>
          <a title="Timeline Zoom Out" className="fa-solid fa-magnifying-glass-minus" onClick={ (e) => onBtnZoomOut() }></a>
        </div>
      </div>
      <div ref={keyframeWindowRef as any} className="keyframe-bar" onClick={onClickKeyFrameWindow} onMouseDown={onMouseDownKeyFrameWindow} onMouseUp={onMouseUpKeyFrameWindow} onMouseMove={onMouseMoveKeyFrameWindow} onScroll={onScrollKeyFrameWindow}>
        <canvas ref={waveformCanvasRef as any} style={{position: 'absolute', top: 0, left: 200, width: (tab.getCurrentAnimationLength() * tab.timelineZoom) }} />
        <div className="keyframe-time-track" style={{ top: scrollTop, right: 'initial', width: 200 + (tab.getCurrentAnimationLength() * tab.timelineZoom), zIndex: 1 }}>{ timestamps }</div>
        <div className="keyframe-track" style={{ height: scrollHeight, right: 'initial', width: 200 + (tab.getCurrentAnimationLength() * tab.timelineZoom) }}>
          {(
            currentAnimation ? currentAnimation.nodes.map( (node, index) => {
              return <AnimationNodeTimelineComponent key={`keyframe-node-${index}`} node={node} timelineZoom={timelineZoom} timelineOffset={timelineOffset} />
            }) : <></>
          )}
        </div>
        <div className="keyframe-track-seeker" style={{top: (scrollTop + 12.5), left: seekPositionLeft, marginLeft: 200, height: panelHeight, zIndex: 1}}>
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
        [...node.controllers.entries()].map( (value, _index) => {
          return <ControllerTimelineComponent key={`keyframe-controller-${value[1].uuid}`} controller={value[1]} timelineZoom={timelineZoom} timelineOffset={timelineOffset} />
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
          controller.data.map( (keyframe, index) => {
            return (
              <div key={`controller-keyframe-${controller.uuid}-${index}-${keyframe.time}`} className="keyframe" style={{ left: keyframe.time * timelineZoom }} >
                <i className="fa-solid fa-diamond"></i>
              </div>
            );
          })
        }
      </div>
    </div>
  );

}