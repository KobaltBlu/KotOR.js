import React, { useEffect, useRef, useState } from "react";
import { useLoadingConsole } from "../../context/LoadingConsoleContext";
import type { LoadingConsoleEntry } from "../../context/LoadingConsoleContext";
import './LoadingScreen.scss';

export interface ILoadingScreenProps {
  active?: boolean;
  message?: string;
  backgroundURL?: string;
  logoURL?: string;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toTimeString().slice(0, 12);
}

function LogLine({ entry }: { entry: LoadingConsoleEntry }) {
  const extra = entry.args.length > 0 ? " " + entry.args.join(" ") : "";
  return (
    <div className={`loading-console-line loading-console-${entry.severity}`} key={entry.id}>
      <span className="loading-console-time">[{formatTime(entry.time)}]</span>{" "}
      <span className="loading-console-text">{entry.message}{extra}</span>
    </div>
  );
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
  const consoleEndRef = useRef<HTMLDivElement | null>(null);
  const loadingConsole = useLoadingConsole();

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
    setVisible(true);
  };

  useEffect(() => {
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

  useEffect(() => {
    if (loadingConsole.enabled && loadingConsole.entries.length) {
      consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loadingConsole.enabled, loadingConsole.entries.length]);

  const showConsole = loadingConsole.enabled && visible;

  return (
    <div className={`app-loader ${visible ? 'active' : ''} ${fadeIn ? 'fade-in' : ''} ${fadeOut ? 'fade-out' : ''}`}>
      <div className="background" style={{backgroundImage: (!!backgroundURL) ? `url(${backgroundURL})` : 'initial'}}></div>
      <div className="logo-wrapper"><img src={logoURL} style={{display: (!!logoURL) ? 'block' : 'none'}} alt="" /></div>
      <div className="loading-container">
        <div className="spinner-wrapper">
          <div className="ball"></div>
          <div className="ball1"></div>
        </div>
        <div className="loading-message">{message}</div>
      </div>
      {showConsole && (
        <div className="loading-console">
          <div className="loading-console-header">
            <span>Loading log</span>
            <button type="button" className="loading-console-clear" onClick={loadingConsole.clear}>Clear</button>
          </div>
          <div className="loading-console-body">
            {loadingConsole.entries.map((entry) => (
              <LogLine key={entry.id} entry={entry} />
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}
    </div>
  );

};
