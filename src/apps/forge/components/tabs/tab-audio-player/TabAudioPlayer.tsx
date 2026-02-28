import React, { useEffect, useRef, useState } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { TabAudioPlayerState } from "../../../states/tabs/TabAudioPlayerState";
import { AudioPlayerState } from "../../../states/AudioPlayerState";
import * as KotOR from "../../../../../KotOR";

export const TabAudioPlayer = function(props: BaseTabProps) {
  const tab = props.tab as TabAudioPlayerState;
  
  // Use useRef for mutable variables that we want to persist
  // without triggering a re-render on their change
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null as any);
  const contextRef = useRef<CanvasRenderingContext2D>(null as any);
  
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isDisposed, setIsDisposed] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTimeString, setCurrentTimeString] = useState<string>('0:00');
  const [durationString, setDurationString] = useState<string>('0:00');

  const [file, setFile] = useState<KotOR.AudioFile>();

  let animationFrame: number;

  const onLoad = () => {
    setIsReady(true);
  }

  const onPlay = () => {
    setIsPlaying(true);
    onFrame();
  }

  const onPause = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animationFrame);
  }

  const onStop = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animationFrame);
  }

  const onLoop = () => {
    
  }

  const onOpen = (file: KotOR.AudioFile) => {
    log.debug('onOpen', file);
    if(!file){ return; }
    setFile(file);
  }

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
    AudioPlayerState.AddEventListener('onOpen', onOpen);
    window.addEventListener('resize', onResize);

    console.log('useEffect', canvasRef, canvasRef.current);
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      console.log(ctx);
      contextRef.current = (ctx as CanvasRenderingContext2D);
      onResize();
    }
    
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      AudioPlayerState.RemoveEventListener('onLoad', onLoad);
      AudioPlayerState.RemoveEventListener('onPlay', onPlay);
      AudioPlayerState.RemoveEventListener('onPause', onPause);
      AudioPlayerState.RemoveEventListener('onStop', onStop);
      AudioPlayerState.RemoveEventListener('onLoop', onLoop);
      AudioPlayerState.RemoveEventListener('onOpen', onOpen);
      cancelAnimationFrame(requestRef.current as any);
      setIsDisposed(true);
      window.removeEventListener('resize', onResize);
    }
  })

  const onBtnPlay = (e: React.MouseEvent<HTMLSpanElement>) => {
    if(isPlaying){
      AudioPlayerState.Pause();
    }else{
      AudioPlayerState.Play();
    }
  }

  const onBtnStop = (e: React.MouseEvent<HTMLSpanElement>) => {
    AudioPlayerState.Stop();
  }

  const onTrackBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekPosition = parseFloat(e.target.value);
    try{ AudioPlayerState.Stop(); }catch(e){}
    AudioPlayerState.pausedAt = seekPosition;
    try{ AudioPlayerState.Play(); }catch(e){}
  }

  const onBtnSave = (e: React.MouseEvent<HTMLSpanElement>) => {
    AudioPlayerState.Pause();
    AudioPlayerState.ExportAudio().then( () => {

    });
  }

  const onResize = () => {
    if(!canvasRef.current) return;

    const rect = (canvasRef.current.parentNode as HTMLBaseElement)?.getBoundingClientRect();
    if(!rect){ return; }

    canvasRef.current.width = rect.width;
  }
  
  const animate = (time: number = 0) => {
    const context = contextRef.current;
    if (previousTimeRef.current != undefined && context && AudioPlayerState.analyser) {
      const _deltaTime = time - previousTimeRef.current;

      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      const bufferLength = AudioPlayerState.analyserBufferLength;
      let barHeight;
      const barWidth = context.canvas.width / 2 / bufferLength;
      let firstX = -barWidth/2;
      let secondX = (bufferLength * barWidth) - barWidth/2;

      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      AudioPlayerState.analyser.getByteFrequencyData(AudioPlayerState.analyserData as any);

      const totalHeight = 64;
      const maxHeight = 64;
      const factor = maxHeight/128;
      const remaining = totalHeight * factor;

      const total = AudioPlayerState.analyserData.reduce((prev = 0, current = 0) => {
        return prev + current;
      });
      const avg = total/bufferLength;
      const strenth = avg/128;

      context.filter = "blur(50px)";
      const radius = context.canvas.width*strenth;

      context.fillStyle = "#3D3D3D";
      context.beginPath();
      context.arc(context.canvas.width/2, context.canvas.height/2 + radius/2, radius, 0, Math.PI * 2, true);
      context.fill();

      context.filter = 'none';

      for (let i = 0; i < bufferLength; i++) {
        barHeight = AudioPlayerState.analyserData[i] * factor;
        const percent = barHeight/maxHeight;
        const red = 32 * percent;//(i * barHeight) / 10;
        const green = 64 * percent;//(i * barHeight) / 10;
        const blue = ((barHeight/128) * 128) + remaining;
        context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        context.fillRect(
          context.canvas.width / 2 - firstX,
          context.canvas.height - barHeight,
          barWidth,
          barHeight
        ); 
        firstX += barWidth;
        //draw mirrored bar
        context.fillRect(secondX, context.canvas.height - barHeight, barWidth, barHeight); 
        secondX += barWidth;
      }
      
      // Pass on a function to the setter of the state
      // to make sure we always have the latest state
      // setCount(prevCount => (prevCount + deltaTime * 0.01) % 100);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }

  return (
    <>
      <div style={{width: `100%`, display: 'flex'}}>
        <canvas ref={canvasRef} width="640" height="240" style={{borderTop: `1px solid #141414`, borderBottom: `1px solid #141414`}}></canvas>
      </div>
      <div className="audio-player-info" style={{background: `#154670`, color: `white`, padding: `5px 10px`}}>
        <span className="audio-player-title-label">Now Playing:&nbsp;
          <span className="audio-player-marquee">
            <span className="audio-player-title">
              <b>{file ? file.filename : ''}</b>
            </span>
          </span>
        </span>
      </div>
      <div className="inline-audio-player">
        <div className="audio-player-controls" style={{fontSize: `32pt`}}>
          <span className="btn-play" title={isPlaying ? 'Pause' : 'Play'} style={{cursor: 'pointer'}} onClick={onBtnPlay}>
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
          </span>
          <span className="btn-stop" title="Stop" style={{cursor: 'pointer'}} onClick={onBtnStop}>
            <i className="fa-solid fa-stop"></i>
          </span>
          <input className="track large" type="range" step="0.01" min="0" value={currentTime} max={duration} disabled={!!isReady} onChange={onTrackBarChange} />
          <span className="time">{currentTimeString} / {durationString}</span>
          <span className="btn-save" title="Export Audio" style={{cursor: 'pointer', marginLeft: '3px'}} onClick={onBtnSave}>
            <i className="fa-solid fa-download"></i>
          </span>
          <span className="track-pop" style={{display:'none', position:'fixed'}} ></span>
        </div>
      </div>
    </>
  );
}
