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
  const [expandFromDialog, setExpandFromDialog] = useState<boolean>(() => parentTab.rhubarb_expand_from_dialog);
  const [splitConsonants, setSplitConsonants] = useState<boolean>(() => parentTab.rhubarb_split_consonants);
  const [phraseOnsetKeys, setPhraseOnsetKeys] = useState<boolean>(() => parentTab.rhubarb_phrase_onset_keys);
  const [timeOffsetMs, setTimeOffsetMs] = useState<number>(() => parentTab.rhubarb_time_offset_ms);
  const [rekeyAfterGapMs, setRekeyAfterGapMs] = useState<number>(() => parentTab.rhubarb_rekey_after_gap_ms);

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

  const onToggleBool = (
    key: "expandFromDialog" | "splitConsonants" | "phraseOnsetKeys",
    setter: (v: boolean) => void,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setter(next);
    parentTab.setRhubarbConfig({ [key]: next });
  };

  const onTimeOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Math.max(-200, Math.min(200, parseFloat(e.target.value) || 0));
    setTimeOffsetMs(next);
    parentTab.setRhubarbConfig({ timeOffsetMs: next });
  };

  const onRekeyGapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Math.max(0, Math.min(500, parseFloat(e.target.value) || 0));
    setRekeyAfterGapMs(next);
    parentTab.setRhubarbConfig({ rekeyAfterGapMs: next });
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

  const extraShapes: Array<{ letter: "G" | "H" | "X"; label: string; title: string }> = [
    { letter: "G", label: "F/V", title: "F and V mouth shape" },
    { letter: "H", label: "L", title: "L mouth shape" },
    { letter: "X", label: "Rest", title: "Idle / rest mouth shape" },
  ];

  return (
    <div className="lip-sidebar">

      <SectionContainer name="Audio & Preview">
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
        <div className="lip-sidebar__stack">
          <label className="lip-sidebar__label" htmlFor="lip-head-select">
            Preview head
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

      <SectionContainer name="Generate">
        <div className="lip-sidebar__stack">
          <label className="lip-sidebar__label" htmlFor="lip-dialog-text">
            Spoken line
          </label>
          <ForgeTextArea
            id="lip-dialog-text"
            className="lip-sidebar__dialog-text"
            rows={3}
            placeholder="Paste the VO transcript (English)"
            value={dialogText}
            onChange={onDialogTextChange}
            disabled={phonemeBusy}
          />
        </div>
        <p className="lip-sidebar__hint">
          Transcript improves recognition. First run loads the speech model.
        </p>
        <div className="lip-sidebar__btn-row">
          <ForgeButton
            variant="primary"
            size="sm"
            className="lip-sidebar__btn"
            onClick={onGeneratePhonemesAndShapes}
            disabled={!hasAudio || phonemeBusy}
            title={hasAudio ? 'Generate mouth shapes from the loaded audio' : 'Load audio first'}
          >
            <i className={`fa-solid ${phonemeBusy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} me-1`} aria-hidden />
            {phonemeBusy ? 'Generating…' : 'Generate lipsync'}
          </ForgeButton>
        </div>
        {!hasAudio && (
          <p className="lip-sidebar__hint">Load audio above before generating.</p>
        )}
        {(phonemeEngine || phonemeCount > 0) && !phonemeBusy && !phonemeError && (
          <p className="lip-sidebar__hint mb-0">
            {phonemeEngine || 'rhubarb-wasm'}{phonemeCount > 0 ? ` · ${phonemeCount} cues` : ''}
          </p>
        )}
        {phonemeError && (
          <p className="lip-sidebar__hint text-danger mb-0">{phonemeError}</p>
        )}
        <div className="lip-sidebar__btn-row lip-sidebar__btn-row--secondary">
          <ForgeButton
            variant="secondary"
            size="sm"
            className="lip-sidebar__btn"
            onClick={onImportPHNClick}
            title="Replace all keyframes from a PHN phoneme file"
          >
            <i className="fa-solid fa-file-import me-1" aria-hidden />
            Import PHN
          </ForgeButton>
        </div>
        <p className="lip-sidebar__hint">Replaces all keyframes from the PHN file.</p>
      </SectionContainer>

      <SectionContainer name="Timeline">
        <div className="lip-sidebar__stack">
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

      <SectionContainer name="Options" collapsible defaultOpen={false}>
        <div className="lip-sidebar__stack">
          <span className="lip-sidebar__label">Extra shapes</span>
          <div className="lip-sidebar__field-row lip-sidebar__field-row--wrap">
            {extraShapes.map((shape) => (
              <label key={shape.letter} className="lip-sidebar__check" title={shape.title}>
                <input
                  type="checkbox"
                  checked={extendedShapes.includes(shape.letter)}
                  disabled={phonemeBusy}
                  onChange={() => toggleExtendedShape(shape.letter)}
                />
                {shape.label}
              </label>
            ))}
          </div>
        </div>

        <label className="lip-sidebar__check lip-sidebar__check--block" title="Emit idle mouth keys during silence">
          <input
            type="checkbox"
            checked={includeRestKeys}
            disabled={phonemeBusy}
            onChange={onIncludeRestChange}
          />
          Keys during silence
        </label>
        <label className="lip-sidebar__check lip-sidebar__check--block" title="Use the spoken line to pick Odyssey mouth shapes">
          <input
            type="checkbox"
            checked={expandFromDialog}
            disabled={phonemeBusy}
            onChange={onToggleBool("expandFromDialog", setExpandFromDialog)}
          />
          Use spoken line for mouth shapes
        </label>
        <label className="lip-sidebar__check lip-sidebar__check--block" title="Break long consonant stretches into more mouth shapes">
          <input
            type="checkbox"
            checked={splitConsonants}
            disabled={phonemeBusy}
            onChange={onToggleBool("splitConsonants", setSplitConsonants)}
          />
          Split long consonants
        </label>
        <label className="lip-sidebar__check lip-sidebar__check--block" title="Insert a closed mouth at the start of each phrase">
          <input
            type="checkbox"
            checked={phraseOnsetKeys}
            disabled={phonemeBusy}
            onChange={onToggleBool("phraseOnsetKeys", setPhraseOnsetKeys)}
          />
          Closed mouth at phrase start
        </label>

        <div className="lip-sidebar__stack">
          <label className="lip-sidebar__label" htmlFor="lip-time-offset">
            Mouth lead (ms)
          </label>
          <ForgeInput
            id="lip-time-offset"
            type="number"
            min={-200}
            max={200}
            step={1}
            className="lip-sidebar__number-input"
            value={timeOffsetMs}
            disabled={phonemeBusy}
            onChange={onTimeOffsetChange}
            title="Negative values make mouth keys lead the audio"
          />
        </div>
        <div className="lip-sidebar__stack">
          <label className="lip-sidebar__label" htmlFor="lip-rekey-gap">
            Repeat after pause (ms)
          </label>
          <ForgeInput
            id="lip-rekey-gap"
            type="number"
            min={0}
            max={500}
            step={1}
            className="lip-sidebar__number-input"
            value={rekeyAfterGapMs}
            disabled={phonemeBusy}
            onChange={onRekeyGapChange}
            title="Re-emit the same mouth shape after this much of a pause"
          />
        </div>
        <div className="lip-sidebar__stack">
          <label className="lip-sidebar__label" htmlFor="lip-min-cue">
            Ignore cues shorter than (ms)
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
            title="Drop or merge mouth cues shorter than this"
          />
        </div>
        <div className="lip-sidebar__stack">
          <label className="lip-sidebar__label" htmlFor="lip-workers">
            Analysis workers
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
            title="Web workers used for speech analysis"
          />
        </div>
      </SectionContainer>

      <SectionContainer name="Keyframes">
        <div className="lip-sidebar-tree-host">
          <SceneGraphTreeView
            manager={parentTab.ui3DRenderer.sceneGraphManager}
            listStyle={{ height: "auto", minHeight: "72px", overflow: "visible" }}
          />
        </div>
      </SectionContainer>

    </div>
  );
};
