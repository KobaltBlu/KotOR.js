import React, { useEffect, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabAudioPlayerState } from "@/apps/forge/states/tabs/TabAudioPlayerState";
import {
  AudioPlayerOstStatePayload,
  AudioPlayerState,
} from "@/apps/forge/states/AudioPlayerState";
import { ForgeAudioOstControls } from "@/apps/forge/components/ForgeAudioOstControls";
import {
  drawHyperspace,
  drawSpectrumBars,
  drawSpectrumIdle,
  ensureHyperspaceState,
  HyperspaceVizState,
  TAB_AUDIO_VISUAL_OPTIONS,
  TabAudioVisualId,
} from "@/apps/forge/components/tabs/tab-audio-player/tabAudioVisualizations";
import * as KotOR from "@/KotOR";

const VISUAL_MIN_H = 168;
const VISUAL_MAX_H = 320;

export const TabAudioPlayer = function (props: BaseTabProps) {
  const tab = props.tab as TabAudioPlayerState;

  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const visualIdRef = useRef<TabAudioVisualId>("spectrum");
  const hyperspaceStateRef = useRef<HyperspaceVizState | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTimeString, setCurrentTimeString] = useState<string>("0:00");
  const [durationString, setDurationString] = useState<string>("0:00");
  const [volume, setVolume] = useState<number>(AudioPlayerState.volume ?? 0.25);
  const [file, setFile] = useState<KotOR.AudioFile>();
  const [visualId, setVisualId] = useState<TabAudioVisualId>("spectrum");
  const [ost, setOst] = useState<AudioPlayerOstStatePayload>(() => ({
    active: false,
    label: "",
    trackIndex: -1,
    total: 0,
    shuffle: false,
    queuePosition: 0,
  }));

  let animationFrame: number;

  const syncOstFromState = () => {
    const active = AudioPlayerState.ostMode && AudioPlayerState.ostTracks.length > 0;
    const physical = AudioPlayerState.getCurrentOstPhysicalIndex();
    const entry =
      active && physical >= 0 ? AudioPlayerState.ostTracks[physical] : undefined;
    setOst({
      active,
      label: entry?.displayName ?? entry?.label ?? "",
      trackIndex: physical,
      total: AudioPlayerState.ostTracks.length,
      shuffle: AudioPlayerState.ostShuffle,
      queuePosition: active ? AudioPlayerState.ostPlayCursor + 1 : 0,
    });
  };

  const onOstState = (payload: AudioPlayerOstStatePayload) => {
    setOst(payload);
  };

  const onPlay = () => {
    setIsPlaying(true);
    onFrame();
  };

  const onPause = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animationFrame);
  };

  const onStop = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animationFrame);
    setCurrentTime(0);
    setCurrentTimeString(AudioPlayerState.SecondsToTimeString(0));
  };

  const onLoop = () => {};

  const onVolume = (v: number) => {
    setVolume(v);
  };

  const onOpen = (f: KotOR.AudioFile) => {
    if (!f) {
      return;
    }
    setFile(f);
  };

  const onFrame = () => {
    cancelAnimationFrame(animationFrame);
    if (AudioPlayerState.playing) {
      animationFrame = requestAnimationFrame(() => onFrame());
      setCurrentTime(AudioPlayerState.GetCurrentTime());
      setDuration(AudioPlayerState.GetDuration());
      setCurrentTimeString(
        AudioPlayerState.SecondsToTimeString(AudioPlayerState.GetCurrentTime())
      );
      setDurationString(
        AudioPlayerState.SecondsToTimeString(AudioPlayerState.GetDuration())
      );
    }
  };

  const onResize = () => {
    const canvas = canvasRef.current;
    const wrap = visualRef.current;
    if (!canvas || !wrap) {
      return;
    }
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(280, Math.floor(rect.width));
    const h = Math.min(VISUAL_MAX_H, Math.max(VISUAL_MIN_H, Math.floor(w * 0.28)));
    canvas.width = w;
    canvas.height = h;
    hyperspaceStateRef.current = null;
  };

  useEffect(() => {
    const wrap = visualRef.current;
    if (!wrap) {
      return;
    }
    const ro = new ResizeObserver(() => onResize());
    ro.observe(wrap);
    onResize();
    return () => ro.disconnect();
  }, []);

  useEffectOnce(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      contextRef.current = ctx;
      onResize();
    }

    AudioPlayerState.AddEventListener("onPlay", onPlay);
    AudioPlayerState.AddEventListener("onPause", onPause);
    AudioPlayerState.AddEventListener("onStop", onStop);
    AudioPlayerState.AddEventListener("onLoop", onLoop);
    AudioPlayerState.AddEventListener("onOpen", onOpen);
    AudioPlayerState.AddEventListener("onVolume", onVolume);
    syncOstFromState();
    AudioPlayerState.AddEventListener("onOstState", onOstState);

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      AudioPlayerState.RemoveEventListener("onPlay", onPlay);
      AudioPlayerState.RemoveEventListener("onPause", onPause);
      AudioPlayerState.RemoveEventListener("onStop", onStop);
      AudioPlayerState.RemoveEventListener("onLoop", onLoop);
      AudioPlayerState.RemoveEventListener("onOpen", onOpen);
      AudioPlayerState.RemoveEventListener("onVolume", onVolume);
      AudioPlayerState.RemoveEventListener("onOstState", onOstState);
      cancelAnimationFrame(requestRef.current as number);
    };
  });

  visualIdRef.current = visualId;

  const onBtnPlay = () => {
    if (isPlaying) {
      AudioPlayerState.Pause();
    } else {
      AudioPlayerState.Play();
    }
  };

  const onBtnStop = () => {
    AudioPlayerState.Stop();
  };

  const onTrackBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekPosition = parseFloat(e.target.value);
    try {
      AudioPlayerState.Stop();
    } catch {
      /* ignore */
    }
    AudioPlayerState.pausedAt = seekPosition;
    try {
      AudioPlayerState.Play();
    } catch {
      /* ignore */
    }
  };

  const onBtnSave = () => {
    AudioPlayerState.Pause();
    void AudioPlayerState.ExportAudio();
  };

  const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    AudioPlayerState.SetVolume(parseFloat(e.target.value));
  };

  const volumeIcon =
    volume === 0 ? "fa-volume-xmark"
    : volume < 0.33 ? "fa-volume-low"
    : volume < 0.66 ? "fa-volume-low"
    : "fa-volume-high";

  const animate = (time: number = 0) => {
    const context = contextRef.current;
    if (previousTimeRef.current != undefined && context) {
      const w = context.canvas.width;
      const h = context.canvas.height;
      context.clearRect(0, 0, w, h);

      let data: Uint8Array | null = null;
      let bufferLength = 0;
      if (AudioPlayerState.analyser) {
        bufferLength = AudioPlayerState.analyserBufferLength;
        AudioPlayerState.analyser.getByteFrequencyData(AudioPlayerState.analyserData as any);
        data = AudioPlayerState.analyserData;
      }

      const mode = visualIdRef.current;
      if (mode === "spectrum") {
        if (data && bufferLength > 0) {
          drawSpectrumBars(context, w, h, data, bufferLength);
        } else {
          drawSpectrumIdle(context, w, h);
        }
      } else if (mode === "hyperspace") {
        hyperspaceStateRef.current = ensureHyperspaceState(
          hyperspaceStateRef.current,
          w,
          h
        );
        drawHyperspace(context, w, h, hyperspaceStateRef.current, data, bufferLength, time);
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  const seekDisabled = duration <= 0;
  const title = file?.filename?.trim() || "No file loaded";
  const ostPosition =
    ost.active && ost.total > 0
      ? `${ost.queuePosition} / ${ost.total}${ost.shuffle ? " · shuffle" : ""}`
      : "";
  const ostMetaTitle =
    ost.active && ost.label
      ? `Ambient soundtrack: ${ost.label}${ostPosition ? ` (${ostPosition})` : ""}`
      : "";

  return (
    <div className="forge-tab-audio" data-tab-id={tab.id}>
      <div className="forge-tab-audio__visual" ref={visualRef}>
        <div
          className="forge-tab-audio__visual-toolbar"
          role="toolbar"
          aria-label="Audio visualization"
        >
          {TAB_AUDIO_VISUAL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`forge-tab-audio__viz-btn${visualId === opt.id ? " forge-tab-audio__viz-btn--active" : ""}`}
              title={opt.title}
              aria-label={opt.label}
              aria-pressed={visualId === opt.id}
              onClick={() => setVisualId(opt.id)}
            >
              <i className={`fa-solid ${opt.icon}`} aria-hidden />
              <span className="forge-tab-audio__viz-btn-label">{opt.label}</span>
            </button>
          ))}
        </div>
        <canvas
          ref={canvasRef}
          className="forge-tab-audio__canvas"
          width={640}
          height={240}
          aria-hidden
        />
      </div>

      <div className="forge-tab-audio__meta">
        <div className="forge-tab-audio__meta-kicker">Now playing</div>
        <h2 className="forge-tab-audio__meta-title" title={title}>
          {title}
        </h2>
        {ost.active && ost.label ? (
          <p className="forge-tab-audio__meta-ost" title={ostMetaTitle}>
            <span className="forge-tab-audio__meta-ost-badge">OST</span>
            <span className="forge-tab-audio__meta-ost-title">{ost.label}</span>
            {ostPosition ? (
              <span className="forge-tab-audio__meta-ost-pos">{ostPosition}</span>
            ) : null}
          </p>
        ) : null}
        <p className="forge-tab-audio__meta-hint">
          Use the deck below for transport, export, and the ambientmusic.2da soundtrack
          (playlist, shuffle, skip).
        </p>
      </div>

      <div className="forge-tab-audio__deck">
        <div className="forge-tab-audio__transport">
          <button
            type="button"
            className="forge-tab-audio__btn forge-tab-audio__btn--primary"
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={onBtnPlay}
          >
            <i className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play"}`} />
          </button>
          <button
            type="button"
            className="forge-tab-audio__btn"
            title="Stop"
            aria-label="Stop"
            onClick={onBtnStop}
          >
            <i className="fa-solid fa-stop" />
          </button>
        </div>

        <div className="forge-tab-audio__timeline">
          <input
            className="forge-tab-audio__seek"
            type="range"
            step="0.01"
            min={0}
            max={duration || 0}
            value={Math.min(currentTime, duration || 0)}
            disabled={seekDisabled}
            aria-label="Playback position"
            onChange={onTrackBarChange}
          />
          <div className="forge-tab-audio__time-row">
            <span className="forge-tab-audio__time">{currentTimeString}</span>
            <span className="forge-tab-audio__time-sep" aria-hidden>
              /
            </span>
            <span className="forge-tab-audio__time forge-tab-audio__time--dim">
              {durationString}
            </span>
          </div>
        </div>

        <div className="forge-tab-audio__volume" aria-label="Volume">
          <i
            className={`fa-solid ${volumeIcon} forge-tab-audio__volume-icon`}
            aria-hidden
          />
          <input
            className="forge-tab-audio__volume-slider"
            type="range"
            step="0.01"
            min={0}
            max={1}
            value={volume}
            aria-label="Volume"
            onChange={onVolumeChange}
          />
          <span className="forge-tab-audio__volume-label">
            {Math.round(volume * 100)}%
          </span>
        </div>

        <div className="forge-tab-audio__rule" aria-hidden />

        <ForgeAudioOstControls showInlineNowPlaying={false} className="forge-audio-ost--tab" />

        <div className="forge-tab-audio__rule" aria-hidden />

        <button
          type="button"
          className="forge-tab-audio__btn forge-tab-audio__btn--export"
          title="Export audio"
          aria-label="Export audio"
          onClick={onBtnSave}
        >
          <i className="fa-solid fa-download" />
          <span className="forge-tab-audio__btn-label">Export</span>
        </button>
      </div>
    </div>
  );
};
