/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AudioEmitter class is used in conjunction with AudioEngine class manage global and positional audio emitters in the game.
 */

class AudioEmitter {

  constructor (options = {}) {
    this.isDestroyed = false;
    //this.options = options;

    this.pos = {x: 0, y: 0, z: 0};

    this.options = Object.assign({
      engine: AudioEngine,
      channel: AudioEngine.CHANNEL.SFX,
      template: {
        sounds: [],
        isActive: false,
        isLooping: false,
        isRandom: false,
        isRandomPosition: false,
        interval: 0,
        intervalVariation: 0,
        maxDistance: 1,
        volume: 1
      }
    }, options)


    this.engine = this.options.engine;
    this.currentSound = null;
    this.buffers = {};
    this.gainNode = this.engine.audioCtx.createGain();
    this.pannerNode = this.engine.audioCtx.createPanner();
    this.currentTimeout = null;


    this.sounds = this.options.template.sounds;
    this.isActive = this.options.template.isActive;
    this.isLooping = this.options.template.isLooping;
    this.isRandom = this.options.template.isRandom;
    this.isRandomPosition = this.options.template.isRandomPosition;

    this.interval = this.options.template.interval;
    this.intervalVariation = this.options.template.intervalVariation;

    this.maxDistance = this.options.template.maxDistance;

    this.volume = this.options.template.volume;

    this.gainNode.gain.value = (Math.PI/2) * ( ( ( this.volume * 100 ) / 127 ) * 0.01 );

    //console.log('GainValue', this.gainNode.gain.value);

    if(this.options.template.positional == 1)
      options.Type = AudioEmitter.Type.POSITIONAL;
    else
      options.Type = AudioEmitter.Type.GLOBAL;

    this.index = 0;

    this.mainNode = null;

    switch(options.Type){
      case AudioEmitter.Type.POSITIONAL:
        this.mainNode = this.engine.audioCtx.createPanner();
        this.SetPosition( this.options.props.position.x, this.options.props.position.y, this.options.props.position.z );
        //this.mainNode.setOrientation( this.options.props.rotation.x, this.options.props.rotation.y, this.options.props.rotation.z, 0, 0, 1);
        this.mainNode.maxDistance = this.maxDistance;

        this.mainNode.connect(this.gainNode);
      break;
      case AudioEmitter.Type.GLOBAL:
        this.mainNode = this.gainNode;
      break;
    }

    //console.log(this.sounds);

    let soundIndex = 0;
    let loadSounds = () => {

      if(soundIndex < this.sounds.length){

        let snd = this.sounds[soundIndex];
        //console.log('AudioEmitter', 'Sound', snd, this.sounds[soundIndex]);
        AudioLoader.LoadSound(snd, (data) => {
          //console.log('AudioEmitter', 'Sound Loaded', snd, data);

          this.AddSound({
            data: data,
            name: snd,
            onLoad: () => {
              soundIndex++;
              loadSounds();
            },
            onError: () => {
              //console.log(data);
              console.error('AudioEmitter', 'Sound not added to emitter', snd);
              soundIndex++;
              loadSounds(); //Even though the sound was not added to the emitter
            }
          });

        }, (e) => {
          console.error('AudioEmitter', 'Sound not found', snd);
          soundIndex++;
          loadSounds(); //Even though the sound was not loaded
        });


      }else{
        if(this.isActive)
          this.Begin();

        if(options.onLoad != null)
          options.onLoad();
      }

    };
    loadSounds();

    //console.log('gain', this.gainNode, 'engine', this.engine);

    switch(this.options.channel){
      case AudioEngine.CHANNEL.VO:
        this.gainNode.connect(this.engine.voGain);
      break;
      default:
        this.gainNode.connect(this.engine.sfxGain);
      break;
    }

    

  }

  PlaySound(name ='', onLoad = null, onEnd = null){

    if(this.currentSound != null){
      try{
        this.currentSound.disconnect();
        this.currentSound.stop(0);
        this.currentSound = null;
      }catch(e) { console.error('Failed to disconnect sound', e); this.currentSound = null; }
    }
    
    if(typeof this.buffers[name] == 'undefined'){
      AudioLoader.LoadSound(name, (data) => {
        //console.log('AudioEmitter', 'Sound Loaded', name, data);

        this.AddSound({
          data: data,
          name: name,
          onLoad: () => {
            this.currentSound = this.engine.audioCtx.createBufferSource();
            this.currentSound.buffer = this.buffers[name];
            this.currentSound.buffer.onEnd = onEnd;
            this.currentSound.name = name;
            this.currentSound.connect(this.mainNode);
            this.currentSound.onended = () => {
              //console.log('end', this, this.currentSound);
              try{
                if(onEnd === 'function')
                  onEnd();
              }catch(e){

              }
            };

            if(typeof onLoad === 'function')
              onLoad(this.currentSound);
              
            this.currentSound.start(0, 0);

          },
          onError: () => {
            //console.log(data);
            console.error('AudioEmitter', 'Sound not added to emitter', name);
            if(typeof onEnd === 'function')
              onEnd(true);
          }
        });

      }, (e) => {
        console.error('AudioEmitter', 'Sound not found', name);
        if(typeof onEnd === 'function')
          onEnd(true);
      });
    }else{
      this.currentSound = this.engine.audioCtx.createBufferSource();
      this.currentSound.buffer = this.buffers[name];
      this.currentSound.name = name;
      this.currentSound.connect(this.mainNode);
      
      if(typeof onLoad === 'function')
        onLoad(this.currentSound);
        
      this.currentSound.start(0, 0);
    }
  }

