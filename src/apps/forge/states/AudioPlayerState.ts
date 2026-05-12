import { EditorFile } from "@/apps/forge/EditorFile";
import * as fs from "fs";
import * as path from "path";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabAudioPlayerState } from "@/apps/forge/states/tabs/TabAudioPlayerState";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { AudioLoader } from "@/audio/AudioLoader";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { pathParse } from "@/apps/forge/helpers/PathParse";
import { ForgeFileSystem, ForgeFileSystemResponseType } from "@/apps/forge/ForgeFileSystem";

declare const dialog: any;

export type AudioPlayerEventListenerTypes =
  | "onPlay"
  | "onPause"
  | "onStop"
  | "onLoad"
  | "onVolume"
  | "onLoop"
  | "onOpen"
  | "onOstState"
  | "onFloatingMiniPlayerPrefs";

export interface TabManagerEventListeners {
  onPlay: Function[];
  onPause: Function[];
  onStop: Function[];
  onLoad: Function[];
  onVolume: Function[];
  onLoop: Function[];
  onOpen: Function[];
  onOstState: Function[];
  onFloatingMiniPlayerPrefs: Function[];
}

export type AudioPlayerOstStatePayload = {
  active: boolean;
  /** Resolved track title (TLK from Description, or DisplayName, or row label). */
  label: string;
  /** Index into `playlist` / `queueLabels` for the current track, or -1. */
  trackIndex: number;
  total: number;
  shuffle: boolean;
  /** 1-based position in the current play order. */
  queuePosition: number;
  /** Titles in playlist table order (ambient OST or manual queue). */
  queueLabels: string[];
};

export type AudioPlaylistStreamEntry = {
  type: "stream_music";
  id: string;
  title: string;
  resRef: string;
  label: string;
  /** Index in `getAmbientMusicPlaylistEntries()` order. */
  ambientPhysicalIndex: number;
};

export type AudioPlaylistEditorEntry = {
  type: "editor_file";
  id: string;
  title: string;
  file: EditorFile;
};

export type AudioPlaylistEntry = AudioPlaylistStreamEntry | AudioPlaylistEditorEntry;

export type AmbientMusicOstEntry = {
  resRef: string;
  /** 2DA row label (`__rowlabel`). */
  label: string;
  /** TLK text from `Description` StrRef, else `DisplayName`, else `label`. */
  displayName: string;
};

export type AudioPlayerStopOptions = {
  /**
   * When false, `onStop` is not fired (e.g. Pause — scrubber stays at pause position).
   * Default true so Stop resets the UI track position.
   */
  emitStopEvent?: boolean;
};

export class AudioPlayerState {
  
  // this.gainNode = AudioEngine.GetAudioEngine().audioCtx.createGain();
  // this.gainNode.gain.value = 0.25;
  // this.source = AudioEngine.GetAudioEngine().audioCtx.createBufferSource();
  static file?: EditorFile;
  static audioFile: KotOR.AudioFile;
  static buffer: any;

  static eventListeners: TabManagerEventListeners = {
    onPlay: [],
    onPause: [],
    onStop: [],
    onLoad: [],
    onVolume: [],
    onLoop: [],
    onOpen: [],
    onOstState: [],
    onFloatingMiniPlayerPrefs: [],
  };

  /** localStorage: user hid the floating mini player until respawned from the Audio menu. */
  static readonly FLOATING_MINI_LS_DISMISSED = "forge.miniPlayer.dismissed";
  /** localStorage: JSON `{ left, top }` for last floating position. */
  static readonly FLOATING_MINI_LS_BOUNDS = "forge.miniPlayer.bounds";

  /**
   * Clears the floating mini player “dismissed” flag and notifies listeners so the widget shows again.
   */
  static showFloatingMiniPlayer(): void {
    try {
      localStorage.removeItem(AudioPlayerState.FLOATING_MINI_LS_DISMISSED);
    } catch {
      /* ignore */
    }
    AudioPlayerState.ProcessEventListener("onFloatingMiniPlayerPrefs", []);
  }
  
  static analyser: AnalyserNode;
  static analyserBufferLength: number; 
  static analyserData: Uint8Array;
  static source: AudioBufferSourceNode;
  static gainNode: GainNode;
  static volume: number = 0.25;
  static loading: boolean;
  static position: number;
  static startedAt: number;
  static pausedAt: number;
  static playing: boolean;
  static loop: boolean;
  static loopId: NodeJS.Timeout;

