import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ProfilePromoItem } from "./ProfilePromoItem";
import { useApp } from "../context/AppContext";


export const ProfilePromoItems = forwardRef(function(props: any, ref: any){
  const appContext = useApp();
  const profile: any = props.profile;
  const tabRef: any = props.tabRef;
  const promoElementsRef = useRef<HTMLDivElement>(null);
  const promoElementWidthValue: number = props.promoElementWidth || 320;
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Scroll state management
  const canScroll = useRef<boolean>(false);
  const scrollLeftVisable = useRef<boolean>(false);
  const scrollRightVisable = useRef<boolean>(false);
  const scrollOffset = useRef<number>(0);

  const [scrollL, setScrollL] = useState<boolean>(false);
  const [scrollR, setScrollR] = useState<boolean>(false);
  const [marginLeft, setMarginLeft] = useState<number>(scrollOffset.current);

  // Memoized scroll update functions
  const updateScroll = useCallback(() => {
    if(!tabRef.current || !promoElementsRef.current){
      return;
    }
    
    const max = tabRef.current.clientWidth - promoElementsRef.current.clientWidth;
    canScroll.current = max < 0;
  }, [tabRef, promoElementsRef]);

  const updateScrollButtons = useCallback(() => {
    if(!tabRef.current || !promoElementsRef.current){
      scrollLeftVisable.current = false;
      scrollRightVisable.current = false;
      canScroll.current = false;
      return;
    }

    const max = tabRef.current.clientWidth - promoElementsRef.current.clientWidth;
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
    
    setScrollL(scrollLeftVisable.current);
    setScrollR(scrollRightVisable.current);
    setMarginLeft(scrollOffset.current);
  }, [tabRef, promoElementsRef]);

  // Combined update function for external calls
  const updateScrollAndButtons = useCallback(() => {
    updateScroll();
    updateScrollButtons();
  }, [updateScroll, updateScrollButtons]);

  useImperativeHandle(ref, () => ({
    recalculate() {
      // console.warn(`recalculate: ${profile.name} promo`);
      updateScrollAndButtons();
    }
  }), [updateScrollAndButtons]);

  const onBtnPromoLeft = useCallback(() => {
    updateScroll();
    if(!canScroll.current)
      return;

    if(!tabRef.current || !promoElementsRef.current)
      return;

    const offset = scrollOffset.current + promoElementWidthValue;
    scrollOffset.current = offset >= 0 ? 0 : offset;
    updateScrollButtons();
  }, [updateScroll, updateScrollButtons, promoElementWidthValue]);

  const onBtnPromoRight = useCallback(() => {
    updateScroll();
    if(!canScroll.current)
      return;

    if(!tabRef.current || !promoElementsRef.current)
      return;

    const max = Math.abs(tabRef.current.clientWidth - promoElementsRef.current.clientWidth);
    const offset = scrollOffset.current - promoElementWidthValue;

    scrollOffset.current = Math.abs(offset) >= max ? -max : offset;
    updateScrollButtons();
  }, [updateScroll, updateScrollButtons, promoElementWidthValue]);

  // Setup ResizeObserver to detect child size changes
  useEffect(() => {
    if (!promoElementsRef.current) return;

    // Clean up existing observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    // Create new ResizeObserver
    let debounceTimeout: NodeJS.Timeout | null = null;
    resizeObserverRef.current = new ResizeObserver((entries) => {
      // Debounce the updates to avoid excessive recalculations
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        updateScrollAndButtons();
        debounceTimeout = null;
      }, 16); // ~60fps
    });

    // Observe the promo elements container
    resizeObserverRef.current.observe(promoElementsRef.current);

    // Also observe individual promo items if they exist
    const promoItems = promoElementsRef.current.querySelectorAll('.promo-element');
    promoItems.forEach(item => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.observe(item);
      }
    });

    // Initial update
    updateScrollAndButtons();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [updateScrollAndButtons, profile.elements]);

  // Initial setup with timeout for layout completion
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateScrollAndButtons();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [updateScrollAndButtons]);

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