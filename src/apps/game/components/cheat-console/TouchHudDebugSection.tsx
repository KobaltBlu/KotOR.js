import React, { useEffect, useState } from "react";
import * as KotOR from "@apps/game/KotOR";

const CHOICES: { value: KotOR.TouchHudMode; label: string; title: string }[] = [
  { value: KotOR.TouchHudMode.Auto, label: 'Auto', title: 'Touch HUD on touch screens only' },
  { value: KotOR.TouchHudMode.On, label: 'On', title: 'Always use the touch HUD' },
  { value: KotOR.TouchHudMode.Off, label: 'Off', title: 'Always use the desktop HUD' },
];

/** Picks when the in-game touch HUD is used (touchhud). */
export const TouchHudDebugSection: React.FC = () => {
  const [mode, setMode] = useState<KotOR.TouchHudMode>(() => KotOR.getTouchHudMode());
  const [showing, setShowing] = useState<boolean>(() => KotOR.touchHudWanted());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMode(KotOR.getTouchHudMode());
      setShowing(KotOR.touchHudWanted());
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  const choose = (value: KotOR.TouchHudMode) => {
    KotOR.setTouchHudMode(value);
    setMode(value);
    setShowing(KotOR.touchHudWanted(value));
  };

  return (
    <>
      <div className="console-submenu-row">
        <span className="console-submenu-label" title="Layout for playing on a phone or tablet">
          Touch HUD
        </span>
      </div>
      <div className="debug-tools-btn-row">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`console-btn console-btn-small console-choice ${mode === c.value ? 'on' : 'off'}`}
            onClick={() => choose(c.value)}
            aria-pressed={mode === c.value}
            title={c.title}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="console-pad-meta">
        {showing ? 'Showing the touch HUD' : 'Showing the desktop HUD'}
        {mode === KotOR.TouchHudMode.Auto ? (KotOR.isTouchScreen() ? ' (touch screen found)' : ' (no touch screen)') : ''}
      </div>
    </>
  );
};
