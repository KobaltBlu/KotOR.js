import { ModelViewerTab } from "../tabs";
import { Component } from ".";
import { OdysseyModelAnimation, OdysseyModelAnimationNode } from "../../odyssey";
import { OdysseyController } from "../../odyssey/controllers";
import { OdysseyControllerGeneric } from "../../interface/odyssey/controller/OdysseyControllerGeneric";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";

export class KeyFrameTimelineComponent extends Component {
  declare tab: ModelViewerTab;
  keyframes: any[] = [];
  selected: any;
  name: string = '';

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

  timelineOffset: number = 200;

  audio_buffer: AudioBuffer;

  timeline_zoom: number = 250;
  seeking: boolean;
  playing: boolean = false;
  min_timeline_zoom: any = 1000;
  max_timeline_zoom: any = 50;
  dragging_frame: any;
  selected_frame: any;

  elapsed: number = 0;
  duration: number = 1;

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
    onSeek: [],
    onTimelineZoomIn: [],
    onTimelineZoomOut: [],
    onAnimationChange: [],
    onLoopChange: [],
  };
  $btn_wrapper_left: JQuery<HTMLElement>;
  $btn_wrapper_center: JQuery<HTMLElement>;
  $btn_wrapper_right: JQuery<HTMLElement>;
  $select_animation: JQuery<HTMLElement>;
  $label_loop: JQuery<HTMLElement>;
  $checkbox_loop: JQuery<HTMLElement>;

  constructor(tab: ModelViewerTab){
    super();
    this.tab = tab;

    this.$ui_controls = $('<div class="keyframe-controls" />');
    this.$ui_bar = $('<div class="keyframe-bar">');
    this.$ui_canvas = $('<canvas style="position: absolute; bottom: 0;"/>');

    this.$btn_wrapper_left = $('<div style="display: flex; flex-basis: 25%; justify-content: flex-start; font-size: 12pt; align-items: center;" />');
    this.$btn_wrapper_center = $('<div style="flex: 1; font-size: 18pt; flex-basis: 100%;" />');
    this.$btn_wrapper_right = $('<div style="display: flex; flex-basis: 25%; justify-content: flex-end;" />');

    this.$select_animation = $('<select />');

    this.$label_loop = $('<i class="fa-solid fa-rotate"></i>');
    this.$checkbox_loop = $('<input type="checkbox" />');

    this.$label_loop.css({
      marginLeft: '10px',
      marginRight: '5px',
    });

    this.$checkbox_loop.css({
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    })

    this.$btn_key_left = $('<a href="#" title="Previous Keyframe" class="glyphicon glyphicon-chevron-left" style="text-decoration: none;"></a>');
    this.$btn_key_right = $('<a href="#" title="Next Keyframe" class="glyphicon glyphicon-chevron-right" style="text-decoration: none;"></a>');
    this.$btn_play = $('<a href="#" title="Play/Pause" class="glyphicon glyphicon-play" style="text-decoration: none;"></a>');
    this.$btn_stop = $('<a href="#" title="Stop" class="glyphicon glyphicon-stop" style="text-decoration: none;"></a>');

    this.$btn_key_add = $('<a href="#" title="Add Keyframe" class="glyphicon glyphicon-plus" style="text-decoration: none;"></a>');
    this.$btn_key_delete = $('<a href="#" title="Delete Keyframe" class="glyphicon glyphicon-trash" style="text-decoration: none;"></a>');
    
    this.$btn_timeline_zoom_in = $('<a href="#" title="Timeline Zoom In" class="glyphicon glyphicon-zoom-in" style="text-decoration: none; float:right;"></a>');
    this.$btn_timeline_zoom_out = $('<a href="#" title="Timeline Zoom Out" class="glyphicon glyphicon-zoom-out" style="text-decoration: none; float:right;"></a>');
    
    this.$ui_bar_seek = $('<div class="keyframe-track-seeker"><div class="seeker-thumb"></div></div>');
    this.$ui_bar_keyframe_time = $('<div class="keyframe-time-track" />');
    this.$ui_bar_keyframes = $('<div class="keyframe-track" />');
    
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
      position: 'relative',
      top: 'initial',
      bottom: 'initial',
      left: 'initial',
      right: 'initial',
    });

    this.$ui_bar.css({
      position: 'relative',
      top: 'initial',
      bottom: 'initial',
      left: 'initial',
      right: 'initial',
      height: '100%',
    });

    this.initEventListeners();
    this.buildUI();
    this.setElapsed(0);
  }

  initEventListeners(){

    this.$select_animation.on('change', (e) => {
      this.processEventListener('onAnimationChange', 
        $(':selected', this.$select_animation).data('animation')
      );
    });

    this.$checkbox_loop.on('input', (e) => {
      this.processEventListener('onLoopChange', 
        this.$checkbox_loop.is(':checked') ? true : false
      );
    })

    this.$btn_play.on('click', (e: any) => {
      e.preventDefault();
      this.btnPlayPause();
    });

    this.$btn_stop.on('click', (e: any) => {
      e.preventDefault();
      this.btnStop();
    });

    this.$btn_timeline_zoom_in.on('click', (e: any) => {
      e.preventDefault();
      this.TimeLineZoomIn();
    });

    this.$btn_timeline_zoom_out.on('click', (e: any) => {
      e.preventDefault();
      this.TimeLineZoomOut();
    });

    this.$ui_bar_keyframe_time.on('click', (e: any) => {
      if(e.target == this.$ui_bar_seek[0])
        return;

      let was_playing = this.playing;

      this.pause();

      //Update the lips elapsed time based on the seekbar position
      let offset = this.$ui_bar.offset();
      if(offset && this.$ui_bar){
        let position = e.pageX - offset.left + (this.$ui_bar.scrollLeft() as any);
        let percentage = position / (this.duration * this.timeline_zoom);
        this.processEventListener('onSeek', this.duration * percentage);
      }

      if(was_playing)
        this.play();

      console.log(e);
    });

    $('.seeker-thumb', this.$ui_bar_seek).on('mousedown', (e: any) => {
      this.pause();
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
    
    this.$ui_bar.on('scroll', (e) => {
      this.updateScrollPositions();
    })

  }

  updateScrollPositions(){
    let $target = this.$ui_bar;
    let target = $target[0];

    let left = target.scrollLeft;
    let top = target.scrollTop;

    this.$ui_bar_keyframe_time.css({
      top: top
    });

    $('.track-label', target).css({
      left: left,
      width: this.timelineOffset,
      zIndex: 1,
    });

    $('.track-keyframes', target).css({
      left: this.timelineOffset,
      width: target.scrollWidth - this.timelineOffset,
      zIndex: 0,
    });

    this.$ui_bar_keyframes.css({
      width: target.scrollWidth
    });
  }

  setAnimations(animations: OdysseyModelAnimation[] = []){
    animations = animations.slice().sort( (a: OdysseyModelAnimation, b: OdysseyModelAnimation) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      let comparison = 0;
      if (nameA > nameB) {
        comparison = 1;
      } else if (nameA < nameB) {
        comparison = -1;
      }
      return comparison;
    });

    this.$select_animation.html('<option value="-1">None</option>');
    let animation: OdysseyModelAnimation;
    for(let i = 0; i < animations.length; i++){
      animation = animations[i];
      if(animation){
        let $option = $(`<option value="${animation.name.replace(/\0[\s\S]*$/g,'')}">${animation.name.replace(/\0[\s\S]*$/g,'')}</option>`);
        $option.data('animation', animation);
        this.$select_animation.append($option);
      }
    }
  }

  buildUI(){
    this.$ui_controls.html('');
    this.$ui_bar.append(this.$ui_canvas);

    this.$btn_wrapper_left
      .append(this.$select_animation)
      .append(this.$label_loop)
      .append(this.$checkbox_loop);
    
    this.$btn_wrapper_center.append(this.$btn_key_delete)
      .append(this.$btn_key_left).append(this.$btn_play).append(this.$btn_stop)
      .append(this.$btn_key_right).append(this.$btn_key_add);
    
    this.$btn_wrapper_right
      .append(this.$btn_timeline_zoom_in)
      .append(this.$btn_timeline_zoom_out);

    this.$ui_controls
      .append(this.$btn_wrapper_left)
      .append(this.$btn_wrapper_center)
      .append(this.$btn_wrapper_right);

    this.$ui_controls.css({
      display: 'flex'
    });

    this.$btn_wrapper_center.css({
      flex: '1',
      flexBasis: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      display: 'flex',
    });

    this.setAnimations();
    
    this.$ui_bar_seek.html('<div class="seeker-thumb"></div>');
    this.$ui_bar_keyframe_time.html('');
    this.$ui_bar_keyframes.html('').css({
      bottom: 'initial',
      height: 'initial',
      top: '25px',
    });

    this.$select_animation.css({
      fontSize: '12pt',
      marginBottom: 0,
    });

    this.$ui_bar_seek.css({
      height: 'calc(100% - 10px)'
    });

    this.setDuration(this.duration);

    this.$ui_bar
      .append(this.$ui_bar_keyframe_time)
      .append(this.$ui_bar_keyframes)
      .append(this.$ui_bar_seek);

    this.buildKeyframes();

  }

  btnPlayPause(){
    console.log('$btn_play', this.playing);
    if(this.playing){
      this.pause();
    }else{
      this.play();
    }
  }

  btnStop(){
    this.stop();
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
    this.pause();
    // if(this.lip instanceof LIPObject){
    //   this.elapsed -= 0.01;
    //   if(this.elapsed < 0) this.elapsed = 0;
    // }
    
    this.$btn_play.removeClass('glyphicon-pause').removeClass('glyphicon-play').addClass('glyphicon-play');
    this.processEventListener('onSeekPrevious');
  }

  btnSeekNext(){
    this.pause();
    // if(this.lip instanceof LIPObject){
    //   this.elapsed += 0.01;
    //   if(this.elapsed > this.duration) this.elapsed = this.duration;
    // }
    
    // this.SeekAudio(this.elapsed);
    // this.$btn_play.removeClass('glyphicon-pause').removeClass('glyphicon-play').addClass('glyphicon-play');
    
    // this.updateLip(0);
    this.processEventListener('onSeekNext');
  }

  play(){
    this.$btn_play.removeClass('glyphicon-play').removeClass('glyphicon-pause').addClass('glyphicon-pause');
    this.playing = true;
    this.processEventListener('onPlay');
  }

  pause(){
    this.$btn_play.removeClass('glyphicon-pause').removeClass('glyphicon-play').addClass('glyphicon-play');
    this.playing = false;
    this.processEventListener('onPause');
  }

  stop(){
    this.pause();
    this.processEventListener('onStop');
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

    if(this.timeline_zoom < this.min_timeline_zoom){
      this.timeline_zoom = this.min_timeline_zoom;
    }
    
    this.ResetTimeLineAfterZoom();
    this.processEventListener('onTimelineZoomOut');
  }

  ResetTimeLineAfterZoom(){
    this.$ui_bar_keyframe_time.css({
      width: this.duration * this.timeline_zoom + 50
    });

    this.$ui_bar_keyframes.css({
      // width: this.duration * this.timeline_zoom + 50
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

  buildAnimationControllers(animation?: OdysseyModelAnimation){
    this.$ui_bar_keyframes.html('');
    if(this.tab.currentAnimation instanceof OdysseyModelAnimation){
      this.tab.currentAnimation.nodes.forEach( (node: OdysseyModelAnimationNode) => {
        let $nodeTrack = $(`<div class="keyframe-track-wrapper node" style="display: flex;"><div class="track-label" style="width: ${this.timelineOffset}px;"><i class="fa-regular fa-square"></i> ${node.name}</div><div class="track-keyframes" style="position: relative;"></div></div>`);
        this.$ui_bar_keyframes.append($nodeTrack);
        node.controllers.forEach( (controller: OdysseyController) => {
          let $controllerTrack = $(`<div class="keyframe-track-wrapper controller" style="display: flex;"><div class="track-label" style="width: ${this.timelineOffset}px;"><i class="fa-solid fa-circle"></i> ${OdysseyModelControllerType[controller.type]}</div><div class="track-keyframes" style="position: relative;"></div></div>`);
          if(Array.isArray(controller.data)){
            controller.data.forEach( (frame: any) => {
              this.buildKeyframe(frame, $('.track-keyframes', $controllerTrack));
            })
          }
          this.$ui_bar_keyframes.append($controllerTrack);
        })
      });
    }
    this.updateScrollPositions();
  }

  buildKeyframes(){
    this.buildAnimationControllers();
    this.$ui_bar_keyframe_time.html('');
    if(Array.isArray(this.keyframes)){
      for(let i = 0, il = this.keyframes.length; i < il; i++){
        let keyframe = this.keyframes[i];
        // this.buildKeyframe(keyframe);
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
    let count = Math.ceil(Math.ceil(this.duration) / nthTime);

    for(let i = 0; i <= count; i++){
      let $lbl_timestamp = $('<span></span>');
      let s = factor*i;
      $lbl_timestamp.text((s-(s%=60))/60+(9<s?':':':0')+s);
      $lbl_timestamp.css({
        position: 'absolute',
        left: this.timelineOffset + ((nthTime * i) * this.timeline_zoom),
        width: 30,
        marginLeft: -15,
        textAlign: 'center'
      });
      this.$ui_bar_keyframe_time.append($lbl_timestamp);
    }

  }

  buildKeyframe(keyframe: any, $parent: JQuery<HTMLElement>){
    
    let $keyframe = $('<div class="keyframe" />');
    keyframe.$ele = $keyframe;

    $keyframe.css({
      left: (keyframe.time * this.timeline_zoom)
    });

    $parent.append($keyframe);

    $keyframe.on('click', (e: any) => {
      e.stopPropagation();
      this.processEventListener('onKeyframeSelected', keyframe);
      // this.elapsed = keyframe.time;
      // this.selected_frame = keyframe;
      this.pause();
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

  updateTimeLineScroll(){
    // setTimeout( () => {
      if(parseFloat(this.$ui_bar_seek.css('left')) > this.$ui_bar.width() + this.$ui_bar.scrollLeft()){
        this.$ui_bar.scrollLeft(parseFloat(this.$ui_bar_seek.css('left')) - 50);
      }
  
      if(parseFloat(this.$ui_bar_seek.css('left')) < this.$ui_bar.scrollLeft()){
        this.$ui_bar.scrollLeft(parseFloat(this.$ui_bar_seek.css('left')) - 50);
      }
    // }, 100);
  }

  setDuration(duration: number = 1){
    this.duration = duration;
    
    this.$ui_bar_keyframe_time.css({
      width: this.duration * this.timeline_zoom + 50,
    });

    this.$ui_bar_keyframes.css({
      // width: this.duration * this.timeline_zoom + 50,
    });
  }

  setElapsed(elapsed: number = 0){
    this.elapsed = elapsed;
    this.$ui_bar_seek.css({
      left: this.timelineOffset + (this.elapsed * this.timeline_zoom)
    });
    this.updateTimeLineScroll();
  }

}