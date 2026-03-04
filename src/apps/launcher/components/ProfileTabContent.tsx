import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { LightboxComponent } from '@/apps/launcher/components/LightboxComponenet';
import { ProfileLaunchButtons } from '@/apps/launcher/components/ProfileLaunchButtons';
import { ProfilePromoItems } from '@/apps/launcher/components/ProfilePromoItems';
import { ProfileProvider } from '@/apps/launcher/context/ProfileContext';
import type { LauncherProfile } from '@/apps/launcher/types';
import { createScopedLogger, LogScope } from '@/utility/Logger';


const log = createScopedLogger(LogScope.Launcher);

export interface ProfileTabContentHandle {
  showTab(): void;
}

export interface ProfileTabContentProps {
  profile: LauncherProfile;
  active: boolean;
}

export const ProfileTabContent = forwardRef<ProfileTabContentHandle, ProfileTabContentProps>(function ProfileTabContentInner(props, ref) {
  log.trace('ProfileTabContent render profile=%s', props.profile?.name ?? 'unknown');
  const profile = props.profile;
  const active = props.active;
  const tabRef = useRef<HTMLDivElement>(null);
  const promoRef = useRef<{ recalculate(): void } | null>(null);
  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);
  const [lightboxType, setLightboxType] = useState<'image'|'ytvideo'>('ytvideo');
  const [lightboxSrc, setLightboxSrc] = useState<string>("");

  // The component instance will be extended
  // with whatever you return from the callback passed
  // as the second argument

  useImperativeHandle(ref, () => ({
    showTab() {
      log.trace('ProfileTabContent showTab() profile=%s', profile.name);
      if (promoRef.current) promoRef.current.recalculate();
    },
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

  const onPromoItemClick = useCallback((element: { type: string; id?: string; url?: string }) => {
    log.debug('onPromoItemClick type=%s', element?.type ?? 'unknown');
    if (element.type === 'ytvideo') {
      setLightboxType('ytvideo');
        setLightboxSrc(element.id ?? '');
    } else if (element.type === 'image') {
      setLightboxType('image');
      setLightboxSrc(element.url ?? '');
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
