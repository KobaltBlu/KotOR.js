import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { CommunityProvider, useCommunity } from "../context/CommunityContext";
import { ProfilePromoItems } from "./ProfilePromoItems";

export interface CommunityTabContentProps {};

export const CommunityTabContent = forwardRef(function(props: CommunityTabContentProps, ref: any){
  const appContext = useApp();
  const communityContext = useCommunity();
  const tabRef = useRef<HTMLDivElement>(null);
  const promoRef = useRef<any>(null);

  const [lightboxActiveValue, setLightboxActive] = useState<boolean>(false);
  const lightboxContentRef = useRef<any>(null);

  const [communityProfile, setCommunityProfile] = useState<any>({
    name: 'Community',
    elements: [],
  });
  const [videos, setVideos] = appContext.videos;

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

  const onPromoItemClick = (element: any) => {
    console.log('onYTVideoClick', element);
    if(element.type === 'ytvideo'){
      lightboxContentRef.current.innerHTML = `<iframe width="960" height="540" src="https://www.youtube.com/embed/${element.id}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    }
    setLightboxActive(true);
  }

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
        <div id="lightbox" className={`lightbox ${lightboxActiveValue ? 'active' : ''}`}>
          <div className="lightbox-content-wrapper">
            <div className="lightbox-close" onClick={() => { setLightboxActive(false) }}>
              <i className="fa-solid fa-circle-xmark" />
            </div>
            <div className="lightbox-content">
              <div ref={lightboxContentRef} style={{textAlign: 'center'}}/>
            </div>
          </div>
        </div>
      </div>
    </CommunityProvider>
  );
});