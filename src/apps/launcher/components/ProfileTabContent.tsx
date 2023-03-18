import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ProfilePromoItem } from "./ProfilePromoItem";
import { ApplicationEnvironment } from "../../../enums/ApplicationEnvironment";
import { ApplicationProfile } from "../../../utility/ApplicationProfile";
import { ConfigClient } from "../../../utility/ConfigClient";
import { useApp } from "../context/AppContext";
import { ProfilePromoItems } from "./ProfilePromoItems";
import { LightboxComponent } from "./LightboxComponenet";
import { ProfileProvider, useProfile } from "../context/ProfileContext";
import { ProfileLaunchButtons } from "./ProfileLaunchButtons";

export interface ProfileTabContentProps {
  profile: any;
  active: boolean
  // ref?: React.RefObject<any>;
};

export const ProfileTabContent = forwardRef(function(props: ProfileTabContentProps, ref: any){
  const [render, rerender] = useState(false);
  const appContext = useApp();
  const profileContext = useProfile();
  const [selectedProfileValue, setSelectedProfile] = appContext.selectedProfile;
  const profile = props.profile;
  const active = props.active;
  const tabRef = useRef<HTMLDivElement>(null);
  const promoRef = useRef<any>(null);

  // The component instance will be extended
  // with whatever you return from the callback passed
  // as the second argument

  useImperativeHandle(ref, () => ({
    showTab() {
      // console.warn(`showTab: ${profile.name}`);
      if(promoRef.current) promoRef.current.recalculate();
    }
  }));

  

  let onComponentResize = () => {
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

  return (
    <ProfileProvider>
      <div ref={tabRef} id={profile.name} className={`launcher-content ${active ? `active` : ''}`}>
        <div className="logo-wrapper">
          <img className="logo" src={ profile.steam_id ? `https://steamcdn-a.akamaihd.net/steam/apps/${profile.steam_id}/logo.png?t=1437496165` : profile.logo } />
        </div>
        <ProfilePromoItems ref={promoRef} profile={profile} tabRef={tabRef}></ProfilePromoItems>
        <ProfileLaunchButtons profile={profile}></ProfileLaunchButtons>
        <LightboxComponent />
      </div>
    </ProfileProvider>
  );
});