import * as fs from "fs";

import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabAudioPlayerState } from "@/apps/forge/states/tabs/TabAudioPlayerState";
import type { AudioEngine } from "@/audio/AudioEngine";
import { createScopedLogger, LogScope } from "@/utility/Logger";

/** Typed access to audio engine to satisfy no-unsafe-call (KotOR re-export may be loosely typed). */
function getAudioEngine(): AudioEngine {
  return KotOR.AudioEngine.GetAudioEngine() as AudioEngine;
}

/** Runtime file dialog (Electron or browser); from external API. */
declare const dialog: {
  showOpenDialog?: (opts?: { filters?: { name: string; extensions: string[] }[] }) => Promise<{ filePaths?: string[]; canceled?: boolean }>;
  showSaveDialog?: (opts?: { title?: string; defaultPath?: string; properties?: string[]; filters?: { name: string; extensions: string[] }[] }) => Promise<{ filePath?: string; canceled?: boolean }>;
};

const log = createScopedLogger(LogScope.Forge);

export type AudioPlayerEventListenerTypes =
  | "onPlay"
  | "onPause"
  | "onStop"
  | "onLoad"
  | "onVolume"
  | "onLoop"
  | "onOpen";

export type AudioPlayerEventCallback = (...args: unknown[]) => void;

export interface TabManagerEventListeners {
  onPlay: AudioPlayerEventCallback[];
  onPause: AudioPlayerEventCallback[];
  onStop: AudioPlayerEventCallback[];
  onLoad: AudioPlayerEventCallback[];
  onVolume: AudioPlayerEventCallback[];
  onLoop: AudioPlayerEventCallback[];
  onOpen: AudioPlayerEventCallback[];
}

export class AudioPlayerState {
  private constructor() {}
  private readonly _staticOnly?: undefined;

  // this.gainNode = AudioEngine.GetAudioEngine().audioCtx.createGain();
  // this.gainNode.gain.value = 0.25;
  // this.source = AudioEngine.GetAudioEngine().audioCtx.createBufferSource();
  static file: EditorFile;
  static audioFile: KotOR.AudioFile;
  static buffer: AudioBuffer | null = null;

  static eventListeners: TabManagerEventListeners = {
    onPlay: [],
    onPause: [],
    onStop: [],
    onLoad: [],
    onVolume: [],
    onLoop: [],
    onOpen: [],
  };

  static analyser: AnalyserNode;
  static analyserBufferLength: number;
  static analyserData: Uint8Array;
  static source: AudioBufferSourceNode;
  static gainNode: GainNode;
  static loading: boolean;
  static position: number;
  static startedAt: number;
  static pausedAt: number;
  static playing: boolean;
  static loop: boolean;
  static loopId: NodeJS.Timeout;

  static AddEventListener(
    type: AudioPlayerEventListenerTypes,
    cb: AudioPlayerEventCallback
  ) {
    log.trace("AddEventListener entry", "type=%s", type);
    if (Array.isArray(AudioPlayerState.eventListeners[type])) {
      const ev = AudioPlayerState.eventListeners[type];
      log.debug("AddEventListener ev length", ev.length);
      const index = ev.indexOf(cb);
      log.trace("AddEventListener indexOf result", index);
      if (index === -1) {
        ev.push(cb);
        log.trace("AddEventListener pushed callback");
      } else {
        log.warn("AudioPlayerState AddEventListener: Already added", type);
      }
    } else {
      log.warn("AudioPlayerState AddEventListener: Unsupported", type);
    }
    log.trace("AddEventListener exit");
  }

  static RemoveEventListener(
    type: AudioPlayerEventListenerTypes,
    cb: AudioPlayerEventCallback
  ) {
    log.trace("RemoveEventListener entry", "type=%s", type);
    if (Array.isArray(AudioPlayerState.eventListeners[type])) {
      const ev = AudioPlayerState.eventListeners[type];
      const index = ev.indexOf(cb);
      log.trace("RemoveEventListener indexOf", index);
      if (index >= 0) {
        ev.splice(index, 1);
        log.debug("RemoveEventListener removed at index", index);
      } else {
        log.warn("AudioPlayerState RemoveEventListener: Already removed", type);
      }
    } else {
      log.warn("AudioPlayerState RemoveEventListener: Unsupported", type);
    }
    log.trace("RemoveEventListener exit");
  }

