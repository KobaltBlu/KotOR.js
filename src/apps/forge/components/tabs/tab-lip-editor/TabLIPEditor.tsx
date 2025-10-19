import React, { useEffect, useRef, useState } from "react"
import { LayoutContainer } from "../../LayoutContainer/LayoutContainer";
import TabManager from "../TabManager";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { TabLIPEditorState, TabLIPEditorStateEventListenerTypes } from "../../../states/tabs";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { TabManagerProvider } from "../../../context/TabManagerContext";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import Draggable from "react-draggable";
import { Form } from "react-bootstrap";
import { LIPShapeLabels } from "../../../data/LIPShapeLabels";

import * as KotOR from "../../../KotOR";
import { UI3DRendererView } from "../../UI3DRendererView";

export const TabLIPEditor = function(props: BaseTabProps){

  const tab: TabLIPEditorState = props.tab as TabLIPEditorState;

  const southPanel = (
    <UILIPKeyFramePanel tab={tab}></UILIPKeyFramePanel>
  );

  const eastPanel = (
    <UILIPUtilitiesControl tab={tab}></UILIPUtilitiesControl>
  );

  useEffectOnce(() => {
    tab.openFile().then( (lip: KotOR.LIPObject) => {
      console.log('lip', lip);
    });
    return () => {

    };
  });

  return (
    <LayoutContainerProvider>
      <LayoutContainer southContent={southPanel} southSize={140} eastContent={eastPanel}>
        <UI3DRendererView context={tab.ui3DRenderer} />
      </LayoutContainer>
    </LayoutContainerProvider>
  )
}

