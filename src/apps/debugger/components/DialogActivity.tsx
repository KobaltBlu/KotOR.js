import React, { useEffect, useState } from "react";
import { useApp } from "@apps/debugger/context/AppContext";
import type {
  DialogParticipantRef,
  DialogScriptRef,
  DialogSnapshot,
} from "@engine/debug/inspect/dialogSnapshot";

const ScriptChip: React.FC<{
  script: DialogScriptRef;
  onOpen: (script: DialogScriptRef) => void;
}> = ({ script, onOpen }) => (
  <button
    type="button"
    className={`dialog-script-chip${script.not ? ' dialog-script-chip-not' : ''}`}
    title={script.not ? `NOT ${script.slot}: ${script.resref}` : `${script.slot}: ${script.resref}`}
    onClick={() => onOpen(script)}
  >
    {script.not ? `!${script.slot}` : script.slot}: {script.resref}
  </button>
);

const ParticipantRow: React.FC<{
  role: string;
  participant?: DialogParticipantRef;
  onOpen: (p: DialogParticipantRef) => void;
}> = ({ role, participant, onOpen }) => {
  if(!participant || participant.objectId < 0){
    return (
      <div className="dialog-participant">
        <span className="dialog-participant-role">{role}</span>
        <span className="dialog-participant-empty">—</span>
      </div>
    );
  }
  return (
    <div className="dialog-participant">
      <span className="dialog-participant-role">{role}</span>
      <button
        type="button"
        className="dialog-participant-link"
        title="Open in Objects"
        onClick={() => onOpen(participant)}
      >
        {participant.label || participant.tag || `id ${participant.objectId}`}
        {participant.tag ? ` · ${participant.tag}` : ''}
        <span className="dialog-participant-meta">
          {participant.kind} · id {participant.objectId}
        </span>
      </button>
    </div>
  );
};