  static ProcessEventListener(
    type: AudioPlayerEventListenerTypes,
    args: unknown[] = []
  ) {
    log.trace("ProcessEventListener entry", "type=%s argsLen=%s", type, args.length);
    if (Array.isArray(AudioPlayerState.eventListeners[type])) {
      const ev = AudioPlayerState.eventListeners[type];
      log.debug("ProcessEventListener listeners count", ev.length);
      for (let i = 0; i < ev.length; i++) {
        const callback = ev[i];
        log.trace("ProcessEventListener invoking", i);
        if (typeof callback === "function") {
          callback(...args);
        } else {
          log.trace("ProcessEventListener skip non-function", i);
        }
      }
    } else {
      log.warn("AudioPlayerState ProcessEventListener: Unsupported", type);
    }
    log.trace("ProcessEventListener exit");
  }

  static TriggerEventListener(
    type: AudioPlayerEventListenerTypes,
    args: unknown[] = []
  ) {
    log.trace("TriggerEventListener", "type=%s", type);
    AudioPlayerState.ProcessEventListener(type, args);
    log.trace("TriggerEventListener done");
  }

  static OpenAudio(file: EditorFile){
    log.trace("OpenAudio entry");
    log.debug("OpenAudio file", file?.getFilename?.() ?? String(file));
    ForgeState.tabManager.addTab(new TabAudioPlayerState());
    log.trace("OpenAudio addTab done");
    AudioPlayerState.Reset();
    log.trace("OpenAudio Reset done");
    AudioPlayerState.Stop();
    log.trace("OpenAudio Stop done");

    AudioPlayerState.file = file;
    log.debug("OpenAudio set static file");
    if(file instanceof EditorFile){
      log.trace("OpenAudio calling readFile");
      file.readFile().then( (response) => {
        log.trace("OpenAudio readFile resolved");
        try{
          log.trace("OpenAudio response.buffer check", !!response?.buffer);
          if(!response.buffer ){
            throw new Error('Audio Buffer is undefined');
          }
          log.debug("OpenAudio creating AudioFile");
          AudioPlayerState.audioFile = new KotOR.AudioFile(response.buffer);
          AudioPlayerState.audioFile.filename = file.resref+'.'+file.ext;
          log.trace("OpenAudio filename set", AudioPlayerState.audioFile.filename);
          if(AudioPlayerState.isPlaying()){
            log.trace("OpenAudio was playing, stopping");
            AudioPlayerState.Stop();
          }
          if(AudioPlayerState.buffer){
            log.trace("OpenAudio clearing buffer");
            AudioPlayerState.buffer = null;
          }
          log.info("OpenAudio starting Play");
          AudioPlayerState.Play();
          AudioPlayerState.ProcessEventListener('onOpen', [AudioPlayerState.audioFile]);
          log.trace("OpenAudio onOpen fired");
        }
        catch (e) {
          log.error("OpenAudio readFile", e instanceof Error ? e : String(e));
        }
      });
      log.trace("OpenAudio readFile then registered");
    } else {
      log.trace("OpenAudio file not EditorFile, skip");
    }
    log.trace("OpenAudio exit");
  }

  static GetAudioBuffer(onBuffered?: (buffer: AudioBuffer | null) => void) {
    log.trace("GetAudioBuffer entry", "bufferNull=%s hasCb=%s", AudioPlayerState.buffer == null, typeof onBuffered === "function");
    if (AudioPlayerState.buffer == null) {
      log.trace("GetAudioBuffer buffer null, getPlayableByteStream");
      AudioPlayerState.audioFile.getPlayableByteStream().then((data: Uint8Array) => {
        log.trace("GetAudioBuffer playable stream length", data?.length ?? 0);
        try {
          log.debug("GetAudioBuffer decodeAudioData start");
          getAudioEngine().audioCtx.decodeAudioData(
            data.buffer as ArrayBuffer,
            (buffer: AudioBuffer) => {
              log.trace("GetAudioBuffer decode success duration=%s", buffer?.duration);
              AudioPlayerState.buffer = buffer;
              if (typeof onBuffered === "function") onBuffered(AudioPlayerState.buffer);
              log.trace("GetAudioBuffer onBuffered called");
            },
            (error: DOMException) => {
              log.error("decodeAudioData error", error.message);
              if (typeof onBuffered === "function")
                onBuffered(AudioPlayerState.buffer);
            }
          );
        }catch(e){
          log.error("GetAudioBuffer decode catch", e instanceof Error ? e : String(e));
        }
      });
      log.trace("GetAudioBuffer getPlayableByteStream then registered");
    } else {
      log.trace("GetAudioBuffer buffer already set");
      if(onBuffered != null) {
        onBuffered(AudioPlayerState.buffer);
        log.trace("GetAudioBuffer onBuffered called (cached)");
      }
    }
    log.trace("GetAudioBuffer exit");
  }

