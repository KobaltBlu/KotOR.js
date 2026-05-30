import React, { useState } from "react";
import { Dropdown } from "react-bootstrap";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import {
  AmbientMusicOstEntry,
  AudioPlayerOstStatePayload,
  AudioPlayerState,
} from "@/apps/forge/states/AudioPlayerState";

export type ForgeAudioOstControlsProps = {
  /**
   * Compact OST title chip (navbar). Tab view uses the meta card instead.
   */
  showInlineNowPlaying?: boolean;
  /**
   * When set with `showInlineNowPlaying`, adds a modifier for navbar-only responsive rules.
   */
  inlineNowVariant?: "navbar";
  /** e.g. `forge-audio-ost--tab` for larger deck controls */
  className?: string;
};

export const ForgeAudioOstControls = function (props: ForgeAudioOstControlsProps) {
  const { showInlineNowPlaying = true, inlineNowVariant, className } = props;

  const [ost, setOst] = useState<AudioPlayerOstStatePayload>(() => ({
    active: false,
    label: "",
    trackIndex: -1,
    total: 0,
    shuffle: false,
    queuePosition: 0,
    queueLabels: [],
  }));
  const [ostMenuOpen, setOstMenuOpen] = useState(false);
  const [ostMenuTracks, setOstMenuTracks] = useState<AmbientMusicOstEntry[]>([]);

  const syncOstFromState = () => {
    const pl = AudioPlayerState.playlist;
    const order = AudioPlayerState.playOrder;
    const active =
      AudioPlayerState.ostMode && pl.length > 0 && order.length > 0;
    const physical = AudioPlayerState.getCurrentOstPhysicalIndex();
    const entry =
      physical >= 0 && physical < pl.length ? pl[physical] : undefined;
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

  const onOstMenuToggle = (open: boolean) => {
    setOstMenuOpen(open);
    if (open) {
      setOstMenuTracks(AudioPlayerState.getAmbientMusicPlaylistEntries());
    }
  };

  const onOstState = (payload: AudioPlayerOstStatePayload) => {
    setOst(payload);
  };

  useEffectOnce(() => {
    syncOstFromState();
    AudioPlayerState.AddEventListener("onOstState", onOstState);
    return () => {
      AudioPlayerState.RemoveEventListener("onOstState", onOstState);
    };
  });

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
    ost.total > 0
      ? `${ost.queuePosition} / ${ost.total}${ost.shuffle ? " · shuffle" : ""}`
      : "";
  const ostTitle = ost.active
    ? `Ambient soundtrack: ${ost.label}${ostPosition ? ` (${ostPosition})` : ""}`
    : ost.total > 1
      ? `Playlist${ostPosition ? `: ${ostPosition}` : ""}`
      : "Play all music from ambientmusic.2da (auto-advance)";

  const onOstShuffleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    AudioPlayerState.setOstShuffle(e.target.checked);
  };

  const nowPlayingTitle =
    ost.label && (ost.active || ost.total > 1) ? ost.label : "";
  const nowClass =
    inlineNowVariant === "navbar"
      ? "forge-audio-ost__now forge-audio-ost__now--navbar"
      : "forge-audio-ost__now";

  const rootClass = ["forge-audio-ost", className].filter(Boolean).join(" ");

  const useQueueList = ost.queueLabels.length > 0;

  return (
    <div className={rootClass}>
      {showInlineNowPlaying && nowPlayingTitle ? (
        <div className={nowClass} title={ostTitle}>
          <span className="forge-audio-ost__now-badge">
            {ost.active ? "OST" : "Queue"}
          </span>
          <span className="forge-audio-ost__now-title">{nowPlayingTitle}</span>
        </div>
      ) : null}

      <div className="forge-audio-ost__rule" aria-hidden />

      <div className="forge-audio-ost__ambient">
        <Dropdown
          className="forge-audio-ost__dropdown"
          align="end"
          show={ostMenuOpen}
          onToggle={onOstMenuToggle}
        >
          <Dropdown.Toggle
            as="button"
            type="button"
            className="forge-audio-ost__icon-btn forge-audio-ost__dropdown-toggle"
            title={useQueueList ? "Open playlist" : "Ambient music (ambientmusic.2da)"}
            aria-label={useQueueList ? "Open playlist" : "Open ambient music playlist"}
          >
            <i className="fa-solid fa-list-ul" />
          </Dropdown.Toggle>
          <Dropdown.Menu
            className="forge-mini-player__menu"
            renderOnMount
            popperConfig={{
              strategy: "fixed",
              modifiers: [
                {
                  name: "preventOverflow",
                  options: {
                    padding: 8,
                    rootBoundary: "viewport",
                  },
                },
              ],
            }}
          >
            <Dropdown.Header className="forge-mini-player__menu-header">
              {useQueueList ? "Playlist" : "Ambient music"}
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
            {useQueueList ? (
              ost.queueLabels.map((title, idx) => (
                <Dropdown.Item
                  key={`pl-${idx}-${title}`}
                  className="forge-mini-player__menu-item"
                  active={ost.trackIndex === idx}
                  title={title}
                  onClick={() => {
                    void AudioPlayerState.seekPlaylistToPhysicalIndex(idx);
                  }}
                >
                  <span className="text-truncate d-block">{title}</span>
                </Dropdown.Item>
              ))
            ) : ostMenuTracks.length === 0 ? (
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
          className={`forge-audio-ost__icon-btn${ost.active ? " forge-audio-ost__icon-btn--ost-on" : ""}`}
          title={ostTitle}
          aria-label={
            ost.active ? "Stop ambient soundtrack" : "Start ambient soundtrack"
          }
          aria-pressed={ost.active}
          onClick={onOstToggle}
        >
          <i className="fa-solid fa-compact-disc" />
        </button>

        {ost.total > 1 ? (
          <div className="forge-audio-ost__ost-skip" role="group" aria-label="Playlist track">
            <button
              type="button"
              className="forge-audio-ost__icon-btn forge-audio-ost__icon-btn--compact"
              title="Previous track"
              aria-label="Previous playlist track"
              onClick={onOstPrev}
            >
              <i className="fa-solid fa-backward-step" />
            </button>
            <button
              type="button"
              className="forge-audio-ost__icon-btn forge-audio-ost__icon-btn--compact"
              title="Next track"
              aria-label="Next playlist track"
              onClick={onOstNext}
            >
              <i className="fa-solid fa-forward-step" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
