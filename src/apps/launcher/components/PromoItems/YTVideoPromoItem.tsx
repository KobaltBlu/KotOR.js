import React, { useRef } from "react";
import { useApp } from "../../context/AppContext";

export interface ProfilePromoItemProps {
  element: any;
  onClick?: (element: any) => void;
  onDoubleClick?: (element: any) => void;
}

export const YTVideoPromoItem = function(props: ProfilePromoItemProps){
  const element: any = props.element;

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
