import React, { useEffect, useState } from "react";
import { SceneGraphTreeView } from "@/apps/forge/components/SceneGraphTreeView";
import {
  TabLIPEditorState,
  TabLIPEditorStateEventListenerTypes,
  TabLIPEditorOptionsState,
  LIP_EDITOR_DEFAULT_HEAD,
} from "@/apps/forge/states/tabs";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ForgeButton, ForgeInput, ForgeSelect, ForgeTextArea } from "@/apps/forge/components/ui";
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
  const [phonemeCount, setPhonemeCount] = useState<number>(() => parentTab.timed_phonemes?.items?.length || 0);
  const [phonemeEngine, setPhonemeEngine] = useState<string>(() => parentTab.timed_phonemes?.engine || '');
  const [phonemeBusy, setPhonemeBusy] = useState<boolean>(false);
  const [phonemeError, setPhonemeError] = useState<string>('');
  const [dialogText, setDialogText] = useState<string>(() => parentTab.phoneme_dialog_text || '');
  const [extendedShapes, setExtendedShapes] = useState<string>(() => parentTab.rhubarb_extended_shapes || 'GHX');
  const [includeRestKeys, setIncludeRestKeys] = useState<boolean>(() => parentTab.rhubarb_include_rest_keys);
  const [minCueMs, setMinCueMs] = useState<number>(() => parentTab.rhubarb_min_cue_duration_ms);
  const [workerCount, setWorkerCount] = useState<number>(() => parentTab.rhubarb_worker_count);

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

  const onPhonemeGenerationStart = () => {
    setPhonemeBusy(true);
    setPhonemeError('');
  };

  const onPhonemesGenerated = (_state: TabLIPEditorState, result: any) => {
    setPhonemeBusy(false);
    setPhonemeError('');
    setPhonemeCount(result?.items?.length || 0);
    setPhonemeEngine(result?.engine || '');
  };

  const onPhonemeGenerationError = (_state: TabLIPEditorState, message: string) => {
    setPhonemeBusy(false);
    setPhonemeError(message || 'Generation failed');
  };

  useEffectOnce(() => {
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onLIPLoaded", onLIPLoaded);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onHeadChange", onHeadChange);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onDurationChange", onDurationChange);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onAudioLoad", onAudioLoad);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onPhonemeGenerationStart", onPhonemeGenerationStart);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onPhonemesGenerated", onPhonemesGenerated);
    parentTab.addEventListener<TabLIPEditorStateEventListenerTypes>("onPhonemeGenerationError", onPhonemeGenerationError);
    setSelectedHead((parentTab.current_head || LIP_EDITOR_DEFAULT_HEAD).toLowerCase());
    setPhonemeCount(parentTab.timed_phonemes?.items?.length || 0);
    setPhonemeEngine(parentTab.timed_phonemes?.engine || '');
    return () => {
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onLIPLoaded", onLIPLoaded);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onHeadChange", onHeadChange);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onDurationChange", onDurationChange);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onAudioLoad", onAudioLoad);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onPhonemeGenerationStart", onPhonemeGenerationStart);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onPhonemesGenerated", onPhonemesGenerated);
      parentTab.removeEventListener<TabLIPEditorStateEventListenerTypes>("onPhonemeGenerationError", onPhonemeGenerationError);
    };
  });

  const onPreviewHeadChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
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

  const onGeneratePhonemesAndShapes = () => {
    parentTab.generateLIPKeyframesFromAudio().catch(() => {});
  };

  const onDialogTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDialogText(value);
    parentTab.setPhonemeDialogText(value);
  };

  const toggleExtendedShape = (letter: "G" | "H" | "X") => {
    const set = new Set(
      String(extendedShapes || "")
        .toUpperCase()
        .split("")
        .filter((c) => c === "G" || c === "H" || c === "X"),
    );
    if (set.has(letter)) set.delete(letter);
    else set.add(letter);
    const next = ["G", "H", "X"].filter((c) => set.has(c)).join("");
    setExtendedShapes(next);
    parentTab.setRhubarbConfig({ extendedShapes: next });
  };

  const onIncludeRestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setIncludeRestKeys(next);
    parentTab.setRhubarbConfig({ includeRestKeys: next });
  };

  const onMinCueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Math.max(0, Math.min(500, parseFloat(e.target.value) || 0));
    setMinCueMs(next);
    parentTab.setRhubarbConfig({ minCueDurationMs: next });
  };

  const onWorkerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cores =
      typeof navigator !== "undefined" && Number.isFinite(navigator.hardwareConcurrency)
        ? Math.max(1, navigator.hardwareConcurrency)
        : 8;
    const next = Math.max(1, Math.min(cores, Math.floor(parseFloat(e.target.value) || 1)));
    setWorkerCount(next);
    parentTab.setRhubarbConfig({ workerCount: next });
  };

  const onFitToKeyFrames = () => {
    parentTab.fitDurationToKeyFrames();
  };

  const heads = Object.values(KotOR.TwoDAManager.datatables.get("heads")?.rows ?? {});
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
          <ForgeInput
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
          <ForgeButton
            variant="secondary"
            size="sm"
            className="lip-sidebar__btn"
            onClick={onFitToKeyFrames}
            title="Set duration to the time of the last keyframe"
          >
            <i className="fa-solid fa-compress-arrows-alt me-1" aria-hidden />
            Fit to Keyframes
          </ForgeButton>
        </div>
      </SectionContainer>

      {/* ── Phoneme Detection (PHN + Auto) ─────────────────────────── */}
      <SectionContainer name="Phoneme Detection">
        <ForgeButton
          variant="secondary"
          size="sm"
          className="lip-sidebar__btn"
          onClick={onImportPHNClick}
          title="Replace keyframes from a PHN phoneme file"
        >
          <i className="fa-solid fa-file-import me-1" aria-hidden />
          Import PHN
        </ForgeButton>
        <p className="lip-sidebar__hint">
          Replaces all keyframes and updates duration from the PHN file.
        </p>
        <label className="lip-sidebar__label" htmlFor="lip-dialog-text">
          Dialog text (optional)
        </label>
        <ForgeTextArea
          id="lip-dialog-text"
          className="lip-sidebar__dialog-text"
          rows={3}
          placeholder="Transcript improves Rhubarb recognition"
          value={dialogText}
          onChange={onDialogTextChange}
          disabled={phonemeBusy}
        />
        <p className="lip-sidebar__hint">
          PocketSphinx (English). First run loads the WASM speech model off the UI thread.
        </p>

        <div className="lip-sidebar__field-row lip-sidebar__field-row--wrap">
          <span className="lip-sidebar__label">Extended</span>
          {(["G", "H", "X"] as const).map((letter) => (
            <label key={letter} className="lip-sidebar__check" title={`Rhubarb extended shape ${letter}`}>
              <input
                type="checkbox"
                checked={extendedShapes.includes(letter)}
                disabled={phonemeBusy}
                onChange={() => toggleExtendedShape(letter)}
              />
              {letter}
            </label>
          ))}
        </div>
        <p className="lip-sidebar__hint">
          G=F/V, H=L, X=rest. Disabled shapes fold onto basic A–F (like --extendedShapes).
        </p>

        <label className="lip-sidebar__check lip-sidebar__check--block">
          <input
            type="checkbox"
            checked={includeRestKeys}
            disabled={phonemeBusy}
            onChange={onIncludeRestChange}
          />
          Include rest (X) keyframes
        </label>

        <div className="lip-sidebar__field-row">
          <label className="lip-sidebar__label" htmlFor="lip-min-cue">
            Min cue (ms)
          </label>
          <ForgeInput
            id="lip-min-cue"
            type="number"
            min={0}
            max={500}
            step={1}
            className="lip-sidebar__number-input"
            value={minCueMs}
            disabled={phonemeBusy}
            onChange={onMinCueChange}
          />
        </div>

        <div className="lip-sidebar__field-row">
          <label className="lip-sidebar__label" htmlFor="lip-workers">
            Workers
          </label>
          <ForgeInput
            id="lip-workers"
            type="number"
            min={1}
            max={typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8}
            step={1}
            className="lip-sidebar__number-input"
            value={workerCount}
            disabled={phonemeBusy}
            onChange={onWorkerCountChange}
          />
        </div>
        <div className="lip-sidebar__btn-row">
          <ForgeButton
            variant="secondary"
            size="sm"
            className="lip-sidebar__btn"
            onClick={onGeneratePhonemesAndShapes}
            disabled={!hasAudio || phonemeBusy}
            title="Generate mouth shapes with Rhubarb WASM and convert to LIP keyframes"
          >
            <i className={`fa-solid ${phonemeBusy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} me-1`} aria-hidden />
            {phonemeBusy ? 'Generating...' : 'Generate Phonemes + Shapes'}
          </ForgeButton>
        </div>
        {(phonemeEngine || phonemeCount > 0) && !phonemeBusy && !phonemeError && (
          <p className="lip-sidebar__hint mb-0">
            {phonemeEngine || 'rhubarb-wasm'}{phonemeCount > 0 ? ` · ${phonemeCount} cues` : ''}
          </p>
        )}
        {phonemeError && (
          <p className="lip-sidebar__hint text-danger mb-0">{phonemeError}</p>
        )}
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
          <ForgeButton
            variant="secondary"
            size="sm"
            className="lip-sidebar__btn"
            onClick={onReplaceAudioClick}
            title="Open a WAV or MP3 file to use as the preview audio"
          >
            <i className="fa-solid fa-folder-open me-1" aria-hidden />
            {hasAudio ? 'Replace Audio' : 'Load Audio'}
          </ForgeButton>
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
          {headList.length ? (
            <ForgeSelect
              id="lip-head-select"
              className="lip-sidebar__select"
              onChange={onPreviewHeadChange}
              value={headSelectValue}
            >
              {headList.map((head: string) => (
                <option key={head} value={head}>{head}</option>
              ))}
            </ForgeSelect>
          ) : (
            <ForgeInput
              id="lip-head-select"
              className="lip-sidebar__select"
              title="heads.2da not loaded — enter a head resref"
              value={headSelectValue}
              onChange={onPreviewHeadChange}
            />
          )}
        </div>
      </SectionContainer>

    </div>
  );
};
