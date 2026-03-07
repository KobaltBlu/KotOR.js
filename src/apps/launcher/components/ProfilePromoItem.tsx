import React, { createRef, useEffect, useRef, useState } from "react";
import { AppProvider, AppProviderValues, useApp } from "../context/AppContext";
import { GalleryPromoItem } from "./PromoItems/GalleryPromoItem";
import { VideoPromoItem } from "./PromoItems/VideoPromoItem";
import { WebviewPromoItem } from "./PromoItems/WebviewPromoItem";
import { YTVideoPromoItem } from "./PromoItems/YTVideoPromoItem";

export interface ProfilePromoItemProps {
  element: any;
  onClick?: (element: any) => void;
  onDoubleClick?: (element: any) => void;
}

export const ProfilePromoItem = function(props: ProfilePromoItemProps){
  const element: any = props.element;
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
