import React, { useEffect, useState } from "react";
import { AppProvider, AppProviderValues, useApp } from "../context/AppContext";
import { useProfile } from "../context/ProfileContext";

export const LightboxComponent = function(){

  const profileContext = useProfile();
  const [lightboxActiveValue, setLightboxActive] = profileContext.lightboxActive;
  const [lightboxImageValue, setLightboxImage] = profileContext.lightboxImage;
  const [lightboxImageWidthValue, setLightboxImageWidth] = profileContext.lightboxImageWidth;
  const [lightboxImageHeightValue, setLightboxImageHeight] = profileContext.lightboxImageHeight;
  return (
    <div id="lightbox" className={`lightbox ${lightboxActiveValue ? 'active' : ''}`}>
      <div className="lightbox-content-wrapper">
        <div className="lightbox-close" onClick={() => { setLightboxActive(false) }}><i className="fa-solid fa-circle-xmark"></i></div>
        <div className="lightbox-content" style={{
          backgroundImage: `url(${lightboxImageValue})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          paddingTop: `${(lightboxImageHeightValue/lightboxImageWidthValue)*100}%`,
        }}></div>
      </div>
    </div>
  )
};