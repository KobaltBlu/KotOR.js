import * as THREE from "three";
import { AudioEngine } from "../audio/AudioEngine";

/**
 * BIKObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file BIKObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BIKObject {
  abs_path: any;
  frames: any[];
  frameIndex: number;
  width: number;
  height: number;
  fps: number;
  yTex: any;
  uTex: any;
  vTex: any;
  min_buffer: number;
  max_buffer: number;
  geometry: any;
  material: any;
  videoPlane: any;
  backPlane: any;
  scene: any;
  audio_array: any[];
  audio_nodes: any[];
  frame_array: any[];
  file: string;
  audioCtx: any;
  onComplete: any;
  decode_complete: boolean;
  demuxer: any;
  video_decoder: any;
  hasAudio: boolean;
  audio_decoder: any;
  audio: { playback_rate: any; channels: any; };
  nextAudioTime: number;
  playbackPosition: number;
  timer: number;
  needsRenderUpdate: boolean;
  isPlaying: boolean;
  nextPacket: any;
  disposed: boolean;

  constructor(args: any = {}){

    args = Object.assign({
      abs_path: false
    }, args);

    this.abs_path = args.abs_path;

    this.frames = [];
    this.frameIndex = 0;

    this.width = 640;
    this.height = 480;
    this.fps = 29.97;

    this.yTex = undefined;
    this.uTex = undefined;
    this.vTex = undefined;

    this.min_buffer = 10;
    this.max_buffer = 20;

    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.material = new THREE.RawShaderMaterial({
      vertexShader: `
        precision highp float;
        uniform mat4 modelViewMatrix; // optional
        uniform mat4 projectionMatrix; // optional
        attribute vec3 position;
        attribute vec4 color;
        attribute vec2 uv;
        varying vec2 v_texCoord;
        varying mat3 trans;
        void main()	{
          v_texCoord = vec2(uv.x, 1.0 - uv.y);
          trans = mat3(
            1.0, 1.0, 1.0,
            0.0, -0.34414, 1.772,
            1.402, -0.71414, 0.0
          );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
        precision highp float;

        varying vec2 v_texCoord;
        uniform sampler2D yTex;
        uniform sampler2D uTex;
        uniform sampler2D vTex;

        //https://www.roxlu.com/2014/039/decoding-h264-and-yuv420p-playback

        void main() {
          vec3 R_cf = vec3(1.164383,  0.000000,  1.596027);
          vec3 G_cf = vec3(1.164383, -0.391762, -0.812968);
          vec3 B_cf = vec3(1.164383,  2.017232,  0.000000);
          vec3 offset = vec3(-0.0625, -0.5, -0.5);

          float y = texture2D(yTex, v_texCoord).r;
          float u = texture2D(uTex, v_texCoord).r;
          float v = texture2D(vTex, v_texCoord).r;
          vec3 yuv = vec3(y,u,v);
          yuv += offset;
          vec4 fragcolor = vec4(0.0, 0.0, 0.0, 1.0);
          fragcolor.r = dot(yuv, R_cf);
          fragcolor.g = dot(yuv, G_cf);
          fragcolor.b = dot(yuv, B_cf);
          gl_FragColor = fragcolor;
        }


      `,
      uniforms: {
        yTex: { value: this.yTex },
        uTex: { value: this.uTex },
        vTex: { value: this.vTex },
      }
    });

    this.videoPlane = new THREE.Mesh(this.geometry, this.material);
    this.videoPlane.position.z = 100;

    this.backPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );

    this.scene = new THREE.Scene();
    this.scene.add(this.backPlane);
    this.scene.add(this.videoPlane);
    
    this.videoPlane.position.z = 99;
    this.resize();

    this.audio_array = [];
    this.audio_nodes = [];
    this.frame_array = [];

  }

  resize(width?: number, height?: number){

    if(!width)
      width = window.innerWidth;

    if(!height)
      height = window.innerHeight;

    this.videoPlane.scale.x = this.width * (width / this.width);
    this.videoPlane.scale.y = this.height * (width / this.width);

    this.backPlane.scale.x = width;
    this.backPlane.scale.y = height;
  }

  initVideoTexture(){
    let yBuffer = new Uint8Array(this.width * this.height);
    let uBuffer = new Uint8Array(this.width/2 * this.height/2);
    let vBuffer = new Uint8Array(this.width/2 * this.height/2);

    uBuffer.fill(128);
    vBuffer.fill(128);

    if(this.yTex)
      this.yTex.dispose()

    if(this.uTex)
      this.uTex.dispose()

    if(this.vTex)
      this.vTex.dispose()

    this.yTex = new THREE.DataTexture(yBuffer, this.width, this.height, THREE.LuminanceFormat, THREE.UnsignedByteType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);
    this.uTex = new THREE.DataTexture(uBuffer, this.width/2, this.height/2, THREE.LuminanceFormat, THREE.UnsignedByteType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);
    this.vTex = new THREE.DataTexture(vBuffer, this.width/2, this.height/2, THREE.LuminanceFormat, THREE.UnsignedByteType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);

    this.material.uniforms.yTex.value = this.yTex;
    this.material.uniforms.uTex.value = this.uTex;
    this.material.uniforms.vTex.value = this.vTex;

    this.yTex.needsUpdate = true;
    this.uTex.needsUpdate = true;
    this.vTex.needsUpdate = true;

    this.material.uniformsNeedsUpdate = true;
  }

  async play(file: string = '', onComplete?: Function) {
    return;
    // Beamcoder has been removed from the project.
    // I plan on writing a bink decoder at some point,
    // which will be more lightweight than the beamcoder library was.

    // this.file = file;

    // let _path = this.abs_path ? this.file : path.join('Movies', this.file);

    // this.audioCtx = AudioEngine.GetAudioEngine().audioCtx;
    // this.stop();
    // this.onComplete = onComplete;
    // AudioEngine.GetAudioEngine().voGain.disconnect(this.audioCtx.destination);
    // AudioEngine.GetAudioEngine().musicGain.disconnect(this.audioCtx.destination);
    // AudioEngine.GetAudioEngine().sfxGain.disconnect(this.audioCtx.destination);
    // this.frames = [];
    // this.decode_complete = false;
    // this.demuxer = await beamcoder.demuxer(_path); // Create a demuxer for a file
    // this.video_decoder = beamcoder.decoder({demuxer: this.demuxer, stream_index: 0 }); // Codec asserted. Can pass in demuxer.

    // if(this.demuxer.streams.length == 2){
    //   this.hasAudio = true;
    //   this.audio_decoder = beamcoder.decoder({demuxer: this.demuxer, stream_index: 1 }); // Codec asserted. Can pass in demuxer.
    //   this.audio = {
    //     playback_rate: this.audio_decoder.sample_rate,
    //     channels: this.audio_decoder.channels
    //   }
    // }

    // this.width = this.video_decoder.width;
    // this.height = this.video_decoder.height;
    // this.resize();
    // this.initVideoTexture();

    // this.audio_array = [];
    // this.audio_nodes = [];
    // this.frame_array = [];

    // this.nextAudioTime = 0;
    // this.playbackPosition = 0;
    // this.timer = 0;
    // this.needsRenderUpdate = false;

    // await this.fetchNextPackets();

    // this.isPlaying = true;
    // //this.decode();

  }

  stop(){
    this.isPlaying = false;
    this.timer = 0;
    // global.clearTimeout(this.timeout);

    //clean up audio nodes
    while(this.audio_nodes.length){
      let node = this.audio_nodes.shift();
      node.disconnect();
      node.buffer = undefined;
      node = undefined;
    }

    AudioEngine.GetAudioEngine().voGain.connect(this.audioCtx.destination);
    AudioEngine.GetAudioEngine().musicGain.connect(this.audioCtx.destination);
    AudioEngine.GetAudioEngine().sfxGain.connect(this.audioCtx.destination);

    if(typeof this.onComplete === 'function')
      this.onComplete();

    this.initVideoTexture();

    this.onComplete = undefined;
  }

  async seek(time = 0){
    this.stop();
    await this.demuxer.seek({ time: time });
    this.audio_array = [];
    this.audio_nodes = [];
    this.frame_array = [];
    await this.fetchNextPackets();
    this.decode();
  }

  updateFrame(frame: any){
    if(frame){
      let ySize = frame.linesize[0] * this.height;
      let uSize = frame.linesize[1] * this.height/2;
      let vSize = frame.linesize[2] * this.height/2;

      this.yTex.image.data = new Uint8Array(frame.data[0]);
      this.uTex.image.data = new Uint8Array(frame.data[1]);
      this.vTex.image.data = new Uint8Array(frame.data[2]);

      this.yTex.image.width = frame.linesize[0];
      this.uTex.image.width = frame.linesize[1];
      this.vTex.image.width = frame.linesize[2];

      this.yTex.needsUpdate = true;
      this.uTex.needsUpdate = true;
      this.vTex.needsUpdate = true;

      this.material.uniformsNeedsUpdate = true;
    }
  }

  async getAllPackets(){
    while(!this.decode_complete){
      await this.decodeNextPacket();
    }
  }

  async decodeNextPacket(){

    if(this.decode_complete)
      return;

    this.nextPacket = await this.demuxer.read(); // Read next frame. Note: returns null for EOF
    if (this.nextPacket && this.nextPacket.stream_index == 0) {
      //VIDEO_FRAME
      let frames = await this.video_decoder.decode(this.nextPacket);
      if(frames.frames.length){
        for(let i = 0, len = frames.frames.length; i < len; i++){
          this.frame_array.push(frames.frames[i]);
        }
      }
    }else if (this.nextPacket && this.nextPacket.stream_index == 1) {
      //AUDIO
      let frames = await this.audio_decoder.decode(this.nextPacket);
      if(frames.frames.length){
        let frameLength = frames.frames[0].data[0].length/4;
        let buffer = this.audioCtx.createBuffer(this.audio.channels, frames.frames.length * frameLength, this.audio.playback_rate);

        for(let i = 0, len = frames.frames.length; i < len; i++){
          for(let channel = 0; channel < this.audio.channels; channel++){
            buffer.copyToChannel(
              this.toFloat32Array(frames.frames[i].data[channel]),
              channel,
              i * frameLength
            );
          }
        }

        // let sampleNode = this.audioCtx.createBufferSource();
        // sampleNode.buffer = buffer;
        // sampleNode.loop = false;
        // sampleNode.connect( AudioEngine.GetAudioEngine().movieGain );
        // sampleNode.onended = function(){
        //   sampleNode.buffer = undefined;
        //   sampleNode.disconnect();
        // };

        this.audio_array.push(buffer);
        //this.audio_nodes.push(sampleNode);

      }
    }else{
      console.log('nextPacket', this.nextPacket);
      this.decode_complete = true;
    }
  }

  async fetchNextPackets(){
    if(this.frame_array.length < this.min_buffer){
      let count = this.max_buffer - this.frame_array.length;
      for(let i = 0; i < count; i++){
        await this.decodeNextPacket();
        if(this.demuxer.streams.length == 2)
          await this.decodeNextPacket();
      }
    }
  }

  async update(delta = 0){
    this.playbackPosition += delta;
    let frameTimer = (this.fps/1000);
    
    //Process audio buffer queue
    this.processAudioQueue();

    if( this.timer >= frameTimer){
      this.timer = 0;
      await this.decode();
    }else{
      this.needsRenderUpdate = false;
    }
    this.timer += delta;
  }

  processAudioQueue(){
    //Process audio buffer queue
    if(this.audio_array.length){

      let buffered = this.audio_array.shift();;

      while(this.audio_array.length){
        let nextBuffer = this.audio_array.shift();
        buffered = this.appendBuffer(buffered, nextBuffer);

        //let current_time = this.audioCtx.currentTime;
        //let sampleNode = this.audio_array.shift();

        // if(!this.nextAudioTime)
        //   this.nextAudioTime = current_time;

        // sampleNode.start( this.nextAudioTime, 0 );
        // this.nextAudioTime = this.nextAudioTime + sampleNode.buffer.duration;
      }

      let bufferedNode = this.audioCtx.createBufferSource();
      bufferedNode.buffer = buffered;
      bufferedNode.loop = false;
      bufferedNode.connect( AudioEngine.GetAudioEngine().movieGain );
      bufferedNode.onended = function(){
        bufferedNode.buffer = undefined;
        bufferedNode.disconnect();
      };

      let current_time = this.audioCtx.currentTime;
      if(!this.nextAudioTime)
        this.nextAudioTime = current_time;

      bufferedNode.start( this.nextAudioTime, 0 );
      this.nextAudioTime = this.nextAudioTime + bufferedNode.buffer.duration;
    }
  }

  //https://stackoverflow.com/questions/14143652/web-audio-api-append-concatenate-different-audiobuffers-and-play-them-as-one-son
  appendBuffer(buffer1: any, buffer2: any) {
    let numberOfChannels = Math.min( buffer1.numberOfChannels, buffer2.numberOfChannels );
    let tmp = this.audioCtx.createBuffer( numberOfChannels, (buffer1.length + buffer2.length), buffer1.sampleRate );
    for (let i=0; i<numberOfChannels; i++) {
      let channel = tmp.getChannelData(i);
      channel.set( buffer1.getChannelData(i), 0);
      channel.set( buffer2.getChannelData(i), buffer1.length);
    }
    return tmp;
  }

  async decode(){
    this.isPlaying = true;
    if(this.frame_array.length || this.audio_array.length){
      //Process next video frame in the queue
      this.updateFrame(this.frame_array.shift());
      await this.fetchNextPackets();
      this.needsRenderUpdate = true;
    }else{
      this.stop();
    }
  }

  toFloat32Array(channel: Uint8Array){
    if(channel instanceof Uint8Array){
      let i, l = channel.length/4;
      let buffer = new Buffer(channel);
      let float32 = new Float32Array(l);

      for(i = 0; i < l; i++){
        float32[i] = buffer.readFloatLE(i*4);
      }
      return float32;
    }
    throw 'toFloat32Array missing Uint8Array';
  }


  dispose(){

    this.disposed = true;

    this.scene.remove(this.videoPlane);
    this.scene.remove(this.backPlane);
    this.geometry.dispose();
    this.material.dispose();
    this.yTex.dispose();
    this.uTex.dispose();
    this.vTex.dispose();

    this.scene = undefined;
    this.geometry = undefined;
    this.material = undefined;
    this.yTex = undefined;
    this.uTex = undefined;
    this.vTex = undefined;

    //clean up audio nodes
    while(this.audio_nodes.length){
      let node = this.audio_nodes.shift();
      node.disconnect();
      node.buffer = undefined;
      node = undefined;
    }

    this.audio_array = [];
    this.frame_array = [];

  }

}
