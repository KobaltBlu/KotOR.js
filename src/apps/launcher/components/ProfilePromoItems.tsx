import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ProfilePromoItem } from "./ProfilePromoItem";
import { useApp } from "../context/AppContext";


export const ProfilePromoItems = forwardRef(function(props: any, ref: any){
  const appContext = useApp();
  const profile: any = props.profile;
  const tabRef: any = props.tabRef;
  const promoElementsRef = useRef<HTMLDivElement>(null);
  const promoElementWidthValue: number = props.promoElementWidth || 320;

  useImperativeHandle(ref, () => ({
    recalculate() {
      // console.warn(`recalculate: ${profile.name} promo`);
      updateScroll();
      updateScrollButtons();
    }
  }));
  
  // let scrollOffset = 0;
  const canScroll = useRef<boolean>(false);
  const scrollLeftVisable = useRef<boolean>(false);
  const scrollRightVisable = useRef<boolean>(false);

  // let [tabWidth, setTabWidth] = useState(0);
  const [scrollL, setScrollL] = useState<boolean>(false);
  const [scrollR, setScrollR] = useState<boolean>(false);
  const scrollOffset = useRef<number>(0);

  const [marginLeft, setMarginLeft] = useState<number>(scrollOffset.current);

  const updateScroll = () => {
    if(!tabRef.current || !promoElementsRef.current){
      return;
    }
    // setTabWidth(tabRef.current.clientWidth);
    const max = tabRef.current.clientWidth - promoElementsRef.current.clientWidth;
    const maxWidth = max;
    if(max < 0){
      canScroll.current = true;
    }else{
      canScroll.current = false;
    }
  }

  const updateScrollButtons = () => {
    if(tabRef.current && promoElementsRef.current){
      const max = tabRef.current.clientWidth - promoElementsRef.current.clientWidth;
      // const maxMarginLeft = Math.abs(tabRef.current.clientWidth - promoElementsRef.current.clientWidth);
      // const maxWidth = max;
      scrollLeftVisable.current = false;
      scrollRightVisable.current = false;
      if(canScroll.current){
        if(scrollOffset.current < 0){
          scrollLeftVisable.current = true;
        }

        if(scrollOffset.current > max){
          scrollRightVisable.current = true;
        }
      }
    }else{
      scrollLeftVisable.current = false;
      scrollRightVisable.current = false;
      canScroll.current = false;
      // scrollOffset = 0;
    }
    setScrollL(scrollLeftVisable.current);
    setScrollR(scrollRightVisable.current);
    scrollOffset.current = scrollOffset.current;
    setMarginLeft(scrollOffset.current);
  }

  const onBtnPromoLeft = () => {
    updateScroll();
    if(!canScroll.current)
      return;

    if(!tabRef.current || !promoElementsRef.current)
      return;

    const offset = scrollOffset.current + promoElementWidthValue;

    scrollOffset.current = offset >= 0 ? 0 : offset;
    updateScrollButtons();
  }

  const onBtnPromoRight = ()=> {
    updateScroll();
    if(!canScroll.current)
      return;

    if(!tabRef.current || !promoElementsRef.current)
      return;

    const max = Math.abs(tabRef.current.clientWidth - promoElementsRef.current.clientWidth);
    const offset = scrollOffset.current - promoElementWidthValue;

    scrollOffset.current = Math.abs(offset) >= max ? -max : offset;
    setMarginLeft(scrollOffset.current)
    updateScrollButtons();
  }

  useEffect(() => {
    updateScroll();
    updateScrollButtons();
  }, [tabRef, promoElementsRef]);

  useEffect(() => {
    setTimeout(() => {
      updateScroll();
      updateScrollButtons();
    }, 100);
  }, []);

  return (
    <div className={`promo-elements ${scrollL ? 'scroll-left': ''} ${scrollR ? 'scroll-right' : ''}`} >
      <div className="promo-elements-left" onClick={onBtnPromoLeft}><i className="fas fa-chevron-left"></i></div>
      <div ref={promoElementsRef} className="promo-elements-container" style={{ marginLeft: marginLeft, position: 'absolute' }}>
        {
          profile.elements.map( (element: any, i: number) => {
            return (
              <ProfilePromoItem element={element} key={`profile-proto-item-${i}`} onClick={props.onClick} onDoubleClick={props.onDoubleClick}></ProfilePromoItem>
            )
          })
        }
      </div>
      <div className="promo-elements-right" onClick={onBtnPromoRight}><i className="fas fa-chevron-right"></i></div>
    </div>
  );

});