import React, { useRef } from "react";
import { useApp } from "../../context/AppContext";

export interface ProfilePromoItemProps {
  element: any;
  onClick?: (element: any) => void;
  onDoubleClick?: (element: any) => void;
}

export const VideoPromoItem = function(props: ProfilePromoItemProps){
  const element: any = props.element;

  const appContext = useApp();

  const videoElement = useRef(null) as React.RefObject<HTMLVideoElement>;
  const onVideoClick: React.MouseEventHandler<HTMLDivElement> = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('onVideoClick', videoElement.current, e);
    if(videoElement.current){
      let elem: HTMLVideoElement = videoElement.current;
      if(elem === document.fullscreenElement){
        if (elem.paused == false) {
          elem.pause();
        } else {
          elem.play();
        }
      }else{
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        }

        //elem.currentTime = 0;
        elem.volume = 0.25;
        elem.loop = false;
      }
    }
  };

  const onVideoDoubleClick: React.MouseEventHandler<HTMLVideoElement> = (e: React.MouseEvent<HTMLVideoElement>) => {
    console.log('onVideoDoubleClick', videoElement.current, e);
    if(videoElement.current){
      let elem: HTMLVideoElement = videoElement.current;
      if(elem === document.fullscreenElement){
        document.exitFullscreen()
      }
    }
  };

  return (
    <div className="promo-element video" onClick={onVideoClick}>
      <video ref={videoElement} src={element.url} loop autoPlay style={{height: '250px'}} onLoadStart={() => { if(videoElement?.current){ videoElement.current.volume=0 } }} onDoubleClick={onVideoDoubleClick}></video>
    </div>
  );

}
