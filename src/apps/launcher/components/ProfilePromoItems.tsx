import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ProfilePromoItem } from "@/apps/launcher/components/ProfilePromoItem";
import { useApp } from "@/apps/launcher/context/AppContext";


export const ProfilePromoItems = forwardRef(function(props: any, ref: any){
  const appContext = useApp();
  const profile: any = props.profile;
  const tabRef: any = props.tabRef;
  const promoWrapRef = useRef<HTMLDivElement>(null);
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

  const getViewportWidth = useCallback(() => {
    return promoWrapRef.current?.clientWidth
      || tabRef?.current?.clientWidth
      || 0;
  }, [tabRef]);

  const getScrollStep = useCallback(() => {
    const firstItem = promoElementsRef.current?.querySelector('.promo-element') as HTMLElement | null;
    if (firstItem?.offsetWidth) {
      const style = window.getComputedStyle(firstItem);
      const marginLeftPx = parseFloat(style.marginLeft) || 0;
      return firstItem.offsetWidth + marginLeftPx;
    }
    return promoElementWidthValue;
  }, [promoElementWidthValue]);

  const syncTileWidthVar = useCallback(() => {
    const wrap = promoWrapRef.current;
    if (!wrap) return;
    const width = wrap.clientWidth;
    if (width > 0) {
      wrap.style.setProperty('--promo-tile-width', `${width}px`);
    }
  }, []);

  // Memoized scroll update functions
  const updateScroll = useCallback(() => {
    if(!promoElementsRef.current){
      return;
    }

    const viewportWidth = getViewportWidth();
    if (!viewportWidth) return;

    const max = viewportWidth - promoElementsRef.current.scrollWidth;
    canScroll.current = max < 0;
  }, [getViewportWidth]);

  const updateScrollButtons = useCallback(() => {
    if(!promoElementsRef.current){
      scrollLeftVisable.current = false;
      scrollRightVisable.current = false;
      canScroll.current = false;
      return;
    }

    const viewportWidth = getViewportWidth();
    if (!viewportWidth) {
      scrollLeftVisable.current = false;
      scrollRightVisable.current = false;
      canScroll.current = false;
      return;
    }

    const max = viewportWidth - promoElementsRef.current.scrollWidth;
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
  }, [getViewportWidth]);

  // Combined update function for external calls
  const updateScrollAndButtons = useCallback(() => {
    syncTileWidthVar();
    updateScroll();
    // Clamp offset after resize so tiles stay in view
    if (promoElementsRef.current) {
      const viewportWidth = getViewportWidth();
      const max = Math.min(0, viewportWidth - promoElementsRef.current.scrollWidth);
      if (scrollOffset.current < max) {
        scrollOffset.current = max;
      }
      if (scrollOffset.current > 0) {
        scrollOffset.current = 0;
      }
    }
    updateScrollButtons();
  }, [syncTileWidthVar, updateScroll, updateScrollButtons, getViewportWidth]);

  useImperativeHandle(ref, () => ({
    recalculate() {
      updateScrollAndButtons();
    }
  }), [updateScrollAndButtons]);

  const onBtnPromoLeft = useCallback(() => {
    updateScroll();
    if(!canScroll.current)
      return;

    if(!promoElementsRef.current)
      return;

    const offset = scrollOffset.current + getScrollStep();
    scrollOffset.current = offset >= 0 ? 0 : offset;
    updateScrollButtons();
  }, [updateScroll, updateScrollButtons, getScrollStep]);

  const onBtnPromoRight = useCallback(() => {
    updateScroll();
    if(!canScroll.current)
      return;

    if(!promoElementsRef.current)
      return;

    const viewportWidth = getViewportWidth();
    const max = Math.abs(viewportWidth - promoElementsRef.current.scrollWidth);
    const offset = scrollOffset.current - getScrollStep();

    scrollOffset.current = Math.abs(offset) >= max ? -max : offset;
    updateScrollButtons();
  }, [updateScroll, updateScrollButtons, getScrollStep, getViewportWidth]);

  // Setup ResizeObserver to detect child size changes
  useEffect(() => {
    if (!promoElementsRef.current && !promoWrapRef.current) return;

    // Clean up existing observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    // Create new ResizeObserver
    let debounceTimeout: NodeJS.Timeout | null = null;
    resizeObserverRef.current = new ResizeObserver(() => {
      // Debounce the updates to avoid excessive recalculations
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        updateScrollAndButtons();
        debounceTimeout = null;
      }, 16); // ~60fps
    });

    if (promoWrapRef.current) {
      resizeObserverRef.current.observe(promoWrapRef.current);
    }

    // Observe the promo elements container
    if (promoElementsRef.current) {
      resizeObserverRef.current.observe(promoElementsRef.current);

      // Also observe individual promo items if they exist
      const promoItems = promoElementsRef.current.querySelectorAll('.promo-element');
      promoItems.forEach(item => {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.observe(item);
        }
      });
    }

    // Initial update
    updateScrollAndButtons();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
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
    <div ref={promoWrapRef} className={`promo-elements ${scrollL ? 'scroll-left': ''} ${scrollR ? 'scroll-right' : ''}`} >
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
