import React, { useEffect, useRef, useState } from "react";
import { Form } from "react-bootstrap";
import * as KotOR from "@/apps/forge/KotOR";
import {
  ModelViewerEditableTrack,
  ModelViewerTrackFilterScope,
  TabModelViewerState,
} from "@/apps/forge/states/tabs";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";

function formatTimelineClock(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const sec = s < 10 ? `0${s.toFixed(2)}` : s.toFixed(2);
  return `${m}:${sec}`;
}

export const KeyFrameTimelineComponent = function(props: any){
  const tab: TabModelViewerState = props.tab;

  const [currentAnimation, setCurrentAnimation] = useState<KotOR.OdysseyModelAnimation>();
  const [selectedAnimationIndex, setSelectedAnimationIndex] = useState<number>(tab.selectedAnimationIndex);
  const [panelHeight, setPanelHeight] = useState<number>(0);
  const [seekPositionLeft, setSeekPositionLeft] = useState<number>(0);
  const waveformCanvasRef = useRef<HTMLCanvasElement>();
  const keyframeWindowRef = useRef<HTMLDivElement>();
  const keyframeDragMovedRef = useRef<boolean>(false);
  const suppressTimelineClickRef = useRef<boolean>(false);

  const [animations, setAnimations] = useState<KotOR.OdysseyModelAnimation[]>([]);
  const [timelineZoom, setTimelineZoom] = useState<number>(tab.timelineZoom);
  const [timelineOffset, setTimelineOffset] = useState<number>(tab.timelineOffset);
  const [looping, setLooping] = useState<boolean>(tab.looping);
  const [paused, setPaused] = useState<boolean>(tab.paused);
  const [keyframeEditorEnabled, setKeyframeEditorEnabled] = useState<boolean>(tab.keyframeEditorEnabled);
  const [trackFilterScope, setTrackFilterScope] = useState<ModelViewerTrackFilterScope>(tab.trackFilterScope);
  const [tracks, setTracks] = useState<ModelViewerEditableTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>(tab.selectedTrack?.id);
  const [selectedKeyRef, setSelectedKeyRef] = useState<string | undefined>(undefined);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const onEditorFileLoad = function(){
    setAnimations( tab.animations );
    setCurrentAnimation( tab.currentAnimation );
    setSelectedAnimationIndex( tab.selectedAnimationIndex );
    setTracks(tab.getEditableTracks());
    setExpandedNodes({});
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

  const onKeyframeEditorChange = function(){
    setKeyframeEditorEnabled(tab.keyframeEditorEnabled);
    setTrackFilterScope(tab.trackFilterScope);
    setTracks(tab.getEditableTracks());
    setSelectedTrackId(tab.selectedTrack?.id);
    if (tab.selectedKey) {
      setSelectedKeyRef(`${tab.selectedKey.trackId}:${tab.selectedKey.keyIndex}`);
    } else {
      setSelectedKeyRef(undefined);
    }
  }

  const onPlay = function(){
    setPaused(false);
  }

  const onPause = function(){
    setPaused(true);
  }

  const panelObserver = new ResizeObserver((elements: ResizeObserverEntry[]) => {
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
    tab.addEventListener('onKeyframeEditorChange', onKeyframeEditorChange);
    tab.addEventListener('onKeyFramesChange', onKeyframeEditorChange);
    tab.addEventListener('onTrackSelectionChange', onKeyframeEditorChange);
    tab.addEventListener('onKeySelectionChange', onKeyframeEditorChange);
    return () => { //destructor
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener('onKeyFrameTrackZoomIn', onKeyFrameTrackZoomIn);
      tab.removeEventListener('onKeyFrameTrackZoomOut', onKeyFrameTrackZoomOut);
      tab.removeEventListener('onAnimationChange', onAnimationChange);
      tab.removeEventListener('onLoopChange', onLoopChange);
      tab.removeEventListener('onAnimate', onAnimate);
      tab.removeEventListener('onPlay', onPlay);
      tab.removeEventListener('onPause', onPause);
      tab.removeEventListener('onKeyframeEditorChange', onKeyframeEditorChange);
      tab.removeEventListener('onKeyFramesChange', onKeyframeEditorChange);
      tab.removeEventListener('onTrackSelectionChange', onKeyframeEditorChange);
      tab.removeEventListener('onKeySelectionChange', onKeyframeEditorChange);
    }
  });

  useEffect( () => {
    setPanelHeight(keyframeWindowRef.current?.clientHeight || 0);
    if(keyframeWindowRef?.current) panelObserver.observe(keyframeWindowRef?.current);
  }, [keyframeWindowRef.current]);

  useEffect(() => {
    const onWindowMouseUp = () => {
      if (tab.dragging_frame) {
        tab.dragging_frame = undefined;
        suppressTimelineClickRef.current = keyframeDragMovedRef.current;
      }
      keyframeDragMovedRef.current = false;
    };
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [tab]);

  const timestamps: JSX.Element[] = [];
  const trackContentRows = (() => {
    const grouped = new Map<string, number>();
    for (let i = 0; i < tracks.length; i++) {
      const n = tracks[i].nodeName;
      grouped.set(n, (grouped.get(n) || 0) + 1);
    }
    let rows = 0;
    for (const [nodeName, controllerCount] of grouped.entries()) {
      rows += 1; // node row
      const expanded = expandedNodes[nodeName] !== false;
      if (expanded) rows += controllerCount;
    }
    return Math.max(rows, 1);
  })();
  const trackContentHeight = Math.max(trackContentRows * 27, Math.max(panelHeight - 25, 54));

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

  const onToggleEditor = function(){
    tab.setKeyframeEditorEnabled(!keyframeEditorEnabled);
  };

  const onCheckboxLoopChange = function(e: React.ChangeEvent<HTMLInputElement>){
    tab.setLooping(e.target.checked);
    setLooping(e.target.checked);
  }

  const onSelectAnimationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(e.target.value);
    tab.setAnimationByIndex(index);
    setTracks(tab.getEditableTracks());
  }

  const onTrackFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scope = e.target.value as ModelViewerTrackFilterScope;
    tab.setTrackFilterScope(scope);
  };

  const toggleNodeExpanded = (nodeName: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeName]: prev[nodeName] === undefined ? false : !prev[nodeName],
    }));
  };

  const updateSeekerPosition = () => {
    const seekPosition = (tab.getCurrentAnimationElapsed() * tab.timelineZoom);
    setSeekPositionLeft(seekPosition);
  }

  const isKeyframeEvent = (e: React.MouseEvent<HTMLElement>): boolean => {
    const target = e.target as HTMLElement | null;
    return !!target?.closest('.keyframe');
  };

  const onClickKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isKeyframeEvent(e)) return;
    if (suppressTimelineClickRef.current) {
      suppressTimelineClickRef.current = false;
      return;
    }
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
    if (isKeyframeEvent(e) && !tab.dragging_frame) return;
    let position = getTimelinePixelPositionRelativeToMouseEvent(e);
    let time = getTimelinePixelPositionAsTime(position);
    if(tab.scrubbing){
      tab.seek(time);
      
      const seekPosition = (tab.getCurrentAnimationElapsed() * tab.timelineZoom);
      setSeekPositionLeft(seekPosition);
    
      tab.pause();
      clearTimeout(tab.scrubbingTimeout);
    }
    
    if(tab.dragging_frame && typeof tab.dragging_frame.trackId === 'string'){
      keyframeDragMovedRef.current = true;
      tab.updateKey(tab.dragging_frame.trackId, tab.dragging_frame.keyIndex, { time }, { captureUndo: false });
    }
  }

  const onMouseDownKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isKeyframeEvent(e)) return;
    if (e.button !== 0) return;
    tab.dragging_frame = undefined;
    keyframeDragMovedRef.current = false;
    tab.scrubbing = true;
    tab.pause();
  }

  const onMouseUpKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    clearTimeout(tab.scrubbingTimeout);
    if(tab.scrubbing){
      tab.pause();
      const seekPosition = (tab.getCurrentAnimationElapsed() * tab.timelineZoom);
      setSeekPositionLeft(seekPosition);
    }
    tab.scrubbing = false;
    tab.dragging_frame = undefined;
    keyframeDragMovedRef.current = false;
  }

  const onKeyframeMouseDown = (e: React.MouseEvent<HTMLDivElement>, trackId: string, keyIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (keyframeEditorEnabled) {
      tab.captureUndoSnapshot();
    }
    tab.selectKey(trackId, keyIndex);
    keyframeDragMovedRef.current = false;
    if (keyframeEditorEnabled) {
      tab.dragging_frame = { trackId, keyIndex };
    } else {
      tab.dragging_frame = undefined;
    }
  };

  const onKeyframeClick = (e: React.MouseEvent<HTMLDivElement>, trackId: string, keyIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    tab.selectKey(trackId, keyIndex);
  };

  const onKeyframeMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    suppressTimelineClickRef.current = keyframeDragMovedRef.current;
    keyframeDragMovedRef.current = false;
    tab.dragging_frame = undefined;
  };

  const onScrollKeyFrameWindow = (e: React.UIEvent<HTMLDivElement>) => {
    if(!e.target) return;
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
    <div className="mvp-keyframe-dock">
      <div className="mvp-keyframe-toolbar">
        <div className="mvp-keyframe-toolbar__left">
          <Form.Select onChange={onSelectAnimationChange} value={selectedAnimationIndex}>
            {
              animations.map( (animation, index) => {
                return <option key={`${index}-${animation.name}`} value={index}>{animation.name}</option>
              })
            }
          </Form.Select>
          <label className="mvp-keyframe-toolbar__loop">
            <i className="fa-solid fa-rotate"></i>
            <input type="checkbox" checked={looping} onChange={onCheckboxLoopChange} />
          </label>
          <button className={`mvp-btn mvp-btn--edit ${keyframeEditorEnabled ? 'is-active' : ''}`} onClick={onToggleEditor}>Edit</button>
          <Form.Select size="sm" value={trackFilterScope} onChange={onTrackFilterChange} style={{ width: 160 }}>
            <option value="all">All Tracks</option>
            <option value="selectedNode">Selected Node</option>
            <option value="cameraHook">Camera Hook</option>
          </Form.Select>
          <span className="mvp-keyframe-toolbar__clock" title="Playhead / duration">
            <span>{formatTimelineClock(tab.getCurrentAnimationElapsed())}</span>
            <span>/</span>
            <span>{formatTimelineClock(tab.getCurrentAnimationLength())}</span>
          </span>
        </div>
        <div className="mvp-keyframe-toolbar__center">
          <div className="mvp-keyframe-toolbar__btn-group">
            <button title={!paused ? `Pause` : `Play`} className={`mvp-btn mvp-btn--play fa-solid fa-${!paused ? `pause` : `play`}`} onClick={onBtnPlayPause}></button>
            <button title="Stop" className="mvp-btn fa-solid fa-stop" onClick={onBtnStop}></button>
          </div>
        </div>
        <div className="mvp-keyframe-toolbar__right">
          <div className="mvp-keyframe-toolbar__btn-group">
            <button title="Timeline Zoom In" className="mvp-btn fa-solid fa-magnifying-glass-plus" onClick={onBtnZoomIn}></button>
            <button title="Timeline Zoom Out" className="mvp-btn fa-solid fa-magnifying-glass-minus" onClick={onBtnZoomOut}></button>
          </div>
        </div>
      </div>
      <div className="mvp-keyframe-dock-timeline">
        <div ref={keyframeWindowRef as any} className="keyframe-bar" onClick={onClickKeyFrameWindow} onMouseDown={onMouseDownKeyFrameWindow} onMouseUp={onMouseUpKeyFrameWindow} onMouseMove={onMouseMoveKeyFrameWindow} onScroll={onScrollKeyFrameWindow}>
          <canvas ref={waveformCanvasRef as any} style={{position: 'absolute', top: 0, left: 200, width: (tab.getCurrentAnimationLength() * tab.timelineZoom) }} />
          <div className="keyframe-time-track" style={{ top: 0, right: 'initial', width: 200 + (tab.getCurrentAnimationLength() * tab.timelineZoom), zIndex: 1 }}>{ timestamps }</div>
          <div className="keyframe-track" style={{ height: trackContentHeight, right: 'initial', width: 200 + (tab.getCurrentAnimationLength() * tab.timelineZoom) }}>
            <TrackTreeTimelineComponent
              tracks={tracks}
              timelineZoom={timelineZoom}
              timelineOffset={timelineOffset}
              selectedTrackId={selectedTrackId}
              selectedKeyRef={selectedKeyRef}
              keyframeEditorEnabled={keyframeEditorEnabled}
              expandedNodes={expandedNodes}
              onToggleNodeExpanded={toggleNodeExpanded}
              onTrackSelect={(trackId) => tab.selectTrack(trackId)}
              onKeyframeClick={onKeyframeClick}
              onKeyframeMouseDown={onKeyframeMouseDown}
              onKeyframeMouseUp={onKeyframeMouseUp}
            />
          </div>
          <div className="keyframe-track-seeker" style={{top: 12.5, left: seekPositionLeft, marginLeft: 200, height: trackContentHeight, zIndex: 1}}>
            <div className="seeker-thumb"></div>
          </div>
        </div>
      </div>
    </div>
  );

}

