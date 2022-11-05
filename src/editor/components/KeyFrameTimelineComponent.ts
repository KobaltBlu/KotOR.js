import { ModelViewerTab } from "../tabs";
import { Component } from ".";

export class KeyFrameTimelineComponent extends Component {
  declare tab: ModelViewerTab;
  keyframes: any[] = [];
  selected: any;

  $ui_controls: JQuery<HTMLElement>;
  $ui_bar: JQuery<HTMLElement>;
  $btn_key_left: JQuery<HTMLElement>;
  $btn_key_right: JQuery<HTMLElement>;
  $btn_play: JQuery<HTMLElement>;
  $btn_stop: JQuery<HTMLElement>;
  $btn_key_add: JQuery<HTMLElement>;
  $btn_key_delete: JQuery<HTMLElement>;
  $btn_timeline_zoom_in: JQuery<HTMLElement>;
  $btn_timeline_zoom_out: JQuery<HTMLElement>;
  $ui_bar_seek: JQuery<HTMLElement>;
  $ui_bar_keyframe_time: JQuery<HTMLElement>;
  $ui_bar_keyframes: JQuery<HTMLElement>;
  $ui_canvas: JQuery<HTMLElement>;

  audio_buffer: AudioBuffer;

  timeline_zoom: any;
  seeking: boolean;
  playing: any;
  mim_timeline_zoom: any;
  max_timeline_zoom: any;
  dragging_frame: any;
  selected_frame: any;

  elapsed: number = 0;
  max_time: number = 1;

  eventListeners: any = {
    onPlay: [],
    onPause: [],
    onStop: [],
    onKeyframeSelected: [],
    onNextKeyframe: [],
    onPreviousKeyframe: [],
    onDeleteKeyframe: [],
    onAddKeyframe: [],
    onSeekPrevious: [],
    onSeekNext: [],
    onTimelineZoomIn: [],
    onTimelineZoomOut: [],
  };

  constructor(tab: ModelViewerTab){
    super();
    this.tab = tab;

    this.$ui_controls = $('<div class="keyframe-controls" />');
    this.$ui_bar = $('<div class="keyframe-bar">');
    this.$ui_canvas = $('<canvas style="position: absolute; bottom: 0;"/>');

    this.$btn_key_left = $('<a href="#" title="Previous Keyframe" class="glyphicon glyphicon-chevron-left" style="text-decoration: none;"></a>');
    this.$btn_key_right = $('<a href="#" title="Next Keyframe" class="glyphicon glyphicon-chevron-right" style="text-decoration: none;"></a>');
    this.$btn_play = $('<a href="#" title="Play/Pause" class="glyphicon glyphicon-play" style="text-decoration: none;"></a>');
    this.$btn_stop = $('<a href="#" title="Stop" class="glyphicon glyphicon-stop" style="text-decoration: none;"></a>');

    this.$btn_key_add = $('<a href="#" title="Add Keyframe" class="glyphicon glyphicon-plus" style="text-decoration: none;"></a>');
    this.$btn_key_delete = $('<a href="#" title="Delete Keyframe" class="glyphicon glyphicon-trash" style="text-decoration: none;"></a>');
    
    this.$btn_timeline_zoom_in = $('<a href="#" title="Timeline Zoom In" class="glyphicon glyphicon-zoom-in" style="text-decoration: none; float:right;"></a>');
    this.$btn_timeline_zoom_out = $('<a href="#" title="Timeline Zoom Out" class="glyphicon glyphicon-zoom-out" style="text-decoration: none; float:right;"></a>');
    
    this.$component.append(this.$ui_controls);
    this.$component.append(this.$ui_bar);
    this.$ui_bar.append(this.$ui_canvas);

    this.$component.css({
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    });

    this.$ui_controls.css({
      position: 'initial',
      top: 'initial',
      bottom: 'initial',
      left: 'initial',
      right: 'initial',
    });

    this.$ui_bar.css({
      position: 'initial',
      top: 'initial',
      bottom: 'initial',
      left: 'initial',
      right: 'initial',
      height: '100%',
    })

    this.buildUI();
  }

