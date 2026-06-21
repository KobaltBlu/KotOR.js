import React, { useCallback, useEffect, useRef, useState } from "react";
import { getSteamStoreUrl, getSteamWidgetEmbedUrl } from "@/apps/common/data/kotorStoreProducts";

export interface SteamStoreEmbedProps {
  appId: number;
  title: string;
  lazyMode?: "observer" | "click-only";
}

export const SteamStoreEmbed: React.FC<SteamStoreEmbedProps> = ({
  appId,
  title,
  lazyMode = "observer",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(lazyMode === "click-only" ? false : false);
  const storeUrl = getSteamStoreUrl(appId);
  const embedUrl = getSteamWidgetEmbedUrl(appId);

  const requestLoad = useCallback(() => {
    setShouldLoad(true);
  }, []);

  useEffect(() => {
    if (lazyMode !== "observer" || shouldLoad) {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [lazyMode, shouldLoad]);

  return (
    <div ref={containerRef} className="steam-store-embed">
      <h4 className="steam-store-embed__heading">Steam Store</h4>
      {shouldLoad ? (
        <div className="steam-store-embed__frame-wrapper">
          <iframe
            className="steam-store-embed__iframe"
            src={embedUrl}
            title={`${title} on Steam`}
            frameBorder={0}
            loading="lazy"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="steam-store-embed__placeholder">
          <p className="steam-store-embed__placeholder-text">Steam store widget</p>
          <button type="button" className="steam-store-embed__load-btn" onClick={requestLoad}>
            Show Steam store
          </button>
        </div>
      )}
      <a
        className="steam-store-embed__link"
        href={storeUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        View on Steam
      </a>
    </div>
  );
};

export default SteamStoreEmbed;
