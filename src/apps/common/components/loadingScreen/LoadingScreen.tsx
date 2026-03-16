import React, { useEffect, useRef, useState } from "react";

import { createScopedLogger, LogScope, type IScopedLogger } from "@/utility/Logger";

import "@/apps/common/components/loadingScreen/LoadingScreen.scss";

const log: IScopedLogger = createScopedLogger(LogScope.Loader);

export interface ILoadingScreenProps {
  active?: boolean;
  message?: string;
  backgroundURL?: string;
  logoURL?: string;
}

export const LoadingScreen = (props: ILoadingScreenProps) => {

  //component props
  const [active, setActive] = useState<boolean>(!!props.active);
  const [message, setMessage] = useState<string>(props.message || 'Loading...');
  const [backgroundURL, setBackgroundURL] = useState<string>(props.backgroundURL || '');
  const [logoURL, setLogoURL] = useState<string>(props.logoURL || '');

  //fade in and out
  const [fadeIn, setFadeIn] = useState<boolean>(false);
  const [fadeOut, setFadeOut] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);

  const fadeInTimeout = useRef<NodeJS.Timeout | null>(null);
  const fadeOutTimeout = useRef<NodeJS.Timeout | null>(null);

  const onHide = () => {
    clearTimeout(fadeOutTimeout.current as any);
    clearTimeout(fadeInTimeout.current as any);
    setFadeIn(false);
    setFadeOut(true);
    fadeOutTimeout.current = setTimeout(() => {
      setVisible(false);
    }, 1000);
  };

  const onShow = () => {
    clearTimeout(fadeOutTimeout.current as any);
    clearTimeout(fadeInTimeout.current as any);
    setFadeIn(true);
    setFadeOut(false);
    // fadeInTimeout.current = setTimeout(() => {
      setVisible(true);
    // }, 1000);
  };

  useEffect(() => {
    console.log('active', active);
    setActive(!!props.active);
    if(!!props.active){
      onShow();
    }else{
      onHide();
    }
  }, [props.active]);

  useEffect(() => {
    setMessage(props.message || '');
    setBackgroundURL(props.backgroundURL || '');
    setLogoURL(props.logoURL || '');
  }, [props.message, props.backgroundURL, props.logoURL]);

  //se-pre-con class
  return (
    <div className={`app-loader ${visible ? 'active' : ''} ${fadeIn ? 'fade-in' : ''} ${fadeOut ? 'fade-out' : ''}`}>
      <div className="background" style={{backgroundImage: (!!backgroundURL) ? `url(${backgroundURL})` : 'initial'}}></div>
      <div className="logo-wrapper"><img src={logoURL} style={{display: (!!logoURL) ? 'block' : 'none'}} /></div>
      <div className="loading-container">
        <div className="spinner-wrapper">
          <div className="ball"></div>
          <div className="ball1"></div>
        </div>
        <div className="loading-message">{message}</div>
      </div>
    </div>
  );

};
