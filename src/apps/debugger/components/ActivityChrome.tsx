import React from "react";
import { EngineDebugType } from "@/enums/engine/EngineDebugType";
import { IPCDataType } from "@/enums/server/ipc/IPCDataType";
import { IPCMessageType } from "@/enums/server/ipc/IPCMessageType";
import { IPCMessageTypeDebug } from "@/enums/server/ipc/IPCMessageTypeDebug";
import { IPCMessage } from "@/server/ipc/IPCMessage";
import { IPCMessageParam } from "@/server/ipc/IPCMessageParam";
import { useApp } from "@/apps/debugger/context/AppContext";
import type { InspectorActivity } from "@/apps/debugger/context/AppContext";

const ACTIVITIES: { id: InspectorActivity; label: string }[] = [
  { id: 'scene', label: 'Scene' },
  { id: 'module', label: 'Module' },
  { id: 'objects', label: 'Objects' },
  { id: 'globals', label: 'Globals' },
  { id: 'scripts', label: 'Scripts' },
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
  const { activity, setActivity, sendMessageHelper, hostMode } = useApp();

  const toggleDebug = (type: EngineDebugType) => {
    const msg = new IPCMessage(IPCMessageType.Debug, IPCMessageTypeDebug.ToggleDebugState);
    msg.addParam(new IPCMessageParam(IPCDataType.STRING, type));
    sendMessageHelper(msg.toBuffer());
  };

  const requestHostAction = (action: 'close' | 'popout' | 'dock') => {
    sendMessageHelper(action);
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
              onClick={() => setActivity(a.id)}
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
