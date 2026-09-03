import React from "react";
import { useAudioPlayerTransport } from "@/apps/forge/helpers/useAudioPlayerTransport";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import { ForgeAudioOstControls } from "@/apps/forge/components/ForgeAudioOstControls";

import "@/apps/forge/components/tabs/tab-audio-player/TabAudioPlayer.scss";

export const AudioPlayer = function () {
  const transport = useAudioPlayerTransport({ trackVolume: true });

  const volumeIcon =
    transport.volume === 0
      ? "fa-volume-xmark"
      : transport.volume < 0.33
        ? "fa-volume-off"
        : transport.volume < 0.66
          ? "fa-volume-low"
          : "fa-volume-high";

  return (
    <div className="forge-mini-player" role="region" aria-label="Preview audio">
      <div className="forge-mini-player__segment forge-mini-player__segment--transport">
        <div className="forge-mini-player__transport">
          <button
            type="button"
            className="forge-mini-player__icon-btn forge-mini-player__icon-btn--primary"
            title={transport.isPlaying ? "Pause" : "Play"}
            aria-label={transport.isPlaying ? "Pause" : "Play"}
            onClick={transport.onBtnPlay}
          >
            <i className={`fa-solid ${transport.isPlaying ? "fa-pause" : "fa-play"}`} />
          </button>
          <button
            type="button"
            className="forge-mini-player__icon-btn"
            title="Stop"
            aria-label="Stop"
            onClick={transport.onBtnStop}
          >
            <i className="fa-solid fa-stop" />
          </button>
          <button
            type="button"
            className={`forge-mini-player__icon-btn${
              transport.loop ? " forge-mini-player__icon-btn--active" : ""
            }`}
            title={transport.loop ? "Disable loop" : "Enable loop"}
            aria-label={transport.loop ? "Disable loop" : "Enable loop"}
            aria-pressed={transport.loop}
            onClick={transport.onToggleLoop}
          >
            <i className="fa-solid fa-repeat" />
          </button>
        </div>
      </div>

      <div className="forge-mini-player__segment forge-mini-player__segment--timeline">
        <div className="forge-mini-player__timeline">
          <div className="forge-mini-player__timeline-row">
            <span
              className="forge-mini-player__time forge-mini-player__time--current"
              aria-live="polite"
            >
              {transport.currentTimeString}
            </span>
            <div className="forge-mini-player__seek-wrap">
              <input
                className="forge-mini-player__seek"
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
            <span className="forge-mini-player__time forge-mini-player__time--total">
              {transport.durationString}
            </span>
          </div>
        </div>
      </div>

      <div className="forge-mini-player__segment forge-mini-player__segment--volume">
        <button
          type="button"
          className="forge-mini-player__icon-btn"
          title={transport.volume === 0 ? "Unmute" : "Mute"}
          aria-label={transport.volume === 0 ? "Unmute" : "Mute"}
          onClick={transport.onVolumeIconClick}
        >
          <i className={`fa-solid ${volumeIcon}`} aria-hidden />
        </button>
        <input
          className="forge-mini-player__volume"
          type="range"
          step="0.01"
          min={0}
          max={1}
          value={transport.volume}
          aria-label="Volume"
          onChange={transport.onVolumeChange}
        />
      </div>

      <div className="forge-mini-player__segment forge-mini-player__segment--ost">
        <ForgeAudioOstControls showInlineNowPlaying inlineNowVariant="navbar" />
      </div>

      <div className="forge-mini-player__segment forge-mini-player__segment--actions">
        <button
          type="button"
          className="forge-mini-player__icon-btn"
          title="Open full audio player"
          aria-label="Open full audio player"
          onClick={() => {
            AudioPlayerState.openAudioPlayerTab();
          }}
        >
          <i className="fa-solid fa-sliders" />
        </button>
        <button
          type="button"
          className="forge-mini-player__icon-btn"
          title="Export as WAV"
          aria-label="Export as WAV"
          onClick={transport.onExport}
        >
          <i className="fa-solid fa-download" />
        </button>
      </div>
    </div>
  );
};
