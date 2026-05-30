import React, { useCallback, useEffect, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabSSFEditorState } from "@/apps/forge/states/tabs/TabSSFEditorState";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import { Button, Form, Spinner } from "react-bootstrap";
import * as KotOR from "@/apps/forge/KotOR";
import { SSFType } from "@/enums/resource/SSFType";

import "@/apps/forge/components/tabs/tab-ssf-editor/TabSSFEditor.scss";

export const TabSSFEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabSSFEditorState;
  const [dataVersion, setDataVersion] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  const lastUndoSlot = useRef<number | null>(null);

  const [previewLoadingSlot, setPreviewLoadingSlot] = useState<SSFType | null>(null);
  const [previewPlayingSlot, setPreviewPlayingSlot] = useState<SSFType | null>(null);
  const [previewErrors, setPreviewErrors] = useState<Record<number, string>>({});

  /** Same pattern as TabUTSEditor: Web Audio through sfx bus (not HTML audio / blob URLs). */
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopWebAudioPreview = useCallback(() => {
    if (bufferSourceRef.current) {
      try {
        bufferSourceRef.current.stop();
      } catch {
        /* already stopped */
      }
      try {
        bufferSourceRef.current.disconnect();
      } catch {
        /* ignore */
      }
      bufferSourceRef.current = null;
    }
    setPreviewPlayingSlot(null);
    setPreviewLoadingSlot(null);
  }, []);

  const stopPreview = useCallback(() => {
    stopWebAudioPreview();
  }, [stopWebAudioPreview]);

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  const onFileLoad = () => {
    lastUndoSlot.current = null;
    stopPreview();
    setPreviewErrors({});
    setDataVersion((v) => v + 1);
    setHistoryVersion((v) => v + 1);
  };

  useEffectOnce(() => {
    tab.addEventListener("onEditorFileLoad", onFileLoad);
    return () => {
      tab.removeEventListener("onEditorFileLoad", onFileLoad);
    };
  });

  /** Re-render when the tab is shown — TLK may load after first paint, or game may switch profile. */
  const onTabShow = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  useEffectOnce(() => {
    tab.addEventListener("onTabShow", onTabShow);
    return () => {
      tab.removeEventListener("onTabShow", onTabShow);
    };
  });

  const slots: Array<{ slot: SSFType; label: string }> = [];
  for (let i = 0; i < KotOR.SSF_SLOT_COUNT; i++) {
    const name = SSFType[i];
    slots.push({
      slot: i as SSFType,
      label: typeof name === "string" ? name : `SLOT_${i}`,
    });
  }

  const onStrRefFocus = useCallback(
    (slot: SSFType) => {
      if (lastUndoSlot.current === slot) return;
      lastUndoSlot.current = slot;
      tab.captureUndoSnapshot();
      setHistoryVersion((v) => v + 1);
    },
    [tab],
  );

  const onStrRefChange = useCallback(
    (slot: SSFType, raw: string) => {
      const parsed = parseInt(raw, 10);
      const v = Number.isFinite(parsed) ? parsed >>> 0 : 0;
      if (!tab.ssfObject) return;
      tab.ssfObject.setStrRef(slot, v);
      if (tab.file) tab.file.unsaved_changes = true;
      tab.editorFileUpdated();
      setPreviewErrors((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      setDataVersion((x) => x + 1);
    },
    [tab],
  );

  const onStrRefBlur = useCallback(() => {
    lastUndoSlot.current = null;
  }, []);

  const togglePreview = useCallback(
    async (slot: SSFType) => {
      const ssf = tab.ssfObject;
      if (!ssf) return;

      if (previewPlayingSlot === slot) {
        stopPreview();
        return;
      }

      const resRef = tab.getSoundResRefDisplay(slot);
      if (!resRef) {
        setPreviewErrors((p) => ({
          ...p,
          [slot]: "No TLK / SoundResRef",
        }));
        return;
      }

      stopWebAudioPreview();
      setPreviewErrors((p) => {
        const next = { ...p };
        delete next[slot];
        return next;
      });
      setPreviewLoadingSlot(slot);

      try {
        const data = await KotOR.AudioLoader.LoadSound(resRef);
        if (data == null || !data.byteLength) {
          throw new Error("Sound not found");
        }

        const audioCtx = KotOR.AudioEngine.GetAudioEngine().audioCtx;
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }

        const u8 = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
        const pcmBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
        const audioBuffer = await audioCtx.decodeAudioData(pcmBuffer);

        const bufferSourceNode = audioCtx.createBufferSource();
        bufferSourceNode.buffer = audioBuffer;
        bufferSourceNode.connect(KotOR.AudioEngine.sfxChannel.getGainNode());
        bufferSourceNode.onended = () => {
          bufferSourceRef.current = null;
          setPreviewPlayingSlot(null);
        };
        bufferSourceNode.start(0, 0);
        bufferSourceRef.current = bufferSourceNode;
        setPreviewPlayingSlot(slot);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Load failed";
        setPreviewErrors((p) => ({ ...p, [slot]: msg }));
        stopWebAudioPreview();
      } finally {
        setPreviewLoadingSlot(null);
      }
    },
    [tab, previewPlayingSlot, stopPreview, stopWebAudioPreview],
  );

  const ssf = tab.ssfObject;

  const menuItems: MenuItem[] = [
    {
      label: "File",
      children: [
        {
          label: "Save",
          shortcut: "Ctrl+S",
          onClick: () => {
            void tab.save();
          },
          disabled: !ssf,
        },
        {
          label: "Save As...",
          shortcut: "Ctrl+Shift+S",
          onClick: () => {
            void tab.saveAs();
          },
          disabled: !ssf,
        },
      ],
    },
    {
      label: "Edit",
      children: [
        {
          label: "Undo",
          shortcut: "Ctrl+Z",
          disabled: !tab.canUndo,
          onClick: () => {
            tab.undo();
            setHistoryVersion((v) => v + 1);
          },
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Y",
          disabled: !tab.canRedo,
          onClick: () => {
            tab.redo();
            setHistoryVersion((v) => v + 1);
          },
        },
      ],
    },
  ];

  return (
    <div className="tab-ssf-editor h-100 overflow-hidden">
      <MenuBar items={menuItems} />

      <div className="tab-ssf-editor__scroll">
        {!ssf ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <>
            <div className="tab-ssf-editor__grid-header">
              <span>Slot</span>
              <span>STRREF</span>
              <span>Sound (resref)</span>
              <span>TLK text</span>
              <span className="text-end">Actions</span>
            </div>

            <div key={dataVersion + historyVersion}>
              {slots.map(({ slot, label }) => {
                const soundRef = tab.getSoundResRefDisplay(slot);
                const tlkText = tab.getSoundText(slot);
                const err = previewErrors[slot];
                const loading = previewLoadingSlot === slot;
                const playing = previewPlayingSlot === slot;

                return (
                  <div className="tab-ssf-editor__grid-row" key={slot}>
                    <div className="tab-ssf-editor__slot-label">{label}</div>
                    <div>
                      <Form.Control
                        type="number"
                        min={0}
                        max={4294967295}
                        value={ssf.getStrRef(slot)}
                        onFocus={() => onStrRefFocus(slot)}
                        onBlur={onStrRefBlur}
                        onChange={(e) => onStrRefChange(slot, e.target.value)}
                        className="font-monospace tab-ssf-editor__strref-input"
                        size="sm"
                      />
                    </div>
                    <div className="tab-ssf-editor__sound-ref" title={soundRef || undefined}>
                      {soundRef ? <code>{soundRef}</code> : <span className="text-muted">—</span>}
                    </div>
                    <div className="tab-ssf-editor__tlk-preview" title={tlkText || undefined}>
                      {tlkText || "—"}
                    </div>
                    <div className="tab-ssf-editor__actions">
                      {err ? <span className="tab-ssf-editor__preview-error" title={err}>{err}</span> : null}
                      {loading ? <Spinner animation="border" size="sm" /> : null}
                      <Button
                        variant={playing ? "warning" : "primary"}
                        size="sm"
                        disabled={!soundRef || loading}
                        onClick={() => void togglePreview(slot)}
                      >
                        {playing ? "Stop" : "Play"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
