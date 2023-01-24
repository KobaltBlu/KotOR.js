import React, { useEffect } from "react";
import { useState } from "react";

export const LoadingScreen = function(props: any){

  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    //Constructor

    return () => {
      //Destructor
    };
  }, []);

  return (
    <div className="loading-screen se-pre-con">
      <div className="background"></div>
      <div className="logo-wrapper">
        <img src="" />
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