  PlayStreamWave(name ='', onLoad = null, onEnd = null){

    if(this.currentSound != null){
      try{
        this.currentSound.disconnect();
        this.currentSound.stop(0);
        this.currentSound = null;
      }catch(e) { console.error('Failed to disconnect sound', e); this.currentSound = null; }
    }

    if(typeof this.buffers[name] == 'undefined'){
      AudioLoader.LoadStreamWave(name, (data) => {
        //console.log('AudioEmitter', 'Sound Loaded', name, data);

        this.AddSound({
          data: data,
          name: name,
          onLoad: () => {
            this.currentSound = this.engine.audioCtx.createBufferSource();
            this.currentSound.buffer = this.buffers[name];
            this.currentSound.buffer.onEnd = onEnd;
            this.currentSound.name = name;
            this.currentSound.start(0, 0);
            this.currentSound.connect(this.mainNode);

            this.currentSound.onended = () => {
              try{
                if(typeof onEnd === 'function')
                  onEnd();
              }catch(e){

              }
            };

          },
          onError: () => {
            //console.log(data);
            console.error('AudioEmitter', 'Sound not added to emitter', name);
            if(typeof onEnd === 'function')
              onEnd(true);
          },
          onEnd: onEnd
        });

      }, (e) => {
        console.error('AudioEmitter', 'Sound not found', name);
        if(typeof onEnd === 'function')
          onEnd(true);
      });
    }else{
      this.currentSound = this.engine.audioCtx.createBufferSource();
      this.currentSound.buffer = this.buffers[name];
      this.currentSound.buffer.onEnd = onEnd;
      this.currentSound.name = name;
      this.currentSound.start(0, 0);
      this.currentSound.connect(this.mainNode);

      this.currentSound.onended = () => {
        if(typeof nEnd === 'function')
          onEnd();
      };
    }
  }

  SetPosition(x = 0, y = 0, z = 0){

    x = isNaN(x) ? this.pos.x : x;
    y = isNaN(y) ? this.pos.y : y;
    z = isNaN(z) ? this.pos.z : z;

    // We need to cache the values below because setPosition stores the floats in a higher precision than THREE.Vector3
    // which could keep them from matching when compared
    if(this.pos.x != x || this.pos.y != y || this.pos.z != z){
      this.pos.x = x;
      this.pos.y = y;
      this.pos.z = z;
      this.mainNode.setPosition( x, y, z );
    }
    
  }

  SetOrientation(x = 0, y = 0, z = 0){
    //this.mainNode.setPosition( x, y, z )
  }

  Begin () {
    if(this.sounds.length)
      this.PlayNextSound();
  }

  PlayNextSound () {
    if(this.isDestroyed)
      return;

    //console.log('AudioEmitter', 'PlayNextSound')
    if(this.currentSound != null){
      try{
        this.currentSound.disconnect();
        this.currentSound.stop(0);
        this.currentSound = null;
      }catch(e) { console.error('Failed to disconnect sound', e); this.currentSound = null; }
    }

    let sound = this.sounds[this.index];
    let delay = ( Math.floor( Math.random() * this.interval ) + this.intervalVariation ) ;
    //console.log('AudioEmitter', 'PlayNextSound', sound, delay)
    this.currentSound = this.engine.audioCtx.createBufferSource();
    this.currentSound.buffer = this.buffers[sound];
    this.currentSound.loop = (this.sounds.length == 1 && this.isLooping);
    this.currentSound.name = this.index;
    this.currentSound.start(0, 0);
    this.currentSound.connect(this.mainNode);

    this.currentSound.onended = () => {

      if(typeof this.currentSound.buffer.onEnd === 'function')
        this.currentSound.buffer.onEnd();
      
      if(!this.currentSound.loop){
        this.currentTimeout = global.setTimeout( () => {
          //console.log('AudioEmitter', 'PlayNextSound', 'Timeout')
          if(this.isRandom){
            this.index = Math.floor(Math.random() * this.sounds.length);
          }else{
            this.index++;
            if(this.index >= this.sounds.length)
              this.index = 0;
          }
          if(this.isActive)
            this.PlayNextSound();
        }, delay );
      }
    };

  }

  AddSound (options = {}) {

    options = $.extend({
      //Variables
      data: null,
      name: '',
      //Callbacks
      onLoad: null,
      onError: null,
      onEnd: null
    }, options);

    if(options.data != null){

      this.engine.audioCtx.decodeAudioData( options.data, ( buffer ) => {

        this.buffers[options.name] = buffer;
        this.buffers[options.name].onEnd = options.onEnd;

        if(options.onLoad != null)
          options.onLoad();

      }, (err) => {
        console.error('AudioEmitter.AddSound', 'decodeAudioData', err);
        if(options.onError != null)
          options.onError();
      });

    }else{
      console.error('AudioEmitter.AddSound', 'No audio data present');
      if(options.onError != null)
        options.onError();
    }

  }

  Stop(){
    if(this.isDestroyed)
      return;

    //console.log('AudioEmitter', 'PlayNextSound')
    if(this.currentSound != null){
      try{
        this.currentSound.disconnect();
        this.currentSound.stop(0);
        this.currentSound = null;
      }catch(e) { console.error('Failed to disconnect sound', e); this.currentSound = null; }
    }
  }

  Update () {



  }

  Destroy(){
    this.isDestroyed = true;
  }



}

AudioEmitter.Type = {
  GLOBAL: 0,      //Plays everywhere
  RANDOM: 1,      //Plays from a random position
  POSITIONAL: 2,  //Plays from a specific position
};

module.exports = AudioEmitter;
