import React, { createRef, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useProfile } from "../../context/ProfileContext";

export interface ProfilePromoItemProps {
  element: any;
}

export const GalleryPromoItem = function(props: ProfilePromoItemProps){
  const element: any = props.element;
  
  const profileContext = useProfile();
  const [lightboxActiveValue, setLightboxActive] = profileContext.lightboxActive;
  const [lightboxImageValue, setLightboxImage] = profileContext.lightboxImage;

  const [index, setIndex] = useState(0);

  const onBtnLeftClick: React.MouseEventHandler<HTMLDivElement> = (e: React.MouseEvent<HTMLDivElement>) => {
    galleryPreviousImage();
  };

  const onBtnRightClick: React.MouseEventHandler<HTMLDivElement> = (e: React.MouseEvent<HTMLDivElement>) => {
    galleryNextImage();
  };

  const galleryPreviousImage = () => {
    let count = element.images.length;
    let newIndex = index - 1;
    setIndex(index - 1);
    if(newIndex < 0){
      setIndex(count - 1);
    }
  }

  const galleryNextImage = () => {
    let count = element.images.length;
    let newIndex = index + 1;
    setIndex(index + 1);
    if(newIndex >= count){
      setIndex(0);
    }
  }

  let jsxElement: JSX.Element = (
    <div className="promo-element">
      <p>[Invalid Promo Element]</p>
    </div>
  );

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
                console.log('image', image.path_full);
                setLightboxImage(image.path_full);
                setLightboxActive(true);
              }}></div>
            )
          }
        )}
      </div>
      <div className="gallery-right" onClick={onBtnRightClick}><i className="fas fa-chevron-right"></i></div>
    </div>
  );

}

function setState(arg0: number): [any, any] {
  throw new Error("Function not implemented.");
}
