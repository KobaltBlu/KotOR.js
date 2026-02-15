import React, { useRef } from "react";

import { useApp } from "@/apps/launcher/context/AppContext";
import type { LauncherProfileElement } from "@/apps/types";

export interface YTVideoPromoItemProps {
  element: LauncherProfileElement;
  onClick?: (element: LauncherProfileElement) => void;
  onDoubleClick?: (element: LauncherProfileElement) => void;
}

export const YTVideoPromoItem = function(props: YTVideoPromoItemProps) {
  const element = props.element;

  const imageElement = useRef(null) as React.RefObject<HTMLImageElement>;
  const onYTVideoClick: React.MouseEventHandler<HTMLDivElement> = (e: React.MouseEvent<HTMLDivElement>) => {
    if(typeof props.onClick === 'function'){
      props.onClick(element);
    }
  };

  const onImageDoubleClick: React.MouseEventHandler<HTMLImageElement> = (e: React.MouseEvent<HTMLImageElement>) => {
    if(typeof props.onDoubleClick === 'function'){
      props.onDoubleClick(element);
    }
  };

  return (
    <div className="promo-element ytvideo" onClick={onYTVideoClick}>
      <img ref={imageElement} src={element.thumbnail} style={{height: '250px'}} onDoubleClick={onImageDoubleClick} />
    </div>
  );

}
