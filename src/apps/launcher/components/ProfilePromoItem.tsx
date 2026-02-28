import React from "react";

import { GalleryPromoItem } from "@/apps/launcher/components/PromoItems/GalleryPromoItem";
import { VideoPromoItem } from "@/apps/launcher/components/PromoItems/VideoPromoItem";
import { WebviewPromoItem } from "@/apps/launcher/components/PromoItems/WebviewPromoItem";
import { YTVideoPromoItem } from "@/apps/launcher/components/PromoItems/YTVideoPromoItem";
import type { LauncherProfileElement } from "@/apps/launcher/types";

export interface ProfilePromoItemProps {
  element: LauncherProfileElement;
  onClick?: (element: LauncherProfileElement) => void;
  onDoubleClick?: (element: LauncherProfileElement) => void;
}

export const ProfilePromoItem = function(props: ProfilePromoItemProps){
  const element = props.element;

  if(element.type === 'gallery'){
    return <GalleryPromoItem element={element} onClick={props.onClick} onDoubleClick={props.onDoubleClick}></GalleryPromoItem>;
  }

  if(element.type === 'video'){
    return <VideoPromoItem element={element} onClick={props.onClick} onDoubleClick={props.onDoubleClick}></VideoPromoItem>;
  }

  if(element.type === 'webview'){
    return <WebviewPromoItem element={element} onClick={props.onClick} onDoubleClick={props.onDoubleClick}></WebviewPromoItem>;
  }

  if(element.type === 'ytvideo'){
    return <YTVideoPromoItem element={element} onClick={props.onClick} onDoubleClick={props.onDoubleClick}></YTVideoPromoItem>;
  }

  return (
    <div className="promo-element">
      <p>[Invalid Promo Element]</p>
    </div>
  );
}
