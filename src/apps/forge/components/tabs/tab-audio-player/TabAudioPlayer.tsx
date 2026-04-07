import React, { useEffect, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabAudioPlayerState } from "@/apps/forge/states/tabs/TabAudioPlayerState";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import * as KotOR from "@/KotOR";

const VISUAL_MIN_H = 168;
const VISUAL_MAX_H = 320;

export const TabAudioPlayer = function (props: BaseTabProps) {
  const tab = props.tab as TabAudioPlayerState;

  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTimeString, setCurrentTimeString] = useState<string>("0:00");
  const [durationString, setDurationString] = useState<string>("0:00");
  const [file, setFile] = useState<KotOR.AudioFile>();

  let animationFrame: number;

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

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      AudioPlayerState.RemoveEventListener("onPlay", onPlay);
      AudioPlayerState.RemoveEventListener("onPause", onPause);
      AudioPlayerState.RemoveEventListener("onStop", onStop);
      AudioPlayerState.RemoveEventListener("onLoop", onLoop);
      AudioPlayerState.RemoveEventListener("onOpen", onOpen);
      cancelAnimationFrame(requestRef.current as number);
    };
  });

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

  const animate = (time: number = 0) => {
    const context = contextRef.current;
    if (previousTimeRef.current != undefined && context && AudioPlayerState.analyser) {
      const w = context.canvas.width;
      const h = context.canvas.height;
      context.clearRect(0, 0, w, h);

      const bufferLength = AudioPlayerState.analyserBufferLength;
      const barWidth = w / 2 / bufferLength;
      let firstX = -barWidth / 2;
      let secondX = bufferLength * barWidth - barWidth / 2;

      AudioPlayerState.analyser.getByteFrequencyData(AudioPlayerState.analyserData as any);

      const maxHeight = Math.min(96, h * 0.45);
      const factor = maxHeight / 128;

      const total = AudioPlayerState.analyserData.reduce((prev = 0, current = 0) => {
        return prev + current;
      });
      const avg = total / bufferLength;
      const strength = avg / 128;

      context.filter = "blur(36px)";
      const radius = Math.min(w, h) * 0.35 * (0.25 + strength * 0.75);
      context.fillStyle = "rgba(38, 92, 140, 0.45)";
      context.beginPath();
      context.arc(w / 2, h / 2 + radius * 0.15, radius, 0, Math.PI * 2, true);
      context.fill();
      context.filter = "none";

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = AudioPlayerState.analyserData[i] * factor;
        const percent = barHeight / maxHeight;
        const r = Math.floor(20 + 40 * percent);
        const g = Math.floor(90 + 80 * percent);
        const b = Math.floor(140 + 90 * percent);
        context.fillStyle = `rgb(${r},${g},${b})`;
        context.fillRect(w / 2 - firstX, h - barHeight, barWidth, barHeight);
        firstX += barWidth;
        context.fillRect(secondX, h - barHeight, barWidth, barHeight);
        secondX += barWidth;
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  const seekDisabled = duration <= 0;
  const title = file?.filename?.trim() || "No file loaded";

  return (
    <div className="forge-tab-audio" data-tab-id={tab.id}>
      <div className="forge-tab-audio__visual" ref={visualRef}>
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
        <p className="forge-tab-audio__meta-hint">
          Ambient playlist and shuffle live in the toolbar audio widget.
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