  static isPlaying() {
    log.trace("isPlaying", AudioPlayerState.playing);
    return AudioPlayerState.playing;
  }

  static Reset(){
    log.trace("Reset entry");
    AudioPlayerState.position = 0;
    AudioPlayerState.startedAt = 0;
    AudioPlayerState.pausedAt = 0;
    AudioPlayerState.playing = false;
    AudioPlayerState.loading = false;
    AudioPlayerState.loop = false;
    log.debug("Reset state zeroed");

    if(!AudioPlayerState.gainNode){
      log.trace("Reset creating gainNode");
      AudioPlayerState.gainNode = getAudioEngine().audioCtx.createGain();
      AudioPlayerState.gainNode.gain.value = 0.25;
    } else {
      log.trace("Reset gainNode exists");
    }

    if(!AudioPlayerState.source){
      log.trace("Reset creating source");
      AudioPlayerState.source = getAudioEngine().audioCtx.createBufferSource();
    } else {
      log.trace("Reset source exists");
    }
    log.trace("Reset exit");
  }

  static Play(){
    log.trace("Play entry");
    log.debug("Play loading=%s", AudioPlayerState.loading);
    AudioPlayerState.source = getAudioEngine().audioCtx.createBufferSource();
    log.trace("Play created new source");
    if(!AudioPlayerState.loading){
      log.trace("Play GetAudioBuffer");
      AudioPlayerState.GetAudioBuffer((_data: AudioBuffer | null) => {
        log.trace("Play GetAudioBuffer callback");
        if(AudioPlayerState.source){
          AudioPlayerState.loading = false;
          const offset = AudioPlayerState.pausedAt;
          log.trace("Play offset", offset);
          AudioPlayerState.source.buffer = AudioPlayerState.buffer;
          log.trace("Play buffer set");
          AudioPlayerState.analyser = getAudioEngine().audioCtx.createAnalyser();
          AudioPlayerState.analyser.fftSize = 128;
          AudioPlayerState.source.connect(AudioPlayerState.analyser);
          AudioPlayerState.analyser.connect(AudioPlayerState.gainNode);
          AudioPlayerState.gainNode.connect(KotOR.AudioEngine.voChannel.getGainNode() as GainNode);
          log.trace("Play graph connected");
          AudioPlayerState.source.loop = false;
          AudioPlayerState.source.start(0, offset);
          log.debug("Play source.start offset=%s", offset);

          AudioPlayerState.analyserBufferLength = AudioPlayerState.analyser.frequencyBinCount;
          AudioPlayerState.analyserData = new Uint8Array(AudioPlayerState.analyserBufferLength);
          log.trace("Play analyser data allocated");

          AudioPlayerState.startedAt = getAudioEngine().audioCtx.currentTime - offset;
          AudioPlayerState.pausedAt = 0;
          AudioPlayerState.playing = true;
          log.info("Play started");

          AudioPlayerState.source.onended = () => {
            log.trace("Play onended");
            AudioPlayerState.Stop();
            if(AudioPlayerState.loop){
              log.trace("Play onended loop, ProcessEventListener onLoop");
              AudioPlayerState.ProcessEventListener('onLoop');
              AudioPlayerState.Play();
            }
          };

          AudioPlayerState.ResumeLoop();
          AudioPlayerState.ProcessEventListener('onPlay');
          log.trace("Play onPlay fired");
        } else {
          log.trace("Play no source, skip");
        }
      });
    } else {
      log.trace("Play already loading, skip");
    }
    log.trace("Play exit");
  }

  static ResumeLoop(){
    log.trace("ResumeLoop (no-op)");
  }

  static StopLoop(){
    log.trace("StopLoop clearInterval");
    clearInterval(AudioPlayerState.loopId);
    log.trace("StopLoop done");
  }

  static Pause(){
    log.trace("Pause entry");
    const elapsed = getAudioEngine().audioCtx.currentTime - AudioPlayerState.startedAt;
    log.debug("Pause elapsed", elapsed);
    AudioPlayerState.pausedAt = elapsed;
    AudioPlayerState.ProcessEventListener('onPause');
    AudioPlayerState.Stop();
    AudioPlayerState.pausedAt = elapsed;
    log.info("Pause done");
    log.trace("Pause exit");
  }