  /** When true, queue was built from `ambientmusic.2da` (streammusic). */
  static ostMode: boolean = false;
  /** Unified queue: OST stream entries and/or user-picked editor files. */
  static playlist: AudioPlaylistEntry[] = [];
  /** Permutation of `0..playlist.length-1` — play order (shuffled or sequential). */
  static playOrder: number[] = [];
  static playCursor: number = 0;
  /** Shuffle play order for OST and manual playlists. */
  static ostShuffle: boolean = false;
  private static ostStarting: boolean = false;

  private static shuffleInPlace(order: number[]): void {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
  }

  private static rebuildPlayOrder(): void {
    const n = AudioPlayerState.playlist.length;
    if (!n) {
      AudioPlayerState.playOrder = [];
      return;
    }
    const order = Array.from({ length: n }, (_, i) => i);
    if (AudioPlayerState.ostShuffle) {
      AudioPlayerState.shuffleInPlace(order);
    }
    AudioPlayerState.playOrder = order;
  }

  /**
   * Sets shuffle preference. Rebuilds play order and keeps the current track when possible.
   */
  static setOstShuffle(shuffle: boolean): void {
    AudioPlayerState.ostShuffle = shuffle;
    if (!AudioPlayerState.playlist.length || !AudioPlayerState.playOrder.length) {
      AudioPlayerState.emitOstState();
      return;
    }
    const physical = AudioPlayerState.playOrder[AudioPlayerState.playCursor];
    AudioPlayerState.rebuildPlayOrder();
    let nextCursor = AudioPlayerState.playOrder.indexOf(physical);
    if (nextCursor < 0) {
      nextCursor = 0;
    }
    AudioPlayerState.playCursor = nextCursor;
    AudioPlayerState.emitOstState();
  }

  /** Physical index into `playlist` for the track currently loaded in the play order. */
  static getCurrentOstPhysicalIndex(): number {
    if (!AudioPlayerState.playOrder.length || !AudioPlayerState.playlist.length) {
      return -1;
    }
    return AudioPlayerState.playOrder[AudioPlayerState.playCursor];
  }

