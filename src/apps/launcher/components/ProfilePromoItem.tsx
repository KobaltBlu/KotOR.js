import React, { createRef, useEffect, useRef, useState } from "react";
import { AppProvider, AppProviderValues, useApp } from "../context/AppContext";
import { GalleryPromoItem } from "./PromoItems/GalleryPromoItem";
import { VideoPromoItem } from "./PromoItems/VideoPromoItem";
import { WebviewPromoItem } from "./PromoItems/WebviewPromoItem";

export interface ProfilePromoItemProps {
  element: any;
}

export const ProfilePromoItem = function(props: ProfilePromoItemProps){
  const element: any = props.element;
  const myContext = useApp();

  let jsxElement: JSX.Element = (
    <div className="promo-element">
      <p>[Invalid Promo Element]</p>
    </div>
  );

  switch(element.type){
    case 'gallery':
      jsxElement = (
        <GalleryPromoItem element={element}></GalleryPromoItem>
      );
    break;
    case 'video':
      jsxElement = (
        <VideoPromoItem element={element}></VideoPromoItem>
      )
    break;
    case 'webview':
      jsxElement = (
        <WebviewPromoItem element={element}></WebviewPromoItem>
      )
    break;
  }

  return (
    jsxElement
  );

}
