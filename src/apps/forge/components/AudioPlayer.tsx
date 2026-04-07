import React, { useState } from "react";
import { Dropdown } from "react-bootstrap";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import {
  AmbientMusicOstEntry,
  AudioPlayerOstStatePayload,
  AudioPlayerState,
} from "@/apps/forge/states/AudioPlayerState";

export const AudioPlayer = function () {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTimeString, setCurrentTimeString] = useState<string>("0:00");
  const [durationString, setDurationString] = useState<string>("0:00");
  const [ost, setOst] = useState<AudioPlayerOstStatePayload>(() => ({
    active: false,
    label: "",
    trackIndex: -1,
    total: 0,
    shuffle: false,
    queuePosition: 0,
  }));
  const [ostMenuOpen, setOstMenuOpen] = useState(false);
  const [ostMenuTracks, setOstMenuTracks] = useState<AmbientMusicOstEntry[]>([]);

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

  const onOstMenuToggle = (open: boolean) => {
    setOstMenuOpen(open);
    if (open) {
      setOstMenuTracks(AudioPlayerState.getAmbientMusicPlaylistEntries());
    }
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

  const onOstState = (payload: AudioPlayerOstStatePayload) => {
    setOst(payload);
  };

  useEffectOnce(() => {
    syncOstFromState();
    AudioPlayerState.AddEventListener("onPlay", onPlay);
    AudioPlayerState.AddEventListener("onPause", onPause);
    AudioPlayerState.AddEventListener("onStop", onStop);
    AudioPlayerState.AddEventListener("onLoop", onLoop);
    AudioPlayerState.AddEventListener("onOstState", onOstState);
    return () => {
      AudioPlayerState.RemoveEventListener("onPlay", onPlay);
      AudioPlayerState.RemoveEventListener("onPause", onPause);
      AudioPlayerState.RemoveEventListener("onStop", onStop);
      AudioPlayerState.RemoveEventListener("onLoop", onLoop);
      AudioPlayerState.RemoveEventListener("onOstState", onOstState);
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

  const onOstToggle = () => {
    if (AudioPlayerState.ostMode) {
      AudioPlayerState.stopAmbientMusicOst();
    } else {
      void AudioPlayerState.startAmbientMusicOst();
    }
  };

  const onOstPrev = () => {
    void AudioPlayerState.skipOst(-1);
  };

  const onOstNext = () => {
    void AudioPlayerState.skipOst(1);
  };

  const ostPosition =
    ost.active && ost.total > 0
      ? `${ost.queuePosition} / ${ost.total}${ost.shuffle ? " · shuffle" : ""}`
      : "";
  const ostTitle = ost.active
    ? `Ambient soundtrack: ${ost.label}${ostPosition ? ` (${ostPosition})` : ""}`
    : "Play all music from ambientmusic.2da (auto-advance)";

  const onOstShuffleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    AudioPlayerState.setOstShuffle(e.target.checked);
  };

  const seekDisabled = duration <= 0;
  const nowPlayingTitle = ost.active && ost.label ? ost.label : "";

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

      {nowPlayingTitle ? (
        <div className="forge-mini-player__now" title={ostTitle}>
          <span className="forge-mini-player__now-badge">OST</span>
          <span className="forge-mini-player__now-title">{nowPlayingTitle}</span>
        </div>
      ) : null}

      <div className="forge-mini-player__rule" aria-hidden />

      <div className="forge-mini-player__ambient">
        <Dropdown
          className="forge-mini-player__dropdown"
          align="end"
          show={ostMenuOpen}
          onToggle={onOstMenuToggle}
        >
          <Dropdown.Toggle
            as="button"
            type="button"
            className="forge-mini-player__icon-btn forge-mini-player__dropdown-toggle"
            title="Ambient music playlist (ambientmusic.2da)"
            aria-label="Open ambient music playlist"
          >
            <i className="fa-solid fa-list-ul" />
          </Dropdown.Toggle>
          <Dropdown.Menu className="forge-mini-player__menu" renderOnMount>
            <Dropdown.Header className="forge-mini-player__menu-header">
              Ambient music
            </Dropdown.Header>
            <div
              className="forge-mini-player__shuffle-row"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <label className="forge-mini-player__shuffle-label">
                <input
                  type="checkbox"
                  checked={ost.shuffle}
                  onChange={onOstShuffleChange}
                />
                Shuffle
              </label>
            </div>
            {ostMenuTracks.length === 0 ? (
              <Dropdown.ItemText className="forge-mini-player__menu-empty">
                No tracks — load game assets and ambientmusic.2da
              </Dropdown.ItemText>
            ) : (
              ostMenuTracks.map((t, idx) => (
                <Dropdown.Item
                  key={`${t.resRef}-${idx}`}
                  className="forge-mini-player__menu-item"
                  active={ost.active && ost.trackIndex === idx}
                  title={`${t.displayName} — ${t.resRef}${
                    t.label !== t.displayName ? ` (row: ${t.label})` : ""
                  }`}
                  onClick={() => {
                    void AudioPlayerState.seekOstToPhysicalIndex(idx);
                  }}
                >
                  <span className="text-truncate d-block">{t.displayName}</span>
                </Dropdown.Item>
              ))
            )}
          </Dropdown.Menu>
        </Dropdown>

        <button
          type="button"
          className={`forge-mini-player__icon-btn${ost.active ? " forge-mini-player__icon-btn--ost-on" : ""}`}
          title={ostTitle}
          aria-label={ost.active ? "Stop ambient soundtrack" : "Start ambient soundtrack"}
          aria-pressed={ost.active}
          onClick={onOstToggle}
        >
          <i className="fa-solid fa-compact-disc" />
        </button>

        {ost.active ? (
          <div className="forge-mini-player__ost-skip" role="group" aria-label="OST track">
            <button
              type="button"
              className="forge-mini-player__icon-btn forge-mini-player__icon-btn--compact"
              title="Previous track"
              aria-label="Previous ambient track"
              onClick={onOstPrev}
            >
              <i className="fa-solid fa-backward-step" />
            </button>
            <button
              type="button"
              className="forge-mini-player__icon-btn forge-mini-player__icon-btn--compact"
              title="Next track"
              aria-label="Next ambient track"
              onClick={onOstNext}
            >
              <i className="fa-solid fa-forward-step" />
            </button>
          </div>
        ) : null}
      </div>

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
