import React, { useState } from "react";
import { Dropdown } from "react-bootstrap";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import {
  AmbientMusicOstEntry,
  AudioPlayerOstStatePayload,
  AudioPlayerState,
} from "@/apps/forge/states/AudioPlayerState";

export const AudioPlayer = function(props: any){

  //<span className="glyphicon glyphicon-remove" style="cursor: pointer; position:absolute; top:3px; right:3px; z-index:101;" />

  const [isReady, setIsReady] = useState<boolean>(false);
  const [isDisposed, setIsDisposed] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTimeString, setCurrentTimeString] = useState<string>('0:00');
  const [durationString, setDurationString] = useState<string>('0:00');
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

  let animationFrame: number;

  const syncOstFromState = () => {
    const active = AudioPlayerState.ostMode && AudioPlayerState.ostTracks.length > 0;
    const physical = AudioPlayerState.getCurrentOstPhysicalIndex();
    const entry =
      active && physical >= 0 ? AudioPlayerState.ostTracks[physical] : undefined;
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

  const onLoad = () => {
    setIsReady(true);
  }

  const onPlay = () => {
    setIsPlaying(true);
    onFrame();
  }

  const onPause = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animationFrame);
  }

  const onStop = () => {
    setIsPlaying(false);
    cancelAnimationFrame(animationFrame);
    setCurrentTime(0);
    setCurrentTimeString(AudioPlayerState.SecondsToTimeString(0));
  }

  const onLoop = () => {
    
  }

  const onFrame = () => {
    cancelAnimationFrame(animationFrame);
    if(AudioPlayerState.playing){
      animationFrame = requestAnimationFrame(() => onFrame());
      setCurrentTime(AudioPlayerState.GetCurrentTime());
      setDuration(AudioPlayerState.GetDuration());
      setCurrentTimeString(AudioPlayerState.SecondsToTimeString(AudioPlayerState.GetCurrentTime()))
      setDurationString(AudioPlayerState.SecondsToTimeString(AudioPlayerState.GetDuration()))
    }
  }

  const onOstState = (payload: AudioPlayerOstStatePayload) => {
    setOst(payload);
  };

  useEffectOnce( () => {
    syncOstFromState();
    AudioPlayerState.AddEventListener('onLoad', onLoad);
    AudioPlayerState.AddEventListener('onPlay', onPlay);
    AudioPlayerState.AddEventListener('onPause', onPause);
    AudioPlayerState.AddEventListener('onStop', onStop);
    AudioPlayerState.AddEventListener('onLoop', onLoop);
    AudioPlayerState.AddEventListener('onOstState', onOstState);
    return () => {
      AudioPlayerState.RemoveEventListener('onLoad', onLoad);
      AudioPlayerState.RemoveEventListener('onPlay', onPlay);
      AudioPlayerState.RemoveEventListener('onPause', onPause);
      AudioPlayerState.RemoveEventListener('onStop', onStop);
      AudioPlayerState.RemoveEventListener('onLoop', onLoop);
      AudioPlayerState.RemoveEventListener('onOstState', onOstState);
      setIsDisposed(true);
    }
  })

  const onBtnPlay = (e: React.MouseEvent<HTMLSpanElement>) => {
    if(isPlaying){
      AudioPlayerState.Pause();
    }else{
      AudioPlayerState.Play();
    }
  }

  const onBtnStop = (e: React.MouseEvent<HTMLSpanElement>) => {
    AudioPlayerState.Stop();
  }

  const onTrackBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekPosition = parseFloat(e.target.value);
    try{ AudioPlayerState.Stop(); }catch(e){}
    AudioPlayerState.pausedAt = seekPosition;
    try{ AudioPlayerState.Play(); }catch(e){}
  }

  const onBtnSave = (e: React.MouseEvent<HTMLSpanElement>) => {
    AudioPlayerState.Pause();
    AudioPlayerState.ExportAudio().then( () => {

    });
  }

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
      ? `${ost.queuePosition} / ${ost.total}${ost.shuffle ? ' · shuffle' : ''}`
      : '';
  const ostTitle = ost.active
    ? `Ambient soundtrack: ${ost.label}${ostPosition ? ` (${ostPosition})` : ''}`
    : 'Play all music from ambientmusic.2da (auto-advance)';

  const onOstShuffleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    AudioPlayerState.setOstShuffle(e.target.checked);
  };

  return (
    <div className="inline-audio-player">
      {/* <div className="audio-player-info">
        <span className="audio-player-title-label">Now Playing: 
          <span className="audio-player-marquee">
            <span className="audio-player-title"></span>
          </span>
        </span>
      </div> */}
      <div className="audio-player-controls">
        <span className="btn-play" title={isPlaying ? 'Pause' : 'Play'} style={{cursor: 'pointer', flex:1}} onClick={onBtnPlay}>
          <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
        </span>
        <span className="btn-stop" title="Stop" style={{cursor: 'pointer', flex:1}} onClick={onBtnStop}>
          <i className="fa-solid fa-stop"></i>
        </span>
        <input className="track" type="range" step="0.01" min="0" value={currentTime} max={duration} disabled={!!isReady} onChange={onTrackBarChange} />
        <span className="time">{currentTimeString} / {durationString}</span>
        <Dropdown
          className="ost-playlist-dropdown"
          align="end"
          show={ostMenuOpen}
          onToggle={onOstMenuToggle}
        >
          <Dropdown.Toggle
            as="span"
            className="btn-ost-list"
            title="Ambient music playlist (ambientmusic.2da)"
            style={{ cursor: 'pointer', flex: 1, marginLeft: '6px' }}
          >
            <i className="fa-solid fa-list" />
          </Dropdown.Toggle>
          <Dropdown.Menu
            className="ost-track-menu"
            renderOnMount
          >
            <Dropdown.Header>Ambient music</Dropdown.Header>
            <div
              className="px-3 py-2 border-bottom border-secondary"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <label
                className="mb-0 d-flex align-items-center gap-2 text-white"
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <input
                  type="checkbox"
                  checked={ost.shuffle}
                  onChange={onOstShuffleChange}
                />
                Shuffle
              </label>
            </div>
            {ostMenuTracks.length === 0 ? (
              <Dropdown.ItemText className="text-muted small">
                No tracks (load game / ambientmusic.2da)
              </Dropdown.ItemText>
            ) : (
              ostMenuTracks.map((t, idx) => (
                <Dropdown.Item
                  key={`${t.resRef}-${idx}`}
                  active={ost.active && ost.trackIndex === idx}
                  title={`${t.displayName} — ${t.resRef}${
                    t.label !== t.displayName ? ` (row: ${t.label})` : ''
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
        <span
          className={`btn-ost${ost.active ? ' btn-ost-active' : ''}`}
          title={ostTitle}
          style={{ cursor: 'pointer', flex: 1, marginLeft: '2px' }}
          onClick={onOstToggle}
        >
          <i className="fa-solid fa-compact-disc" />
        </span>
        {ost.active ? (
          <>
            <span className="btn-ost-skip" title="Previous track" style={{ cursor: 'pointer', flex: 1 }} onClick={onOstPrev}>
              <i className="fa-solid fa-backward-step" />
            </span>
            <span className="btn-ost-skip" title="Next track" style={{ cursor: 'pointer', flex: 1 }} onClick={onOstNext}>
              <i className="fa-solid fa-forward-step" />
            </span>
          </>
        ) : null}
        <span className="btn-save" title="Export Audio" style={{cursor: 'pointer', flex:1, marginLeft: '3px'}} onClick={onBtnSave}>
          <i className="fa-solid fa-download"></i>
        </span>
        <span className="track-pop" style={{display:'none', position:'fixed'}} ></span>
      </div>
    </div>
  );
}