export const UILIPKeyFramePanel = function(props: any){
  const tab: TabLIPEditorState = props.tab as TabLIPEditorState;
  const waveformCanvasRef = useRef<HTMLCanvasElement>();
  const seekerRef = useRef<HTMLDivElement>();
  const [playing, setPlaying] = useState<boolean>(tab.playing);
  const [seekPositionLeft, setSeekPositionLeft] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(tab.timeline_zoom);
  const [keyframes, setKeyFrames] = useState<KotOR.ILIPKeyFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<KotOR.ILIPKeyFrame>(tab.selected_frame);
  const [duration, setDuration] = useState<number>(1);
  const [timestamps, setTimestamps] = useState<string[]>([]);
  // const [timelineWidth, setTimelineWidth] = useState<number>(250);
  const [timelineScaleFactor, setTimelineScaleFactor] = useState<number>(10);
  const [render, rerender] = useState<boolean>(false);

  const updateUI = () => {
    drawWaveform();
  };

  const drawWaveform = () => {
    if(waveformCanvasRef.current){
      const canvas = waveformCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if(ctx){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if(tab.audio_buffer instanceof AudioBuffer){
          let samples = tab.audio_buffer.getChannelData(0);
          let i, len = samples.length;

          const parentHeight = canvas.parentElement?.clientHeight || 0;
          let height = (parentHeight-25) || 38;
          if(height < 38) height = 38;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          canvas.height = height;
          canvas.width = tab.audio_buffer.duration * tab.timeline_zoom;
          
          let width = canvas.width;
          ctx.strokeStyle = '#5bc0de';
          ctx.fillStyle = 'rgba(0, 0, 0, 0)';
          ctx.fillRect(0, 0, width, height);
          ctx.beginPath();
          ctx.moveTo(0,height/2);
          for (i = 0; i < len; i++) {
            ctx.lineTo(
              /* X */ ((i*width) / len),
              /* Y */ ((samples[i]*height/2)+height/2),
            );
          }
          ctx.stroke();
          ctx.closePath();
        }
      }
    }
  };

  const onLoad = (lip: KotOR.LIPObject) => {
    setKeyFrames(lip.keyframes);
    setDuration(lip.duration);
  }

  const onAudioLoad = () => {
    updateUI();
  };

  const onHeadLoad = () => {

  };

  const onKeyFrameSelect = (keyframe: KotOR.ILIPKeyFrame) => {
    setSelectedFrame(keyframe);
    tab.lip.elapsed = keyframe.time;
    updateSeekerPosition();
  }

  const barObserver = new ResizeObserver((elements: ResizeObserverEntry[]) => {
    for(let i = 0; i < elements.length; i++){
      drawWaveform();
    }
  });

  const onPlay = () => {
    setPlaying(true);
  }

  const onPause = () => {
    setPlaying(false);
  }

  const onStop = () => {
    setPlaying(false);
  }

  const onKeyFramesChange = () => {
    setKeyFrames([...tab.lip.keyframes]);
    rerender(!render);
  }

  const onDurationChange = (duration: number) => {
    setDuration(duration);
  }

  useEffectOnce( () => {
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onLIPLoaded', onLoad);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onAudioLoad', onAudioLoad);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onHeadLoad', onHeadLoad);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onAnimate', onAnimate);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameSelect', onKeyFrameSelect);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFramesChange', onKeyFramesChange);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onPlay', onPlay);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onPause', onPause);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onStop', onStop);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onDurationChange', onDurationChange);
    window.addEventListener('mouseup', onMouseUpWindow);
    rebuildTimelineLabels();
    return () => {
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onLIPLoaded', onLoad);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onAudioLoad', onAudioLoad);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onHeadLoad', onHeadLoad);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onAnimate', onAnimate);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFrameSelect', onKeyFrameSelect);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onKeyFramesChange', onKeyFramesChange);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onPlay', onPlay);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onPause', onPause);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onStop', onStop);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onDurationChange', onDurationChange);
      window.removeEventListener('mouseup', onMouseUpWindow);
      if(waveformCanvasRef?.current?.parentElement) barObserver.unobserve(waveformCanvasRef?.current?.parentElement);
    }
  });

  useEffect( () => {
    updateUI();
    rebuildTimelineLabels();
    if(waveformCanvasRef?.current?.parentElement) barObserver.observe(waveformCanvasRef?.current?.parentElement);
  }, [waveformCanvasRef.current]);

  useEffect( () => {
    let _timelineScaleFactor = timelineScaleFactor;
  
    if(zoom < 250){
      _timelineScaleFactor = 30;
    }
  
    if(zoom <= 150){
      _timelineScaleFactor = 60;
    }
    setTimelineScaleFactor(_timelineScaleFactor);
  }, [zoom]);

  useEffect( () => {
    rebuildTimelineLabels();
  }, [duration]);

  useEffect( () => {
    rebuildTimelineLabels();
  }, [keyframes]);

  const onClickPlayPause = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if(tab.playing){
      tab.pause();
    }else{
      tab.play();
    }
    setPlaying(tab.playing);
  };

  const onClickStop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    tab.stop();
    setPlaying(tab.playing);
  }

  const onClickZoomIn = (e: React.MouseEvent<HTMLAnchorElement>) => {
    tab.keyframeTrackZoomIn();
    setZoom(tab.timeline_zoom);
    drawWaveform();
    rebuildTimelineLabels();
  }

  const onClickZoomOut = (e: React.MouseEvent<HTMLAnchorElement>) => {
    tab.keyframeTrackZoomOut();
    setZoom(tab.timeline_zoom);
    drawWaveform();
    rebuildTimelineLabels();
  }

  const onAnimate = (delta: number) => {
    if(seekerRef.current && tab.lip){
      updateSeekerPosition();
      updateScrollBoundsFocus();
    }
  }

  const updateSeekerPosition = () => {
    const seekPosition = (tab.lip.elapsed * tab.timeline_zoom);
    setSeekPositionLeft(seekPosition);
  }

  const updateScrollBoundsFocus = (force: boolean = false) =>{
    if(!tab.lip) return;
    const seekPosition = (tab.lip.elapsed * tab.timeline_zoom);
    if(waveformCanvasRef.current && waveformCanvasRef.current.parentElement){
      if(tab.playing || !!force){
        const keyframeWindowElement = waveformCanvasRef.current.parentElement;
        if(seekPosition > keyframeWindowElement.clientWidth + keyframeWindowElement.scrollLeft){
          keyframeWindowElement.scrollLeft = (seekPosition - 50);
        }
    
        if(seekPosition < keyframeWindowElement.scrollLeft){
          keyframeWindowElement.scrollLeft = (seekPosition - 50);
        }
      }
    }
  }

  const rebuildTimelineLabels = () => {
    //Build timeline second markers
    let nthTime = timelineScaleFactor/60;
    let count = Math.ceil(Math.ceil(duration) / nthTime);
    let timestamps: string[] = [];
    for(let i = 0; i < count; i++){
      let s = (timelineScaleFactor * i);
      timestamps.push(
        (s-(s%=60))/60+(9<s?':':':0')+s
      );
    }
    setTimestamps(timestamps);
    // setTimelineWidth(Math.ceil(duration) * zoom);
  }

  const getTimelinePixelPositionRelativeToMouseEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if(waveformCanvasRef.current && waveformCanvasRef.current.parentElement){
      const keyframeWindowElement = waveformCanvasRef.current.parentElement;
      const bRect = keyframeWindowElement.getBoundingClientRect();

      let maxPixels = (tab.lip.duration * tab.timeline_zoom);
      
      let position = (e.pageX - bRect.left + keyframeWindowElement.scrollLeft);
      if(position < 0) return 0;
      if(position > maxPixels) return maxPixels;
      return position;
    }
    return 0;
  }

  const getTimelinePixelPositionAsTime = (position: number = 0) => {
    let percentage = position / (tab.lip.duration * tab.timeline_zoom);
    let time = tab.lip.duration * percentage;
    if(time < 0) return 0;
    if(time > tab.lip.duration) return tab.lip.duration;
    return time;
  };

  const onClickKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    if(waveformCanvasRef.current && waveformCanvasRef.current.parentElement){

      //Update the lips elapsed time based on the seekbar position
      let position = getTimelinePixelPositionRelativeToMouseEvent(e);
      let time = getTimelinePixelPositionAsTime(position);
      tab.seek(time);
      
      const seekPosition = (tab.lip.elapsed * tab.timeline_zoom);
      setSeekPositionLeft(seekPosition);
    }
  }

  const onClickNextKeyFrame = (e: React.MouseEvent<HTMLAnchorElement>) => {
    tab.selectNextKeyFrame();
    tab.pause();
    tab.seek(tab.selected_frame.time);
    updateSeekerPosition();
    updateScrollBoundsFocus(true);
  }

  const onClickPreviousKeyFrame = (e: React.MouseEvent<HTMLAnchorElement>) => {
    tab.selectPreviousKeyFrame();
    tab.pause();
    tab.seek(tab.selected_frame.time);
    updateSeekerPosition();
    updateScrollBoundsFocus(true);
  }

  const onKeyFrameMouseDown = (e: React.MouseEvent<HTMLDivElement>, keyframe: KotOR.ILIPKeyFrame) => {
    e.stopPropagation();
    e.preventDefault();
    tab.selectKeyFrame(keyframe);
    tab.dragging_frame_snapshot = Object.assign({}, keyframe);
    tab.dragging_frame = keyframe;
  }

  const onKeyFrameMouseUp = (e: React.MouseEvent<HTMLDivElement>, keyframe: KotOR.ILIPKeyFrame) => {
    e.stopPropagation();
    e.preventDefault();
    tab.seek(keyframe.time);
    updateSeekerPosition();
    updateScrollBoundsFocus(true);
    tab.dragging_frame = undefined;
  }

  const onClickAddKeyFrame = (e: React.MouseEvent<HTMLAnchorElement>) => {
    let newFrame = tab.addKeyFrame(
      tab.lip.elapsed, 0
    );
    tab.selectKeyFrame(newFrame);
  }

  const onMouseMoveKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    let position = getTimelinePixelPositionRelativeToMouseEvent(e);
    let time = getTimelinePixelPositionAsTime(position);
    if(tab.scrubbing){
      tab.seek(time);
      
      const seekPosition = (tab.lip.elapsed * tab.timeline_zoom);
      setSeekPositionLeft(seekPosition);
    
      tab.play(0.05);
      clearTimeout(tab.scrubbingTimeout);
      tab.scrubbingTimeout = setTimeout( () => {
        // tab.pause();
      }, 25);
    }
    
    if(tab.dragging_frame){
      tab.dragging_frame.time = time;
      setKeyFrames([...tab.lip.keyframes]);
    }
  }

  const onMouseDownKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    tab.dragging_frame = undefined;
    tab.scrubbing = true;
    tab.pause();
  }

  const onMouseUpKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    clearTimeout(tab.scrubbingTimeout);
    if(tab.scrubbing){
      tab.pause();
      const seekPosition = (tab.lip.elapsed * tab.timeline_zoom);
      setSeekPositionLeft(seekPosition);
    }
    tab.scrubbing = false;
    tab.dragging_frame = undefined;
  }

  const onMouseUpWindow = (e: MouseEvent) => {
    clearTimeout(tab.scrubbingTimeout);
    if(tab.scrubbing){
      tab.pause();
      const seekPosition = (tab.lip.elapsed * tab.timeline_zoom);
      setSeekPositionLeft(seekPosition);
    }
    tab.scrubbing = false;
    tab.dragging_frame = undefined;
  }

  const onKeyFrameShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    let shape = parseInt(e.target.value);
    tab.selected_frame.shape = !isNaN(shape) ? shape : 0;
    tab.selectKeyFrame(tab.selected_frame);
  }

  return (
    <>
      <div className="keyframe-controls">
        <div className="keyframe-controls-left">
        {
          !!selectedFrame ? (
            <div className="selected-keyframe-edit-options">
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
        </div>
        <div className="keyframe-controls-center">
          <a href="#" title="Delete Keyframe" className="fa-solid fa-trash"></a>
          <a href="#" title="Previous Keyframe" className="fa-solid fa-chevron-left" onClick={onClickPreviousKeyFrame}></a>
          <a href="#" title={playing ? `Pause` : `Play`} className={`fa-solid fa-${playing ? `pause` : `play`}`} onClick={onClickPlayPause}></a>
          <a href="#" title="Stop" className="fa-solid fa-stop" onClick={onClickStop}></a>
          <a href="#" title="Next Keyframe" className="fa-solid fa-chevron-right" onClick={onClickNextKeyFrame}></a>
          <a href="#" title="Add Keyframe" className="fa-solid fa-plus" onClick={onClickAddKeyFrame}></a>
        </div>
        <div className="keyframe-controls-right">
          <a href="#" title="Timeline Zoom In" className="fa-solid fa-magnifying-glass-plus" onClick={onClickZoomIn}></a>
          <a href="#" title="Timeline Zoom Out" className="fa-solid fa-magnifying-glass-minus" onClick={onClickZoomOut}></a>
        </div>
      </div>
      <div className="keyframe-bar" onClick={onClickKeyFrameWindow} onMouseDown={onMouseDownKeyFrameWindow} onMouseUp={onMouseUpKeyFrameWindow} onMouseMove={onMouseMoveKeyFrameWindow}>
        <canvas ref={waveformCanvasRef as any} style={{position: 'absolute', top: 25, left: 0 }} />
        <div className="keyframe-time-track" style={{width: (Math.ceil(duration) * zoom)}}>
          {
            timestamps.map( (label: string, index: number) => {
              return (
                <span key={`time-${label}`} style={{
                  position: 'absolute',
                  left: ( (timelineScaleFactor/60) * index) * zoom,
                  width: 30,
                  marginLeft: -15,
                  textAlign: 'center'
                }}>{label}</span>
              )
            })
          }
        </div>
        <div className="keyframe-track" style={{width: (duration * zoom)}}>
          {
            (
              keyframes.length ? keyframes.map( 
                (keyframe: KotOR.ILIPKeyFrame, index: number) => {
                  //onStart={(e) => handleStart(e, 'north') } onStop={(e) => handleStop(e, 'north') }
                  return (
                    <div key={`${keyframe.uuid}`} className={`keyframe ${selectedFrame == keyframe ? 'selected' : ''}`} style={{left: (keyframe.time * zoom)}} 
                      onClick={(e: any) => onKeyFrameMouseUp(e, keyframe)} 
                      onMouseDown={(e: any) => onKeyFrameMouseDown(e, keyframe)} 
                      onMouseUp={(e: any) => onKeyFrameMouseUp(e, keyframe)}
                    >
                      <i className="fa-solid fa-diamond"></i>
                    </div>
                  )
                }) 
              : <></>
            )
          }
        </div>
        <div ref={seekerRef as any} className="keyframe-track-seeker" style={{left: seekPositionLeft}}>
          <div className="seeker-thumb">

          </div>
        </div>
      </div>
    </>
  );
}

export const UILIPUtilitiesControl = function(props: any){
  const tab: TabLIPEditorState = props.tab as TabLIPEditorState;
  return (
    <TabManagerProvider manager={tab.utilitiesTabManager}>
      <TabManager></TabManager>
    </TabManagerProvider>
  );
}
