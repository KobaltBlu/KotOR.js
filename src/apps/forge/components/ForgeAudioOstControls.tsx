import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useEffectOnce } from '@/apps/forge/helpers/UseEffectOnce';
import {
  AmbientMusicOstEntry,
  AudioPlayerOstStatePayload,
  AudioPlayerState,
} from '@/apps/forge/states/AudioPlayerState';

export type ForgeAudioOstControlsProps = {
  /**
   * Compact OST title chip (navbar). Tab view uses the meta card instead.
   */
  showInlineNowPlaying?: boolean;
  /**
   * When set with `showInlineNowPlaying`, adds a modifier for navbar-only responsive rules.
   */
  inlineNowVariant?: 'navbar';
  /** e.g. `forge-audio-ost--tab` for larger deck controls */
  className?: string;
};

export const ForgeAudioOstControls = function (props: ForgeAudioOstControlsProps) {
  const { showInlineNowPlaying = true, inlineNowVariant, className } = props;

  const [ost, setOst] = useState<AudioPlayerOstStatePayload>(() => ({
    active: false,
    label: '',
    trackIndex: -1,
    total: 0,
    shuffle: false,
    queuePosition: 0,
  }));
  const [ostMenuOpen, setOstMenuOpen] = useState(false);
  const [ostMenuTracks, setOstMenuTracks] = useState<AmbientMusicOstEntry[]>([]);

  const syncOstFromState = () => {
    const active = AudioPlayerState.ostMode && AudioPlayerState.ostTracks.length > 0;
    const physical = AudioPlayerState.getCurrentOstPhysicalIndex();
    const entry = active && physical >= 0 ? AudioPlayerState.ostTracks[physical] : undefined;
    setOst({
      active,
      label: entry?.displayName ?? entry?.label ?? '',
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

  const onOstState = (payload: AudioPlayerOstStatePayload) => {
    setOst(payload);
  };

  useEffectOnce(() => {
    syncOstFromState();
    AudioPlayerState.AddEventListener('onOstState', onOstState);
    return () => {
      AudioPlayerState.RemoveEventListener('onOstState', onOstState);
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
    ost.active && ost.total > 0 ? `${ost.queuePosition} / ${ost.total}${ost.shuffle ? ' · shuffle' : ''}` : '';
  const ostTitle = ost.active
    ? `Ambient soundtrack: ${ost.label}${ostPosition ? ` (${ostPosition})` : ''}`
    : 'Play all music from ambientmusic.2da (auto-advance)';

  const onOstShuffleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    AudioPlayerState.setOstShuffle(e.target.checked);
  };

  const nowPlayingTitle = ost.active && ost.label ? ost.label : '';
  const nowClass =
    inlineNowVariant === 'navbar' ? 'forge-audio-ost__now forge-audio-ost__now--navbar' : 'forge-audio-ost__now';

  const rootClass = ['forge-audio-ost', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {showInlineNowPlaying && nowPlayingTitle ? (
        <div className={nowClass} title={ostTitle}>
          <span className="forge-audio-ost__now-badge">OST</span>
          <span className="forge-audio-ost__now-title">{nowPlayingTitle}</span>
        </div>
      ) : null}

      <div className="forge-audio-ost__rule" aria-hidden />

      <div className="forge-audio-ost__ambient">
        <Dropdown className="forge-audio-ost__dropdown" align="end" show={ostMenuOpen} onToggle={onOstMenuToggle}>
          <Dropdown.Toggle
            as="button"
            type="button"
            className="forge-audio-ost__icon-btn forge-audio-ost__dropdown-toggle"
            title="Ambient music playlist (ambientmusic.2da)"
            aria-label="Open ambient music playlist"
          >
            <i className="fa-solid fa-list-ul" />
          </Dropdown.Toggle>
          <Dropdown.Menu className="forge-mini-player__menu" renderOnMount>
            <Dropdown.Header className="forge-mini-player__menu-header">Ambient music</Dropdown.Header>
            <div
              className="forge-mini-player__shuffle-row"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <label className="forge-mini-player__shuffle-label">
                <input type="checkbox" checked={ost.shuffle} onChange={onOstShuffleChange} />
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
                  title={`${t.displayName} — ${t.resRef}${t.label !== t.displayName ? ` (row: ${t.label})` : ''}`}
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
          className={`forge-audio-ost__icon-btn${ost.active ? ' forge-audio-ost__icon-btn--ost-on' : ''}`}
          title={ostTitle}
          aria-label={ost.active ? 'Stop ambient soundtrack' : 'Start ambient soundtrack'}
          aria-pressed={ost.active}
          onClick={onOstToggle}
        >
          <i className="fa-solid fa-compact-disc" />
        </button>

        {ost.active ? (
          <div className="forge-audio-ost__ost-skip" role="group" aria-label="OST track">
            <button
              type="button"
              className="forge-audio-ost__icon-btn forge-audio-ost__icon-btn--compact"
              title="Previous track"
              aria-label="Previous ambient track"
              onClick={onOstPrev}
            >
              <i className="fa-solid fa-backward-step" />
            </button>
            <button
              type="button"
              className="forge-audio-ost__icon-btn forge-audio-ost__icon-btn--compact"
              title="Next track"
              aria-label="Next ambient track"
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