  buildUI(){
    this.$ui_controls.html('');
    this.$ui_bar.append(this.$ui_canvas);

    this.$btn_play.on('click', (e: any) => {
      e.preventDefault();
      this.btnPlayPause();
    });

    this.$btn_stop.on('click', (e: any) => {
      e.preventDefault();
      this.btnStop();
    });

    this.$ui_controls.append(this.$btn_key_delete)
    .append(this.$btn_key_left).append(this.$btn_play).append(this.$btn_stop)
    .append(this.$btn_key_right).append(this.$btn_key_add).append(this.$btn_timeline_zoom_in).append(this.$btn_timeline_zoom_out);

    this.$btn_timeline_zoom_in.on('click', (e: any) => {
      e.preventDefault();
      this.TimeLineZoomIn();
    });

    this.$btn_timeline_zoom_out.on('click', (e: any) => {
      e.preventDefault();
      this.TimeLineZoomOut();
    });


    
    this.$ui_bar_seek = $('<div class="keyframe-track-seeker"><div class="seeker-thumb"></div></div>');
    this.$ui_bar_keyframe_time = $('<div class="keyframe-time-track" />');
    this.$ui_bar_keyframes = $('<div class="keyframe-track" />');

    this.$ui_bar_keyframe_time.css({
      width: 100,//this.max_time * this.timeline_zoom + 50,
    });

    this.$ui_bar_keyframes.css({
      width: 100,//this.max_time * this.timeline_zoom + 50,
    });

    this.$ui_bar.append(this.$ui_bar_keyframe_time).append(this.$ui_bar_keyframes).append(this.$ui_bar_seek);

    this.$ui_bar_keyframe_time.on('click', (e: any) => {

      if(e.target == this.$ui_bar_seek[0])
        return;

      let was_playing = this.playing;

      // this.Pause();

      //Update the lips elapsed time based on the seekbar position
      let offset = this.$ui_bar.offset();
      if(offset && this.$ui_bar){
        let position = e.pageX - offset.left + (this.$ui_bar.scrollLeft() as any);

        // let percentage = position / (this.max_time * this.timeline_zoom);
        // if(this.lip instanceof LIPObject){
        //   this.elapsed = this.max_time * percentage;
        // }
      }

      // if(was_playing)
      //   this.Play();

      console.log(e);
    });

    $('.seeker-thumb', this.$ui_bar_seek).on('mousedown', (e: any) => {

      // this.Pause();
      this.$ui_bar_seek.removeClass('targeted').addClass('targeted');
      this.seeking = true;

    });

    this.$btn_key_left.on('click', (e: any) => {
      e.preventDefault();
      this.btnPreviousKeyFrame();
    });

    this.$btn_key_right.on('click', (e: any) => {
      e.preventDefault();
      this.btnNextKeyFrame();
    });

    this.$btn_key_add.on('click', (e: any) => {
      e.preventDefault();
      this.btnAddKeyFrame();
    });

    this.$btn_key_delete.on('click', (e: any) => {
      e.preventDefault();
      this.btnDeleteKeyFrame();
    });



  }

  btnPlayPause(){
    console.log('$btn_play', this.playing);
    if(this.playing){
      this.processEventListener('onPause');
      // this.Pause();
    }else{
      this.processEventListener('onPlay');
      // this.Play();
    }
  }

  btnStop(){
    // this.Stop();
    this.processEventListener('onStop');
  }

  btnPreviousKeyFrame(){
    let index = this.keyframes.indexOf(this.selected_frame);
    if(index > 0){
      index--;
    }

    if(index < 0){
      index = 0;
    }

    this.selected_frame = this.keyframes[index];

    this.processEventListener('onPreviousKeyframe', this.selected_frame);
    // if(this.lip instanceof LIPObject){
    //   this.UpdateKeyframeOptions();
    // }

  }

