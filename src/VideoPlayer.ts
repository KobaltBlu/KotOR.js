import * as path from "path";
import { ApplicationProfile } from "./utility/ApplicationProfile";

/**
 * VideoPlayer class.
 * 
 * The VideoPlayer class. I converted all the BINK videos into MP4's so I could test loading them in.
 * Going to have to write an actual BINK decoder at some point
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file VideoPlayer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class VideoPlayer {
  static CurrentSession: VideoPlayerSession;
  static Sessions: VideoPlayerSession[] = [];

  static Load(name = ''){
    return new Promise<void>( (resolve, reject) => {
      if(typeof name == 'string' && name.length){
        resolve();
        return;
        let mp4 = path.join('Movies', name+'.mp4');
        let bik = path.join('Movies', name+'.bik');

        let hasMP4 = false;//fs.existsSync(mp4);
        let hasBIK = false;//fs.existsSync(bik);
        let playerSession;

        // console.log(name, hasMP4, hasBIK);

        // if(hasMP4){
        //   ipcRenderer.send('movie', {
        //     action: 'play',
        //     movie: name,
        //     file: mp4
        //   });
        //   playerSession = new VideoPlayerSession( bik, name, onEnded );
        // }else if(hasBIK){
        //   ipcRenderer.send('movie', {
        //     action: 'play',
        //     movie: name,
        //     file: bik
        //   });
        //   playerSession = new VideoPlayerSession( bik, name, onEnded );
        // }else{
        //   // console.log('no video');
        //   if(typeof onEnded === 'function')
        //     onEnded();
        //   return;
        // }

        VideoPlayer.CurrentSession = playerSession;
        VideoPlayer.Sessions.push(playerSession);
        resolve();
        return;
      }else{
        resolve();
        return;
      }
    })
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
  video: HTMLVideoElement;
  duration: any;

  constructor(src: string, movie: string, onEnded?: Function){
    this.src = src;
    this.movie = movie;
    this.onEnded = onEnded;
    let self = this;

    this.video = document.createElement('video');

    this.video.onended = function(){
      self.destroy();
    };

    this.video.onerror = this.video.onended;

    this.video.addEventListener('click', function(ev: MouseEvent){
      self.stop();
    })

    this.video.style.position = 'absolute';
    this.video.style.top = '0px';
    this.video.style.left = '0px';
    this.video.style.width = '100%';
    this.video.style.height = '100%';
    this.video.style.background = 'black';

    document.body.appendChild(this.video);

    // this.$video.attr('src', src);
    // this.$video.currentTime = 0;
  }

  attachNative(params: any){
    this.video.src = params.videoSource;
    this.video.play();
  }

  attachStream(params: any = {}){
    this.duration = params.duration;
    this.video.src = params.videoSource;
    this.video.play();
  }

  play(){
    this.video.play();
    // this.$video.show();
  }

  pause(){
    this.video.pause();
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
        this.video.pause();
      }catch(e){ }
      this.video.src = '';
      try{
        this.video.remove();
      }catch(e){ console.error(e) }
      if(typeof this.onEnded === 'function')
        this.onEnded();
    }
  }

}


// ipcRenderer.on('movie-ready', (event, response) => {

//   // response.movie = path.parse(videoFilePath).name;
//   // response.type = "stream";
//   // response.videoSource = "http://127.0.0.1:8888?startTime=0";
//   // response.duration = checkResult.duration

//   let session = VideoPlayer.Sessions.find( s => s.movie == response.movie );
//   if(session instanceof VideoPlayerSession){
//     if (response.type === 'native') {
//       session.attachNative(response);
//     } else if (response.type === 'stream') {
//       session.attachStream(response);
//     }
//   }else{
//     //kill movie stream
//     ipcRenderer.send('movie-kill-stream');
//   }

// });
// ipcRenderer.on('movie-fail', (event, response) => {
//   // console.log('movie-fail', response);
//   let session = VideoPlayer.Sessions.find( s => s.movie == response.movie );
//   if(session instanceof VideoPlayerSession){
//     session.stop();
//   }else{
//     //kill movie stream
//     //ipcRenderer.send('movie-kill-stream');
//   }
// });
