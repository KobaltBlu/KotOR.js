/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AudioEngine class manages audio levels and the AudioEmitters that are added to it.
 */

class AudioEngine {

  constructor () {

    this.audioCtx = new AudioEngine.AudioCtx();

    this.reverbLF = new Reverb(this.audioCtx);
    this.reverbHF = new Reverb(this.audioCtx);
    this.reverbLF.filterType = 'highpass';
    this.reverbHF.filterType = 'lowpass';

    this.sfxGain = this.audioCtx.createGain();
    this.sfxGain.gain.value = AudioEngine.GAIN_SFX;
    this.sfxGain.connect(this.audioCtx.destination);

    this.musicGain = this.audioCtx.createGain();
    this.musicGain.gain.value = AudioEngine.GAIN_MUSIC;
    this.musicGain.connect(this.audioCtx.destination);

    this.voGain = this.audioCtx.createGain();
    this.voGain.gain.value = AudioEngine.GAIN_VO;
    this.voGain.connect(this.audioCtx.destination);

    this.movieGain = this.audioCtx.createGain();
    this.movieGain.gain.value = AudioEngine.GAIN_MOVIE;
    this.movieGain.connect(this.audioCtx.destination);

    this.emitters = [];
    this.bgm = null;
    this.bgmTimeout = null;
    this.dialogBGM = null;
    this.dialogBGMTimeout = null;
    this.ambient = null;

    AudioEngine.engines.push(this);

  }

  SetReverbState(state = false){
    this.sfxGain.disconnect();
    //this.musicGain.disconnect();
    this.voGain.disconnect();
    this.reverbLF.disconnect();
    this.reverbHF.disconnect();
    if(state){
      this.sfxGain.connect(this.reverbLF);
      this.sfxGain.connect(this.reverbHF);
      //this.musicGain.connect(this.reverbLF);
      //this.musicGain.connect(this.reverbHF);
      this.voGain.connect(this.reverbLF);
      this.voGain.connect(this.reverbHF);
      //Connect the reverb node to the audio output node
      this.reverbLF.connect(this.audioCtx.destination);
      this.reverbHF.connect(this.audioCtx.destination);
    }else{
      this.sfxGain.connect(this.audioCtx.destination);
      //this.musicGain.connect(this.audioCtx.destination);
      this.voGain.connect(this.audioCtx.destination);
    }
  }

  SetReverbProfile(index = 0){
    console.log('SetReverbProfile:', index);

    let software_mode = false;

    if(iniConfig.getProperty('Sound Options.Force Software').value == 1){
      software_mode = true;
      console.warn('SetReverbProfile:', 'Reverb can\'t be set because Force Software mode is on');
    }

    if(index >= 0){
      let data = EAXPresets.PresetFromIndex(index);
      console.log('SetReverbProfile:', data);
      this.reverbHF.gain.value = data.gainHF;
      this.reverbLF.gain.value = data.gainLF;

      this.reverbHF.decay = data.decayTime;
      this.reverbLF.decay = data.decayTime;

      this.reverbHF.cutoff.value = data.hfReference;
      this.reverbLF.cutoff.value = data.lfReference;

      this.reverbHF.wet.value = data.reflectionsGain * data.diffusion;
      this.reverbLF.wet.value = data.reflectionsGain * data.diffusion;

      this.reverbHF.dry.value = 1;
      this.reverbLF.dry.value = 1;
      
      this.SetReverbState(!software_mode);
    }else{
      this.SetReverbState(false);
    }
  }

  Update ( position = new THREE.Vector3(0), rotation = new THREE.Vector3(0) ) {
    this.audioCtx.listener.setPosition(position.x,position.y,position.z);
    this.audioCtx.listener.setOrientation(rotation.x,rotation.y,rotation.z, 0, 0, 1);

    /*soundsLen = this.sounds.length;
    for(let i = 0; i < soundsLen; i++){
      let sound = sounds[soundsLen];
      sound.Update();
    }*/

  }

  AddEmitter(emitter){
    this.emitters.push(emitter);
  }

  /*AddSound ( options = {} ) {

    options = $.extend({
      //Variables
      data: null,
      position: new THREE.Vector3(0),
      rotation: new THREE.Vector3(0),
      loop: false,
      vol: 1,

      //Callbacks
      onLoad: null,
      onError: null
    }, options);

    this.audioCtx.decodeAudioData( options.data, ( buffer ) => {

      let sound = this.audioCtx.createBufferSource();
      let pannerNode = this.audioCtx.createPanner();

      sound.buffer = buffer;
      sound.loop = options.loop;
      //sound.start( 0, 0 );
      sound.volume = options.vol;

      pannerNode.setPosition( options.position.x, options.position.y, options.position.z );
      pannerNode.setOrientation( options.rotation.x, options.rotation.y, options.rotation.z, 0, 0, 1);

      sound.connect(pannerNode);
      pannerNode.connect(this.sfxGain);

      this.sounds.push(sound);

    }, (error) => {
      console.error("decodeAudioData error", error);
    });

  }*/

  SetBackgroundMusic ( data, vol = 1 ) {
    this.audioCtx.decodeAudioData( data, ( buffer ) => {
      this.bgmBuffer = buffer;
      this.StartBackgroundMusic();
    });
  }

  SetDialogBackgroundMusic ( data, vol = 1 ) {
    this.audioCtx.decodeAudioData( data, ( buffer ) => {
      this.dialogMusicBuffer = buffer;
      this.StartBackgroundMusic(this.dialogMusicBuffer);
    });
  }

