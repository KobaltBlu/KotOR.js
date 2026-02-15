import React, { useEffect , useState } from "react";

import { useLoadingScreen } from "@/apps/forge/context/LoadingScreenContext";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export interface LoadingScreenProps {
  /** Optional passthrough props for styling etc. */
  [key: string]: unknown;
}

export const LoadingScreen = function(_props: LoadingScreenProps){

  const loaderContext = useLoadingScreen();
  const [enabled, _setEnabled] = loaderContext.enabled;
  const [message, _setMessage] = loaderContext.message;
  const [backgroundURL, _setBackgroundURL] = loaderContext.backgroundURL;
  const [logoURL, _setLogoURL] = loaderContext.logoURL;
  
  const [render, rerender] = useState<boolean>(false);

  useEffect(() => {
    log.trace('LoadingScreen mounted');
    return () => {
      log.trace('LoadingScreen unmounted');
    };
  }, []);

  useEffect(() => {
    rerender(!render);
    log.debug('LoadingScreen enabled changed', enabled);
  }, [enabled]);

  useEffect(() => {
    rerender(!render);
    log.debug('LoadingScreen message changed', message);
  }, [message]);

  //style={{display: (enabled) ? 'block' : 'none'}}
  return (
    <div className={`loading-screen se-pre-con ${enabled ? 'fade-in' : 'fade-out'}`} style={{display: (enabled) ? 'block' : 'none'}}>
      <div className="background" style={{backgroundImage: (backgroundURL) ? `url(${backgroundURL})` : 'initial'}}></div>
      <div className="logo-wrapper">
        <img src={logoURL} style={{display: (logoURL) ? 'block' : 'none'}} />
      </div>
      <div className="loading-container">
        <div className="spinner-wrapper">
          <div className="ball"></div>
          <div className="ball1"></div>
        </div>
        <div id="loading-message" className="loading-message">{message}</div>
      </div>
    </div>
  );
}