import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { createScopedLogger, LogScope } from "@/utility/Logger";
import { useApp } from "@/apps/launcher/context/AppContext";

const log = createScopedLogger(LogScope.Launcher);

import { LightboxComponent } from "@/apps/launcher/components/LightboxComponenet";
import { ProfilePromoItems, ProfilePromoItemsRef } from "@/apps/launcher/components/ProfilePromoItems";
import { CommunityProvider, useCommunity } from "@/apps/launcher/context/CommunityContext";
import type { CommunityVideoItem } from "@/apps/launcher/context/CommunityContext";
import type { LauncherProfileElement } from "@/apps/launcher/types";

export interface CommunityTabContentProps {}

export interface CommunityTabContentRef {
  showTab: () => void;
}

export const CommunityTabContent = forwardRef<CommunityTabContentRef, CommunityTabContentProps>(function(props, ref){
  const appContext = useApp();
  const communityContext = useCommunity();
  const tabRef = useRef<HTMLDivElement>(null);
  const promoRef = useRef<ProfilePromoItemsRef | null>(null);

  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);
  const [lightboxType, setLightboxType] = useState<'image'|'ytvideo'>('ytvideo');
  const [lightboxSrc, setLightboxSrc] = useState<string>("");

  const [communityProfile, setCommunityProfile] = useState<{ name: string; elements: LauncherProfileElement[] }>({
    name: 'Community',
    elements: [],
  });
  const [videos, setVideos] = appContext.videos;

  useImperativeHandle(ref, () => ({
    showTab() {
      log.trace('CommunityTabContent showTab', 'Community');
      if(promoRef.current) promoRef.current.recalculate();
    }
  }));
  
  useEffect(() => {
    setCommunityProfile({
      name: 'Community',
      elements: videos.map( (video: CommunityVideoItem) => {
        const link = video.link as { '@attributes'?: { href?: string } } | undefined;
        return {
          type: 'ytvideo',
          title: video.title,
          url: link?.['@attributes']?.href ?? '',
          thumbnail: video.thumbnail,
          id: video.id,
        } as LauncherProfileElement;
      }),
    });
  }, [videos]);

  const onPromoItemClick = useCallback((element: LauncherProfileElement) => {
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
    <CommunityProvider>
      <div ref={tabRef} id="community" className={`launcher-content active`}>
        <div className="panel">
          <h3 className="title">Helpful Links</h3><br />
          <ul className="link-list" style={{marginTop: '10px'}}>
            <li><i className="fa-brands fa-github" />&nbsp;<a href="https://github.com/KobaltBlu/KotOR.js" target="_new">KotOR.js GitHub</a></li>
            <li>|</li>
            <li><i className="fa-solid fa-globe" />&nbsp;<a href="https://swkotor.net" target="_new">SWKotOR.net</a></li>
            <li>|</li>
            <li><i className="fa-brands fa-youtube" />&nbsp;<a href="https://www.youtube.com/@KotORjs" target="_new">YouTube Channel</a></li>
            <li>|</li>
            <li><i className="fa-solid fa-globe" />&nbsp;<a href="https://deadlystream.com" target="_new">Deadly Stream Forum</a></li>
            <li>|</li>
            <li><i className="fa-brands fa-discord" />&nbsp;<a href="https://discord.com/invite/QxjqVAuN8T" target="_new">Discord</a></li>
          </ul>
          <div style={{marginTop: '10px'}}>
            <h3 className="title">Latest Videos</h3><br />
            <ProfilePromoItems ref={promoRef} profile={communityProfile} tabRef={tabRef} promoElementWidth={456.5} onClick={onPromoItemClick}></ProfilePromoItems>
          </div>
        </div>
        <LightboxComponent 
          active={lightboxActiveValue}
          onClose={onLightboxClose}
          type={lightboxType}
          src={lightboxSrc}
        />
      </div>
    </CommunityProvider>
  );
});