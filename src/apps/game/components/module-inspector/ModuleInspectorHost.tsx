import React, { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/apps/game/context/AppContext";
import * as KotOR from "@/apps/game/KotOR";
import "./module-inspector-host.scss";

/**
 * In-game iframe host for the Module Inspector, with pop-out chrome.
 */
export const ModuleInspectorHost: React.FC = () => {
  const appContext = useApp();
  const [gameKey] = appContext.gameKey;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [src, setSrc] = useState('');

  useEffect(() => {
    const dbg = KotOR.GameState.Debugger;
    setSrc(dbg.getDebuggerUrl('iframe'));
  }, []);

  const setIframe = useCallback((el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
    KotOR.GameState.Debugger.attachIframe(el);
  }, []);

  useEffect(() => {
    return () => {
      KotOR.GameState.Debugger.attachIframe(null);
    };
  }, []);

  const onPopOut = useCallback(() => {
    KotOR.GameState.Debugger.popOut();
  }, []);

  const onClose = useCallback(() => {
    KotOR.GameState.Debugger.close();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if(e.key === 'Escape'){
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if(!src){ return null; }

  return (
    <div className={`module-inspector-host ${gameKey}`}>
      <div className="module-inspector-host-chrome">
        <div className="module-inspector-host-title">Dev Tools</div>
        <div className="module-inspector-host-actions">
          <button type="button" className="module-inspector-host-btn" onClick={onPopOut}>
            Pop out
          </button>
          <button type="button" className="module-inspector-host-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <iframe
        ref={setIframe}
        className="module-inspector-host-frame"
        title="Dev Tools"
        src={src}
        allow="clipboard-write"
      />
    </div>
  );
};
