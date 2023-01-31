import React, { useEffect, useRef, useState } from "react"
import { LayoutContainer } from "../../LayoutContainer";
import TabManager from "../TabManager";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { TabLIPEditorState, TabLIPEditorStateEventListenerTypes } from "../../../states/tabs/tab-lip-editor/TabLIPEditorState";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { TabManagerProvider } from "../../../context/TabManagerContext";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import type { LIPObject } from "../../../../../resource/LIPObject";
import type{ LIPKeyFrame } from "../../../../../interface/resource/LIPKeyFrame";
import Draggable from "react-draggable";

declare const KotOR: any;

export const TabLIPEditor = function(props: BaseTabProps){

  const tab: TabLIPEditorState = props.tab as TabLIPEditorState;

  const southPanel = (
    <UILIPKeyFramePanel tab={tab}></UILIPKeyFramePanel>
  );

  const eastPanel = (
    <UILIPUtilitiesControl tab={tab}></UILIPUtilitiesControl>
  );

  useEffectOnce(() => {
    tab.openFile().then( (lip: LIPObject) => {
      console.log('lip', lip);
    });
    return () => {

    };
  });

  return (
    <LayoutContainerProvider>
      <LayoutContainer southContent={southPanel} southSize={140} eastContent={eastPanel}>
        {tab.ui3DRendererView}
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
  const [keyframes, setKeyFrames] = useState<LIPKeyFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<LIPKeyFrame>(tab.selected_frame);
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

  const onLoad = (lip: LIPObject) => {
    setKeyFrames(lip.keyframes);
    setDuration(lip.duration);
  }

  const onAudioLoad = () => {
    updateUI();
  };

  const onHeadLoad = () => {

  };

  const onKeyFrameSelect = (keyframe: LIPKeyFrame) => {
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

  const onClickKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    if(waveformCanvasRef.current && waveformCanvasRef.current.parentElement){
      const keyframeWindowElement = waveformCanvasRef.current.parentElement;
      const bRect = keyframeWindowElement.getBoundingClientRect();

      //Update the lips elapsed time based on the seekbar position
      let position = e.pageX - bRect.left + keyframeWindowElement.scrollLeft;
      let percentage = position / (tab.lip.duration * tab.timeline_zoom);
      tab.seek(tab.lip.duration * percentage)
      
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

  const onKeyFrameMouseDown = (e: React.MouseEvent<HTMLDivElement>, keyframe: LIPKeyFrame) => {
    e.stopPropagation();
    tab.selectKeyFrame(keyframe);
    tab.seek(keyframe.time);
    updateSeekerPosition();
    updateScrollBoundsFocus(true);
  }

  const onKeyFrameMouseUp = (e: React.MouseEvent<HTMLDivElement>, keyframe: LIPKeyFrame) => {
    e.stopPropagation();
  }

  const onClickAddKeyFrame = (e: React.MouseEvent<HTMLAnchorElement>) => {
    let newFrame = tab.addKeyFrame(
      tab.lip.elapsed, 0
    );
    tab.selectKeyFrame(newFrame);
  }

  return (
    <>
      <div className="keyframe-controls">
        <a href="#" title="Delete Keyframe" className="fa-solid fa-trash" style={{textDecoration: 'none'}}></a>
        <a href="#" title="Previous Keyframe" className="fa-solid fa-chevron-left" style={{textDecoration: 'none'}} onClick={onClickPreviousKeyFrame}></a>
        <a href="#" title={playing ? `Pause` : `Play`} className={`fa-solid fa-${playing ? `pause` : `play`}`} style={{textDecoration: 'none'}} onClick={onClickPlayPause}></a>
        <a href="#" title="Stop" className="fa-solid fa-stop" style={{textDecoration: 'none'}} onClick={onClickStop}></a>
        <a href="#" title="Next Keyframe" className="fa-solid fa-chevron-right" style={{textDecoration: 'none'}} onClick={onClickNextKeyFrame}></a>

        <a href="#" title="Add Keyframe" className="fa-solid fa-plus" style={{textDecoration: 'none'}} onClick={onClickAddKeyFrame}></a>
        <a href="#" title="Timeline Zoom In" className="fa-solid fa-magnifying-glass-plus" style={{textDecoration: 'none', float:'right'}} onClick={onClickZoomIn}></a>
        <a href="#" title="Timeline Zoom Out" className="fa-solid fa-magnifying-glass-minus" style={{textDecoration: 'none', float:'right'}} onClick={onClickZoomOut}></a>
      </div>
      <div className="keyframe-bar" onClick={onClickKeyFrameWindow}>
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
        <div className="keyframe-track">
          {
            (
              keyframes.length ? keyframes.map( 
                (keyframe: LIPKeyFrame, index: number) => {
                  //onStart={(e) => handleStart(e, 'north') } onStop={(e) => handleStop(e, 'north') }
                  return (
                    <Draggable key={`${keyframe.uuid}`} bounds="parent" axis="x" >
                      <div className={`keyframe ${selectedFrame == keyframe ? 'selected' : ''}`} style={{left: (keyframe.time * zoom)}} 
                        onClick={(e: any) => onKeyFrameMouseDown(e, keyframe)} 
                        onMouseDown={(e: any) => onKeyFrameMouseDown(e, keyframe)} 
                        onMouseUp={(e: any) => onKeyFrameMouseUp(e, keyframe)}
                      >
                        <i className="fa-solid fa-diamond"></i>
                      </div>
                    </Draggable>
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
