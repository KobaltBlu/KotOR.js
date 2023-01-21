import React, { useEffect, useState } from "react";
import { AppProvider, AppProviderValues, useApp } from "../context/AppContext";

export const LightboxComponent = function(){

  const myContext = useApp();
  const [lightboxActiveValue, setLightboxActive] = myContext.lightboxActive;
  const [lightboxImageValue, setLightboxImage] = myContext.lightboxImage;
  return (
    <div id="lightbox" className={`lightbox ${lightboxActiveValue ? 'active' : ''}`}>
      <div className="lightbox-content-wrapper">
        <div className="lightbox-close" onClick={() => { setLightboxActive(false) }}><i className="fa-solid fa-circle-xmark"></i></div>
        <div className="lightbox-content" style={{
          backgroundImage: `url(${lightboxImageValue})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center'
        }}></div>
      </div>
    </div>
  )
};