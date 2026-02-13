import React, { useState } from 'react';

import { useEffectOnce } from '../helpers/UseEffectOnce';
import { AudioPlayerState } from '../states/AudioPlayerState';

import { createScopedLogger, LogScope } from '../../../utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export interface AudioPlayerProps {
  /** Optional; component uses global AudioPlayerState */
}

export const AudioPlayer: React.FC<AudioPlayerProps> = (_props) => {

  const [isReady, setIsReady] = useState<boolean>(false);
  const [isDisposed, setIsDisposed] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTimeString, setCurrentTimeString] = useState<string>('0:00');
  const [durationString, setDurationString] = useState<string>('0:00');

  let animationFrame: number;

  const onLoad = () => {
    log.trace('AudioPlayer onLoad');
    setIsReady(true);
  };

  const onPlay = () => {
    log.debug('AudioPlayer onPlay');
    setIsPlaying(true);
    onFrame();
  };

  const onPause = () => {
    log.trace('AudioPlayer onPause');
    setIsPlaying(false);
    cancelAnimationFrame(animationFrame);
  };

  const onStop = () => {
    log.trace('AudioPlayer onStop');
    setIsPlaying(false);
    cancelAnimationFrame(animationFrame);
  };

  const onLoop = () => {
    log.trace('AudioPlayer onLoop');
  };

  const onFrame = () => {
    cancelAnimationFrame(animationFrame);
    if(AudioPlayerState.playing){
      animationFrame = requestAnimationFrame(() => onFrame());
      setCurrentTime(AudioPlayerState.GetCurrentTime());
      setDuration(AudioPlayerState.GetDuration());
      setCurrentTimeString(AudioPlayerState.SecondsToTimeString(AudioPlayerState.GetCurrentTime()))
      setDurationString(AudioPlayerState.SecondsToTimeString(AudioPlayerState.GetDuration()))
    }
  }

  useEffectOnce( () => {
    AudioPlayerState.AddEventListener('onLoad', onLoad);
    AudioPlayerState.AddEventListener('onPlay', onPlay);
    AudioPlayerState.AddEventListener('onPause', onPause);
    AudioPlayerState.AddEventListener('onStop', onStop);
    AudioPlayerState.AddEventListener('onLoop', onLoop);
    return () => {
      AudioPlayerState.RemoveEventListener('onLoad', onLoad);
      AudioPlayerState.RemoveEventListener('onPlay', onPlay);
      AudioPlayerState.RemoveEventListener('onPause', onPause);
      AudioPlayerState.RemoveEventListener('onStop', onStop);
      AudioPlayerState.RemoveEventListener('onLoop', onLoop);
      setIsDisposed(true);
    }
  })

  const onBtnPlay = (e: React.MouseEvent<HTMLSpanElement>) => {
    log.trace('AudioPlayer onBtnPlay', { isPlaying });
    if(isPlaying){
      AudioPlayerState.Pause();
    }else{
      AudioPlayerState.Play();
    }
  };

  const onBtnStop = (e: React.MouseEvent<HTMLSpanElement>) => {
    log.trace('AudioPlayer onBtnStop');
    AudioPlayerState.Stop();
  };

  const onTrackBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekPosition = parseFloat(e.target.value);
    log.debug('AudioPlayer onTrackBarChange seekPosition=%s', String(seekPosition));
    try{ AudioPlayerState.Stop(); }catch(err){ log.warn('onTrackBarChange Stop failed', err); }
    AudioPlayerState.pausedAt = seekPosition;
    try{ AudioPlayerState.Play(); }catch(err){ log.warn('onTrackBarChange Play failed', err); }
  };

  const onBtnSave = (e: React.MouseEvent<HTMLSpanElement>) => {
    log.info('AudioPlayer onBtnSave - exporting audio');
    AudioPlayerState.Pause();
    AudioPlayerState.ExportAudio().then( () => {
      log.debug('AudioPlayer ExportAudio completed');
    }).catch((err) => {
      log.error('AudioPlayer ExportAudio failed', err);
    });
  };

  return (
    <div className="inline-audio-player">
      {/* <div className="audio-player-info">
        <span className="audio-player-title-label">Now Playing: 
          <span className="audio-player-marquee">
            <span className="audio-player-title"></span>
          </span>
        </span>
      </div> */}
      <div className="audio-player-controls">
        <span className="btn-play" title={isPlaying ? 'Pause' : 'Play'} style={{cursor: 'pointer', flex:1}} onClick={onBtnPlay}>
          <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
        </span>
        <span className="btn-stop" title="Stop" style={{cursor: 'pointer', flex:1}} onClick={onBtnStop}>
          <i className="fa-solid fa-stop"></i>
        </span>
        <input className="track" type="range" step="0.01" min="0" value={currentTime} max={duration} disabled={!!isReady} onChange={onTrackBarChange} />
        <span className="time">{currentTimeString} / {durationString}</span>
        <span className="btn-save" title="Export Audio" style={{cursor: 'pointer', flex:1, marginLeft: '3px'}} onClick={onBtnSave}>
          <i className="fa-solid fa-download"></i>
        </span>
        <span className="track-pop" style={{display:'none', position:'fixed'}} ></span>
      </div>
    </div>
  );
}