import React, { useEffect, useState } from "react";
import { SceneGraphTreeView } from "@/apps/forge/components/SceneGraphTreeView";
import {
  TabLIPEditorState,
  TabLIPEditorStateEventListenerTypes,
  TabLIPEditorOptionsState,
  LIP_EDITOR_DEFAULT_HEAD,
} from "@/apps/forge/states/tabs";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { Button, Form } from "react-bootstrap";
import { SectionContainer } from "@/apps/forge/components/SectionContainer";

import * as KotOR from "@/apps/forge/KotOR";

export interface TabLIPEditorOptionsProps {
  tab: TabLIPEditorOptionsState;
  parentTab: TabLIPEditorState;
}

export const TabLIPEditorOptions = function (props: TabLIPEditorOptionsProps) {
  const tab = props.tab;
  const parentTab = props.parentTab;
  const [selectedHead, setSelectedHead] = useState<string>(
    () => (parentTab.current_head || LIP_EDITOR_DEFAULT_HEAD).toLowerCase()
  );
  const [duration, setDuration] = useState<number>(parentTab.lip.duration);
  const [audioName, setAudioName] = useState<string>(() => parentTab.audio_name || '');
  const [hasAudio, setHasAudio] = useState<boolean>(() => parentTab.audio_buffer instanceof AudioBuffer);

  const onLIPLoaded = () => {
    setDuration(parentTab.lip.duration);
    setSelectedHead((parentTab.current_head || LIP_EDITOR_DEFAULT_HEAD).toLowerCase());
    setAudioName(parentTab.audio_name || '');
  };

  const onHeadChange = () => {
    setSelectedHead((parentTab.current_head || LIP_EDITOR_DEFAULT_HEAD).toLowerCase());
  };

  const onDurationChange = (value: number = 0, update: boolean = false) => {
    if (update) parentTab.setDuration(value);
    setDuration(value);
  };

  const onAudioLoad = (_state: TabLIPEditorState, buffer?: AudioBuffer) => {
    setHasAudio(buffer instanceof AudioBuffer);
    setAudioName(parentTab.audio_name || '');
  };

  useEffectOnce(() => {
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onLIPLoaded", onLIPLoaded);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onHeadChange", onHeadChange);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onDurationChange", onDurationChange);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onAudioLoad", onAudioLoad);
    setSelectedHead((parentTab.current_head || LIP_EDITOR_DEFAULT_HEAD).toLowerCase());
    return () => {
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onLIPLoaded", onLIPLoaded);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onHeadChange", onHeadChange);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onDurationChange", onDurationChange);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onAudioLoad", onAudioLoad);
    };
  });

  const onPreviewHeadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const head = e.target.value.trim().toLowerCase();
    setSelectedHead(head);
    parentTab.loadHead(head);
  };

  const onImportPHNClick = () => {
    parentTab.importPHN();
  };

  const onReplaceAudioClick = () => {
    parentTab.loadSoundFromFile();
  };

  const onFitToKeyFrames = () => {
    parentTab.fitDurationToKeyFrames();
  };

  const heads = Object.values(KotOR.TwoDAManager.datatables.get("heads")?.rows);
  const headList: string[] = (heads ?? [])
    .map((row: any) => String(row?.head ?? "").trim().toLowerCase())
    .filter(Boolean);
  const normalizedPick = (selectedHead || parentTab.current_head || LIP_EDITOR_DEFAULT_HEAD).toLowerCase();
  const headSelectValue = headList.length
    ? headList.includes(normalizedPick)
      ? normalizedPick
      : headList[0]
    : normalizedPick;

  useEffect(() => {
    setSelectedHead((prev) => (prev === headSelectValue ? prev : headSelectValue));
  }, [headSelectValue]);

  useEffect(() => {
    const current = (parentTab.current_head || LIP_EDITOR_DEFAULT_HEAD).toLowerCase();
    if (headSelectValue !== current) {
      parentTab.loadHead(headSelectValue);
    }
  }, [headSelectValue, parentTab]);

  return (
    <div className="lip-sidebar">

      {/* ── Duration ───────────────────────────────────────────────── */}
      <SectionContainer name="Duration">
        <div className="lip-sidebar__field-row">
          <label className="lip-sidebar__label" htmlFor="lip-duration-input">
            Length (s)
          </label>
          <Form.Control
            id="lip-duration-input"
            type="number"
            step={0.01}
            min={0}
            pattern="[0-9]+([\.,][0-9]+)?"
            placeholder="0.00"
            className="lip-sidebar__number-input"
            value={Number.isFinite(duration) ? duration : 0}
            onFocus={() => parentTab.captureUndoSnapshot()}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onDurationChange(parseFloat(e.target.value), true)
            }
          />
        </div>
        <div className="lip-sidebar__btn-row">
          <Button
            variant="secondary"
            size="sm"
            className="lip-sidebar__btn"
            onClick={onFitToKeyFrames}
            title="Set duration to the time of the last keyframe"
          >
            <i className="fa-solid fa-compress-arrows-alt me-1" aria-hidden />
            Fit to Keyframes
          </Button>
        </div>
      </SectionContainer>

      {/* ── Import ─────────────────────────────────────────────────── */}
      <SectionContainer name="Import">
        <Button
          variant="secondary"
          size="sm"
          className="lip-sidebar__btn"
          onClick={onImportPHNClick}
          title="Replace keyframes from a PHN phoneme file"
        >
          <i className="fa-solid fa-file-import me-1" aria-hidden />
          Import PHN
        </Button>
        <p className="lip-sidebar__hint">
          Replaces all keyframes and updates duration from the PHN header.
        </p>
      </SectionContainer>

      {/* ── Audio ──────────────────────────────────────────────────── */}
      <SectionContainer name="Audio">
        <div className="lip-sidebar__field-row lip-sidebar__field-row--audio">
          <i
            className={`fa-solid fa-${hasAudio ? 'music' : 'music-slash'} lip-sidebar__audio-icon ${hasAudio ? 'lip-sidebar__audio-icon--active' : 'lip-sidebar__audio-icon--missing'}`}
            title={hasAudio ? 'Audio loaded' : 'No audio'}
            aria-hidden
          />
          <span className="lip-sidebar__audio-name" title={audioName || 'None'}>
            {audioName || <em className="lip-sidebar__audio-none">none</em>}
          </span>
        </div>
        <div className="lip-sidebar__btn-row">
          <Button
            variant="secondary"
            size="sm"
            className="lip-sidebar__btn"
            onClick={onReplaceAudioClick}
            title="Open a WAV or MP3 file to use as the preview audio"
          >
            <i className="fa-solid fa-folder-open me-1" aria-hidden />
            {hasAudio ? 'Replace Audio' : 'Load Audio'}
          </Button>
        </div>
      </SectionContainer>

      {/* ── LIP Nodes ──────────────────────────────────────────────── */}
      <SectionContainer name="LIP Nodes">
        <div className="lip-sidebar-tree-host">
          <SceneGraphTreeView
            manager={parentTab.ui3DRenderer.sceneGraphManager}
            listStyle={{ height: "auto", minHeight: "72px", overflow: "visible" }}
          />
        </div>
      </SectionContainer>

      {/* ── Preview Head ───────────────────────────────────────────── */}
      <SectionContainer name="Preview Head">
        <div className="lip-sidebar__field-row">
          <label className="lip-sidebar__label" htmlFor="lip-head-select">
            Head
          </label>
          <Form.Select
            id="lip-head-select"
            className="lip-sidebar__select"
            onChange={onPreviewHeadChange}
            value={headSelectValue}
          >
            {headList.length ? (
              headList.map((head: string) => (
                <option key={head} value={head}>{head}</option>
              ))
            ) : (
              <option value={headSelectValue}>{headSelectValue}</option>
            )}
          </Form.Select>
        </div>
      </SectionContainer>

    </div>
  );
};