const TrackTreeTimelineComponent = function(props: any) {
  const tracks: ModelViewerEditableTrack[] = props.tracks;
  const timelineZoom = props.timelineZoom;
  const timelineOffset = props.timelineOffset;
  const selectedTrackId: string | undefined = props.selectedTrackId;
  const selectedKeyRef: string | undefined = props.selectedKeyRef;
  const keyframeEditorEnabled: boolean = props.keyframeEditorEnabled;
  const expandedNodes: Record<string, boolean> = props.expandedNodes;
  const onToggleNodeExpanded: (nodeName: string) => void = props.onToggleNodeExpanded;
  const onTrackSelect: (trackId: string) => void = props.onTrackSelect;
  const onKeyframeClick: (e: React.MouseEvent<HTMLDivElement>, trackId: string, keyIndex: number) => void = props.onKeyframeClick;
  const onKeyframeMouseDown: (e: React.MouseEvent<HTMLDivElement>, trackId: string, keyIndex: number) => void = props.onKeyframeMouseDown;
  const onKeyframeMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void = props.onKeyframeMouseUp;

  const nodeMap = new Map<string, ModelViewerEditableTrack[]>();
  for (const track of tracks) {
    const arr = nodeMap.get(track.nodeName) ?? [];
    arr.push(track);
    nodeMap.set(track.nodeName, arr);
  }

  return (
    <>
      {[...nodeMap.entries()].map(([nodeName, nodeTracks]) => {
        const isExpanded = expandedNodes[nodeName] !== false;
        return (
          <React.Fragment key={`node-${nodeName}`}>
            <div className="keyframe-track-wrapper node" style={{ display: 'flex' }}>
              <div
                className="track-label"
                style={{ width: timelineOffset, cursor: 'pointer' }}
                onClick={() => onToggleNodeExpanded(nodeName)}
              >
                <i className={`fa-solid ${isExpanded ? 'fa-caret-down' : 'fa-caret-right'}`}></i>&nbsp;
                <i className="fa-regular fa-square"></i>&nbsp;{nodeName}
              </div>
              <div className="track-keyframes" style={{ position: 'relative' }} />
            </div>
            {isExpanded && nodeTracks.map((track) => (
              <TrackTimelineComponent
                key={track.id}
                track={track}
                timelineZoom={timelineZoom}
                timelineOffset={timelineOffset}
                selectedTrackId={selectedTrackId}
                selectedKeyRef={selectedKeyRef}
                keyframeEditorEnabled={keyframeEditorEnabled}
                onTrackSelect={onTrackSelect}
                onKeyframeClick={onKeyframeClick}
                onKeyframeMouseDown={onKeyframeMouseDown}
                onKeyframeMouseUp={onKeyframeMouseUp}
              />
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
}

const TrackTimelineComponent = function(props: any) {
  const track: ModelViewerEditableTrack = props.track;
  const timelineZoom = props.timelineZoom;
  const timelineOffset = props.timelineOffset;
  const selectedTrackId: string | undefined = props.selectedTrackId;
  const selectedKeyRef: string | undefined = props.selectedKeyRef;
  const keyframeEditorEnabled: boolean = props.keyframeEditorEnabled;
  const onTrackSelect: (trackId: string) => void = props.onTrackSelect;
  const onKeyframeClick: (e: React.MouseEvent<HTMLDivElement>, trackId: string, keyIndex: number) => void = props.onKeyframeClick;
  const onKeyframeMouseDown: (e: React.MouseEvent<HTMLDivElement>, trackId: string, keyIndex: number) => void = props.onKeyframeMouseDown;
  const onKeyframeMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void = props.onKeyframeMouseUp;

  return (
    <div className="keyframe-track-wrapper controller" style={{ display: 'flex' }}>
      <div
        className="track-label"
        style={{ width: timelineOffset, cursor: 'pointer', background: selectedTrackId === track.id ? 'rgba(70,120,255,0.15)' : undefined }}
        onClick={() => onTrackSelect(track.id)}
      >
        <i className={`fa-solid ${track.isCameraHook ? 'fa-video' : 'fa-circle'}`}></i>&nbsp;
        <span style={{ opacity: 0.75 }}>{KotOR.OdysseyModelControllerType[track.controllerType] ?? track.controllerType}</span>
      </div>
      <div className="track-keyframes" style={{ position: 'relative' }}>
        {
          track.keys.map( (keyframe, index) => {
            const ref = `${track.id}:${index}`;
            return (
              <div
                key={`controller-keyframe-${track.id}-${index}-${keyframe.time}`}
                className="keyframe"
                style={{
                  left: keyframe.time * timelineZoom,
                  color: selectedKeyRef === ref ? '#7fb2ff' : undefined,
                  cursor: keyframeEditorEnabled ? 'grab' : 'default',
                }}
                onClick={(e) => onKeyframeClick(e, track.id, index)}
                onMouseDown={(e) => keyframeEditorEnabled && onKeyframeMouseDown(e, track.id, index)}
                onMouseUp={onKeyframeMouseUp}
              >
                <i className="fa-solid fa-diamond"></i>
              </div>
            );
          })
        }
      </div>
    </div>
  );

}