export const DialogActivity: React.FC = () => {
  const { stateRef, dialogSnapshot, navigateHelper } = useApp();
  const [snap, setSnap] = useState<DialogSnapshot | null>(dialogSnapshot);

  useEffect(() => { setSnap(dialogSnapshot); }, [dialogSnapshot]);

  useEffect(() => {
    const state = stateRef.current;
    const refresh = () => state?.requestDialogSnapshot();
    refresh();
    const id = window.setInterval(refresh, 500);
    const onSnap = (next: DialogSnapshot | null) => setSnap(next);
    state?.addEventListener('dialog-snapshot', onSnap);
    return () => {
      window.clearInterval(id);
      state?.removeEventListener('dialog-snapshot', onSnap);
    };
  }, [stateRef]);

  const openParticipant = (p: DialogParticipantRef) => {
    if(p.objectId < 0){ return; }
    navigateHelper({
      activity: 'objects',
      objectId: p.objectId,
      ownerTag: p.tag || '',
      ownerLabel: p.label || p.tag || 'object',
      ownerKind: String(p.kind || ''),
    });
  };

  const openScript = (script: DialogScriptRef, objectId?: number, owner?: DialogParticipantRef) => {
    if(!script.resref){ return; }
    navigateHelper({
      activity: 'scripts',
      resref: script.resref,
      scriptKey: script.slot,
      objectId: objectId != null && objectId >= 0 ? objectId : undefined,
      ownerTag: owner?.tag || '',
      ownerLabel: owner?.label || owner?.tag || '',
      ownerKind: owner ? String(owner.kind || '') : '',
    });
  };

  const openInScene = (p: DialogParticipantRef) => {
    if(p.objectId < 0){ return; }
    navigateHelper({
      activity: 'scene',
      objectId: p.objectId,
      ownerTag: p.tag || '',
      ownerLabel: p.label || p.tag || 'object',
      ownerKind: String(p.kind || ''),
    });
  };

  if(!snap?.active){
    return (
      <div className="inspector-activity dialog-activity">
        <div className="inspector-activity-toolbar">
          <h2>Dialog</h2>
          <button
            type="button"
            className="inspector-refresh"
            onClick={() => stateRef.current?.requestDialogSnapshot()}
          >
            Refresh
          </button>
        </div>
        <div className="inspector-empty dialog-empty">No active conversation</div>
      </div>
    );
  }

  const entryText = snap.entry?.text || snap.lastSpokenText || '';
  const speaker = snap.entry?.speaker || snap.owner;

  return (
    <div className="inspector-activity dialog-activity">
      <div className="inspector-activity-toolbar">
        <h2>Dialog</h2>
        <div className="dialog-header-meta">
          <span className="dialog-resref">{snap.resref || '—'}</span>
          <span className="dialog-sep">·</span>
          <span>{snap.stateLabel}</span>
          {snap.paused ? <span className="dialog-badge">paused</span> : null}
          {snap.privateConversation ? <span className="dialog-badge">private</span> : null}
          {snap.cutsceneMode ? <span className="dialog-badge">{snap.cutsceneModeLabel}</span> : null}
        </div>
        <button
          type="button"
          className="inspector-refresh"
          onClick={() => stateRef.current?.requestDialogSnapshot()}
        >
          Refresh
        </button>
      </div>

      <div className="dialog-body">
        <section className="dialog-section">
          <h3>Participants</h3>
          <ParticipantRow role="Owner" participant={snap.owner} onOpen={openParticipant} />
          <ParticipantRow role="Listener" participant={snap.listener} onOpen={openParticipant} />
          {snap.owner && snap.owner.objectId >= 0 ? (
            <button
              type="button"
              className="dialog-secondary-link"
              onClick={() => openInScene(snap.owner!)}
            >
              Show owner on Scene
            </button>
          ) : null}
        </section>

        <section className="dialog-section">
          <h3>
            {snap.entry ? `Entry #${snap.entry.index}` : 'Last spoken'}
          </h3>
          <div className="dialog-entry-text">
            {entryText || <span className="dialog-muted">(empty)</span>}
          </div>
          {snap.entry?.speaker ? (
            <ParticipantRow role="Speaker" participant={snap.entry.speaker} onOpen={openParticipant} />
          ) : null}
          {snap.entry?.listener ? (
            <ParticipantRow role="Entry listener" participant={snap.entry.listener} onOpen={openParticipant} />
          ) : null}
          {snap.entry?.scripts?.length ? (
            <div className="dialog-script-row">
              {snap.entry.scripts.map((s) => (
                <ScriptChip
                  key={`entry:${s.slot}:${s.resref}`}
                  script={s}
                  onOpen={(script) => openScript(script, speaker?.objectId, speaker)}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="dialog-section">
          <h3>Replies ({snap.replies.length})</h3>
          {!snap.replies.length ? (
            <div className="dialog-muted">No replies on current entry</div>
          ) : (
            <ul className="dialog-replies">
              {snap.replies.map((reply) => (
                <li
                  key={reply.index}
                  className={`dialog-reply${reply.available ? '' : ' dialog-reply-filtered'}`}
                >
                  <div className="dialog-reply-head">
                    <span className="dialog-reply-index">#{reply.index}</span>
                    <span className={`dialog-reply-avail${reply.available ? ' yes' : ' no'}`}>
                      {reply.available ? 'available' : 'filtered'}
                    </span>
                  </div>
                  <div className="dialog-reply-text">
                    {reply.text || <span className="dialog-muted">(empty)</span>}
                  </div>
                  {(reply.conditionScripts.length > 0 || reply.actionScripts.length > 0) && (
                    <div className="dialog-script-row">
                      {reply.conditionScripts.map((s) => (
                        <ScriptChip
                          key={`cond:${reply.index}:${s.slot}:${s.resref}`}
                          script={s}
                          onOpen={(script) => openScript(script, snap.owner?.objectId, snap.owner)}
                        />
                      ))}
                      {reply.actionScripts.map((s) => (
                        <ScriptChip
                          key={`act:${reply.index}:${s.slot}:${s.resref}`}
                          script={s}
                          onOpen={(script) => openScript(script, snap.owner?.objectId, snap.owner)}
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {snap.dialogScripts.length > 0 ? (
          <section className="dialog-section">
            <h3>Dialog scripts</h3>
            <div className="dialog-script-row">
              {snap.dialogScripts.map((s) => (
                <ScriptChip
                  key={`dlg:${s.slot}:${s.resref}`}
                  script={s}
                  onOpen={(script) => openScript(script, snap.owner?.objectId, snap.owner)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};
