import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useApp } from "@/apps/launcher/context/AppContext";
import { ProfilePromoItems } from "@/apps/launcher/components/ProfilePromoItems";
import { LightboxComponent } from "@/apps/launcher/components/LightboxComponenet";
import { ProfileProvider, useProfile } from "@/apps/launcher/context/ProfileContext";
import { ProfileLaunchButtons } from "@/apps/launcher/components/ProfileLaunchButtons";

export interface ProfileTabContentProps {
  profile: any;
  active: boolean
  // ref?: React.RefObject<any>;
}

export const ProfileTabContent = forwardRef(function(props: ProfileTabContentProps, ref: any){
  const appContext = useApp();
  const profile = props.profile;
  const active = props.active;
  const tabRef = useRef<HTMLDivElement>(null);
  const promoRef = useRef<any>(null);
  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);
  const [lightboxType, setLightboxType] = useState<'image'|'ytvideo'>('ytvideo');
  const [lightboxSrc, setLightboxSrc] = useState<string>("");

  // The component instance will be extended
  // with whatever you return from the callback passed
  // as the second argument

  useImperativeHandle(ref, () => ({
    showTab() {
      // console.warn(`showTab: ${profile.name}`);
      if(promoRef.current) promoRef.current.recalculate();
    }
  }));

  

  const onComponentResize = () => {
    // updateScroll();
    // updateScrollButtons();
  }

  useEffect(() => {
    window.addEventListener('resize', onComponentResize);
    // updateScroll();
    // updateScrollButtons();
    return () => {
      window.removeEventListener('resize', onComponentResize);
    };
  }, []);

  const onPromoItemClick = useCallback((element: any) => {
    console.log('onPromoItemClick', element);
    if(element.type === 'ytvideo'){
      setLightboxType('ytvideo');
      setLightboxSrc(element.id);
    } else if (element.type === 'image') {
      setLightboxType('image');
      setLightboxSrc(element.url);
    }
    setLightboxActive(true);
  }, []);

  const onLightboxClose = useCallback(() => {
    setLightboxActive(false);
    setLightboxSrc("");
  }, []);

  return (
    <ProfileProvider>
      <div ref={tabRef} id={profile.name} className={`launcher-content ${active ? `active` : ''}`}>
        <div className="logo-wrapper">
          <img className="logo" src={ profile.steam_id ? `https://steamcdn-a.akamaihd.net/steam/apps/${profile.steam_id}/logo.png?t=1437496165` : profile.logo } />
        </div>
        <ProfilePromoItems ref={promoRef} profile={profile} tabRef={tabRef} onClick={onPromoItemClick}></ProfilePromoItems>
        <ProfileLaunchButtons profile={profile}></ProfileLaunchButtons>
        <LightboxComponent active={lightboxActiveValue} onClose={onLightboxClose} type={lightboxType} src={lightboxSrc} />
      </div>
    </ProfileProvider>
  );
});