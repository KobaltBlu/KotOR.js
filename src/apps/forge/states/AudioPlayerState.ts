import { EditorFile } from "@/apps/forge/EditorFile";
import * as fs from "fs";
import * as path from "path";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabAudioPlayerState } from "@/apps/forge/states/tabs/TabAudioPlayerState";
import { GameFileSystem } from "@/utility/GameFileSystem";

declare const dialog: any;

export type AudioPlayerEventListenerTypes =
  'onPlay'|'onPause'|'onStop'|'onLoad'|'onVolume'|'onLoop'|'onOpen'|'onOstState';

export interface TabManagerEventListeners {
  onPlay: Function[],
  onPause: Function[],
  onStop: Function[],
  onLoad: Function[],
  onVolume: Function[],
  onLoop: Function[],
  onOpen: Function[],
  onOstState: Function[],
}

export type AudioPlayerOstStatePayload = {
  active: boolean;
  /** Resolved track title (TLK from Description, or DisplayName, or row label). */
  label: string;
  /** Row index in the ambientmusic playlist (table order). -1 when OST is off. */
  trackIndex: number;
  total: number;
  shuffle: boolean;
  /** 1-based position in the current play order. */
  queuePosition: number;
};

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

  /** When true, advancing to the next `ambientmusic.2da` row after a track ends. */
  static ostMode: boolean = false;
  static ostTracks: AmbientMusicOstEntry[] = [];
  /** Permutation of `0..ostTracks.length-1` — play order (shuffled or sequential). */
  static ostPlayOrder: number[] = [];
  static ostPlayCursor: number = 0;
  /** User preference: next `startAmbientMusicOst` / rebuild uses shuffled order. */
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

  private static rebuildOstPlayOrder(): void {
    const n = AudioPlayerState.ostTracks.length;
    if (!n) {
      AudioPlayerState.ostPlayOrder = [];
      return;
    }
    const order = Array.from({ length: n }, (_, i) => i);
    if (AudioPlayerState.ostShuffle) {
      AudioPlayerState.shuffleInPlace(order);
    }
    AudioPlayerState.ostPlayOrder = order;
  }

  /**
   * Sets shuffle preference. When OST is active, rebuilds play order and keeps the current track.
   */
  static setOstShuffle(shuffle: boolean): void {
    AudioPlayerState.ostShuffle = shuffle;
    if (!AudioPlayerState.ostMode || !AudioPlayerState.ostTracks.length || !AudioPlayerState.ostPlayOrder.length) {
      AudioPlayerState.emitOstState();
      return;
    }
    const physical = AudioPlayerState.ostPlayOrder[AudioPlayerState.ostPlayCursor];
    AudioPlayerState.rebuildOstPlayOrder();
    let nextCursor = AudioPlayerState.ostPlayOrder.indexOf(physical);
    if (nextCursor < 0) {
      nextCursor = 0;
    }
    AudioPlayerState.ostPlayCursor = nextCursor;
    AudioPlayerState.emitOstState();
  }

  static getCurrentOstPhysicalIndex(): number {
    if (!AudioPlayerState.ostMode || !AudioPlayerState.ostPlayOrder.length) {
      return -1;
    }
    return AudioPlayerState.ostPlayOrder[AudioPlayerState.ostPlayCursor];
  }

  static AddEventListener(type: AudioPlayerEventListenerTypes, cb: Function){
    if(Array.isArray(AudioPlayerState.eventListeners[type])){
      const ev = AudioPlayerState.eventListeners[type];
      const index = ev.indexOf(cb);
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
      const ev = AudioPlayerState.eventListeners[type];
      const index = ev.indexOf(cb);
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
      const ev = AudioPlayerState.eventListeners[type];
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

  static OpenAudio(file: EditorFile){
    AudioPlayerState.clearOstMode();
    ForgeState.tabManager.addTab(new TabAudioPlayerState());
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
    const active = AudioPlayerState.ostMode && AudioPlayerState.ostTracks.length > 0;
    const physical =
      active && AudioPlayerState.ostPlayOrder.length > 0
        ? AudioPlayerState.ostPlayOrder[AudioPlayerState.ostPlayCursor]
        : -1;
    const entry =
      active && physical >= 0 ? AudioPlayerState.ostTracks[physical] : undefined;
    const payload: AudioPlayerOstStatePayload = {
      active,
      label: entry?.displayName ?? entry?.label ?? '',
      trackIndex: physical,
      total: AudioPlayerState.ostTracks.length,
      shuffle: AudioPlayerState.ostShuffle,
      queuePosition: active ? AudioPlayerState.ostPlayCursor + 1 : 0,
    };
    AudioPlayerState.ProcessEventListener('onOstState', [payload]);
  }

  static clearOstMode(): void {
    AudioPlayerState.ostMode = false;
    AudioPlayerState.ostTracks = [];
    AudioPlayerState.ostPlayOrder = [];
    AudioPlayerState.ostPlayCursor = 0;
    AudioPlayerState.emitOstState();
  }

  static stopAmbientMusicOst(): void {
    AudioPlayerState.clearOstMode();
    AudioPlayerState.Stop();
  }

  private static async loadGameMusicResRef(resRef: string, displayTitle: string): Promise<void> {
    const filePath = path.join('streammusic', `${resRef}.wav`);
    const buffer = await GameFileSystem.readFile(filePath);
    AudioPlayerState.file = undefined;
    AudioPlayerState.audioFile = new KotOR.AudioFile(buffer);
    AudioPlayerState.audioFile.filename = `${displayTitle} (${resRef})`;
    AudioPlayerState.buffer = null;
    AudioPlayerState.ProcessEventListener('onOpen', [AudioPlayerState.audioFile]);
    AudioPlayerState.emitOstState();
  }

  /**
   * Tries the track at `ostPlayCursor`; on missing file, advances in play order up to one full pass.
   */
  private static async loadOstTrackAtIndexWithRetry(attempts = 0): Promise<boolean> {
    const n = AudioPlayerState.ostTracks.length;
    if (!n || !AudioPlayerState.ostPlayOrder.length || attempts >= n) {
      return false;
    }
    const physical = AudioPlayerState.ostPlayOrder[AudioPlayerState.ostPlayCursor];
    const t = AudioPlayerState.ostTracks[physical];
    try {
      await AudioPlayerState.loadGameMusicResRef(t.resRef, t.displayName);
      return true;
    } catch (e) {
      console.warn('Ambient OST: could not load', t.resRef, e);
      AudioPlayerState.ostPlayCursor = (AudioPlayerState.ostPlayCursor + 1) % n;
      return AudioPlayerState.loadOstTrackAtIndexWithRetry(attempts + 1);
    }
  }

  static async startAmbientMusicOst(): Promise<void> {
    if (AudioPlayerState.ostStarting) {
      return;
    }
    const entries = AudioPlayerState.getAmbientMusicPlaylistEntries();
    if (!entries.length) {
      console.warn('Ambient OST: no tracks in ambientmusic.2da (or table not loaded). Open a project / game assets first.');
      return;
    }
    AudioPlayerState.ostStarting = true;
    try {
      AudioPlayerState.ostTracks = entries;
      AudioPlayerState.ostMode = true;
      AudioPlayerState.rebuildOstPlayOrder();
      AudioPlayerState.ostPlayCursor = 0;
      AudioPlayerState.Reset();
      AudioPlayerState.Stop();
      const ok = await AudioPlayerState.loadOstTrackAtIndexWithRetry();
      if (!ok) {
        console.warn('Ambient OST: no streammusic files could be loaded.');
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
    if (!AudioPlayerState.ostMode || !AudioPlayerState.ostTracks.length) {
      return;
    }
    const n = AudioPlayerState.ostTracks.length;
    AudioPlayerState.ostPlayCursor =
      (AudioPlayerState.ostPlayCursor + delta + n) % n;
    AudioPlayerState.Stop();
    const ok = await AudioPlayerState.loadOstTrackAtIndexWithRetry();
    if (ok) {
      AudioPlayerState.Play();
    } else {
      AudioPlayerState.stopAmbientMusicOst();
    }
  }

  /**
   * Jump to a track by its index in the ambientmusic playlist (same order as `getAmbientMusicPlaylistEntries`).
   * Starts OST if it is not active.
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
        AudioPlayerState.ostTracks = entries;
        AudioPlayerState.ostMode = true;
        AudioPlayerState.rebuildOstPlayOrder();
        AudioPlayerState.ostPlayCursor = Math.max(
          0,
          AudioPlayerState.ostPlayOrder.indexOf(physicalIndex)
        );
        AudioPlayerState.Reset();
        AudioPlayerState.Stop();
        const ok = await AudioPlayerState.loadOstTrackAtIndexWithRetry();
        if (!ok) {
          console.warn('Ambient OST: no streammusic files could be loaded.');
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

    const pos = AudioPlayerState.ostPlayOrder.indexOf(physicalIndex);
    if (pos < 0) {
      return;
    }
    AudioPlayerState.ostPlayCursor = pos;
    AudioPlayerState.Stop();
    const ok = await AudioPlayerState.loadOstTrackAtIndexWithRetry();
    if (ok) {
      AudioPlayerState.Play();
    } else {
      AudioPlayerState.stopAmbientMusicOst();
    }
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
      AudioPlayerState.gainNode.gain.value = 0.25;
    }

    if(!AudioPlayerState.source){
      AudioPlayerState.source = KotOR.AudioEngine.GetAudioEngine().audioCtx.createBufferSource();
    }

  }

  static Play(){
    AudioPlayerState.source = KotOR.AudioEngine.GetAudioEngine().audioCtx.createBufferSource();
    if(!AudioPlayerState.loading){
      AudioPlayerState.GetAudioBuffer((data: any) => {
        if(AudioPlayerState.source){
          AudioPlayerState.loading = false;
          const offset = AudioPlayerState.pausedAt;
          AudioPlayerState.source.buffer = AudioPlayerState.buffer;
          AudioPlayerState.analyser = KotOR.AudioEngine.GetAudioEngine().audioCtx.createAnalyser();
          AudioPlayerState.analyser.fftSize = 128; 
          AudioPlayerState.source.connect(AudioPlayerState.analyser);
          AudioPlayerState.analyser.connect(AudioPlayerState.gainNode);
          AudioPlayerState.gainNode.connect(KotOR.AudioEngine.voChannel.getGainNode());
          AudioPlayerState.source.loop = false;
          AudioPlayerState.source.start(0, offset);

          AudioPlayerState.analyserBufferLength = AudioPlayerState.analyser.frequencyBinCount; 
          AudioPlayerState.analyserData = new Uint8Array(AudioPlayerState.analyserBufferLength);

          AudioPlayerState.startedAt = KotOR.AudioEngine.GetAudioEngine().audioCtx.currentTime - offset;
          AudioPlayerState.pausedAt = 0;
          AudioPlayerState.playing = true;

          AudioPlayerState.source.onended = () => {
            const advanceOst =
              AudioPlayerState.ostMode && AudioPlayerState.ostTracks.length > 0;
            AudioPlayerState.Stop();
            if (advanceOst) {
              const n = AudioPlayerState.ostTracks.length;
              AudioPlayerState.ostPlayCursor =
                (AudioPlayerState.ostPlayCursor + 1) % n;
              void AudioPlayerState.loadOstTrackAtIndexWithRetry().then((ok) => {
                if (ok && AudioPlayerState.ostMode) {
                  AudioPlayerState.Play();
                } else if (!ok) {
                  AudioPlayerState.stopAmbientMusicOst();
                }
              });
              return;
            }
            if(AudioPlayerState.loop){
              AudioPlayerState.ProcessEventListener('onLoop');
              AudioPlayerState.Play();
            }
          };

          AudioPlayerState.ResumeLoop();
          AudioPlayerState.ProcessEventListener('onPlay');
        }
      });
    }
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
    const elapsed = KotOR.AudioEngine.GetAudioEngine().audioCtx.currentTime - AudioPlayerState.startedAt;
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
      const payload = await dialog.showSaveDialog({
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
    const h = Math.floor(time / 3600);
    const m = Math.floor(time % 3600 / 60);
    const s = Math.floor(time % 3600 % 60);
    return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);
  }

}