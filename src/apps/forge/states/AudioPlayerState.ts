import { EditorFile } from "../EditorFile";
import * as fs from "fs";
import * as KotOR from "../KotOR";

declare const dialog: any;

export type AudioPlayerEventListenerTypes =
  'onPlay'|'onPause'|'onStop'|'onLoad'|'onVolume'|'onLoop';

export interface TabManagerEventListeners {
  onPlay: Function[],
  onPause: Function[],
  onStop: Function[],
  onLoad: Function[],
  onVolume: Function[],
  onLoop: Function[],
}

export class AudioPlayerState {
  
  // this.gainNode = AudioEngine.GetAudioEngine().audioCtx.createGain();
  // this.gainNode.gain.value = 0.25;
  // this.source = AudioEngine.GetAudioEngine().audioCtx.createBufferSource();
  static file: EditorFile;
  static audioFile: KotOR.AudioFile;
  static buffer: any;

  static eventListeners: TabManagerEventListeners = {
    onPlay: [],
    onPause: [],
    onStop: [],
    onLoad: [],
    onVolume: [],
    onLoop: [],
  };
  
  static source: AudioBufferSourceNode;
  static gainNode: GainNode;
  static loading: boolean;
  static position: number;
  static startedAt: number;
  static pausedAt: number;
  static playing: boolean;
  static loop: boolean;
  static loopId: NodeJS.Timeout;

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

  static OpenAudio(file: EditorFile){
    AudioPlayerState.Reset();
    AudioPlayerState.Stop();
    
    AudioPlayerState.file = file;
    if(file instanceof EditorFile){
      file.readFile().then( (response) => {
        try{
          // AudioPlayerState.$title.text(file.resref+'.'+file.ext);
          AudioPlayerState.audioFile = new KotOR.AudioFile(response.buffer);
          if(AudioPlayerState.isPlaying()){
            AudioPlayerState.Stop();
          }
          if(AudioPlayerState.buffer){
            AudioPlayerState.buffer = null;
          }
          AudioPlayerState.Play();
          // AudioPlayerState.Show();
        }
        catch (e) {
          console.error(e);
          //AudioPlayerState.Hide();
        }
      });
    }
  }

  static GetAudioBuffer(onBuffered?: Function){
    if(AudioPlayerState.buffer == null){
      AudioPlayerState.audioFile.GetPlayableByteStream((data: ArrayBuffer) => {
        try{
          KotOR.AudioEngine.GetAudioEngine().audioCtx.decodeAudioData(data, (buffer: any) => {
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
          let offset = AudioPlayerState.pausedAt;
          AudioPlayerState.source.buffer = AudioPlayerState.buffer;
          AudioPlayerState.source.connect(AudioPlayerState.gainNode);
          AudioPlayerState.gainNode.connect(KotOR.AudioEngine.GetAudioEngine().audioCtx.destination);
          AudioPlayerState.source.loop = false;
          AudioPlayerState.source.start(0, offset);

          AudioPlayerState.startedAt = KotOR.AudioEngine.GetAudioEngine().audioCtx.currentTime - offset;
          AudioPlayerState.pausedAt = 0;
          AudioPlayerState.playing = true;

          AudioPlayerState.source.onended = () => {
            AudioPlayerState.Stop();
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
    let elapsed = KotOR.AudioEngine.GetAudioEngine().audioCtx.currentTime - AudioPlayerState.startedAt;
    AudioPlayerState.pausedAt = elapsed;
    AudioPlayerState.ProcessEventListener('onPause');
    AudioPlayerState.Stop();
    AudioPlayerState.pausedAt = elapsed;
  }

  static Stop(){
    try{
      if(AudioPlayerState.source){
        AudioPlayerState.source.disconnect();
        AudioPlayerState.source.stop(0);
      }
    }catch(e){ console.error(e); }
    AudioPlayerState.pausedAt = 0;
    AudioPlayerState.startedAt = 0;
    AudioPlayerState.playing = false;
    AudioPlayerState.StopLoop();
    AudioPlayerState.ProcessEventListener('onStop');
  }

  static async ExportAudio() {
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      let payload = await dialog.showSaveDialog({
        title: 'Export Audio File',
        defaultPath: AudioPlayerState.audioFile.filename,
        properties: ['createDirectory'],
        filters: [
          {name: 'Wave File', extensions: ['wav']},
          {name: 'MP3 File', extensions: ['mp3']}
        ]
      });

      if(!payload.canceled && typeof payload.filePath != 'undefined'){
        fs.writeFile(payload.filePath, AudioPlayerState.audioFile.GetExportableData() || Buffer.allocUnsafe(0), (err) => {
          if (err) {
            console.warn('AudioFile Save Fail', payload.filePath);
            // if(typeof args.onError == 'function')
            //   args.onError(err);
          }else{
            console.log('AudioFile Saved', payload.filePath);
            // if(typeof args.onComplete == 'function')
            //   args.onComplete();
          }
        });
        AudioPlayerState.audioFile.Export({
          file: payload.filePath,
          onComplete: () => {
            // NotificationManager.Notify(NotificationManager.Types.SUCCESS, 'Audio file saved');
          },
          onError: () => {
            // NotificationManager.Notify(NotificationManager.Types.WARNING, 'Audio file failed to save');
          }
        });
      }
    }else{
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
        if(handle){
          const writable = await handle.createWritable();
          await writable.write(AudioPlayerState.audioFile.GetExportableData() || Buffer.allocUnsafe(0));
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