  static Stop(){
    log.trace("Stop entry");
    try{
      if(AudioPlayerState.source){
        log.trace("Stop disconnecting source");
        AudioPlayerState.source.disconnect();
        AudioPlayerState.source.stop(0);
        log.trace("Stop source stopped");
      } else {
        log.trace("Stop no source");
      }
    } catch (e) {
      log.error("Stop", e instanceof Error ? e : String(e));
    }
    AudioPlayerState.pausedAt = 0;
    AudioPlayerState.startedAt = 0;
    AudioPlayerState.playing = false;
    log.debug("Stop state cleared");
    AudioPlayerState.StopLoop();
    AudioPlayerState.ProcessEventListener('onStop');
    log.trace("Stop exit");
  }

  static async ExportAudio() {
    log.trace("ExportAudio entry");
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      log.trace("ExportAudio Electron showSaveDialog");
      const payload = await dialog.showSaveDialog?.({
        title: 'Export Audio File',
        defaultPath: AudioPlayerState.audioFile.filename,
        properties: ['createDirectory'],
        filters: [
          {name: 'Wave File', extensions: ['wav']},
          {name: 'MP3 File', extensions: ['mp3']}
        ]
      });
      if (!payload) {
        log.warn("ExportAudio showSaveDialog not available");
        return;
      }
      log.debug("ExportAudio dialog result canceled=%s filePath=%s", payload.canceled, payload.filePath);

      if (!payload.canceled && typeof payload.filePath !== "undefined") {
        log.trace("ExportAudio fs.writeFile");
        fs.writeFile(payload.filePath, AudioPlayerState.audioFile.getExportableData() || new Uint8Array(0), (err) => {
          if (err) {
            log.warn("AudioFile Save Fail", payload.filePath);
          } else {
            log.info("AudioFile Saved", payload.filePath);
          }
        });
        AudioPlayerState.audioFile.export({
          file: payload.filePath,
          onComplete: () => {
            log.trace("ExportAudio onComplete");
          },
          onError: () => {
            log.warn("ExportAudio onError");
          }
        });
        log.trace("ExportAudio export() called");
      } else {
        log.trace("ExportAudio canceled or no path");
      }
    } else {
      log.trace("ExportAudio showSaveFilePicker (browser)");
      showSaveFilePicker({
        suggestedName: AudioPlayerState.audioFile.filename,
        types: [{
          description: 'MP3 File',
          accept: {'audio/mpeg': ['.mp3']},
        },{
          description: 'WAV File',
          accept: {'audio/vnd.wav': ['.wav']},
        }]
      } as SaveFilePickerOptions ).then( async (handle: FileSystemFileHandle) => {
        log.trace("ExportAudio picker then");
        if(handle){
          log.debug("ExportAudio handle", handle.name);
          const writable = await handle.createWritable();
          const exportData: BufferSource = AudioPlayerState.audioFile.getExportableData() ?? new Uint8Array(0);
          await writable.write(exportData);
          await writable.close();
          log.info('AudioFile Saved name=%s', handle.name);
        } else {
          log.trace("ExportAudio no handle");
        }
      });
    }
    log.trace("ExportAudio exit");
  }

  static GetCurrentTime(): number {
    log.trace("GetCurrentTime entry");
    try{
      if(AudioPlayerState.pausedAt) {
        log.trace("GetCurrentTime return pausedAt", AudioPlayerState.pausedAt);
        return AudioPlayerState.pausedAt;
      }
      if(AudioPlayerState.startedAt) {
        const t = getAudioEngine().audioCtx.currentTime - AudioPlayerState.startedAt;
        log.trace("GetCurrentTime return elapsed", t);
        return t;
      }
    }catch(e: unknown){
      log.error("GetCurrentTime", e instanceof Error ? e : String(e));
      return 0;
    }
    log.trace("GetCurrentTime return 0");
    return 0;
  }

  static GetDuration(): number {
    log.trace("GetDuration entry");
    try {
      if (AudioPlayerState.buffer == null) {
        log.trace("GetDuration buffer null return 0");
        return 0;
      }
      const d = AudioPlayerState.buffer.duration;
      log.trace("GetDuration", d);
      return d;
    } catch (e) {
      log.trace("GetDuration catch return 0", e);
      return 0;
    }
  }

  static SecondsToTimeString(time: number){
    log.trace("SecondsToTimeString entry", time);
    time = time | 0;
    const h = Math.floor(time / 3600);
    const m = Math.floor(time % 3600 / 60);
    const s = Math.floor(time % 3600 % 60);
    const out = ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);
    log.trace("SecondsToTimeString", out);
    return out;
  }

}
