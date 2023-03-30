import React, { useEffect, useRef, useState } from "react";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { TabVideoPlayerState } from "../../states/tabs";
import { LayoutContainer } from "../LayoutContainer";
import * as muxjs from "mux.js";

import * as KotOR from "../../KotOR";

export const TabVideoPlayer = function(props: BaseTabProps){

  const tab = props.tab as TabVideoPlayerState;
  const [render, rerender] = useState<boolean>(false);
  const [videoScale, setvideoScale] = useState<number>(1);
  const [videoWidth, setvideoWidth] = useState<number>(640);
  const [videoHeight, setvideoHeight] = useState<number>(480);

  const [source, setSource] = useState<MediaSource>();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const bufferVideoData = (buffer: Buffer) => {
    rerender(!render);
    if(videoRef.current){
      tab.createBufferContext();
      const videoElement = videoRef.current;
      if(videoElement){
        const context = tab.bufferContext;
        videoElement.volume = 0.25
        videoElement.src = URL.createObjectURL(context.mediaSource);
        videoElement.play();
        (videoElement as any).mediaSource = context.mediaSource;
        context.started = false;
        tab.decode();
      }
    }
  }

  let tmpCanvasScale = 1;

  const onEditorFileLoad = () => {
    bufferVideoData(tab.bikBuffer);
  };

  useEffectOnce( () => {
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    // tab.addEventListener('onBuffer', onVideoBuffer);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
      // tab.removeEventListener('onBuffer', onVideoBuffer);
    }
  });

  useEffect(() => {
    // console.log('containerRef', containerRef);
    // if(containerRef.current){
    //   containerRef.current.addEventListener('wheel', onMouseWheel);
    // }
    // return () => {
    //   if(containerRef.current){
    //     containerRef.current.removeEventListener('wheel', onMouseWheel);
    //   }
    // }
  }, [containerRef]);

  useEffect(() => {
    console.log('videoRef', videoRef.current);
  }, [videoRef]);

  return (
    <>
      <div ref={containerRef} style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'scroll', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video ref={videoRef} controls style={{width: `${videoWidth}px`, height: `${videoHeight}px`, transform: `scale(${videoScale})`}} />
      </div>
    </>
  );

}