  btnNextKeyFrame(){
    if(Array.isArray(this.keyframes)){
      let index = this.keyframes.indexOf(this.selected_frame);
      if(index < this.keyframes.length-1){
        index++;
      }

      if(index > this.keyframes.length){
        index = this.keyframes.length-1;
      }

      this.selected_frame = this.keyframes[index];

      this.processEventListener('onNextKeyframe', this.selected_frame);
      // this.UpdateKeyframeOptions();
    }
  }

  btnAddKeyFrame(){
    let keyframe = {
      time: this.elapsed,
      shape: 6
    };
    this.keyframes.push(keyframe);
    this.buildKeyframes();
    this.selected_frame = keyframe;

    this.processEventListener('onAddKeyframe', this.selected_frame);
    // if(this.lip instanceof LIPObject){
    //   this.lip.reIndexKeyframes();
    //   this.UpdateKeyframeOptions();
    // }
  }

  btnDeleteKeyFrame(){
    let result = confirm("Are you sure you want to delete this keyframe?");
    if(result){
      if(this.selected_frame){
        let index = this.keyframes.indexOf(this.selected_frame);
        if(index >= 0){
          let deleted = this.keyframes[index];
          this.keyframes.splice(index, 1)

          if(index > this.keyframes.length){
            index = this.keyframes.length - 1;
          }

          if(index < 0){
            index = 0;
          }

          this.selected_frame = this.keyframes[index];

          this.buildKeyframes();

          this.processEventListener('onDeleteKeyframe', deleted);
          // if(this.lip instanceof LIPObject){
          //   this.lip.reIndexKeyframes();
          //   this.UpdateKeyframeOptions();
          // }
        }
      }
    }
  }

  btnSeekPrevious(){
    // this.Pause();
    // if(this.lip instanceof LIPObject){
    //   this.elapsed -= 0.01;
    //   if(this.elapsed < 0) this.elapsed = 0;
    // }
    
    this.$btn_play.removeClass('glyphicon-pause').removeClass('glyphicon-play').addClass('glyphicon-play');
    this.processEventListener('onSeekPrevious');
  }

  btnSeekNext(){
    // this.Pause();
    // if(this.lip instanceof LIPObject){
    //   this.elapsed += 0.01;
    //   if(this.elapsed > this.max_time) this.elapsed = this.max_time;
    // }
    
    // this.SeekAudio(this.elapsed);
    // this.$btn_play.removeClass('glyphicon-pause').removeClass('glyphicon-play').addClass('glyphicon-play');
    
    // this.updateLip(0);
    this.processEventListener('onSeekNext');
  }

  TimeLineZoomIn(){
    this.timeline_zoom += 25;

    if(this.timeline_zoom > this.max_timeline_zoom){
      this.timeline_zoom = this.max_timeline_zoom;
    }
    
    this.ResetTimeLineAfterZoom();
    this.processEventListener('onTimelineZoomIn');
  }

  TimeLineZoomOut(){
    this.timeline_zoom -= 25;

    if(this.timeline_zoom < this.mim_timeline_zoom){
      this.timeline_zoom = this.mim_timeline_zoom;
    }
    
    this.ResetTimeLineAfterZoom();
    this.processEventListener('onTimelineZoomOut');
  }

  ResetTimeLineAfterZoom(){
    this.$ui_bar_keyframe_time.css({
      width: this.max_time * this.timeline_zoom + 50
    });

    this.$ui_bar_keyframes.css({
      width: this.max_time * this.timeline_zoom + 50
    });

    this.buildKeyframes();

    // if(this.lip instanceof LIPObject){
    //   this.UpdateKeyframeOptions();
    // }
    
    this.drawWaveform();

    //Try to keep the seekbar in focus after zoom
    let centerOffset = ((this.$ui_bar.width() as any/2) - this.elapsed * this.timeline_zoom)*-1;
    this.$ui_bar.scrollLeft(centerOffset);

  }

