import React, { useState } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import { ForgeAudioOstControls } from "@/apps/forge/components/ForgeAudioOstControls";

export const AudioPlayer = function () {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTimeString, setCurrentTimeString] = useState<string>("0:00");
  const [durationString, setDurationString] = useState<string>("0:00");

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

  useEffectOnce(() => {
    AudioPlayerState.AddEventListener("onPlay", onPlay);
    AudioPlayerState.AddEventListener("onPause", onPause);
    AudioPlayerState.AddEventListener("onStop", onStop);
    AudioPlayerState.AddEventListener("onLoop", onLoop);
    return () => {
      AudioPlayerState.RemoveEventListener("onPlay", onPlay);
      AudioPlayerState.RemoveEventListener("onPause", onPause);
      AudioPlayerState.RemoveEventListener("onStop", onStop);
      AudioPlayerState.RemoveEventListener("onLoop", onLoop);
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

  const seekDisabled = duration <= 0;

  return (
    <div className="forge-mini-player" role="region" aria-label="Preview audio">
      <div className="forge-mini-player__transport">
        <button
          type="button"
          className="forge-mini-player__icon-btn forge-mini-player__icon-btn--primary"
          title={isPlaying ? "Pause" : "Play"}
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={onBtnPlay}
        >
          <i className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play"}`} />
        </button>
        <button
          type="button"
          className="forge-mini-player__icon-btn"
          title="Stop"
          aria-label="Stop"
          onClick={onBtnStop}
        >
          <i className="fa-solid fa-stop" />
        </button>
      </div>

      <div className="forge-mini-player__timeline">
        <input
          className="forge-mini-player__seek"
          type="range"
          step="0.01"
          min={0}
          max={duration || 0}
          value={Math.min(currentTime, duration || 0)}
          disabled={seekDisabled}
          aria-label="Playback position"
          onChange={onTrackBarChange}
        />
        <div className="forge-mini-player__time-row">
          <span className="forge-mini-player__time" aria-live="polite">
            {currentTimeString}
          </span>
          <span className="forge-mini-player__time-sep" aria-hidden>
            /
          </span>
          <span className="forge-mini-player__time forge-mini-player__time--dim">
            {durationString}
          </span>
        </div>
      </div>

      <ForgeAudioOstControls showInlineNowPlaying inlineNowVariant="navbar" />

      <div className="forge-mini-player__rule" aria-hidden />

      <button
        type="button"
        className="forge-mini-player__icon-btn"
        title="Export audio"
        aria-label="Export audio"
        onClick={onBtnSave}
      >
        <i className="fa-solid fa-download" />
      </button>
    </div>
  );
};
