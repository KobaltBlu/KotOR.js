import React from "react";
import {
  EngineDebugType,
  IPCDataType,
  IPCMessageType,
  IPCMessageTypeDebug,
  IPCMessage,
  IPCMessageParam,
} from "@apps/debugger/KotOR";
import { useApp } from "@apps/debugger/context/AppContext";
import type { InspectorActivity } from "@apps/debugger/context/AppContext";

const ACTIVITIES: { id: InspectorActivity; label: string }[] = [
  { id: 'scene', label: 'Scene' },
  { id: 'module', label: 'Module' },
  { id: 'objects', label: 'Objects' },
  { id: 'globals', label: 'Globals' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'dialog', label: 'Dialog' },
];

export interface ActivityChromeProps {
  children: React.ReactNode;
  statusLeft?: string;
  statusRight?: string;
}

export const ActivityChrome: React.FC<ActivityChromeProps> = ({
  children,
  statusLeft,
  statusRight,
}) => {
  const { activity, navigateHelper, sendMessageHelper, hostMode } = useApp();

  const toggleDebug = (type: EngineDebugType) => {
    const msg = new IPCMessage(IPCMessageType.Debug, IPCMessageTypeDebug.ToggleDebugState);
    msg.addParam(new IPCMessageParam(IPCDataType.STRING, type));
    sendMessageHelper(msg.toBuffer());
  };

  const requestHostAction = (action: 'close' | 'popout' | 'dock') => {
    sendMessageHelper(action);
  };

  const onActivityClick = (id: InspectorActivity) => {
    navigateHelper({ activity: id });
  };

  return (
    <div className={`module-inspector host-${hostMode}`}>
      <header className="module-inspector-topbar">
        <div className="module-inspector-brand">Dev Tools</div>
        <nav className="module-inspector-tabs" aria-label="Inspector activities">
          {ACTIVITIES.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`module-inspector-tab ${activity === a.id ? 'active' : ''}`}
              onClick={() => onActivityClick(a.id)}
            >
              {a.label}
            </button>
          ))}
        </nav>
        <div className="module-inspector-toggles">
          <button
            type="button"
            className="module-inspector-toggle"
            onClick={() => toggleDebug(EngineDebugType.PATH_FINDING)}
            title="Toggle pathfinding debug"
          >
            Pathfinding
          </button>
          <button
            type="button"
            className="module-inspector-toggle"
            onClick={() => toggleDebug(EngineDebugType.OBJECT_LABELS)}
            title="Toggle object labels"
          >
            Object Labels
          </button>
          {hostMode === 'iframe' && (
            <button
              type="button"
              className="module-inspector-toggle"
              onClick={() => requestHostAction('popout')}
              title="Open in a separate window"
            >
              Pop out
            </button>
          )}
          {hostMode === 'window' && (
            <>
              <button
                type="button"
                className="module-inspector-toggle"
                onClick={() => requestHostAction('dock')}
                title="Dock back into the game window"
              >
                Dock
              </button>
              <button
                type="button"
                className="module-inspector-toggle"
                onClick={() => requestHostAction('close')}
                title="Close Dev Tools"
              >
                Close
              </button>
            </>
          )}
        </div>
      </header>
      <main className="module-inspector-body">{children}</main>
      <footer className="module-inspector-status">
        <span className="status-left">{statusLeft || '—'}</span>
        <span className="status-right">{statusRight || ''}</span>
      </footer>
    </div>
  );
};
