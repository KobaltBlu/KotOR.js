import React, { useEffect, useRef, useState } from "react";
import "@/apps/common/components/loadingScreen/LoadingScreen.scss";
import { formatLoaderEta, ILoaderProgress } from "@/apps/common/loader/LoaderProgress";

export interface ILoadingScreenProps {
  active?: boolean;
  message?: string;
  backgroundURL?: string;
  logoURL?: string;
  progress?: ILoaderProgress | null;
}

export const LoadingScreen = (props: ILoadingScreenProps) => {

  const [active, setActive] = useState<boolean>(!!props.active);
  const [message, setMessage] = useState<string>(props.message || 'Loading...');
  const [backgroundURL, setBackgroundURL] = useState<string>(props.backgroundURL || '');
  const [logoURL, setLogoURL] = useState<string>(props.logoURL || '');
  const [progress, setProgress] = useState<ILoaderProgress | null>(props.progress ?? null);
  const [etaLabel, setEtaLabel] = useState<string>('');

  const [fadeIn, setFadeIn] = useState<boolean>(false);
  const [fadeOut, setFadeOut] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);

  const fadeInTimeout = useRef<NodeJS.Timeout | null>(null);
  const fadeOutTimeout = useRef<NodeJS.Timeout | null>(null);
  const progressStartRef = useRef<number | null>(null);
  const smoothedRateRef = useRef<number | null>(null);

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
    const next = props.progress ?? null;
    setProgress(next);

    if (!next || next.total <= 0) {
      progressStartRef.current = null;
      smoothedRateRef.current = null;
      setEtaLabel('');
      return;
    }

    if (progressStartRef.current === null || next.completed === 0) {
      progressStartRef.current = performance.now();
      smoothedRateRef.current = null;
    }

    if (next.completed <= 0) {
      setEtaLabel('Calculating...');
      return;
    }

    const elapsedSeconds = (performance.now() - (progressStartRef.current as number)) / 1000;
    if (elapsedSeconds <= 0) {
      setEtaLabel('Calculating...');
      return;
    }

    const instantRate = next.completed / elapsedSeconds;
    smoothedRateRef.current = smoothedRateRef.current === null
      ? instantRate
      : smoothedRateRef.current * 0.65 + instantRate * 0.35;

    const remaining = Math.max(0, next.total - next.completed);
    const etaSeconds = remaining / (smoothedRateRef.current || instantRate);
    setEtaLabel(formatLoaderEta(etaSeconds));
  }, [props.progress]);

  const showProgress = !!progress && progress.total > 0;
  const percent = showProgress
    ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
    : 0;
  const statusLine = showProgress
    ? (progress.currentAsset || progress.message || message)
    : message;

  return (
    <div className={`app-loader ${visible ? 'active' : ''} ${fadeIn ? 'fade-in' : ''} ${fadeOut ? 'fade-out' : ''}`}>
      <div className="background" style={{backgroundImage: (!!backgroundURL) ? `url(${backgroundURL})` : 'initial'}}></div>
      <div className="logo-wrapper">{logoURL ? <img src={logoURL} /> : null}</div>
      <div className="loading-container">
        <div className="spinner-wrapper">
          <div className="ball"></div>
          <div className="ball1"></div>
        </div>
        <div className="loading-message">
          <div className="loading-message-text" title={statusLine}>{statusLine}</div>
          {showProgress && (
            <div className="loading-progress">
              <div className="loading-progress-track">
                <div className="loading-progress-bar" style={{ width: `${percent}%` }} />
              </div>
              <div className="loading-progress-meta">
                <span>{percent}%</span>
                <span>{progress.completed} / {progress.total}</span>
                {etaLabel ? <span>{etaLabel}</span> : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

};
