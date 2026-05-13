import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import { TabAudioPlayerState } from "@/apps/forge/states/tabs/TabAudioPlayerState";
import { AudioPlayer } from "@/apps/forge/components/AudioPlayer";

import "@/apps/forge/components/ForgeFloatingMiniPlayer.scss";

const MARGIN = 10;

function readDismissedFromStorage(): boolean {
  try {
    // Hidden unless user explicitly opted in (`"0"`). `"1"` = dismissed from chrome.
    return localStorage.getItem(AudioPlayerState.FLOATING_MINI_LS_DISMISSED) !== "0";
  } catch {
    return true;
  }
}

function readBoundsFromStorage(): { left: number; top: number } | null {
  try {
    const raw = localStorage.getItem(AudioPlayerState.FLOATING_MINI_LS_BOUNDS);
    if (!raw) {
      return null;
    }
    const o = JSON.parse(raw) as { left?: number; top?: number };
    if (
      typeof o.left === "number" &&
      typeof o.top === "number" &&
      Number.isFinite(o.left) &&
      Number.isFinite(o.top)
    ) {
      return { left: o.left, top: o.top };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeBoundsToStorage(left: number, top: number): void {
  try {
    localStorage.setItem(
      AudioPlayerState.FLOATING_MINI_LS_BOUNDS,
      JSON.stringify({ left, top }),
    );
  } catch {
    /* ignore */
  }
}

function setDismissedInStorage(dismissed: boolean): void {
  try {
    if (dismissed) {
      localStorage.setItem(AudioPlayerState.FLOATING_MINI_LS_DISMISSED, "1");
    } else {
      localStorage.setItem(AudioPlayerState.FLOATING_MINI_LS_DISMISSED, "0");
    }
  } catch {
    /* ignore */
  }
}

function defaultPosition(panelW: number, panelH: number): { left: number; top: number } {
  const w = typeof window !== "undefined" ? window.innerWidth : 800;
  const h = typeof window !== "undefined" ? window.innerHeight : 600;
  return {
    left: Math.max(MARGIN, w - panelW - MARGIN),
    top: Math.max(MARGIN, h - panelH - MARGIN),
  };
}

function clampPosition(
  left: number,
  top: number,
  panelW: number,
  panelH: number,
): { left: number; top: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const maxL = Math.max(MARGIN, w - panelW - MARGIN);
  const maxT = Math.max(MARGIN, h - panelH - MARGIN);
  return {
    left: Math.min(Math.max(MARGIN, left), maxL),
    top: Math.min(Math.max(MARGIN, top), maxT),
  };
}

type DragSession = {
  startPointerX: number;
  startPointerY: number;
  startLeft: number;
  startTop: number;
  width: number;
  height: number;
};

export const ForgeFloatingMiniPlayer = function () {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const lastPosRef = useRef<{ left: number; top: number } | null>(null);

  const [dismissed, setDismissed] = useState(readDismissedFromStorage);
  const [fullAudioTabActive, setFullAudioTabActive] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);

  const syncFullAudioTab = useCallback(() => {
    const cur = ForgeState.tabManager.currentTab;
    setFullAudioTabActive(cur instanceof TabAudioPlayerState);
  }, []);

  const onPrefs = useCallback(() => {
    setDismissed(readDismissedFromStorage());
  }, []);

  useEffectOnce(() => {
    syncFullAudioTab();
    ForgeState.tabManager.addEventListener("onTabShow", syncFullAudioTab);
    ForgeState.tabManager.addEventListener("onTabRemoved", syncFullAudioTab);
    AudioPlayerState.AddEventListener("onFloatingMiniPlayerPrefs", onPrefs);
    return () => {
      ForgeState.tabManager.removeEventListener("onTabShow", syncFullAudioTab);
      ForgeState.tabManager.removeEventListener("onTabRemoved", syncFullAudioTab);
      AudioPlayerState.RemoveEventListener("onFloatingMiniPlayerPrefs", onPrefs);
    };
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = rootRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const saved = readBoundsFromStorage();
      if (saved) {
        const clamped = clampPosition(saved.left, saved.top, rect.width, rect.height);
        setPos(clamped);
        lastPosRef.current = clamped;
      } else {
        const d = defaultPosition(rect.width, rect.height);
        setPos(d);
        lastPosRef.current = d;
      }
      setLayoutReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const el = rootRef.current;
      if (!el || pos === null) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const clamped = clampPosition(pos.left, pos.top, rect.width, rect.height);
      setPos(clamped);
      lastPosRef.current = clamped;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

  const onWindowPointerMove = useCallback((e: PointerEvent) => {
    const d = dragSessionRef.current;
    if (!d) {
      return;
    }
    const dx = e.clientX - d.startPointerX;
    const dy = e.clientY - d.startPointerY;
    const next = clampPosition(
      d.startLeft + dx,
      d.startTop + dy,
      d.width,
      d.height,
    );
    lastPosRef.current = next;
    setPos(next);
  }, []);

  const onWindowPointerUp = useCallback(() => {
    if (!dragSessionRef.current) {
      return;
    }
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
    dragSessionRef.current = null;
    const p = lastPosRef.current;
    if (p) {
      writeBoundsToStorage(p.left, p.top);
    }
  }, [onWindowPointerMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
      dragSessionRef.current = null;
    };
  }, [onWindowPointerMove, onWindowPointerUp]);

  useEffect(() => {
    if (!dismissed && !fullAudioTabActive) {
      return;
    }
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
    dragSessionRef.current = null;
  }, [dismissed, fullAudioTabActive, onWindowPointerMove, onWindowPointerUp]);

  const onDismiss = () => {
    setDismissed(true);
    setDismissedInStorage(true);
  };

  const onDragPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    const el = rootRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const curLeft = pos?.left ?? rect.left;
    const curTop = pos?.top ?? rect.top;
    if (pos === null) {
      setPos({ left: curLeft, top: curTop });
    }
    dragSessionRef.current = {
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startLeft: curLeft,
      startTop: curTop,
      width: rect.width,
      height: rect.height,
    };
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
  };

  if (dismissed || fullAudioTabActive) {
    return null;
  }

  const style: React.CSSProperties =
    layoutReady && pos !== null
      ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" }
      : {
          right: MARGIN,
          bottom: MARGIN,
          left: "auto",
          top: "auto",
          visibility: "hidden" as const,
        };

  return (
    <div
      ref={rootRef}
      className="forge-floating-mini-player"
      style={style}
      role="complementary"
      aria-label="Mini audio player"
    >
      <div className="forge-floating-mini-player__chrome">
        <div className="forge-floating-mini-player__handle">
          <div
            className="forge-floating-mini-player__handle-drag"
            onPointerDown={onDragPointerDown}
          >
            <span className="forge-floating-mini-player__handle-title">Audio</span>
          </div>
          <button
            type="button"
            className="forge-floating-mini-player__dismiss"
            title="Hide mini player"
            aria-label="Hide mini player"
            onClick={onDismiss}
          >
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>
        <div className="forge-floating-mini-player__body">
          <AudioPlayer />
        </div>
      </div>
    </div>
  );
};
