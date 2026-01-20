import React, { useEffect , useState } from "react";

import { useLoadingScreen } from "../context/LoadingScreenContext";

export const LoadingScreen = function(props: any){

  const loaderContext = useLoadingScreen();
  const [enabled, setEnabled] = loaderContext.enabled;
  const [message, setMessage] = loaderContext.message;
  const [backgroundURL, setBackgroundURL] = loaderContext.backgroundURL;
  const [logoURL, setLogoURL] = loaderContext.logoURL;
  
  const [render, rerender] = useState<boolean>(false);

  useEffect(() => {
    //Constructor
    console.log()
    return () => {
      //Destructor
    };
  }, []);

  useEffect(() => {
    rerender(!render);
    console.log('ls', enabled);
  }, [enabled]);

  useEffect(() => {
    rerender(!render);
    console.log('ls', message);
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