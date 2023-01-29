import React, { useEffect, useRef, useState } from "react"
import { LayoutContainer } from "../LayoutContainer";
import TabManager from "./TabManager";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { TabLIPEditorState } from "../../states/tabs/TabLIPEditorState";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { TabManagerProvider } from "../../context/TabManagerContext";
import { LayoutContainerProvider } from "../../context/LayoutContainerContext";
import type { LIPObject } from "../../../../KotOR";
import type{ LIPKeyFrame } from "../../../../interface/resource/LIPKeyFrame";
import Draggable from "react-draggable";

declare const KotOR: any;

export const TabLIPEditor = function(props: BaseTabProps){

  const tab: TabLIPEditorState = props.tab as TabLIPEditorState;

  const southPanel = (
    <UILIPKeyframePanel tab={tab}></UILIPKeyframePanel>
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

export const UILIPKeyframePanel = function(props: any){
  const tab: TabLIPEditorState = props.tab as TabLIPEditorState;
  const waveformCanvasRef = useRef<HTMLCanvasElement>();
  const seekerRef = useRef<HTMLDivElement>();
  const [playing, setPlaying] = useState<boolean>(tab.playing);
  const [seekPositionLeft, setSeekPositionLeft] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(tab.timeline_zoom);
  const [keyframes, setKeyframes] = useState<LIPKeyFrame[]>([]);
  const [duration, setDuration] = useState<number>(1);
  const [timestamps, setTimestamps] = useState<string[]>([]);
  // const [timelineWidth, setTimelineWidth] = useState<number>(250);
  const [timelineScaleFactor, setTimelineScaleFactor] = useState<number>(10);

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
    setKeyframes(lip.keyframes);
    setDuration(lip.Header.Length);
  }

  const barObserver = new ResizeObserver((elements: ResizeObserverEntry[]) => {
    for(let i = 0; i < elements.length; i++){
      drawWaveform();
    }
  });

  useEffectOnce( () => {
    tab.addEventListener('onLIPLoaded', onLoad);
    tab.addEventListener('onAudioLoad', updateUI);
    tab.addEventListener('onAnimate', onAnimate);
    rebuildTimelineLabels();
    return () => {
      tab.removeEventListener('onLIPLoaded', onLoad);
      tab.removeEventListener('onAudioLoad', updateUI);
      tab.removeEventListener('onAnimate', onAnimate);
      if(waveformCanvasRef?.current?.parentElement) barObserver.unobserve(waveformCanvasRef?.current?.parentElement);
    }
  });

  useEffect( () => {
    updateUI();
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
      const seekPosition = (tab.lip.elapsed * tab.timeline_zoom);
      setSeekPositionLeft(seekPosition);
      if(waveformCanvasRef.current && waveformCanvasRef.current.parentElement){
        if(tab.playing){
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

  const onClickKeyframeWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    if(waveformCanvasRef.current && waveformCanvasRef.current.parentElement){
      const keyframeWindowElement = waveformCanvasRef.current.parentElement;
      const bRect = keyframeWindowElement.getBoundingClientRect();

      let was_playing = tab.playing;
      tab.pause();

      //Update the lips elapsed time based on the seekbar position
      let position = e.pageX - bRect.left + keyframeWindowElement.scrollLeft;
      let percentage = position / (tab.lip.Header.Length * tab.timeline_zoom);

      if(tab.lip instanceof KotOR.LIPObject){
        tab.lip.elapsed = tab.lip.Header.Length * percentage;
      }
      
      const seekPosition = (tab.lip.elapsed * tab.timeline_zoom);
      setSeekPositionLeft(seekPosition);

      if(was_playing)
        tab.play();

    }
  }

  return (
    <>
      <div className="keyframe-controls">
        <a href="#" title="Delete Keyframe" className="fa-solid fa-trash" style={{textDecoration: 'none'}}></a>
        <a href="#" title="Previous Keyframe" className="fa-solid fa-chevron-left" style={{textDecoration: 'none'}}></a>
        <a href="#" title={playing ? `Pause` : `Play`} className={`fa-solid fa-${playing ? `pause` : `play`}`} style={{textDecoration: 'none'}} onClick={onClickPlayPause}></a>
        <a href="#" title="Stop" className="fa-solid fa-stop" style={{textDecoration: 'none'}} onClick={onClickStop}></a>
        <a href="#" title="Next Keyframe" className="fa-solid fa-chevron-right" style={{textDecoration: 'none'}}></a>

        <a href="#" title="Add Keyframe" className="fa-solid fa-plus" style={{textDecoration: 'none'}}></a>
        <a href="#" title="Timeline Zoom In" className="fa-solid fa-magnifying-glass-plus" style={{textDecoration: 'none', float:'right'}} onClick={onClickZoomIn}></a>
        <a href="#" title="Timeline Zoom Out" className="fa-solid fa-magnifying-glass-minus" style={{textDecoration: 'none', float:'right'}} onClick={onClickZoomOut}></a>
      </div>
      <div className="keyframe-bar" onClick={onClickKeyframeWindow}>
        <canvas ref={waveformCanvasRef} style={{position: 'absolute', top: 25, left: 0 }} />
        <div className="keyframe-time-track" style={{width: (Math.ceil(duration) * zoom)}}>
          {
            timestamps.map( (label: string, index: number) => {
              return (
                <span key={`time-${index}`} style={{
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
                    <Draggable key={`keyframe-${index}`} bounds="parent" axis="x" >
                      <div className="keyframe" style={{left: (keyframe.time * zoom)}}></div>
                    </Draggable>
                  )
                }) 
              : <></>
            )
          }
        </div>
        <div ref={seekerRef} className="keyframe-track-seeker" style={{left: seekPositionLeft}}>
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
