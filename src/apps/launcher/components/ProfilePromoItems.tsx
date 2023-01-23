import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ProfilePromoItem } from "./ProfilePromoItem";
import { useApp } from "../context/AppContext";


export const ProfilePromoItems = forwardRef(function(props: any, ref: any){
  const appContext = useApp();
  const profile: any = props.profile;
  const tabRef: any = props.tabRef;
  const promoElementsRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    recalculate() {
      // console.warn(`showTab: ${profile.name} promo`);
      updateScroll();
      updateScrollButtons();
    }
  }));
  
  // let scrollOffset = 0;
  let canScroll = false;
  let maxWidth = 0;
  let scrollLeftVisable = false;
  let scrollRightVisable = false;

  // let [tabWidth, setTabWidth] = useState(0);
  let [scrollL, setScrollL] = useState(false);
  let [scrollR, setScrollR] = useState(false);
  let [scrollOffset, setScrollOffset] = useState(0);
  let [marginLeft, setMarginLeft] = useState(scrollOffset);

  let updateScroll = () => {
    if(tabRef.current && promoElementsRef.current){
      // setTabWidth(tabRef.current.clientWidth);
      let max = tabRef.current.clientWidth - promoElementsRef.current.clientWidth;
      maxWidth = max;
      if(max < 0){
        canScroll = true;
      }else{
        canScroll = false;
      }
    }else{
      // canScroll = false;
      // scrollOffset = 0;
    }
    setScrollOffset(scrollOffset);
  }

  let updateScrollButtons = () => {
    if(tabRef.current && promoElementsRef.current){
      let max = tabRef.current.clientWidth - promoElementsRef.current.clientWidth;
      let maxMarginLeft = Math.abs(tabRef.current.clientWidth - promoElementsRef.current.clientWidth) - tabRef.current.clientWidth;
      maxWidth = max;
      scrollLeftVisable = false;
      scrollRightVisable = false;
      if(canScroll){
        if(scrollOffset < 0){
          scrollLeftVisable = true;
        }

        if(scrollOffset > max){
          scrollRightVisable = true;
        }
      }
    }else{
      scrollLeftVisable = false;
      scrollRightVisable = false;
      canScroll = false;
      // scrollOffset = 0;
    }
    setScrollL(scrollLeftVisable);
    setScrollR(scrollRightVisable);
    setScrollOffset(scrollOffset);
    setMarginLeft(scrollOffset);
  }

  let onBtnPromoLeft = () => {
    updateScroll();
    if(!canScroll)
      return;

    if(!tabRef.current || !promoElementsRef.current)
      return;

    let offset = scrollOffset + 320;

    if(offset >= 0)
      offset = 0;

    scrollOffset = offset;
    setScrollOffset(scrollOffset);
    updateScrollButtons();
  }

  let onBtnPromoRight = ()=> {
    updateScroll();
    if(!canScroll)
      return;

    if(!tabRef.current || !promoElementsRef.current)
      return;

    let max = Math.abs(tabRef.current.clientWidth - promoElementsRef.current.clientWidth) - tabRef.current.clientWidth;

    let offset = scrollOffset - 320;

    if(Math.abs(offset) >= max)
      offset = -max;

    scrollOffset = offset;
    setScrollOffset(scrollOffset);
    updateScrollButtons();
  }

  
  useEffect(() => {
    // console.log('canScroll', profile.name, canScroll);
  }, [canScroll]);

  return (
    <div className={`promo-elements ${scrollL ? 'scroll-left': ''} ${scrollR ? 'scroll-right' : ''}`} >
      <div className="promo-elements-left" onClick={onBtnPromoLeft}><i className="fas fa-chevron-left"></i></div>
      <div ref={promoElementsRef} className="promo-elements-container" style={{ marginLeft: marginLeft, position: 'absolute' }}>
        {
          profile.elements.map( (element: any, i: number) => {
            return (
              <ProfilePromoItem element={element} key={`profile-proto-item-${i}`}></ProfilePromoItem>
            )
          })
        }
      </div>
      <div className="promo-elements-right" onClick={onBtnPromoRight}><i className="fas fa-chevron-right"></i></div>
    </div>
  );

});