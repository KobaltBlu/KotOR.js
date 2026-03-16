import React, { createRef, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useProfile } from "../../context/ProfileContext";

export interface ProfilePromoItemProps {
  element: any;
  onClick?: (element: any) => void;
  onDoubleClick?: (element: any) => void;
}

export const GalleryPromoItem = function(props: ProfilePromoItemProps){
  const element: any = props.element;

  const [index, setIndex] = useState(0);

  const onBtnLeftClick: React.MouseEventHandler<HTMLDivElement> = (e: React.MouseEvent<HTMLDivElement>) => {
    galleryPreviousImage();
  };

  const onBtnRightClick: React.MouseEventHandler<HTMLDivElement> = (e: React.MouseEvent<HTMLDivElement>) => {
    galleryNextImage();
  };

  const galleryPreviousImage = () => {
    const count = element.images.length;
    const newIndex = index - 1;
    setIndex(index - 1);
    if(newIndex < 0){
      setIndex(count - 1);
    }
  }

  const galleryNextImage = () => {
    const count = element.images.length;
    const newIndex = index + 1;
    setIndex(index + 1);
    if(newIndex >= count){
      setIndex(0);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      galleryNextImage();
    }, 2500)
    return () => clearInterval(interval);
  }, [index]);

  return (
    <div className="promo-element gallery">
      <div className="gallery-left" onClick={onBtnLeftClick}><i className="fas fa-chevron-left"></i></div>
      <div className="gallery-images">
        {
          element.images.map((image: any, i: number) => {
            return (
              <div key={`gallery-image-${i}`} className={`gallery-image ${i == index ? 'active' : ''}`} data-full={image.path_full} style={{backgroundImage: `url(${image.path_thumbnail})`}} onClick={() => {
                if(typeof props.onClick === 'function'){
                  props.onClick({
                    type: 'image',
                    url: image.path_full,
                  });
                }
              }}></div>
            )
          }
        )}
      </div>
      <div className="gallery-right" onClick={onBtnRightClick}><i className="fas fa-chevron-right"></i></div>
    </div>
  );

}
