import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { CommunityProvider, useCommunity } from "../context/CommunityContext";
import { ProfilePromoItems } from "./ProfilePromoItems";
import { LightboxComponent } from "./LightboxComponenet";

export interface CommunityTabContentProps {};

export const CommunityTabContent = forwardRef(function(props: CommunityTabContentProps, ref: any){
  const appContext = useApp();
  const communityContext = useCommunity();
  const tabRef = useRef<HTMLDivElement>(null);
  const promoRef = useRef<any>(null);

  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);
  const [lightboxType, setLightboxType] = useState<'image'|'ytvideo'>('ytvideo');
  const [lightboxSrc, setLightboxSrc] = useState<string>("");

  const [communityProfile, setCommunityProfile] = useState<any>({
    name: 'Community',
    elements: [],
  });
  const [videos, setVideos] = appContext.videos;

  useImperativeHandle(ref, () => ({
    showTab() {
      // console.warn(`showTab: ${profile.name}`);
      if(promoRef.current) promoRef.current.recalculate();
    }
  }));
  
  useEffect(() => {
    setCommunityProfile({
      name: 'Community',
      elements: videos.map( (video: any) => {
        return {
          type: 'ytvideo',
          title: video.title,
          url: video.link['@attributes'].href,
          thumbnail: video.thumbnail,
          id: video.id,
        };
      }),
    });
  }, [videos]);

  const onPromoItemClick = useCallback((element: any) => {
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