import React, { createRef, useEffect, useRef, useState } from "react";


import { GalleryPromoItem } from "@/apps/launcher/components/PromoItems/GalleryPromoItem";
import { VideoPromoItem } from "@/apps/launcher/components/PromoItems/VideoPromoItem";
import { WebviewPromoItem } from "@/apps/launcher/components/PromoItems/WebviewPromoItem";
import { YTVideoPromoItem } from "@/apps/launcher/components/PromoItems/YTVideoPromoItem";
import { AppProvider, AppProviderValues, useApp } from "@/apps/launcher/context/AppContext";
import type { LauncherProfileElement } from "@/apps/launcher/types";


export interface ProfilePromoItemProps {
  element: LauncherProfileElement;
  onClick?: (element: LauncherProfileElement) => void;
  onDoubleClick?: (element: LauncherProfileElement) => void;
}

export const ProfilePromoItem = function(props: ProfilePromoItemProps){
  const element = props.element;
  const appContext = useApp();

  let jsxElement: JSX.Element = (
    <div className="promo-element">
      <p>[Invalid Promo Element]</p>
    </div>
  );

  switch(element.type){
    case 'gallery':
      jsxElement = (
        <GalleryPromoItem element={element} onClick={props.onClick} onDoubleClick={props.onDoubleClick}></GalleryPromoItem>
      );
    break;
    case 'video':
      jsxElement = (
        <VideoPromoItem element={element} onClick={props.onClick} onDoubleClick={props.onDoubleClick}></VideoPromoItem>
      )
    break;
    case 'webview':
      jsxElement = (
        <WebviewPromoItem element={element} onClick={props.onClick} onDoubleClick={props.onDoubleClick}></WebviewPromoItem>
      )
    break;
    case 'ytvideo':
      jsxElement = (
        <YTVideoPromoItem element={element} onClick={props.onClick} onDoubleClick={props.onDoubleClick}></YTVideoPromoItem>
      )
    break;
  }

  return (
    jsxElement
  );

}
