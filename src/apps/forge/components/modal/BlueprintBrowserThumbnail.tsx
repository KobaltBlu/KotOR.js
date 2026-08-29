import React, { useEffect, useRef, useState } from "react";
import type { BlueprintItem, BlueprintType } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";
import { isBlueprintThumbnailType } from "@/apps/forge/helpers/blueprintThumbnailFingerprint";
import {
  prefetchBlueprintThumbnailCacheHit,
  requestBlueprintThumbnail,
} from "@/apps/forge/helpers/blueprintThumbnailRenderer";
import { ForgeState } from "@/apps/forge/states/ForgeState";

export interface BlueprintBrowserThumbnailProps {
  type: BlueprintType;
  item: BlueprintItem;
  size?: number;
}

export const BlueprintBrowserThumbnail = function(props: BlueprintBrowserThumbnailProps){
  const { type, item, size = 128 } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const showPlaceholder = !isBlueprintThumbnailType(type) || !ForgeState.hasGameData;

  useEffect(() => {
    if (showPlaceholder) {
      return;
    }
    const node = rootRef.current;
    if (!node) {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "120px", threshold: 0.01 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [showPlaceholder, item.resref, item.source]);

  useEffect(() => {
    if (!visible || showPlaceholder) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSrc(null);

    void (async () => {
      try {
        let objectUrl = await prefetchBlueprintThumbnailCacheHit(type, item);
        if (!objectUrl) {
          objectUrl = await requestBlueprintThumbnail(type, item);
        }
        if (!cancelled && objectUrl) {
          setSrc(objectUrl);
        } else if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, showPlaceholder, type, item.resref, item.source, item.path]);

  useEffect(() => {
    return () => {
      if (src) {
        URL.revokeObjectURL(src);
      }
    };
  }, [src]);

  return (
    <div
      ref={rootRef}
      className="blueprint-browser-icon"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          className="blueprint-browser-icon__img"
          src={src}
          alt=""
          draggable={false}
        />
      ) : (
        <div className={`blueprint-browser-icon-placeholder${loading ? " blueprint-browser-icon-placeholder--loading" : ""}`}>
          {showPlaceholder ? type.toUpperCase() : loading ? "…" : type.toUpperCase()}
        </div>
      )}
    </div>
  );
};