  StartBackgroundMusic(buffer = undefined){

    if(buffer == undefined)
      buffer = this.bgmBuffer;

    this.StopBackgroundMusic();
    //Create the new audio buffer and callbacks
    this.bgm = this.audioCtx.createBufferSource();

    this.bgm.buffer = buffer;
    this.bgm.loop = false;
    this.bgm.start( 0, 0 );
    this.bgm.connect( this.musicGain );

    this.bgm.onended = () => {
      this.bgm.currentTime = 0;
      if(AudioEngine.loopBGM){// && this.dialogBGM == null){
        this.bgmTimeout = global.setTimeout( () => {
          this.StartBackgroundMusic();
        }, this.GetBackgroundMusicLoopTime());
      }
    };
  }

  StopBackgroundMusic(){
    try{
      if (this.bgm != null) {
        this.bgm.onended = undefined;
        this.bgm.disconnect();
        this.bgm.stop(0);
        this.bgm = null;
      }
    }catch(e){}
  }

  GetBackgroundMusicLoopTime(){
    if(Game.module instanceof Module){
      return Game.module.area.audio.MusicDelay;
    }else{
      return 30000;
    }
  }

  SetAmbientSound ( data, loop = true, vol = 0.66 ) {

    this.audioCtx.decodeAudioData( data, ( buffer ) => {

      if (this.ambient != null) {
        this.ambient.disconnect();
        this.ambient.stop(0);
        this.ambient = null;
      }

      this.ambient = this.audioCtx.createBufferSource();

      this.ambient.buffer = buffer;
      this.ambient.loop = loop;
      this.ambient.start( 0, 0 );
      this.ambient.connect( this.sfxGain );

    });

  }

  stopBackgroundMusic(){
    try{
      this.bgm.stop()
      this.bgm.disconnect();
      this.bgm = null;
    }catch(e){
      console.error(e);
    }
  }

  stopAmbientSound(){
    try{
      this.ambient.stop()
      this.ambient.disconnect();
      this.ambient = null;
    }catch(e){
      console.error(e);
    }
  }

  GetAudioBuffer (data = null, onBuffered = null) {

    this.audioCtx.decodeAudioData(data, (buffer) => {
      if(onBuffered != null)
        onBuffered(buffer);
    });

  }

  Destroy(){

    //Clear the BGM repeat timeout just incase it is active
    global.clearTimeout(this.bgmTimeout);

    for(let i = 0; i < this.emitters.length; i++)
      this.emitters[i].Destroy();

    this.emitters = [];

    this.stopAmbientSound();
    this.stopBackgroundMusic();

    this.audioCtx.close();
  }

  Reset(){
    
    //Clear the BGM repeat timeout just incase it is active
    global.clearTimeout(this.bgmTimeout);

    for(let i = 0; i < this.emitters.length; i++)
      this.emitters[i].Destroy();

    this.emitters = [];

    this.stopAmbientSound();
    this.stopBackgroundMusic();

  }

  static ToggleMute(){
    if(AudioEngine.isMuted)
      AudioEngine.Unmute();
    else
      AudioEngine.Mute();
  }

  static Mute() {
    AudioEngine.isMuted = true;
    AudioEngine._gainSfxVol = AudioEngine.GAIN_SFX;
    AudioEngine._gainMusicVol = AudioEngine.GAIN_MUSIC;
    AudioEngine._gainVoVol = AudioEngine.GAIN_VO;
    AudioEngine.GAIN_SFX = AudioEngine.GAIN_MUSIC = AudioEngine.GAIN_VO = 0;
  }

  static Unmute() {
    AudioEngine.isMuted = false;
    AudioEngine.GAIN_SFX = AudioEngine._gainSfxVol;
    AudioEngine.GAIN_MUSIC = AudioEngine._gainMusicVol;
    AudioEngine.GAIN_VO = AudioEngine._gainVoVol;
  }

  static get GAIN_MUSIC(){
    return AudioEngine._GAIN_MUSIC;
  }

  static get GAIN_VO(){
    return AudioEngine._GAIN_VO;
  }

  static get GAIN_SFX(){
    return AudioEngine._GAIN_SFX;
  }

  static get GAIN_MOVIE(){
    return AudioEngine._GAIN_MOVIE;
  }

  static set GAIN_MUSIC(value){
    AudioEngine._GAIN_MUSIC = value;
    //console.log('set gain music', this, AudioEngine);
    for(let i = 0; i < AudioEngine.engines.length; i++){
      AudioEngine.engines[i].musicGain.gain.value = AudioEngine._GAIN_MUSIC;
    }
  }

  static set GAIN_VO(value){
    AudioEngine._GAIN_VO = value;
    for(let i = 0; i < AudioEngine.engines.length; i++){
      AudioEngine.engines[i].voGain.gain.value = AudioEngine._GAIN_VO;
    }
  }

  static set GAIN_SFX(value){
    AudioEngine._GAIN_SFX = value;
    //console.log('set gain sfx', this, AudioEngine);
    for(let i = 0; i < AudioEngine.engines.length; i++){
      AudioEngine.engines[i].sfxGain.gain.value = AudioEngine._GAIN_SFX;
    }
  }

  static set GAIN_MOVIE(value){
    AudioEngine._GAIN_MOVIE = value;
  }

}

AudioEngine.AudioCtx = (global.AudioContext || global.webkitAudioContext);

AudioEngine.engines = [];

AudioEngine._GAIN_MUSIC = 0.25;
AudioEngine._GAIN_VO = 0.5;
AudioEngine._GAIN_SFX = 0.17;
AudioEngine._GAIN_MOVIE = 0.17;

AudioEngine.loopBGM = true;

AudioEngine.isMuted = false;

AudioEngine.CHANNEL = {
  SFX: 0,
  VO: 1,
  MUSIC: 2
}

//AudioEngine.ToggleMute();

module.exports = AudioEngine;