  buildKeyframes(){
    this.$ui_bar_keyframes.html('');
    this.$ui_bar_keyframe_time.html('');
    if(Array.isArray(this.keyframes)){
      for(let i = 0, il = this.keyframes.length; i < il; i++){
        let keyframe = this.keyframes[i];
        this.buildKeyframe(keyframe, i);
      }
    }

    //Build timeline second markers
    let factor = 10;

    if(this.timeline_zoom < 250){
      factor = 30;
    }

    if(this.timeline_zoom <= 150){
      factor = 60;
    }

    let nthTime = factor/60;
    let count = Math.ceil(Math.ceil(this.max_time) / nthTime);

    for(let i = 0; i < count; i++){
      let $lbl_timestamp = $('<span></span>');
      let s = factor*i;
      $lbl_timestamp.text((s-(s%=60))/60+(9<s?':':':0')+s);
      $lbl_timestamp.css({
        position: 'absolute',
        left: (nthTime * i) * this.timeline_zoom,
        width: 30,
        marginLeft: -15,
        textAlign: 'center'
      });
      this.$ui_bar_keyframe_time.append($lbl_timestamp);
    }


  }

  buildKeyframe(keyframe: any, index: any){
    
    let $keyframe = $('<div class="keyframe" />');
    keyframe.$ele = $keyframe;

    $keyframe.css({
      left: keyframe.time * this.timeline_zoom //(keyframe.time / this.max_time) * 100 +'%',
    });

    this.$ui_bar_keyframes.append($keyframe);

    $keyframe.on('click', (e: any) => {
      e.stopPropagation();
      this.processEventListener('onKeyframeSelected', keyframe);
      // this.elapsed = keyframe.time;
      // this.selected_frame = keyframe;
      // this.Pause();
      // this.UpdateKeyframeOptions();
    });

    $keyframe.on('mousedown', (e: any) => {
      $keyframe.removeClass('targeted').addClass('targeted');
      this.dragging_frame = keyframe;
    });

  }
  

  drawWaveform(){
    if(this.audio_buffer){
      let canvas: HTMLCanvasElement = this.$ui_canvas[0] as HTMLCanvasElement;
      let ctx = canvas.getContext('2d');
      if(ctx){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if(this.audio_buffer instanceof AudioBuffer){

          let samples = this.audio_buffer.getChannelData(0);
          let i, len = samples.length;

          canvas.height = 38;
          canvas.width = this.audio_buffer.duration * this.timeline_zoom;

          let width = canvas.width, height = canvas.height;
          ctx.strokeStyle = '#5bc0de';
          ctx.fillStyle = 'rgba(0, 0, 0, 0)';
          ctx.fillRect(0, 0, width, height);
          ctx.beginPath();
          ctx.moveTo(0,height/2);
          for (i = 0; i < len; i++) {
            let x = ((i*width) / len);
            let y = ((samples[i]*height/2)+height/2);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.closePath();

        }
      }
    }
        
  }

  setElapsed(elapsed: number = 0){
    this.$ui_bar_seek.css({
      left: elapsed * this.timeline_zoom//(this.elapsed / this.max_time) * 100 + '%'
    });
  }

  addEventListener(key: string = '', cb?: Function){
    if(typeof cb === 'function'){
      if(this.eventListeners.hasOwnProperty('key')){
        let ev = this.eventListeners[key];
        if(Array.isArray(ev)){
          let exists = ev.indexOf(cb) >= 0 ? true : false;
          if(!exists){
            ev.push(cb);
          }
        }
      }
    }
  }

  removeEventListener(key: string = '', cb?: Function){
    if(typeof cb === 'function'){
      if(this.eventListeners.hasOwnProperty('key')){
        let ev = this.eventListeners[key];
        if(Array.isArray(ev)){
          let index = ev.indexOf(cb);
          if(index >= 0){
            ev.splice(index, 1);
          }
        }
      }
    }
  }

  processEventListener(key: string = '', data: any = {}){
    if(this.eventListeners.hasOwnProperty('key')){
      let ev = this.eventListeners[key];
      if(Array.isArray(ev)){
        for(let i = 0, len = ev.length; i < len; i++){
          let event = ev[i];
          if(typeof event === 'function'){
            event(data);
          }
        }
      }
    }
  }

}