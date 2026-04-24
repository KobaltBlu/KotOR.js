import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutContainer } from '@/apps/forge/components/LayoutContainer/LayoutContainer';
import { useEffectOnce } from '@/apps/forge/helpers/UseEffectOnce';
import { TabLIPEditorState, TabLIPEditorStateEventListenerTypes } from '@/apps/forge/states/tabs';
import { BaseTabProps } from '@/apps/forge/interfaces/BaseTabProps';
import { LayoutContainerProvider } from '@/apps/forge/context/LayoutContainerContext';
import { Form } from 'react-bootstrap';
import { LIPShapeLabels } from '@/apps/forge/data/LIPShapeLabels';

import * as KotOR from '@/apps/forge/KotOR';
import { UI3DRendererView } from '@/apps/forge/components/UI3DRendererView';
import { TabLIPEditorOptions } from '@/apps/forge/components/tabs/tab-lip-editor/TabLIPEditorOptions';

import '@/apps/forge/components/tabs/tab-lip-editor/tab-lip-editor.scss';

function formatTimelineMmSs(totalSeconds: number): string {
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor(totalSeconds / 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatLipClock(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = t % 60;
  const sec = s < 10 ? `0${s.toFixed(2)}` : s.toFixed(2);
  return `${m}:${sec}`;
}

export const TabLIPEditor = function (props: BaseTabProps) {
  const tab: TabLIPEditorState = props.tab as TabLIPEditorState;

  const southPanel = <UILIPKeyFramePanel tab={tab}></UILIPKeyFramePanel>;

  const eastPanel = <UILIPUtilitiesControl tab={tab}></UILIPUtilitiesControl>;

  useEffectOnce(() => {
    if (tab.file) {
      tab.openFile().catch(() => {});
    } else {
      tab.newFile().catch(() => {});
    }
    return () => {};
  });

  return (
    <LayoutContainerProvider>
      <LayoutContainer southContent={southPanel} southSize={196} eastContent={eastPanel} eastSize={300}>
        <UI3DRendererView context={tab.ui3DRenderer} />
      </LayoutContainer>
    </LayoutContainerProvider>
  );
};

export interface UILIPKeyFramePanelProps {
  tab: TabLIPEditorState;
}

export const UILIPKeyFramePanel = function (props: UILIPKeyFramePanelProps) {
  const tab = props.tab;
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const seekerRef = useRef<HTMLDivElement>(null);
  const keyframeBarRef = useRef<HTMLDivElement>(null);
  const drawWaveformRef = useRef<() => void>(() => {});
  const durationDragRef = useRef<{ active: boolean; startX: number; startDuration: number }>({
    active: false,
    startX: 0,
    startDuration: 0,
  });
  const zoomRef = useRef<number>(tab.timeline_zoom);
  const [playing, setPlaying] = useState<boolean>(tab.playing);
  const [seekPositionLeft, setSeekPositionLeft] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(tab.timeline_zoom);
  const [keyframes, setKeyFrames] = useState<KotOR.ILIPKeyFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<KotOR.ILIPKeyFrame | undefined>(tab.selected_frame);
  const [duration, setDuration] = useState<number>(1);
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [timelineScaleFactor, setTimelineScaleFactor] = useState<number>(10);
  const [render, rerender] = useState<boolean>(false);
  const [playheadTime, setPlayheadTime] = useState<number>(() => tab.lip?.elapsed ?? 0);
  const [hasWaveformAudio, setHasWaveformAudio] = useState<boolean>(() => tab.audio_buffer instanceof AudioBuffer);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [timedPhonemes, setTimedPhonemes] = useState<any[]>(() => tab.timed_phonemes?.items || []);

  const drawWaveform = () => {
    if (waveformCanvasRef.current) {
      const canvas = waveformCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const height = Math.max(1, canvas.parentElement?.clientHeight || 64);
        const audioDuration = tab.audio_buffer instanceof AudioBuffer ? tab.audio_buffer.duration : 0;
        const seconds = Math.max(duration, audioDuration, 0.01);
        const width = Math.max(1, Math.floor(seconds * zoom));

        canvas.height = height;
        canvas.width = width;
        ctx.clearRect(0, 0, width, height);

        if (tab.audio_buffer instanceof AudioBuffer) {
          const samples = tab.audio_buffer.getChannelData(0);
          const len = samples.length;
          if (len > 0) {
            const samplesPerPixel = Math.max(1, Math.floor(len / width));
            const halfHeight = height / 2;

            ctx.strokeStyle = '#5bc0de';
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let x = 0; x < width; x++) {
              const start = x * samplesPerPixel;
              const end = Math.min(start + samplesPerPixel, len);
              let min = 1;
              let max = -1;

              for (let i = start; i < end; i++) {
                const sample = samples[i];
                if (sample < min) min = sample;
                if (sample > max) max = sample;
              }

              ctx.moveTo(x, (1 + min) * halfHeight);
              ctx.lineTo(x, (1 + max) * halfHeight);
            }

            ctx.stroke();
            ctx.closePath();
          }
        }
      }
    }
  };

  drawWaveformRef.current = drawWaveform;

  const onLoad = (lip: KotOR.LIPObject) => {
    setKeyFrames(lip.keyframes);
    setDuration(lip.duration);
    setPlayheadTime(lip.elapsed);
  };

  const onAudioLoad = (_state: TabLIPEditorState, buffer?: AudioBuffer) => {
    setHasWaveformAudio(buffer instanceof AudioBuffer);
    drawWaveformRef.current();
  };

  const onHeadLoad = () => {};

  const onPhonemesGenerated = (_state: TabLIPEditorState, result: any) => {
    setTimedPhonemes(result?.items || []);
  };

  const onKeyFrameSelect = (keyframe: KotOR.ILIPKeyFrame) => {
    setSelectedFrame(keyframe);
    tab.lip.elapsed = keyframe.time;
    updateSeekerPosition();
  };

  const onPlay = () => {
    setPlaying(true);
  };

  const onPause = () => {
    setPlaying(false);
  };

  const onStop = () => {
    setPlaying(false);
    setPlayheadTime(0);
  };

  const onKeyFramesChange = () => {
    setKeyFrames([...tab.lip.keyframes]);
    setSelectedFrame(tab.selected_frame);
    setCanUndo(tab.canUndo);
    setCanRedo(tab.canRedo);
    rerender(!render);
  };

  const onDurationChange = (duration: number) => {
    setDuration(duration);
  };

  const syncUndoRedoState = () => {
    setCanUndo(tab.canUndo);
    setCanRedo(tab.canRedo);
  };

  useLayoutEffect(() => {
    const el = keyframeBarRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      drawWaveformRef.current();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffectOnce(() => {
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
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onUndoApplied', syncUndoRedoState);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onRedoApplied', syncUndoRedoState);
    tab.addEventListener<TabLIPEditorStateEventListenerTypes>('onPhonemesGenerated', onPhonemesGenerated);
    window.addEventListener('mouseup', onMouseUpWindow);
    window.addEventListener('mousemove', onMouseMoveWindow);
    rebuildTimelineLabels();
    drawWaveformRef.current();
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
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onUndoApplied', syncUndoRedoState);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onRedoApplied', syncUndoRedoState);
      tab.removeEventListener<TabLIPEditorStateEventListenerTypes>('onPhonemesGenerated', onPhonemesGenerated);
      window.removeEventListener('mouseup', onMouseUpWindow);
      window.removeEventListener('mousemove', onMouseMoveWindow);
    };
  });

  useEffect(() => {
    let _timelineScaleFactor = timelineScaleFactor;

    if (zoom < 250) {
      _timelineScaleFactor = 30;
    }

    if (zoom <= 150) {
      _timelineScaleFactor = 60;
    }
    setTimelineScaleFactor(_timelineScaleFactor);
  }, [zoom]);

  useEffect(() => {
    rebuildTimelineLabels();
  }, [duration]);

  useEffect(() => {
    rebuildTimelineLabels();
  }, [keyframes]);

  useEffect(() => {
    rebuildTimelineLabels();
  }, [timelineScaleFactor]);

  useEffect(() => {
    drawWaveformRef.current();
  }, [duration, zoom]);

  const onClickPlayPause = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (tab.playing) {
      tab.pause();
    } else {
      tab.play();
    }
    setPlaying(tab.playing);
  };

  const onClickStop = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    tab.stop();
    setPlaying(tab.playing);
  };

  const onClickZoomIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    tab.keyframeTrackZoomIn();
    zoomRef.current = tab.timeline_zoom;
    setZoom(tab.timeline_zoom);
    drawWaveform();
    rebuildTimelineLabels();
  };

  const onClickZoomOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    tab.keyframeTrackZoomOut();
    zoomRef.current = tab.timeline_zoom;
    setZoom(tab.timeline_zoom);
    drawWaveform();
    rebuildTimelineLabels();
  };

  const onAnimate = (delta: number) => {
    if (seekerRef.current && tab.lip) {
      updateSeekerPosition();
      updateScrollBoundsFocus();
    }
  };

  const updateSeekerPosition = () => {
    const seekPosition = tab.lip.elapsed * tab.timeline_zoom;
    setSeekPositionLeft(seekPosition);
    setPlayheadTime(tab.lip.elapsed);
  };

  const updateScrollBoundsFocus = (force: boolean = false) => {
    if (!tab.lip) return;
    const seekPosition = tab.lip.elapsed * tab.timeline_zoom;
    const keyframeWindowElement = keyframeBarRef.current;
    if (keyframeWindowElement) {
      if (tab.playing || !!force) {
        if (seekPosition > keyframeWindowElement.clientWidth + keyframeWindowElement.scrollLeft) {
          keyframeWindowElement.scrollLeft = seekPosition - 50;
        }

        if (seekPosition < keyframeWindowElement.scrollLeft) {
          keyframeWindowElement.scrollLeft = seekPosition - 50;
        }
      }
    }
  };

  const rebuildTimelineLabels = () => {
    let nthTime = timelineScaleFactor / 60;
    let count = Math.ceil(Math.ceil(duration) / nthTime);
    let timestamps: string[] = [];
    for (let i = 0; i < count; i++) {
      const tSec = (timelineScaleFactor / 60) * i;
      timestamps.push(formatTimelineMmSs(tSec));
    }
    setTimestamps(timestamps);
  };

  const getTimelinePixelPositionRelativeToMouseEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const keyframeWindowElement = keyframeBarRef.current;
    if (keyframeWindowElement) {
      const bRect = keyframeWindowElement.getBoundingClientRect();

      const maxPixels = tab.lip.duration * tab.timeline_zoom;

      const position = e.pageX - bRect.left + keyframeWindowElement.scrollLeft;
      if (position < 0) return 0;
      if (position > maxPixels) return maxPixels;
      return position;
    }
    return 0;
  };

  const getTimelinePixelPositionAsTime = (position: number = 0) => {
    const percentage = position / (tab.lip.duration * tab.timeline_zoom);
    const time = tab.lip.duration * percentage;
    if (time < 0) return 0;
    if (time > tab.lip.duration) return tab.lip.duration;
    return time;
  };

  const onClickKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    const keyframeWindowElement = keyframeBarRef.current;
    if (keyframeWindowElement) {
      let position = getTimelinePixelPositionRelativeToMouseEvent(e);
      let time = getTimelinePixelPositionAsTime(position);
      tab.seek(time);

      const seekPosition = tab.lip.elapsed * tab.timeline_zoom;
      setSeekPositionLeft(seekPosition);
    }
  };

  const onClickNextKeyFrame = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!tab.selected_frame) return;
    tab.selectNextKeyFrame();
    tab.pause();
    tab.seek(tab.selected_frame.time);
    updateSeekerPosition();
    updateScrollBoundsFocus(true);
  };

  const onClickPreviousKeyFrame = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!tab.selected_frame) return;
    tab.selectPreviousKeyFrame();
    tab.pause();
    tab.seek(tab.selected_frame.time);
    updateSeekerPosition();
    updateScrollBoundsFocus(true);
  };

  const onKeyFrameMouseDown = (e: React.MouseEvent<HTMLDivElement>, keyframe: KotOR.ILIPKeyFrame) => {
    e.stopPropagation();
    e.preventDefault();
    tab.captureUndoSnapshot();
    tab.selectKeyFrame(keyframe);
    tab.dragging_frame_snapshot = Object.assign({}, keyframe);
    tab.dragging_frame = keyframe;
  };

  const onKeyFrameMouseUp = (e: React.MouseEvent<HTMLDivElement>, keyframe: KotOR.ILIPKeyFrame) => {
    e.stopPropagation();
    e.preventDefault();
    if (tab.dragging_frame) {
      tab.finalizeKeyframeDrag();
    }
    tab.seek(keyframe.time);
    updateSeekerPosition();
    updateScrollBoundsFocus(true);
    tab.dragging_frame = undefined;
    tab.dragging_frame_snapshot = undefined;
  };

  const onClickAddKeyFrame = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    let newFrame = tab.addKeyFrame(tab.lip.elapsed, 0);
    tab.selectKeyFrame(newFrame);
  };

  const onClickDeleteKeyFrame = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const toRemove = tab.selected_frame;
    if (!toRemove) return;
    tab.removeKeyFrame(toRemove);
    if (tab.selected_frame) tab.seek(tab.selected_frame.time);
    else tab.seek(Math.min(tab.lip.elapsed, tab.lip.duration));
    updateSeekerPosition();
  };

  const onMouseMoveKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    const position = getTimelinePixelPositionRelativeToMouseEvent(e);
    const time = getTimelinePixelPositionAsTime(position);
    if (tab.scrubbing) {
      tab.seek(time);

      const seekPosition = tab.lip.elapsed * tab.timeline_zoom;
      setSeekPositionLeft(seekPosition);
    }

    if (tab.dragging_frame) {
      tab.dragging_frame.time = time;
      setKeyFrames([...tab.lip.keyframes]);
    }
  };

  const onMouseDownKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    if (durationDragRef.current.active) return;
    tab.dragging_frame = undefined;
    tab.scrubbing = true;
    tab.pause();
  };

  const onMouseUpKeyFrameWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tab.dragging_frame) {
      tab.finalizeKeyframeDrag();
    }
    if (tab.scrubbing) {
      tab.pause();
      const seekPosition = tab.lip.elapsed * tab.timeline_zoom;
      setSeekPositionLeft(seekPosition);
    }
    tab.scrubbing = false;
    tab.dragging_frame = undefined;
    tab.dragging_frame_snapshot = undefined;
  };

  const onMouseUpWindow = (e: MouseEvent) => {
    if (durationDragRef.current.active) {
      durationDragRef.current.active = false;
      if (tab.file) tab.file.unsaved_changes = true;
      return;
    }
    if (tab.dragging_frame) {
      tab.finalizeKeyframeDrag();
    }
    if (tab.scrubbing) {
      tab.pause();
      const seekPosition = tab.lip.elapsed * tab.timeline_zoom;
      setSeekPositionLeft(seekPosition);
    }
    tab.scrubbing = false;
    tab.dragging_frame = undefined;
    tab.dragging_frame_snapshot = undefined;
  };

  const onMouseMoveWindow = (e: MouseEvent) => {
    if (!durationDragRef.current.active) return;
    const deltaX = e.clientX - durationDragRef.current.startX;
    const deltaSecs = deltaX / zoomRef.current;
    const minDuration = 0.1;
    const newDuration = Math.max(minDuration, durationDragRef.current.startDuration + deltaSecs);
    tab.setDuration(Math.round(newDuration * 1000) / 1000);
  };

  const onDurationHandleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    tab.captureUndoSnapshot();
    durationDragRef.current = { active: true, startX: e.clientX, startDuration: tab.lip.duration };
    tab.scrubbing = false;
  };

  const onKeyFrameShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!tab.selected_frame) return;
    tab.captureUndoSnapshot();
    let shape = parseInt(e.target.value);
    tab.selected_frame.shape = !isNaN(shape) ? shape : 0;
    tab.selectKeyFrame(tab.selected_frame);
    if (tab.file) tab.file.unsaved_changes = true;
    tab.reloadKeyFrames();
  };

  const audioDurationPx = (tab.audio_buffer?.duration || 0) * zoom;
  const timelineWidthPx = Math.max(duration, tab.audio_buffer?.duration || 0) * zoom;
  const waveformWidthPx = audioDurationPx > 0 ? audioDurationPx : timelineWidthPx;

  return (
    <div className="lip-keyframe-dock">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="lip-toolbar">
        {/* Left: undo/redo + clock + shape selector */}
        <div className="lip-toolbar__left">
          <div className="lip-toolbar__btn-group">
            <button
              type="button"
              title="Undo (Ctrl+Z)"
              className="lip-btn fa-solid fa-rotate-left"
              onClick={() => {
                tab.undo();
                syncUndoRedoState();
              }}
              disabled={!canUndo}
              aria-label="Undo"
            />
            <button
              type="button"
              title="Redo (Ctrl+Y)"
              className="lip-btn fa-solid fa-rotate-right"
              onClick={() => {
                tab.redo();
                syncUndoRedoState();
              }}
              disabled={!canRedo}
              aria-label="Redo"
            />
          </div>
          <span className="lip-toolbar__clock" title="Playhead / duration">
            <span className="lip-toolbar__clock-time">{formatLipClock(playheadTime)}</span>
            <span className="lip-toolbar__clock-sep">/</span>
            <span className="lip-toolbar__clock-dur">{formatLipClock(duration)}</span>
          </span>
          {selectedFrame ? (
            <Form.Select
              className="lip-toolbar__shape-select"
              onChange={onKeyFrameShapeChange}
              value={selectedFrame.shape}
              aria-label="Mouth shape"
            >
              {LIPShapeLabels.map((label: string, i: number) => (
                <option key={i} value={i}>
                  {label.trim()}
                </option>
              ))}
            </Form.Select>
          ) : (
            <Form.Select className="lip-toolbar__shape-select" disabled value="">
              <option value="">— shape —</option>
            </Form.Select>
          )}
        </div>

        {/* Centre: transport + keyframe ops */}
        <div className="lip-toolbar__center">
          <div className="lip-toolbar__btn-group">
            <button
              type="button"
              title="Delete keyframe"
              className="lip-btn fa-solid fa-trash"
              disabled={!tab.selected_frame}
              onClick={onClickDeleteKeyFrame}
              aria-label="Delete keyframe"
            />
            <button
              type="button"
              title="Previous keyframe"
              className="lip-btn fa-solid fa-backward-step"
              onClick={onClickPreviousKeyFrame}
              aria-label="Previous keyframe"
            />
            <button
              type="button"
              title={playing ? 'Pause' : 'Play'}
              className={`lip-btn lip-btn--play fa-solid fa-${playing ? 'pause' : 'play'}`}
              onClick={onClickPlayPause}
              aria-label={playing ? 'Pause' : 'Play'}
            />
            <button
              type="button"
              title="Stop"
              className="lip-btn fa-solid fa-stop"
              onClick={onClickStop}
              aria-label="Stop"
            />
            <button
              type="button"
              title="Next keyframe"
              className="lip-btn fa-solid fa-forward-step"
              onClick={onClickNextKeyFrame}
              aria-label="Next keyframe"
            />
          </div>
          <div className="lip-toolbar__btn-group lip-toolbar__btn-group--add">
            <button
              type="button"
              title="Add keyframe at playhead"
              className="lip-btn lip-btn--add fa-solid fa-plus"
              onClick={onClickAddKeyFrame}
              aria-label="Add keyframe"
            />
          </div>
        </div>

        {/* Right: zoom */}
        <div className="lip-toolbar__right">
          <button
            type="button"
            title="Zoom in"
            className="lip-btn fa-solid fa-magnifying-glass-plus"
            onClick={onClickZoomIn}
            aria-label="Zoom in"
          />
          <button
            type="button"
            title="Zoom out"
            className="lip-btn fa-solid fa-magnifying-glass-minus"
            onClick={onClickZoomOut}
            aria-label="Zoom out"
          />
        </div>
      </div>

      {/* ── Timeline ────────────────────────────────────────────────── */}
      <div className="lip-keyframe-dock-timeline">
        <div
          ref={keyframeBarRef}
          className="keyframe-bar"
          onClick={onClickKeyFrameWindow}
          onMouseDown={onMouseDownKeyFrameWindow}
          onMouseUp={onMouseUpKeyFrameWindow}
          onMouseMove={onMouseMoveKeyFrameWindow}
        >
          {/* Ruler */}
          <div className="keyframe-time-track" style={{ width: timelineWidthPx }}>
            {timestamps.map((label: string, index: number) => (
              <span
                key={`time-${index}-${label}`}
                style={{
                  position: 'absolute',
                  left: (timelineScaleFactor / 60) * index * zoom,
                  width: 30,
                  marginLeft: -15,
                  textAlign: 'center',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Waveform */}
          <div className="lip-keyframe-wave" style={{ width: waveformWidthPx }}>
            <canvas ref={waveformCanvasRef} />
            {!hasWaveformAudio && (
              <div className="lip-keyframe-wave__empty">
                <i className="fa-solid fa-wave-square" aria-hidden />
                <span>No audio found</span>
              </div>
            )}
          </div>

          {/* Keyframe strip */}
          <div className="keyframe-track" style={{ width: timelineWidthPx }}>
            {timedPhonemes.map((item: any, index: number) => (
              <div
                key={`phon-${index}-${item.startSec}`}
                className="lip-phoneme-marker"
                style={{ left: item.startSec * zoom }}
                title={`${item.symbol} @ ${item.startSec.toFixed(2)}s`}
              />
            ))}
            {keyframes.map((keyframe: KotOR.ILIPKeyFrame) => (
              <div
                key={keyframe.uuid}
                className={`keyframe ${selectedFrame == keyframe ? 'selected' : ''}`}
                style={{ left: keyframe.time * zoom }}
                onClick={(e: React.MouseEvent<HTMLDivElement>) => onKeyFrameMouseUp(e, keyframe)}
                onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => onKeyFrameMouseDown(e, keyframe)}
                onMouseUp={(e: React.MouseEvent<HTMLDivElement>) => onKeyFrameMouseUp(e, keyframe)}
              >
                <i className="fa-solid fa-diamond" aria-hidden />
              </div>
            ))}

            {/* Duration drag handle */}
            <div
              className="lip-duration-handle"
              style={{ left: duration * zoom }}
              onMouseDown={onDurationHandleMouseDown}
              title="Drag to change timeline duration"
            />
          </div>

          {/* Playhead seeker */}
          <div ref={seekerRef} className="keyframe-track-seeker" style={{ left: seekPositionLeft }}>
            <div className="seeker-thumb" />
          </div>
        </div>
      </div>
    </div>
  );
};

export interface UILIPUtilitiesControlProps {
  tab: TabLIPEditorState;
}

export const UILIPUtilitiesControl = function (props: UILIPUtilitiesControlProps) {
  const tab = props.tab;
  return <TabLIPEditorOptions tab={tab.lipOptionsTab} parentTab={tab} />;
};
