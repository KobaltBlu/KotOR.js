import React, { useEffect, useMemo, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { useAudioPlayerTransport } from "@/apps/forge/helpers/useAudioPlayerTransport";
import { useTabStatusBar } from "@/apps/forge/helpers/useForgeStatusBarItems";
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
  drawWaveformOverview,
  ensureHyperspaceState,
  HyperspaceVizState,
  TAB_AUDIO_VISUAL_OPTIONS,
  TabAudioVisualId,
} from "@/apps/forge/components/tabs/tab-audio-player/tabAudioVisualizations";
import * as KotOR from "@/KotOR";
import { forgeAudioSettings } from "@/apps/forge/settings/forgeEditorsSettings";

import "@/apps/forge/components/tabs/tab-audio-player/TabAudioPlayer.scss";

function buildTechItems(
  info: ReturnType<typeof AudioPlayerState.getAudioTechInfo>,
): string[] {
  const parts: string[] = [];
  if (info.container && info.container !== "-") {
    parts.push(info.container);
  }
  if (info.encoding && info.encoding !== "-") {
    parts.push(info.encoding);
  }
  if (info.sampleRate) {
    parts.push(`${Math.round(info.sampleRate)} Hz`);
  }
  if (info.channels) {
    parts.push(
      info.channels === 1 ? "Mono" : info.channels === 2 ? "Stereo" : `${info.channels} ch`,
    );
  }
  if (info.duration > 0) {
    parts.push(AudioPlayerState.SecondsToTimeString(info.duration));
  }
  return parts;
}

