/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ipcRenderer } from "electron";
import * as fs from "fs";
import * as path from "path";

/* @file
 * The VideoPlayer class. I converted all the BINK videos into MP4's so I could test loading them in.
 * Going to have to write an actual BINK decoder at some point
 */

export class VideoPlayer {
  static CurrentSession: VideoPlayerSession;
  static Sessions: VideoPlayerSession[] = [];

  static Load(name = '', onEnded?: Function){
    if(typeof name == 'string' && name.length){
      let mp4 = path.join(ApplicationProfile.directory, 'Movies', name+'.mp4');
      let bik = path.join(ApplicationProfile.directory, 'Movies', name+'.bik');

      let hasMP4 = false;//fs.existsSync(mp4);
      let hasBIK = fs.existsSync(bik);
      let playerSession;

      // console.log(name, hasMP4, hasBIK);

      if(hasMP4){
        ipcRenderer.send('movie', {
          action: 'play',
          movie: name,
          file: mp4
        });
        playerSession = new VideoPlayerSession( bik, name, onEnded );
      }else if(hasBIK){
        ipcRenderer.send('movie', {
          action: 'play',
          movie: name,
          file: bik
        });
        playerSession = new VideoPlayerSession( bik, name, onEnded );
      }else{
        // console.log('no video');
        if(typeof onEnded === 'function')
          onEnded();
        return;
      }

      VideoPlayer.CurrentSession = playerSession;
      VideoPlayer.Sessions.push(playerSession);
    }else{
      if(typeof onEnded === 'function'){
        onEnded();
      }
    }

  }

}

VideoPlayer.CurrentSession = undefined;
VideoPlayer.Sessions = [];

class VideoPlayerSession {

  src: string = '';
  movie: string = '';
  onEnded: Function;
  hasEnded = false;
  player: any = null;
  $video: any;
  duration: any;

  constructor(src: string, movie: string, onEnded?: Function){
    this.src = src;
    this.movie = movie;
    this.onEnded = onEnded;
    let self = this;

    this.$video = $('<video />');

    this.$video[0].onended = function(){
      self.destroy();
    };

    this.$video[0].onerror = this.$video[0].onended;

    this.$video.on('click', function(e: any){
      self.stop();
    });

    this.$video.css({
      'position': 'absolute',
      'top': 0,
      'left': 0,
      'width': '100%',
      'height': '100%',
      'background': 'black'
    });

    $('body').append(this.$video);

    // this.$video.attr('src', src);
    // this.$video.currentTime = 0;
  }

  attachNative(params: any){
    this.$video.attr('src', params.videoSource);
    this.$video[0].play();
  }

  attachStream(params: any = {}){
    this.duration = params.duration;
    this.$video.attr('src', params.videoSource);
    this.$video[0].play();
  }

  play(){
    this.$video[0].play();
    this.$video.show();
  }

  pause(){
    this.$video[0].pause();
  }

  stop(){
    try{
      this.destroy();
    }catch(e){ console.error(e) }
    let idx = VideoPlayer.Sessions.indexOf(this);
    if(idx >= 0){
      VideoPlayer.Sessions.splice(idx, 1);
    }
  }

  destroy(){
    // console.log('destroy');
    if(!this.hasEnded){
      this.hasEnded = true;
      try{
        this.$video[0].pause();
      }catch(e){ }
      this.$video.attr('src', '');
      try{
        this.$video.remove();
      }catch(e){ console.error(e) }
      if(typeof this.onEnded === 'function')
        this.onEnded();
    }
  }

}


ipcRenderer.on('movie-ready', (event, response) => {

  // response.movie = path.parse(videoFilePath).name;
  // response.type = "stream";
  // response.videoSource = "http://127.0.0.1:8888?startTime=0";
  // response.duration = checkResult.duration

  let session = VideoPlayer.Sessions.find( s => s.movie == response.movie );
  if(session instanceof VideoPlayerSession){
    if (response.type === 'native') {
      session.attachNative(response);
    } else if (response.type === 'stream') {
      session.attachStream(response);
    }
  }else{
    //kill movie stream
    ipcRenderer.send('movie-kill-stream');
  }

});
ipcRenderer.on('movie-fail', (event, response) => {
  // console.log('movie-fail', response);
  let session = VideoPlayer.Sessions.find( s => s.movie == response.movie );
  if(session instanceof VideoPlayerSession){
    session.stop();
  }else{
    //kill movie stream
    //ipcRenderer.send('movie-kill-stream');
  }
});
