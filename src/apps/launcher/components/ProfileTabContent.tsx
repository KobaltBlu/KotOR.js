import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ProfilePromoItems } from "@/apps/launcher/components/ProfilePromoItems";
import { LightboxComponent } from "@/apps/launcher/components/LightboxComponenet";
import { ProfileProvider } from "@/apps/launcher/context/ProfileContext";
import { ProfileLaunchButtons } from "@/apps/launcher/components/ProfileLaunchButtons";

export interface ProfileTabContentProps {
  profile: any;
  active: boolean;
}

export const ProfileTabContent = forwardRef(function(props: ProfileTabContentProps, ref: any) {
  const profile = props.profile;
  const active = props.active;
  const tabRef = useRef<HTMLDivElement>(null);
  const promoRef = useRef<any>(null);
  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);
  const [lightboxType, setLightboxType] = useState<'image'|'ytvideo'>('ytvideo');
  const [lightboxSrc, setLightboxSrc] = useState<string>("");

  useImperativeHandle(ref, () => ({
    showTab() {
      if (promoRef.current) promoRef.current.recalculate();
    }
  }));

  const onComponentResize = () => {
    // reserved for future recalculation hooks
  };

  useEffect(() => {
    window.addEventListener('resize', onComponentResize);
    return () => {
      window.removeEventListener('resize', onComponentResize);
    };
  }, []);

  const onPromoItemClick = useCallback((element: any) => {
    if (element.type === 'ytvideo') {
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
      <div ref={tabRef} id={profile.name} className={`launcher-content ${active ? 'active' : ''}`}>
        <div className="launcher-hero-copy">
          <div className="hero-top-row">
            {profile.logo ? (
              <div className="logo-wrapper">
                <img
                  className="logo"
                  src={profile.steam_id ? `https://steamcdn-a.akamaihd.net/steam/apps/${profile.steam_id}/logo.png?t=1437496165` : profile.logo}
                  alt={profile.full_name || profile.name}
                />
              </div>
            ) : (
              <h1 className="hero-title">{profile.full_name || profile.name}</h1>
            )}

            {profile.kicker && <div className="hero-tag hero-tag-corner">{profile.kicker}</div>}
          </div>

          {profile.description && (
            <div className="hero-copy-panel">
              {!profile.logo && <div className="hero-copy-divider"></div>}
              <p className="hero-subtitle">{profile.description}</p>
            </div>
          )}
        </div>

        {Array.isArray(profile.elements) && profile.elements.length > 0 && (
          <div className="launcher-media-shell">
            <div className="promo-section-title">Media &amp; Updates</div>
            <ProfilePromoItems
              ref={promoRef}
              profile={profile}
              tabRef={tabRef}
              onClick={onPromoItemClick}
            />
          </div>
        )}

        <ProfileLaunchButtons profile={profile} />

        <LightboxComponent
          active={lightboxActiveValue}
          onClose={onLightboxClose}
          type={lightboxType}
          src={lightboxSrc}
        />
      </div>
    </ProfileProvider>
  );
});
