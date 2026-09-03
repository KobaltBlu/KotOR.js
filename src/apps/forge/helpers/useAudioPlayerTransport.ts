import { useRef, useState } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import { forgeAudioSettings } from "@/apps/forge/settings/forgeEditorsSettings";

export type AudioPlayerTransport = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentTimeString: string;
  durationString: string;
  loop: boolean;
  volume: number;
  seekDisabled: boolean;
  onBtnPlay: () => void;
  onBtnStop: () => void;
  onSeekChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleLoop: () => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeIconClick: () => void;
  onExport: () => void;
  syncFromEngine: () => void;
};

/**
 * Shared play/pause/stop/seek/time/loop/volume wiring for the full tab and mini player.
 */
export function useAudioPlayerTransport(options?: {
  trackVolume?: boolean;
}): AudioPlayerTransport {
  const trackVolume = options?.trackVolume ?? true;

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTimeString, setCurrentTimeString] = useState<string>("0:00");
  const [durationString, setDurationString] = useState<string>("0:00");
  const [loop, setLoop] = useState<boolean>(() => !!AudioPlayerState.loop);
  const [volume, setVolume] = useState<number>(() => AudioPlayerState.volume ?? 0.25);
  const volumeBeforeMuteRef = useRef<number>(
    AudioPlayerState.volume > 0 ? AudioPlayerState.volume : 0.25,
  );
  const animationFrameRef = useRef<number>(0);

  const onFrame = () => {
    cancelAnimationFrame(animationFrameRef.current);
    if (AudioPlayerState.playing) {
      animationFrameRef.current = requestAnimationFrame(() => onFrame());
      const cur = AudioPlayerState.GetCurrentTime();
      const dur = AudioPlayerState.GetDuration();
      setCurrentTime(cur);
      setDuration(dur);
      setCurrentTimeString(AudioPlayerState.SecondsToTimeString(cur));
      setDurationString(AudioPlayerState.SecondsToTimeString(dur));
    }
  };

  const syncFromEngine = () => {
    const dur = AudioPlayerState.GetDuration();
    const cur = AudioPlayerState.GetCurrentTime();
    setCurrentTime(cur);
    setDuration(dur);
    setCurrentTimeString(AudioPlayerState.SecondsToTimeString(cur));
    setDurationString(AudioPlayerState.SecondsToTimeString(dur));
    setLoop(!!AudioPlayerState.loop);
    setVolume(AudioPlayerState.volume ?? 0.25);
    if (AudioPlayerState.playing) {
      setIsPlaying(true);
      cancelAnimationFrame(animationFrameRef.current);
      onFrame();
    } else {
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  useEffectOnce(() => {
    const onPlay = () => {
      setIsPlaying(true);
      onFrame();
    };
    const onPause = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameRef.current);
    };
    const onStop = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameRef.current);
      setCurrentTime(0);
      setCurrentTimeString(AudioPlayerState.SecondsToTimeString(0));
    };
    const onLoop = (value?: boolean) => {
      setLoop(typeof value === "boolean" ? value : !!AudioPlayerState.loop);
    };
    const onVolume = (v: number) => {
      setVolume(v);
      if (v > 0) {
        volumeBeforeMuteRef.current = v;
      }
    };

    AudioPlayerState.AddEventListener("onPlay", onPlay);
    AudioPlayerState.AddEventListener("onPause", onPause);
    AudioPlayerState.AddEventListener("onStop", onStop);
    AudioPlayerState.AddEventListener("onLoop", onLoop);
    AudioPlayerState.AddEventListener("onOpen", syncFromEngine);
    if (trackVolume) {
      AudioPlayerState.AddEventListener("onVolume", onVolume);
    }

    syncFromEngine();

    return () => {
      AudioPlayerState.RemoveEventListener("onPlay", onPlay);
      AudioPlayerState.RemoveEventListener("onPause", onPause);
      AudioPlayerState.RemoveEventListener("onStop", onStop);
      AudioPlayerState.RemoveEventListener("onLoop", onLoop);
      AudioPlayerState.RemoveEventListener("onOpen", syncFromEngine);
      if (trackVolume) {
        AudioPlayerState.RemoveEventListener("onVolume", onVolume);
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  });

  return {
    isPlaying,
    currentTime,
    duration,
    currentTimeString,
    durationString,
    loop,
    volume,
    seekDisabled: duration <= 0,
    onBtnPlay: () => {
      if (isPlaying) {
        AudioPlayerState.Pause();
      } else {
        AudioPlayerState.Play();
      }
    },
    onBtnStop: () => {
      AudioPlayerState.Stop();
    },
    onSeekChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const seekPosition = parseFloat(e.target.value);
      AudioPlayerState.Seek(seekPosition);
      setCurrentTime(seekPosition);
      setCurrentTimeString(AudioPlayerState.SecondsToTimeString(seekPosition));
    },
    onToggleLoop: () => {
      AudioPlayerState.ToggleLoop();
    },
    onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = parseFloat(e.target.value);
      AudioPlayerState.SetVolume(next);
      forgeAudioSettings.set({ volume: next });
    },
    onVolumeIconClick: () => {
      if (volume > 0) {
        volumeBeforeMuteRef.current = volume;
        AudioPlayerState.SetVolume(0);
        forgeAudioSettings.set({ volume: 0 });
      } else {
        const restored = volumeBeforeMuteRef.current || 0.25;
        AudioPlayerState.SetVolume(restored);
        forgeAudioSettings.set({ volume: restored });
      }
    },
    onExport: () => {
      void AudioPlayerState.ExportAudio();
    },
    syncFromEngine,
  };
}