  static AddEventListener(type: AudioPlayerEventListenerTypes, cb: Function){
    if(Array.isArray(AudioPlayerState.eventListeners[type])){
      let ev = AudioPlayerState.eventListeners[type];
      let index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        console.warn('Event Listener: Already added', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static RemoveEventListener(type: AudioPlayerEventListenerTypes, cb: Function){
    if(Array.isArray(AudioPlayerState.eventListeners[type])){
      let ev = AudioPlayerState.eventListeners[type];
      let index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        console.warn('Event Listener: Already removed', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static ProcessEventListener(type: AudioPlayerEventListenerTypes, args: any[] = []){
    if(Array.isArray(AudioPlayerState.eventListeners[type])){
      let ev = AudioPlayerState.eventListeners[type];
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static TriggerEventListener(type: AudioPlayerEventListenerTypes, args: any[] = []){
    AudioPlayerState.ProcessEventListener(type, args);
  }

  /**
   * Opens or focuses the full Audio Player tab (`TabAudioPlayerState`, single-instance).
   * Does not change the current track or queue.
   */
  static openAudioPlayerTab(): void {
    ForgeState.tabManager.addTab(new TabAudioPlayerState());
  }

  static OpenAudio(file: EditorFile){
    AudioPlayerState.clearOstMode();
    AudioPlayerState.openAudioPlayerTab();
    AudioPlayerState.Reset();
    AudioPlayerState.Stop();
    
    AudioPlayerState.file = file;
    if(file instanceof EditorFile){
      file.readFile().then( (response) => {
        try{
          if(!response.buffer ){
            throw new Error('Audio Buffer is undefined');
          }
          AudioPlayerState.audioFile = new KotOR.AudioFile(response.buffer);
          AudioPlayerState.audioFile.filename = file.resref+'.'+file.ext;
          if(AudioPlayerState.isPlaying()){
            AudioPlayerState.Stop();
          }
          if(AudioPlayerState.buffer){
            AudioPlayerState.buffer = null;
          }
          AudioPlayerState.Play();
          // AudioPlayerState.Show();
          AudioPlayerState.ProcessEventListener('onOpen', [AudioPlayerState.audioFile]);
        }
        catch (e) {
          console.error(e);
          //AudioPlayerState.Hide();
        }
      });
    }
  }

  /**
   * Resolve visible track name: `Description` (TLK StrRef), then `DisplayName`, then row label / resref.
   */
  private static resolveAmbientMusicDisplayName(
    row: any,
    rowLabel: string,
    resRef: string
  ): string {
    const descCol = row.description ?? row.Description;
    if (descCol != null && descCol !== '****' && String(descCol).trim() !== '') {
      const parsed = KotOR.TwoDAObject.cellParser(descCol);
      if (parsed != null) {
        const strRef = KotOR.TwoDAObject.normalizeValue(descCol, 'number', -1);
        const strings = KotOR.TLKManager?.TLKStrings;
        if (strRef >= 0 && strings && strRef < strings.length) {
          const tlk = strings[strRef];
          const val = tlk?.Value;
          if (val != null && String(val).trim() !== '') {
            return String(val).replace(/\0[\s\S]*$/g, '').trim();
          }
        }
      }
    }
    const dnCol = row.displayname ?? row.DisplayName;
    if (dnCol != null && dnCol !== '****') {
      const s = KotOR.TwoDAObject.normalizeValue(dnCol, 'string', '') as string;
      if (s && String(s).trim() !== '') {
        let t = String(s).trim();
        if (
          (t.startsWith('"') && t.endsWith('"')) ||
          (t.startsWith("'") && t.endsWith("'"))
        ) {
          t = t.slice(1, -1);
        }
        return t;
      }
    }
    const rl = String(rowLabel || '').trim();
    if (rl) {
      return rl;
    }
    return resRef;
  }

  /**
   * Rows from `ambientmusic.2da` with a non-empty `resource` (not ****), in table order.
   */
  static getAmbientMusicPlaylistEntries(): AmbientMusicOstEntry[] {
    const twoda = KotOR.TwoDAManager.datatables.get('ambientmusic') as KotOR.TwoDAObject | undefined;
    if (!twoda?.rows || typeof twoda.RowCount !== 'number') {
      return [];
    }
    const out: AmbientMusicOstEntry[] = [];
    for (let i = 0; i < twoda.RowCount; i++) {
      const row = twoda.rows[i];
      if (!row) {
        continue;
      }
      const raw = row.resource;
      if (raw == null || raw === '****') {
        continue;
      }
      const resRef = String(raw).trim();
      if (!resRef) {
        continue;
      }
      const label = row.__rowlabel != null && String(row.__rowlabel).length
        ? String(row.__rowlabel)
        : resRef;
      const displayName = AudioPlayerState.resolveAmbientMusicDisplayName(row, label, resRef);
      out.push({ resRef, label, displayName });
    }
    return out;
  }

  static emitOstState(): void {
    const pl = AudioPlayerState.playlist;
    const order = AudioPlayerState.playOrder;
    const ostActive =
      AudioPlayerState.ostMode && pl.length > 0 && order.length > 0;
    const physical =
      order.length > 0 ? order[AudioPlayerState.playCursor] : -1;
    const entry =
      physical >= 0 && physical < pl.length ? pl[physical] : undefined;
    const label = entry ? entry.title : "";
    const queueLabels = pl.map((e) => e.title);
    const payload: AudioPlayerOstStatePayload = {
      active: ostActive,
      label,
      trackIndex: physical,
      total: pl.length,
      shuffle: AudioPlayerState.ostShuffle,
      queuePosition: order.length > 0 ? AudioPlayerState.playCursor + 1 : 0,
      queueLabels,
    };
    AudioPlayerState.ProcessEventListener("onOstState", [payload]);
  }

  static clearOstMode(): void {
    AudioPlayerState.ostMode = false;
    AudioPlayerState.playlist = [];
    AudioPlayerState.playOrder = [];
    AudioPlayerState.playCursor = 0;
    AudioPlayerState.emitOstState();
  }

  static stopAmbientMusicOst(): void {
    AudioPlayerState.clearOstMode();
    AudioPlayerState.Stop();
  }

  private static async loadGameMusicResRef(resRef: string, displayTitle: string): Promise<void> {
    const filePath = path.join("streammusic", `${resRef}.wav`);
    const buffer = await KotOR.GameFileSystem.readFile(filePath);
    AudioPlayerState.file = undefined;
    AudioPlayerState.audioFile = new KotOR.AudioFile(buffer);
    AudioPlayerState.audioFile.filename = `${displayTitle} (${resRef})`;
    AudioPlayerState.buffer = null;
    AudioPlayerState.ProcessEventListener("onOpen", [AudioPlayerState.audioFile]);
    AudioPlayerState.emitOstState();
  }

  private static async loadEditorFileForPlayback(file: EditorFile): Promise<void> {
    const response = await file.readFile();
    if (!response.buffer) {
      throw new Error("Audio Buffer is undefined");
    }
    AudioPlayerState.file = file;
    AudioPlayerState.audioFile = new KotOR.AudioFile(response.buffer);
    AudioPlayerState.audioFile.filename = `${file.resref}.${file.ext}`;
    AudioPlayerState.buffer = null;
    AudioPlayerState.ProcessEventListener("onOpen", [AudioPlayerState.audioFile]);
    AudioPlayerState.emitOstState();
  }

  /**
   * Tries the track at `playCursor`; on missing file, advances in play order up to one full pass.
   */
  private static async loadPlaylistCursorWithRetry(attempts = 0): Promise<boolean> {
    const n = AudioPlayerState.playlist.length;
    if (!n || !AudioPlayerState.playOrder.length || attempts >= n) {
      return false;
    }
    const physical = AudioPlayerState.playOrder[AudioPlayerState.playCursor];
    const t = AudioPlayerState.playlist[physical];
    if (!t) {
      return false;
    }
    try {
      if (t.type === "stream_music") {
        await AudioPlayerState.loadGameMusicResRef(t.resRef, t.title);
      } else {
        await AudioPlayerState.loadEditorFileForPlayback(t.file);
      }
      return true;
    } catch (e) {
      console.warn("Playlist: could not load track", t, e);
      AudioPlayerState.playCursor = (AudioPlayerState.playCursor + 1) % n;
      return AudioPlayerState.loadPlaylistCursorWithRetry(attempts + 1);
    }
  }

  static async startAmbientMusicOst(): Promise<void> {
    if (AudioPlayerState.ostStarting) {
      return;
    }
    const entries = AudioPlayerState.getAmbientMusicPlaylistEntries();
    if (!entries.length) {
      console.warn(
        "Ambient OST: no tracks in ambientmusic.2da (or table not loaded). Open a project / game assets first.",
      );
      return;
    }
    AudioPlayerState.ostStarting = true;
    try {
      AudioPlayerState.playlist = entries.map((t, i) => ({
        type: "stream_music" as const,
        id: `ambient-${i}-${t.resRef}`,
        title: t.displayName,
        resRef: t.resRef,
        label: t.label,
        ambientPhysicalIndex: i,
      }));
      AudioPlayerState.ostMode = true;
      AudioPlayerState.rebuildPlayOrder();
      AudioPlayerState.playCursor = 0;
      AudioPlayerState.Reset();
      AudioPlayerState.Stop();
      const ok = await AudioPlayerState.loadPlaylistCursorWithRetry();
      if (!ok) {
        console.warn("Ambient OST: no streammusic files could be loaded.");
        AudioPlayerState.clearOstMode();
        return;
      }
      AudioPlayerState.emitOstState();
      AudioPlayerState.Play();
    } finally {
      AudioPlayerState.ostStarting = false;
    }
  }

  static async skipOst(delta: number): Promise<void> {
    if (!AudioPlayerState.playOrder.length) {
      return;
    }
    const n = AudioPlayerState.playOrder.length;
    AudioPlayerState.playCursor =
      (AudioPlayerState.playCursor + delta + n) % n;
    AudioPlayerState.Stop();
    const ok = await AudioPlayerState.loadPlaylistCursorWithRetry();
    if (ok) {
      AudioPlayerState.Play();
    } else if (AudioPlayerState.ostMode) {
      AudioPlayerState.stopAmbientMusicOst();
    } else {
      AudioPlayerState.emitOstState();
    }
  }

  /**
   * Jump to a playlist row by physical index (0..playlist.length-1).
   * When OST is off and the row is an ambient stream entry, starts OST from the full table.
   */
  static async seekOstToPhysicalIndex(physicalIndex: number): Promise<void> {
    const entries = AudioPlayerState.getAmbientMusicPlaylistEntries();
    if (physicalIndex < 0 || physicalIndex >= entries.length) {
      return;
    }
    if (AudioPlayerState.ostStarting) {
      return;
    }

    if (!AudioPlayerState.ostMode) {
      AudioPlayerState.ostStarting = true;
      try {
        AudioPlayerState.playlist = entries.map((t, i) => ({
          type: "stream_music" as const,
          id: `ambient-${i}-${t.resRef}`,
          title: t.displayName,
          resRef: t.resRef,
          label: t.label,
          ambientPhysicalIndex: i,
        }));
        AudioPlayerState.ostMode = true;
        AudioPlayerState.rebuildPlayOrder();
        AudioPlayerState.playCursor = Math.max(
          0,
          AudioPlayerState.playOrder.indexOf(physicalIndex),
        );
        AudioPlayerState.Reset();
        AudioPlayerState.Stop();
        const ok = await AudioPlayerState.loadPlaylistCursorWithRetry();
        if (!ok) {
          console.warn("Ambient OST: no streammusic files could be loaded.");
          AudioPlayerState.clearOstMode();
          return;
        }
        AudioPlayerState.emitOstState();
        AudioPlayerState.Play();
      } finally {
        AudioPlayerState.ostStarting = false;
      }
      return;
    }

    const pos = AudioPlayerState.playOrder.indexOf(physicalIndex);
    if (pos < 0) {
      return;
    }
    AudioPlayerState.playCursor = pos;
    AudioPlayerState.Stop();
    const ok = await AudioPlayerState.loadPlaylistCursorWithRetry();
    if (ok) {
      AudioPlayerState.Play();
    } else {
      AudioPlayerState.stopAmbientMusicOst();
    }
  }

  /**
   * Jump to a track in the current queue by its index in `playlist` (manual or OST).
   */
  static async seekPlaylistToPhysicalIndex(physicalIndex: number): Promise<void> {
    if (
      physicalIndex < 0 ||
      physicalIndex >= AudioPlayerState.playlist.length ||
      !AudioPlayerState.playOrder.length
    ) {
      return;
    }
    const pos = AudioPlayerState.playOrder.indexOf(physicalIndex);
    if (pos < 0) {
      return;
    }
    AudioPlayerState.playCursor = pos;
    AudioPlayerState.Stop();
    const ok = await AudioPlayerState.loadPlaylistCursorWithRetry();
    if (ok) {
      AudioPlayerState.Play();
    } else if (AudioPlayerState.ostMode) {
      AudioPlayerState.stopAmbientMusicOst();
    } else {
      AudioPlayerState.emitOstState();
    }
  }

  static appendEditorFilesToPlaylist(files: EditorFile[]): void {
    if (!files.length) {
      return;
    }
    if (AudioPlayerState.ostMode) {
      AudioPlayerState.clearOstMode();
      AudioPlayerState.Stop();
    }
    for (const file of files) {
      const id = `ed-${file.resref}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      AudioPlayerState.playlist.push({
        type: "editor_file",
        id,
        title: file.getFilename(),
        file,
      });
    }
    AudioPlayerState.rebuildPlayOrder();
    if (AudioPlayerState.playCursor >= AudioPlayerState.playOrder.length) {
      AudioPlayerState.playCursor = 0;
    }
    AudioPlayerState.emitOstState();
  }

  static removePlaylistPhysicalIndex(physicalIndex: number): void {
    if (
      physicalIndex < 0 ||
      physicalIndex >= AudioPlayerState.playlist.length
    ) {
      return;
    }
    const playingPhys = AudioPlayerState.getCurrentOstPhysicalIndex();
    const playingId =
      playingPhys >= 0 && playingPhys < AudioPlayerState.playlist.length
        ? AudioPlayerState.playlist[playingPhys].id
        : undefined;
    const wasCurrent = playingPhys === physicalIndex;
    AudioPlayerState.playlist.splice(physicalIndex, 1);
    if (!AudioPlayerState.playlist.length) {
      if (AudioPlayerState.ostMode) {
        AudioPlayerState.clearOstMode();
      } else {
        AudioPlayerState.playOrder = [];
        AudioPlayerState.playCursor = 0;
      }
      AudioPlayerState.Stop();
      AudioPlayerState.emitOstState();
      return;
    }
    AudioPlayerState.rebuildPlayOrder();
    if (playingId) {
      const np = AudioPlayerState.playlist.findIndex((e) => e.id === playingId);
      AudioPlayerState.playCursor =
        np >= 0 ? AudioPlayerState.playOrder.indexOf(np) : 0;
    } else {
      AudioPlayerState.playCursor = Math.min(
        AudioPlayerState.playCursor,
        AudioPlayerState.playOrder.length - 1,
      );
    }
    AudioPlayerState.emitOstState();
    if (wasCurrent) {
      AudioPlayerState.Stop();
      void AudioPlayerState.loadPlaylistCursorWithRetry().then((ok) => {
        if (ok) {
          AudioPlayerState.Play();
        } else if (AudioPlayerState.ostMode) {
          AudioPlayerState.stopAmbientMusicOst();
        }
      });
    }
  }

  static clearManualPlaylist(): void {
    if (AudioPlayerState.ostMode) {
      return;
    }
    if (!AudioPlayerState.playlist.length) {
      return;
    }
    AudioPlayerState.playlist = [];
    AudioPlayerState.playOrder = [];
    AudioPlayerState.playCursor = 0;
    AudioPlayerState.Stop();
    AudioPlayerState.emitOstState();
  }

  static async promptAppendAudioToPlaylist(): Promise<void> {
    const res = await ForgeFileSystem.OpenFile({
      ext: [".wav", ".mp3"],
      multiple: true,
    });
    const files: EditorFile[] = [];
    if (res.type === ForgeFileSystemResponseType.FILE_PATH_STRING && res.paths?.length) {
      for (const p of res.paths) {
        files.push(
          new EditorFile({
            path: p,
            useSystemFileSystem: true,
          }),
        );
      }
    } else if (res.handles?.length) {
      for (const h of res.handles as FileSystemFileHandle[]) {
        const parsed = pathParse(h.name);
        files.push(
          new EditorFile({
            path: EditorFile.referenceURIForSystemVirtualName(h.name),
            handle: h,
            filename: h.name,
            resref: parsed.name,
            ext: parsed.ext,
          }),
        );
      }
    }
    if (!files.length) {
      return;
    }
    AudioPlayerState.appendEditorFilesToPlaylist(files);
  }

  private static currentPlaylistEntryMatchesBuffer(): boolean {
    if (!AudioPlayerState.playlist.length || !AudioPlayerState.playOrder.length) {
      return true;
    }
    const physical = AudioPlayerState.playOrder[AudioPlayerState.playCursor];
    const ent = AudioPlayerState.playlist[physical];
    if (!ent || !AudioPlayerState.audioFile) {
      return false;
    }
    if (ent.type === "editor_file") {
      return AudioPlayerState.file === ent.file;
    }
    const fn = AudioPlayerState.audioFile.filename || "";
    return fn.includes(`(${ent.resRef})`);
  }

  private static async ensurePlaylistEntryLoaded(): Promise<boolean> {
    if (!AudioPlayerState.playlist.length || !AudioPlayerState.playOrder.length) {
      return true;
    }
    if (AudioPlayerState.currentPlaylistEntryMatchesBuffer() && AudioPlayerState.buffer) {
      return true;
    }
    return AudioPlayerState.loadPlaylistCursorWithRetry();
  }

  static GetAudioBuffer(onBuffered?: Function){
    if(AudioPlayerState.buffer == null){
      AudioPlayerState.audioFile.getPlayableByteStream().then((data: Uint8Array) => {
        try{
          const ab = (
            data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
              ? data.buffer
              : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
          ) as ArrayBuffer;
          KotOR.AudioEngine.GetAudioEngine().audioCtx.decodeAudioData(ab, (buffer: any) => {
            AudioPlayerState.buffer = buffer;
            if(typeof onBuffered === 'function')
              onBuffered(AudioPlayerState.buffer);
          }, (error: any) => {
            console.error("decodeAudioData error", error);

            // AudioPlayerState.buffer = pcm.toAudioBuffer(data);
            console.log('Caught PCM error converting ADPCM to PCM', AudioPlayerState.buffer, AudioPlayerState.buffer instanceof AudioBuffer)
            if(typeof onBuffered === 'function')
              onBuffered(AudioPlayerState.buffer);
          });
        }catch( e ){

        }
      });
    }else{
      if(onBuffered != null)
        onBuffered(AudioPlayerState.buffer);
    }
  }

  static isPlaying() {
    return AudioPlayerState.playing;
  }

  static Reset(){
    AudioPlayerState.position = 0;
    AudioPlayerState.startedAt = 0;
    AudioPlayerState.pausedAt = 0;
    AudioPlayerState.playing = false;
    AudioPlayerState.loading = false;
    AudioPlayerState.loop = false;

    if(!AudioPlayerState.gainNode){
      AudioPlayerState.gainNode = KotOR.AudioEngine.GetAudioEngine().audioCtx.createGain();
      AudioPlayerState.gainNode.gain.value = AudioPlayerState.volume;
    }

    if(!AudioPlayerState.source){
      AudioPlayerState.source = KotOR.AudioEngine.GetAudioEngine().audioCtx.createBufferSource();
    }

  }

  static SetVolume(volume: number): void {
    volume = Math.max(0, Math.min(1, volume));
    AudioPlayerState.volume = volume;
    if(AudioPlayerState.gainNode){
      AudioPlayerState.gainNode.gain.value = volume;
    }
    AudioPlayerState.ProcessEventListener('onVolume', [volume]);
  }

  static Play(){
    AudioPlayerState.source = KotOR.AudioEngine.GetAudioEngine().audioCtx.createBufferSource();
    if(AudioPlayerState.loading){
      return;
    }
    void AudioPlayerState.ensurePlaylistEntryLoaded().then((ready) => {
      if (!ready && AudioPlayerState.playOrder.length > 0) {
        return;
      }
      if (!AudioPlayerState.loading) {
        AudioPlayerState.GetAudioBuffer((data: any) => {
          if (AudioPlayerState.source) {
            AudioPlayerState.loading = false;
            let offset = AudioPlayerState.pausedAt;
            AudioPlayerState.source.buffer = AudioPlayerState.buffer;
            AudioPlayerState.analyser =
              KotOR.AudioEngine.GetAudioEngine().audioCtx.createAnalyser();
            AudioPlayerState.analyser.fftSize = 128;
            AudioPlayerState.source.connect(AudioPlayerState.analyser);
            AudioPlayerState.analyser.connect(AudioPlayerState.gainNode);
            AudioPlayerState.gainNode.connect(
              KotOR.AudioEngine.voChannel.getGainNode(),
            );
            AudioPlayerState.source.loop = false;
            AudioPlayerState.source.start(0, offset);

            AudioPlayerState.analyserBufferLength =
              AudioPlayerState.analyser.frequencyBinCount;
            AudioPlayerState.analyserData = new Uint8Array(
              AudioPlayerState.analyserBufferLength,
            );

            AudioPlayerState.startedAt =
              KotOR.AudioEngine.GetAudioEngine().audioCtx.currentTime - offset;
            AudioPlayerState.pausedAt = 0;
            AudioPlayerState.playing = true;

            AudioPlayerState.source.onended = () => {
              AudioPlayerState.Stop();
              if (AudioPlayerState.loop && !AudioPlayerState.ostMode) {
                AudioPlayerState.ProcessEventListener("onLoop");
                AudioPlayerState.Play();
                return;
              }
              const qn = AudioPlayerState.playOrder.length;
              const advanceQueue =
                qn > 0 && (AudioPlayerState.ostMode || qn > 1);
              if (advanceQueue) {
                AudioPlayerState.playCursor =
                  (AudioPlayerState.playCursor + 1) % qn;
                void AudioPlayerState.loadPlaylistCursorWithRetry().then((ok) => {
                  if (
                    ok &&
                    (AudioPlayerState.ostMode ||
                      AudioPlayerState.playOrder.length > 0)
                  ) {
                    AudioPlayerState.Play();
                  } else if (AudioPlayerState.ostMode) {
                    AudioPlayerState.stopAmbientMusicOst();
                  }
                });
              }
            };

            AudioPlayerState.ResumeLoop();
            AudioPlayerState.ProcessEventListener("onPlay");
          }
        });
      }
    });
  }

  static ResumeLoop(){
    // AudioPlayerState.loopId = global.setInterval(() => {
    //   //
    // }, 100);
  }

  static StopLoop(){
    clearInterval(AudioPlayerState.loopId);
  }

  static Pause(){
    let elapsed = KotOR.AudioEngine.GetAudioEngine().audioCtx.currentTime - AudioPlayerState.startedAt;
    AudioPlayerState.pausedAt = elapsed;
    AudioPlayerState.ProcessEventListener('onPause');
    AudioPlayerState.Stop({ emitStopEvent: false });
    AudioPlayerState.pausedAt = elapsed;
  }

  static Stop(options?: AudioPlayerStopOptions){
    try{
      if(AudioPlayerState.source){
        // stop() schedules onended; clear first so user Stop / Pause / skip
        // are not treated as a natural track end (which would advance OST).
        AudioPlayerState.source.onended = null;
        AudioPlayerState.source.disconnect();
        AudioPlayerState.source.stop(0);
      }
    }catch(e){ console.error(e); }
    AudioPlayerState.pausedAt = 0;
    AudioPlayerState.startedAt = 0;
    AudioPlayerState.playing = false;
    AudioPlayerState.StopLoop();
    if (options?.emitStopEvent !== false) {
      AudioPlayerState.ProcessEventListener('onStop');
    }
  }

  private static copyRawAudioBytes(data: unknown): Uint8Array | null {
    if (data instanceof Uint8Array && data.length > 0) {
      return new Uint8Array(data);
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(data) && (data as Buffer).length > 0) {
      return new Uint8Array(data as Buffer);
    }
    return null;
  }

  /** 16-bit PCM little-endian WAV from decoded Web Audio buffer (last-resort export). */
  private static encodeAudioBufferToWav(buf: AudioBuffer): Uint8Array {
    const channels = buf.numberOfChannels;
    const rate = buf.sampleRate;
    const samples = buf.length;
    const bits = 16;
    const blockAlign = (channels * bits) / 8;
    const dataBytes = samples * blockAlign;
    const out = new Uint8Array(44 + dataBytes);
    const v = new DataView(out.buffer);
    const le = true;
    const w = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++) {
        out[o + i] = s.charCodeAt(i);
      }
    };
    w(0, 'RIFF');
    v.setUint32(4, 36 + dataBytes, le);
    w(8, 'WAVE');
    w(12, 'fmt ');
    v.setUint32(16, 16, le);
    v.setUint16(20, 1, le);
    v.setUint16(22, channels, le);
    v.setUint32(24, rate, le);
    v.setUint32(28, rate * blockAlign, le);
    v.setUint16(32, blockAlign, le);
    v.setUint16(34, bits, le);
    w(36, 'data');
    v.setUint32(40, dataBytes, le);
    let off = 44;
    for (let i = 0; i < samples; i++) {
      for (let ch = 0; ch < channels; ch++) {
        const f = buf.getChannelData(ch)[i];
        let pcm = Math.round(Math.max(-1, Math.min(1, f)) * 32767);
        if (pcm > 32767) {
          pcm = 32767;
        }
        if (pcm < -32768) {
          pcm = -32768;
        }
        v.setInt16(off, pcm, le);
        off += 2;
      }
    }
    return out;
  }

  /**
   * Bytes to write: parsed export, playable stream, raw file, or re-encode decoded AudioBuffer.
   */
  private static async getAudioExportBytes(): Promise<Uint8Array> {
    const af = AudioPlayerState.audioFile;
    if (!af) {
      return new Uint8Array(0);
    }
    let bytes = af.getExportableData();
    if (bytes.length > 0) {
      return bytes;
    }
    try {
      const playable = await af.getPlayableByteStream();
      if (playable.length > 0) {
        return playable;
      }
    } catch (e) {
      console.warn('Audio export: getPlayableByteStream failed', e);
    }
    const raw = AudioPlayerState.copyRawAudioBytes(af.data);
    if (raw) {
      return raw;
    }
    const decoded = AudioPlayerState.buffer;
    if (decoded instanceof AudioBuffer && decoded.length > 0) {
      return AudioPlayerState.encodeAudioBufferToWav(decoded);
    }
    return new Uint8Array(0);
  }

  static async ExportAudio() {
    const af = AudioPlayerState.audioFile;
    if (!af) {
      console.warn('ExportAudio: no audio file loaded');
      return;
    }

    const exportData = await AudioPlayerState.getAudioExportBytes();
    if (!exportData.length) {
      console.warn('ExportAudio: no data to write');
      return;
    }

    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      let payload = await dialog.showSaveDialog({
        title: 'Export Audio File',
        defaultPath: af.filename,
        properties: ['createDirectory'],
        filters: [
          {name: 'Wave File', extensions: ['wav']},
          {name: 'MP3 File', extensions: ['mp3']}
        ]
      });

      if(!payload.canceled && typeof payload.filePath != 'undefined'){
        await fs.promises.writeFile(payload.filePath, exportData);
        console.log('AudioFile Saved', payload.filePath);
      }
    }else{
      showSaveFilePicker({
        suggestedName: af.filename,
        types: [{
          description: 'MP3 File',
          accept: {'audio/mpeg': ['.mp3']},
        },{
          description: 'WAV File',
          accept: {'audio/vnd.wav': ['.wav']},
        }]
      } as SaveFilePickerOptions ).then( async (handle: FileSystemFileHandle) => {
        if(handle){
          const writable = await handle.createWritable();
          await writable.write(exportData as any);
          await writable.close();
          console.log('AudioFile Saved', handle.name);
        }
      })
    }
  }

  static GetCurrentTime(): number {
    try{
      if(AudioPlayerState.pausedAt) {
        return AudioPlayerState.pausedAt;
      }
      if(AudioPlayerState.startedAt) {
        return KotOR.AudioEngine.GetAudioEngine().audioCtx.currentTime - AudioPlayerState.startedAt;
      }
    }catch(e){ }
    return 0;
  }

  static GetDuration() {
    try{
      return AudioPlayerState.buffer.duration;
    }catch(e){ }
    return 0;
  }

  static SecondsToTimeString(time: number){
    time = time | 0
    let h = Math.floor(time / 3600);
    let m = Math.floor(time % 3600 / 60);
    let s = Math.floor(time % 3600 % 60);
    return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);
  }

}