export const TabAudioPlayer = function (props: BaseTabProps) {
  const tab = props.tab as TabAudioPlayerState;
  const transport = useAudioPlayerTransport({ trackVolume: true });

  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const visualIdRef = useRef<TabAudioVisualId>(forgeAudioSettings.get().visualization);
  const hyperspaceStateRef = useRef<HyperspaceVizState | null>(null);
  const visualCollapsedRef = useRef(false);
  const timeDomainRef = useRef<Uint8Array | null>(null);
  const animateRef = useRef<(time: number) => void>(() => {});

  const [file, setFile] = useState<KotOR.AudioFile>();
  const [techItems, setTechItems] = useState<string[]>([]);
  const [visualCollapsed, setVisualCollapsed] = useState(false);
  const [visualId, setVisualId] = useState<TabAudioVisualId>(
    () => forgeAudioSettings.get().visualization,
  );
  const [ost, setOst] = useState<AudioPlayerOstStatePayload>(() => ({
    active: false,
    label: "",
    trackIndex: -1,
    total: 0,
    shuffle: false,
    queuePosition: 0,
    queueLabels: [],
  }));

  const syncOstFromState = () => {
    const pl = AudioPlayerState.playlist;
    const order = AudioPlayerState.playOrder;
    const active = AudioPlayerState.ostMode && pl.length > 0 && order.length > 0;
    const physical = AudioPlayerState.getCurrentOstPhysicalIndex();
    const entry = physical >= 0 && physical < pl.length ? pl[physical] : undefined;
    setOst({
      active,
      label: entry?.title ?? "",
      trackIndex: physical,
      total: pl.length,
      shuffle: AudioPlayerState.ostShuffle,
      queuePosition: order.length > 0 ? AudioPlayerState.playCursor + 1 : 0,
      queueLabels: pl.map((e) => e.title),
    });
  };

  const refreshTech = () => {
    setTechItems(buildTechItems(AudioPlayerState.getAudioTechInfo()));
  };

  const onOpen = (f: KotOR.AudioFile) => {
    if (!f) {
      return;
    }
    setFile(f);
    refreshTech();
    transport.syncFromEngine();
  };

  const onResize = () => {
    const canvas = canvasRef.current;
    const wrap = visualRef.current;
    if (!canvas || !wrap || visualCollapsedRef.current) {
      return;
    }
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(160, Math.floor(rect.width));
    const h = Math.max(80, Math.floor(rect.height));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      contextRef.current = canvas.getContext("2d");
    }
  };

  useEffect(() => {
    visualCollapsedRef.current = visualCollapsed;
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext("2d");
    }
    const wrap = visualRef.current;
    if (!wrap) {
      return;
    }
    const ro = new ResizeObserver(() => onResize());
    ro.observe(wrap);
    onResize();
    return () => ro.disconnect();
  }, [visualCollapsed]);

  useEffect(() => {
    if (visualId === "waveform") {
      AudioPlayerState.GetAudioBuffer();
    }
  }, [visualId]);

  useEffectOnce(() => {
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext("2d");
      onResize();
    }

    const onOstState = (payload: AudioPlayerOstStatePayload) => {
      setOst(payload);
    };

    AudioPlayerState.AddEventListener("onOpen", onOpen);
    AudioPlayerState.AddEventListener("onOstState", onOstState);
    AudioPlayerState.AddEventListener("onPlay", refreshTech);
    syncOstFromState();
    refreshTech();
    if (AudioPlayerState.audioFile) {
      setFile(AudioPlayerState.audioFile);
    }

    requestRef.current = requestAnimationFrame((time) => {
      animateRef.current(time);
      requestRef.current = requestAnimationFrame(function tick(next: number) {
        animateRef.current(next);
        requestRef.current = requestAnimationFrame(tick);
      });
    });

    return () => {
      AudioPlayerState.RemoveEventListener("onOpen", onOpen);
      AudioPlayerState.RemoveEventListener("onOstState", onOstState);
      AudioPlayerState.RemoveEventListener("onPlay", refreshTech);
      cancelAnimationFrame(requestRef.current as number);
    };
  });

  visualIdRef.current = visualId;

  animateRef.current = (time: number = 0) => {
    const context = contextRef.current;
    try {
      if (previousTimeRef.current != undefined && context && !visualCollapsedRef.current) {
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
            h,
          );
          drawHyperspace(
            context,
            w,
            h,
            hyperspaceStateRef.current,
            data,
            bufferLength,
            time,
          );
        } else if (mode === "waveform") {
          const buf = AudioPlayerState.getDecodedAudioBuffer();
          const dur = AudioPlayerState.GetDuration();
          const progress = dur > 0 ? AudioPlayerState.GetCurrentTime() / dur : 0;
          let live: Uint8Array | null = null;
          if (AudioPlayerState.analyser) {
            const n = AudioPlayerState.analyser.fftSize || AudioPlayerState.analyserBufferLength || 0;
            if (n > 0) {
              if (!timeDomainRef.current || timeDomainRef.current.length !== n) {
                timeDomainRef.current = new Uint8Array(n);
              }
              live = timeDomainRef.current;
              AudioPlayerState.analyser.getByteTimeDomainData(live as any);
            }
          }
          drawWaveformOverview(context, w, h, buf, progress, live);
        }
      }
    } catch {
      /* keep the visualizer loop running */
    }
    previousTimeRef.current = time;
  };

  const volumeIcon =
    transport.volume === 0
      ? "fa-volume-xmark"
      : transport.volume < 0.33
        ? "fa-volume-off"
        : transport.volume < 0.66
          ? "fa-volume-low"
          : "fa-volume-high";

  const title = String(file?.filename ?? "").trim() || "No file loaded";
  const ostPosition =
    ost.total > 0
      ? `${ost.queuePosition} / ${ost.total}${ost.shuffle ? " · shuffle" : ""}`
      : "";
  const nowMeta =
    ost.active && ost.label
      ? `OST  ${ostPosition}`
      : !ost.active && ost.queueLabels.length > 1
        ? `Queue  ${ostPosition}`
        : "";
  const canSkip = ost.total > 1;
  const statusBarItems = useMemo(
    () =>
      techItems.map((text, i) => ({
        id: `tech-${i}`,
        text,
        title: "Track technical details",
        align: "start" as const,
      })),
    [techItems],
  );
  useTabStatusBar(tab, statusBarItems);

  return (
    <div className="forge-tab-audio" data-tab-id={tab.id}>
      <div className="forge-tab-audio__shell">
        <div className="forge-tab-audio__workspace">
          <section
            className={`forge-tab-audio__stage${
              visualCollapsed ? " forge-tab-audio__stage--collapsed" : ""
            }`}
            aria-label="Visualizer"
          >
            <div
              className="forge-tab-audio__stage-toolbar"
              role="toolbar"
              aria-label="Audio visualization"
            >
              <button
                type="button"
                className="forge-tab-audio__tool-btn"
                title={visualCollapsed ? "Show visualizer" : "Hide visualizer"}
                aria-pressed={!visualCollapsed}
                onClick={() => setVisualCollapsed((v) => !v)}
              >
                <i
                  className={`fa-solid ${visualCollapsed ? "fa-eye" : "fa-eye-slash"}`}
                  aria-hidden
                />
              </button>
              {!visualCollapsed
                ? TAB_AUDIO_VISUAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`forge-tab-audio__tool-btn${
                        visualId === opt.id ? " forge-tab-audio__tool-btn--active" : ""
                      }`}
                      title={opt.title}
                      aria-label={opt.label}
                      aria-pressed={visualId === opt.id}
                      onClick={() => {
                        setVisualId(opt.id);
                        forgeAudioSettings.set({ visualization: opt.id });
                      }}
                    >
                      <i className={`fa-solid ${opt.icon}`} aria-hidden />
                    </button>
                  ))
                : null}
            </div>

            {!visualCollapsed ? (
              <div className="forge-tab-audio__stage-frame" ref={visualRef}>
                <canvas
                  ref={canvasRef}
                  className="forge-tab-audio__canvas"
                  width={640}
                  height={180}
                  aria-hidden
                />
              </div>
            ) : null}

            <div className="forge-tab-audio__now">
              <h2 className="forge-tab-audio__now-title" title={title}>
                {title}
              </h2>
              {nowMeta ? (
                <div className="forge-tab-audio__now-meta">{nowMeta}</div>
              ) : null}
            </div>
          </section>

          <section className="forge-tab-audio__playlist" aria-label="Playlist">
            <div className="forge-tab-audio__playlist-head">
              <h3 className="forge-tab-audio__playlist-title">Playlist</h3>
              <div className="forge-tab-audio__playlist-actions">
                <button
                  type="button"
                  className="forge-tab-audio__head-btn"
                  title="Append WAV/MP3 files to the queue"
                  onClick={() => {
                    void AudioPlayerState.promptAppendAudioToPlaylist();
                  }}
                >
                  <i className="fa-solid fa-plus" aria-hidden />
                  <span>Add</span>
                </button>
                <button
                  type="button"
                  className="forge-tab-audio__head-btn"
                  disabled={ost.active || !ost.queueLabels.length}
                  title={
                    ost.active
                      ? "Stop OST before editing the queue"
                      : "Remove all queued files"
                  }
                  onClick={() => {
                    AudioPlayerState.clearManualPlaylist();
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="forge-tab-audio__cols" aria-hidden>
              <span className="forge-tab-audio__col-index">#</span>
              <span className="forge-tab-audio__col-title">Title</span>
            </div>

            {ost.queueLabels.length ? (
              <ul className="forge-tab-audio__track-list">
                {ost.queueLabels.map((rowTitle, idx) => (
                  <li
                    key={`pl-${idx}-${rowTitle}`}
                    className={`forge-tab-audio__track${
                      idx === ost.trackIndex ? " forge-tab-audio__track--active" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="forge-tab-audio__track-main"
                      title="Play this track"
                      onClick={() => {
                        void AudioPlayerState.seekPlaylistToPhysicalIndex(idx);
                      }}
                    >
                      <span className="forge-tab-audio__track-index">{idx + 1}</span>
                      <span className="forge-tab-audio__track-name">{rowTitle}</span>
                      {idx === ost.trackIndex && transport.isPlaying ? (
                        <i
                          className="fa-solid fa-volume-high forge-tab-audio__track-playing"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                    {!ost.active ? (
                      <button
                        type="button"
                        className="forge-tab-audio__track-remove"
                        title="Remove from queue"
                        aria-label={`Remove ${rowTitle}`}
                        onClick={() => {
                          AudioPlayerState.removePlaylistPhysicalIndex(idx);
                        }}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="forge-tab-audio__empty">Queue is empty.</p>
            )}

            <div className="forge-tab-audio__playlist-ost">
              <ForgeAudioOstControls
                showInlineNowPlaying={false}
                className="forge-audio-ost--tab"
              />
            </div>
          </section>
        </div>

        <footer className="forge-tab-audio__deck">
          <div className="forge-tab-audio__transport">
            <button
              type="button"
              className="forge-tab-audio__ctrl"
              title="Previous track"
              aria-label="Previous track"
              disabled={!canSkip}
              onClick={() => {
                void AudioPlayerState.skipOst(-1);
              }}
            >
              <i className="fa-solid fa-backward-step" />
            </button>
            <button
              type="button"
              className="forge-tab-audio__ctrl forge-tab-audio__ctrl--play"
              title={transport.isPlaying ? "Pause" : "Play"}
              aria-label={transport.isPlaying ? "Pause" : "Play"}
              onClick={transport.onBtnPlay}
            >
              <i className={`fa-solid ${transport.isPlaying ? "fa-pause" : "fa-play"}`} />
            </button>
            <button
              type="button"
              className="forge-tab-audio__ctrl"
              title="Next track"
              aria-label="Next track"
              disabled={!canSkip}
              onClick={() => {
                void AudioPlayerState.skipOst(1);
              }}
            >
              <i className="fa-solid fa-forward-step" />
            </button>
            <button
              type="button"
              className="forge-tab-audio__ctrl"
              title="Stop"
              aria-label="Stop"
              onClick={transport.onBtnStop}
            >
              <i className="fa-solid fa-stop" />
            </button>
            <button
              type="button"
              className={`forge-tab-audio__ctrl${
                transport.loop ? " forge-tab-audio__ctrl--on" : ""
              }`}
              title={transport.loop ? "Disable loop" : "Enable loop"}
              aria-label={transport.loop ? "Disable loop" : "Enable loop"}
              aria-pressed={transport.loop}
              onClick={transport.onToggleLoop}
            >
              <i className="fa-solid fa-repeat" />
            </button>
          </div>

          <div className="forge-tab-audio__timeline">
            <span className="forge-tab-audio__time forge-tab-audio__time--current">
              {transport.currentTimeString}
            </span>
            <div className="forge-tab-audio__seek-wrap">
              <input
                className="forge-tab-audio__seek"
                type="range"
                step="0.01"
                min={0}
                max={transport.duration || 0}
                value={Math.min(transport.currentTime, transport.duration || 0)}
                disabled={transport.seekDisabled}
                aria-label="Playback position"
                onChange={transport.onSeekChange}
              />
            </div>
            <span className="forge-tab-audio__time forge-tab-audio__time--total">
              {transport.durationString}
            </span>
          </div>

          <div className="forge-tab-audio__volume" aria-label="Volume">
            <button
              type="button"
              className="forge-tab-audio__volume-mute"
              title={transport.volume === 0 ? "Unmute" : "Mute"}
              aria-label={transport.volume === 0 ? "Unmute" : "Mute"}
              onClick={transport.onVolumeIconClick}
            >
              <i className={`fa-solid ${volumeIcon}`} aria-hidden />
            </button>
            <input
              className="forge-tab-audio__volume-slider"
              type="range"
              step="0.01"
              min={0}
              max={1}
              value={transport.volume}
              aria-label="Volume"
              onChange={transport.onVolumeChange}
            />
            <span className="forge-tab-audio__volume-value">
              {Math.round(transport.volume * 100)}%
            </span>
          </div>

          <button
            type="button"
            className="forge-tab-audio__export"
            title="Export as WAV"
            aria-label="Export as WAV"
            onClick={transport.onExport}
          >
            <i className="fa-solid fa-download" aria-hidden />
            <span>Export WAV</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
