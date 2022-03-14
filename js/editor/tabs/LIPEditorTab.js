class LIPEditorTab extends EditorTab {
  constructor(file, isLocal = false){
    super();
    this.animLoop = true;
    this.playing = false;
    this.seeking = false;
    this.current_head = 'p_bastilah';
    this.audio_name = '';
    this.selected_frame = null;
    this.poseFrame = false;
    this.audio_buffer = {duration: 0};
    this.dragging_frame = undefined;
    this.preview_gain = 0.25;

    this.max_timeline_zoom = 1000;
    this.min_timeline_zoom = 50;
    this.timeline_zoom = 250;

    console.log('LIP Editor');
    $('a', this.$tab).text('LIP Editor');

    if(localStorage.getItem('lip_head')){
      this.current_head = localStorage.getItem('lip_head');
    }

    if(localStorage.getItem('lip_gain')){
      this.preview_gain = parseFloat(localStorage.getItem('lip_gain'));
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      autoClear: false,
      logarithmicDepthBuffer: true
    });
    this.renderer.autoClear = false;
    this.renderer.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );

    this.clock = new THREE.Clock();
    this.stats = new Stats();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 55, this.$tabContent.innerWidth() / this.$tabContent.innerHeight(), 0.1, 15000 );
    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    this.camera.position.set(0, .5, .1);              // offset the camera a bit
    this.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));

    this.camera.rotation.set(-Math.PI/2, 0, Math.PI);

    this.CameraMode = {
      EDITOR: 0,
      STATIC: 1,
      ANIMATED: 2
    };

    this.staticCameraIndex = 0;
    this.animatedCameraIndex = 0;
    this.cameraMode = this.CameraMode.EDITOR;
    this.currentCamera = this.camera;

    this.canvas = this.renderer.domElement;
    this.$canvas = $(this.canvas);

    this.$canvas.addClass('noselect').attr('tabindex', 1);

    this.$ui_controls = $('<div class="keyframe-controls" />');
    this.$ui_picker = $('<div style="position: absolute; top: 5px; right: 5px;" />');
    this.$ui_keyframe_options = $('<div style="position: absolute; bottom: 145px; right: 5px;" />');
    this.$ui_audio = $('<div style="position: absolute; top: 25%; right: 5px;" />');
    this.$ui_lip = $('<div style="position: absolute; top: 50px; left: 5px;" />');
    this.$ui_bar = $('<div class="keyframe-bar">');
    this.$ui_canvas = $('<canvas style="position: absolute; bottom: 0;"/>');

    this.$ui_picker.windowPane({
      title: 'Preview Head',
      draggable: true
    });

    this.$ui_keyframe_options.windowPane({
      title: 'Selected Keyframe',
      draggable: true
    });

    this.$ui_audio.windowPane({
      title: 'Voice Over Preview',
      draggable: true
    });
    
    this.$ui_lip.windowPane({
      title: 'Lip Sync Properties',
      draggable: true
    });

    //0x60534A
    this.globalLight = new THREE.AmbientLight('#3f3f3f'); //0x60534A
    this.globalLight.position.x = 0;
    this.globalLight.position.y = 0;
    this.globalLight.position.z = 0;
    this.globalLight.intensity  = 1;

    this.pointLight = new THREE.PointLight('#FFFFFF');
    this.pointLight.position.x = 0;
    this.pointLight.position.y = 1;
    this.pointLight.position.z = 1;
    this.pointLight.distance = 10;

    this.scene.add(this.globalLight);
    this.scene.add(this.pointLight);

    this.lip = undefined;

    this.head = undefined;
    this.head_hook = new THREE.Object3D;
    this.scene.add(this.head_hook);

    //this.controls = new ModelViewerControls(this.currentCamera, this.canvas, this);
    //this.controls.AxisUpdate(); //always call this after the Yaw or Pitch is updated

    this.$tabContent.append($(this.stats.dom));
    this.$tabContent.append(this.$canvas);

    this.$tabContent.append(this.$ui_controls);
    this.$tabContent.append(this.$ui_keyframe_options);
    this.$tabContent.append(this.$ui_bar);
    this.$tabContent.append(this.$ui_picker);
    this.$tabContent.append(this.$ui_audio);
    this.$tabContent.append(this.$ui_lip);


    this.data = new Uint8Array(0);
    this.file = file;

    //Audio
    this.gainNode = Game.audioEngine.audioCtx.createGain();
    this.gainNode.gain.value = this.preview_gain;
    this.source = Game.audioEngine.audioCtx.createBufferSource();

    window.addEventListener('resize', () => {
      try{
        this.TabSizeUpdate();
      }catch(e){

      }
    });

    $('#container').layout({ applyDefaultStyles: false,
      onresize: () => {
        try{
          this.TabSizeUpdate();
        }catch(e){

        }
      }
    });

    this.BuildGround();

    this.OpenFile(file);

  }

  UpdateUI(){
    this.$ui_controls.html('');
    this.$ui_keyframe_options[0].$content.html('');
    this.$ui_audio[0].$content.html('');
    this.$ui_bar.html('');

    this.$ui_bar.append(this.$ui_canvas);

    this.$btn_key_left = $('<a href="#" title="Previous Keyframe" class="glyphicon glyphicon-chevron-left" style="text-decoration: none;"></a>');
    this.$btn_key_right = $('<a href="#" title="Next Keyframe" class="glyphicon glyphicon-chevron-right" style="text-decoration: none;"></a>');
    this.$btn_play = $('<a href="#" title="Play/Pause" class="glyphicon glyphicon-play" style="text-decoration: none;"></a>');
    this.$btn_stop = $('<a href="#" title="Stop" class="glyphicon glyphicon-stop" style="text-decoration: none;"></a>');

    this.$btn_key_add = $('<a href="#" title="Add Keyframe" class="glyphicon glyphicon-plus" style="text-decoration: none;"></a>');
    this.$btn_key_delete = $('<a href="#" title="Delete Keyframe" class="glyphicon glyphicon-trash" style="text-decoration: none;"></a>');
    
    this.$btn_timeline_zoom_in = $('<a href="#" title="Timeline Zoom In" class="glyphicon glyphicon-zoom-in" style="text-decoration: none; float:right;"></a>');
    this.$btn_timeline_zoom_out = $('<a href="#" title="Timeline Zoom Out" class="glyphicon glyphicon-zoom-out" style="text-decoration: none; float:right;"></a>');

    this.$btn_play.on('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('$btn_play', this.playing);
      if(this.playing){
        this.Pause();
      }else{
        this.Play();
      }
    });

    this.$btn_stop.on('click', (e) => {
      e.preventDefault();
      this.Stop();
    });

    this.$ui_controls.append(this.$btn_key_delete)
    .append(this.$btn_key_left).append(this.$btn_play).append(this.$btn_stop)
    .append(this.$btn_key_right).append(this.$btn_key_add).append(this.$btn_timeline_zoom_in).append(this.$btn_timeline_zoom_out);

    this.$btn_timeline_zoom_in.on('click', (e) => {
      e.preventDefault();
      this.TimeLineZoomIn();
    });

    this.$btn_timeline_zoom_out.on('click', (e) => {
      e.preventDefault();
      this.TimeLineZoomOut();
    });


    
    this.$ui_bar_seek = $('<div class="keyframe-track-seeker"><div class="seeker-thumb"></div></div>');
    this.$ui_bar_keyframe_time = $('<div class="keyframe-time-track" />');
    this.$ui_bar_keyframes = $('<div class="keyframe-track" />');

    this.$ui_bar_keyframe_time.css({
      width: this.lip.Header.Length * this.timeline_zoom + 50
    });

    this.$ui_bar_keyframes.css({
      width: this.lip.Header.Length * this.timeline_zoom + 50
    });

    this.$ui_bar.append(this.$ui_bar_keyframe_time).append(this.$ui_bar_keyframes).append(this.$ui_bar_seek);

    this.$ui_bar_keyframe_time.on('click', (e) => {

      if(e.target == this.$ui_bar_seek[0])
        return;

      let was_playing = this.playing;

      this.Pause();

      //Update the lips elapsed time based on the seekbar position
      let offset = this.$ui_bar.offset();
      let position = e.pageX - offset.left + this.$ui_bar.scrollLeft();
      let percentage = position / (this.lip.Header.Length * this.timeline_zoom);

      if(this.lip instanceof LIPObject){
        this.lip.elapsed = this.lip.Header.Length * percentage;
      }

      if(was_playing)
        this.Play();

      console.log(e);
    });

    $('.seeker-thumb', this.$ui_bar_seek).on('mousedown', (e) => {

      this.Pause();
      this.$ui_bar_seek.removeClass('targeted').addClass('targeted');
      this.seeking = true;

    });

    //Keyframe Controls
    this.$ui_keyframe_options.hide();
    this.$select_keyframe_shape = $('<select></select>');
    this.$select_keyframe_time = $('<input type="number" step="0.005" />');

    for(let i = 0; i < 16; i++){
      let text = 'N/A';
      //This switch statement is a modified version of the one found in the source for KotOR Lipsynch Editor by JdNoa
      switch (i) {
        case 0:
          text = "0: ee (teeth)";
          break;
        case 1:
          text = "1: eh (bet, red)";
          break;
        case 2:
          text = "2: schwa (a in sofa)";
          break;
        case 3:
          text = "3: ah (bat, cat)";
          break;
        case 4:
          text = "4: oh (or, boat)";
          break;
        case 5:
          text = "5: oo (blue); wh in wheel";
          break;
        case 6:
          text = "6: y (you)";
          break;
        case 7:
          text = "7: s, ts";
          break;
        case 8:
          text = "8: f, v";
          break;
        case 9:
          text = "9: n, ng";
          break;
        case 10:
          text = "10: th";
          break;
        case 11:
          text = "11: m, p, b";
          break;
        case 12:
          text = "12: t, d";
          break;
        case 13:
          text = "13: j, sh";
          break;
        case 14:
          text = "14: l, r";
          break;
        case 15:
          text = "15: k, g";
          break;
      }
      this.$select_keyframe_shape.append('<option value="'+i+'">'+text+'</option>');
    }

    this.$select_keyframe_shape.on('change', (e) => {
      if(this.lip instanceof LIPObject){
        let keyframe = this.selected_frame;
        keyframe.shape = parseInt(this.$select_keyframe_shape.val());
        this.poseFrame = true;
      }
    });

    this.$select_keyframe_time.on('input', (e) => {
      if(this.lip instanceof LIPObject){
        let keyframe = this.selected_frame;
        keyframe.time = parseFloat(this.$select_keyframe_time.val());

        let $keyframe = this.selected_frame.$ele;
        
        $keyframe.css({
          left: keyframe.time * this.timeline_zoom,
        });

        this.lip.reIndexKeyframes();
        this.BuildKeyframes();
        
      }
    });

    this.$ui_keyframe_options[0].$content.append('<b class="title">Mouth Shape:</b>').append(this.$select_keyframe_shape).append('<b class="title">Time:</b>').append(this.$select_keyframe_time);

    this.$btn_key_left.on('click', (e) => {
      e.preventDefault();
      let index = this.lip.keyframes.indexOf(this.selected_frame);
      if(index > 0){
        index--;
      }

      if(index < 0){
        index = 0;
      }

      this.selected_frame = this.lip.keyframes[index];

      if(this.lip instanceof LIPObject){
        this.UpdateKeyframeOptions();
      }

    });

    this.$btn_key_right.on('click', (e) => {
      e.preventDefault();
      if(this.lip instanceof LIPObject){
        let index = this.lip.keyframes.indexOf(this.selected_frame);
        if(index < this.lip.keyframes.length-1){
          index++;
        }

        if(index > this.lip.keyframes.length){
          index = this.lip.keyframes.length-1;
        }

        this.selected_frame = this.lip.keyframes[index];

        this.UpdateKeyframeOptions();
        
      }

    });

    this.$btn_key_add.on('click', (e) => {
      e.preventDefault();
      let keyframe = {
        time: this.lip.elapsed,
        shape: 6
      };
      this.lip.keyframes.push(keyframe);
      this.lip.reIndexKeyframes();

      this.BuildKeyframes();

      this.selected_frame = keyframe;

      if(this.lip instanceof LIPObject){
        this.UpdateKeyframeOptions();
      }

    });

    this.$btn_key_delete.on('click', (e) => {
      e.preventDefault();

      let result = confirm("Are you sure you want to delete this keyframe?");
      if(result){
        if(this.selected_frame){
          let index = this.lip.keyframes.indexOf(this.selected_frame);
          this.lip.keyframes.splice(index, 1)
          this.lip.reIndexKeyframes();

          if(index > this.lip.keyframes.length){
            index = this.lip.keyframes.length - 1;
          }

          if(index < 0){
            index = 0;
          }

          this.selected_frame = this.lip.keyframes[index];

          this.BuildKeyframes();

          if(this.lip instanceof LIPObject){
            this.UpdateKeyframeOptions();
          }
        }
      }

    });

    //Head Appearance Picker
    this.$select_head = $('<select />');
    this.$select_anim = $('<select />');

    let _options = '';
    let heads = Global.kotor2DA.heads;
    for(let i = 0, il = heads.RowCount; i < il; i++){
      let head_row = heads.rows[i];
      _options += '<option value="'+head_row.head+'">'+head_row.head+'</option>';
    }
    
    this.$select_head.html(_options);
    this.$ui_picker[0].$content.append('<b class="title">Change Head:</b>').append(this.$select_head);

    this.$select_head.on('change', (e) => {

      let head = this.$select_head.val().toLowerCase();
      if(head != this.current_head){
        this.LoadHead(head, () => {
          TextureLoader.LoadQueue(() => {
            console.log('Textures Loaded');
          });
        });
      }

    });

    //Head Animation Picker
    _options = '';
    let anims = this.head.animations;
    for(let i = 0, il = anims.length; i < il; i++){
      let anim = anims[i];
      _options += '<option value="'+anim.name+'">'+anim.name+'</option>';
    }
    
    this.$select_anim.html(_options);
    this.$ui_picker[0].$content.append('<br />').append('<b class="title">Change Animation:</b>').append(this.$select_anim);
    this.$select_anim.val('tlknorm');
    this.$select_anim.on('change', (e) => {
      let anim_name = this.$select_anim.val().toLowerCase();
      this.head.poseAnimation(anim_name);
      this.head.playAnimation(anim_name, true);
    });

    //Voice Over Audio
    this.$lbl_audio_name = $('<span>'+this.audio_name+'</span>');
    this.$lbl_audio_duration = $('<span>'+this.audio_buffer.duration+'</span>');
    this.$input_gain = $('<input type="range" class="volume" min="0" max="1" step="0.01" />');
    this.$btn_audio_browse = $('<a href="#" class="btn btn-default" style="width: 100%; padding: 5px; display: inline-block; margin: 0; margin-top: 5px;">Load Audio</a>');
    this.$btn_audio_browse.on('click', (e) => {
      e.preventDefault();
      let test = dialog.showOpenDialog(
        {
          title: 'Open Audio File',
          filters: [
            {name: 'Audio File', extensions: ['wav', 'mp3']}
          ],
          properties: ['createDirectory'],
        }
      ).then( (response) => {
        if(response.filePaths.length){
          let filename = response.filePaths[0].split(path.sep).pop();
          let fileParts = filename.split('.');
          switch(fileParts[1]){
            case 'mp3':
            case 'wav':
              new AudioFile(response.filePaths[0], (audio) => {
                console.log('audio', audio);
                audio.GetPlayableByteStream((data) => {
                  Game.audioEngine.audioCtx.decodeAudioData(data, (buffer) => {
                    this.Stop();
                    this.audio_name = fileParts[0];
                    this.$lbl_audio_name.text(this.audio_name);
                    this.audio_buffer = buffer;
                    this.$lbl_audio_duration.text(this.audio_buffer.duration);
                    this.Play();
                  });
                });
              });
            break;
            default:

            break;
          }
          //console.log({path: paths[0], filename: filename, name: fileParts[0], ext: fileParts[1]})
        }
      })
    });

    this.$input_gain.val(this.preview_gain);

    this.$input_gain.on('input', (e) => {
      this.preview_gain = parseFloat(this.$input_gain.val());
      this.gainNode.gain.value = this.preview_gain;
      localStorage.setItem('lip_gain', this.preview_gain);
    });

    this.$ui_audio[0].$content.append('<b class="title">Name: </b>').append(this.$lbl_audio_name).append('<br />')
    .append('<b class="title" style="margin-top: 5px;">Length: </b>').append(this.$lbl_audio_duration).append('<br />')
    .append(this.$input_gain).append('<br />')
    .append(this.$btn_audio_browse);

    //Lip Sync Properties

    this.$input_lip_length = $('<input type="number" step="0.005" />');
    this.$input_lip_length.val(this.lip.Header.Length);
    this.$input_lip_length.on('input', (e) => {
      if(this.lip instanceof LIPObject){
        this.lip.Header.Length = parseFloat(this.$input_lip_length.val());
        //Rebuild the timeline because the length has changed
        this.BuildKeyframes();
      }
    });

    this.$btn_match_audio_length = $('<a href="#" class="btn btn-default" style="width: 100%; padding: 5px; display: inline-block; margin: 0; margin-top: 5px;">Match Audio Length</a>');
    this.$btn_match_audio_length.on('click', (e) => {
      e.preventDefault();

      let result = confirm("Are you sure you want to modify the length of the LIP Sync File?");
      if(result){
        if(this.audio_buffer instanceof AudioBuffer){
          this.lip.Header.Length = this.audio_buffer.duration;
          //Rebuild the timeline because the length has changed
          this.BuildKeyframes();
          this.$input_lip_length.val(this.lip.Header.Length);
        }else{
          dialog.showErrorBox('KotOR Forge', 'Failed: No audio file present.');
        }
      }

    });

    this.$btn_load_phn = $('<a href="#" class="btn btn-default" style="width: 100%; padding: 5px; display: inline-block; margin: 0; margin-top: 5px;">Import PHN</a>');
    this.$btn_load_phn.on('click', (e) => {
      e.preventDefault();

      dialog.showOpenDialog({
        title: 'Open PHN File',
        filters: [
          {name: 'PHN File', extensions: ['phn']}
        ],
        properties: ['createDirectory'],
      }, 
      (paths) => {
        if(paths.length){
          let filename = paths[0].split(path.sep).pop();
          let fileParts = filename.split('.');
          switch(fileParts[1]){
            case 'phn':
              this.ImportPHN(paths[0], () => {
                console.log('PHN Loaded');
                setTimeout(() => {
                  this.BuildKeyframes();
                }, 100);
              });

            break;
            default:

            break;
          }
          //console.log({path: paths[0], filename: filename, name: fileParts[0], ext: fileParts[1]})
        }
      })

    });

    this.$ui_lip[0].$content.append('<b class="title">Duration:</b>').append(this.$input_lip_length).append(this.$btn_match_audio_length).append(this.$btn_load_phn);

    this.InitWindowEventHandlers();
    this.DrawWaveform();

  }

  UpdateKeyframeOptions(){
    this.$ui_keyframe_options.show();
    if(this.lip instanceof LIPObject){
      if(this.selected_frame){
        let keyframe = this.selected_frame;
        this.$select_keyframe_shape.val(keyframe.shape);
        this.$select_keyframe_time.val(keyframe.time);
        this.lip.elapsed = keyframe.time;
        this.poseFrame = true;

        this.SeekAudio(keyframe.time);

        $('.keyframe', this.$ui_bar_keyframes).removeClass('selected');
        try{
          this.selected_frame.$ele.removeClass('selected').addClass('selected');
        }catch(e){}

        this.UpdateTimeLineScroll();
      }else{
        console.error('No keyframe selected');
      }
    }
  }

  BuildKeyframes(){
    this.$ui_bar_keyframes.html('');
    this.$ui_bar_keyframe_time.html('');
    if(this.lip instanceof LIPObject){
      for(let i = 0, il = this.lip.keyframes.length; i < il; i++){
        let keyframe = this.lip.keyframes[i];
        this.BuildKeyframe(keyframe, i);
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
    let count = Math.ceil(Math.ceil(this.lip.Header.Length) / nthTime);

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

  BuildKeyframe(keyframe, index){
    
    let $keyframe = $('<div class="keyframe" />');
    keyframe.$ele = $keyframe;

    $keyframe.css({
      left: keyframe.time * this.timeline_zoom //(keyframe.time / this.lip.Header.Length) * 100 +'%',
    });

    this.$ui_bar_keyframes.append($keyframe);

    $keyframe.on('click', (e) => {
      e.stopPropagation();
      this.lip.elapsed = keyframe.time;
      this.selected_frame = keyframe;
      this.Pause();
      this.UpdateKeyframeOptions();
    });

    $keyframe.on('mousedown', (e) => {
      $keyframe.removeClass('targeted').addClass('targeted');
      this.dragging_frame = keyframe;
    });

  }

  TimeLineZoomIn(){
    this.timeline_zoom += 25;

    if(this.timeline_zoom > this.max_timeline_zoom){
      this.timeline_zoom = this.max_timeline_zoom;
    }
    
    this.ResetTimeLineAfterZoom();
  }

  TimeLineZoomOut(){
    this.timeline_zoom -= 25;

    if(this.timeline_zoom < this.mim_timeline_zoom){
      this.timeline_zoom = this.mim_timeline_zoom;
    }
    
    this.ResetTimeLineAfterZoom();
  }

  ResetTimeLineAfterZoom(){
    this.$ui_bar_keyframe_time.css({
      width: this.lip.Header.Length * this.timeline_zoom + 50
    });

    this.$ui_bar_keyframes.css({
      width: this.lip.Header.Length * this.timeline_zoom + 50
    });

    this.BuildKeyframes();

    if(this.lip instanceof LIPObject){
      this.UpdateKeyframeOptions();
    }
    this.DrawWaveform();

    //Try to keep the seekbar in focus after zoom
    let centerOffset = ((this.$ui_bar.width()/2) - this.lip.elapsed * this.timeline_zoom)*-1;
    this.$ui_bar.scrollLeft(centerOffset);

  }

  OpenFile(file){

    if(file instanceof EditorFile){
      file.readFile( (buffer) => {
        new LIPObject(buffer, (lip) => {
          this.lip = lip;

          if(typeof this.lip.file != 'string')
            this.lip.file = file.resref + '.' + ResourceTypes.getKeyByValue(file.reskey);

          this.LoadSound(file.resref, () => {
            this.LoadHead(this.current_head, () => {
              TextureLoader.LoadQueue(() => {
                console.log('Textures Loaded');
                this.TabSizeUpdate();
                this.UpdateUI();
                this.BuildKeyframes();
                this.Render();
              });
            });
          });
        });
      });
    }

  }

  LoadHead(model_name = 'p_bastilah', onLoad = null){

    Game.ModelLoader.load({
      file: model_name,
      onLoad: (mdl) => {
        this.current_head = model_name;
        localStorage.setItem('lip_head', this.current_head);
        THREE.AuroraModel.FromMDL(mdl, {
          castShadow: true,
          receiveShadow: true,
          onComplete: (model) => {

            if(this.head instanceof THREE.Object3D){
              this.head.parent.remove(this.head);
            }

            this.head = model;
            this.head_hook.add(this.head);

            this.head.animations.sort((a,b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0))

            this.head.playAnimation('tlknorm', true);

            this.head.moduleObject = {
              lipObject: this.lip
            };

            if(typeof onLoad === 'function')
              onLoad();

          }
        });
      }
    });
  }

  LoadSound(sound = 'nm35aabast06217_', onLoad = null){

    this.audio_buffer = {duration: 0};
    
    AudioLoader.LoadStreamWave(sound, (data) => {
      this.audio_name = sound;
      Game.audioEngine.audioCtx.decodeAudioData(data, (buffer) => {

        this.audio_buffer = buffer;

        if(typeof onLoad === 'function')
          onLoad();

      });

    }, (e) => {
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  DrawWaveform(){

    let canvas = this.$ui_canvas[0];
    let ctx = canvas.getContext('2d');
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

  _ResetAudio(){
    try{
      this.source.disconnect();
      this.source.stop(0);
      this.source = null;
    }catch(e){ }
  }

  Play(){

    this.$btn_play.removeClass('glyphicon-play').removeClass('glyphicon-pause').addClass('glyphicon-pause');

    this._ResetAudio();
    this.source = Game.audioEngine.audioCtx.createBufferSource();
    
    try{
      this.source.buffer = this.audio_buffer;
      this.source.connect(this.gainNode);
      this.gainNode.connect(Game.audioEngine.audioCtx.destination);
      this.source.loop = false;

      if(this.lip instanceof LIPObject){
        this.source.start(0, this.lip.elapsed);
      }else{
        this.source.start(0, 0);
      }
    }catch(e){}
    
    this.playing = true;
    if(this.lip instanceof LIPObject){
      if(this.lip.elapsed >= this.lip.Header.Length){
        this.lip.elapsed = 0;
      }
    }
  }

  Pause(){
    this.$btn_play.removeClass('glyphicon-pause').removeClass('glyphicon-play').addClass('glyphicon-play');
    this._ResetAudio();
    this.playing = false;
  }

  Stop(){
    this.$btn_play.removeClass('glyphicon-pause').removeClass('glyphicon-play').addClass('glyphicon-play');
    this.Pause();
    if(this.lip instanceof LIPObject){
      this.lip.elapsed = 0;
    }
  }

  SeekAudio(time){
    if(this.source){
      this.source.currentTime = time;
    }
  }

  onResize() {
    super.onResize();
    this._ResetAudio();
    try{
      this.TabSizeUpdate();
    }catch(e){

    }
  }

  onDestroy() {
    this.Stop();
    super.onDestroy();

    try{
      this.TabSizeUpdate();
    }catch(e){

    }
  }

  TabSizeUpdate(){
    this.camera.aspect = this.$tabContent.innerWidth() / this.$tabContent.innerHeight();
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( this.$tabContent.innerWidth(), this.$tabContent.innerHeight() );
  }

  UpdateTimeLineScroll(){
    setTimeout( () => {
      if(parseFloat(this.$ui_bar_seek.css('left')) > this.$ui_bar.width() + this.$ui_bar.scrollLeft()){
        this.$ui_bar.scrollLeft(parseFloat(this.$ui_bar_seek.css('left')) - 50);
      }
  
      if(parseFloat(this.$ui_bar_seek.css('left')) < this.$ui_bar.scrollLeft()){
        this.$ui_bar.scrollLeft(parseFloat(this.$ui_bar_seek.css('left')) - 50);
      }
    }, 100);
  }

  Render(){
    requestAnimationFrame( () => { this.Render(); } );
    if(!this.visible)
      return;

    let delta = this.clock.getDelta();
    //this.controls.Update(delta);

    if(this.head instanceof THREE.AuroraModel){
      this.head.update(delta);
    }

    if(this.lip instanceof LIPObject && this.head instanceof THREE.AuroraModel){

      this.head.moduleObject.lipObject = this.lip;

      let last_time = this.lip.elapsed;

      if(this.playing || this.seeking || this.poseFrame)
        this.lip.update(delta, this.head);
      
      if(this.poseFrame){
        this.poseFrame = false;
        this.lip.elapsed = last_time;
      }

      if(this.lip.elapsed > this.lip.Header.Length){
        this.lip.elapsed = this.lip.Header.Length;
        this.Stop();
      }

    }

    for(let i = 0; i < this.scene.children.length; i++){
      let obj = this.scene.children[i];
      if(obj instanceof THREE.AuroraModel){
        obj.update(delta);
      }
    }

    for(let i = 0; i < AnimatedTextures.length; i++){
      AnimatedTextures[i].Update(delta);
    }
    

    //if(this.playing){
      this.$ui_bar_seek.css({
        left: this.lip.elapsed * this.timeline_zoom//(this.lip.elapsed / this.lip.Header.Length) * 100 + '%'
      });
    //}

    if(this.playing){
      this.UpdateTimeLineScroll();
    }


    this.renderer.clear();
    this.renderer.render( this.scene, this.currentCamera );
    this.stats.update();
    this.seeking = false;
  }

  BuildGround(){

    // Geometry
    let cbgeometry = new THREE.WireframeGeometry(new THREE.PlaneGeometry( 25, 25, 25, 25 ));
    let mat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
    let wireframe = new THREE.LineSegments( cbgeometry, mat );
    this.scene.add( wireframe );

  }

  Save(){
    if(this.lip instanceof LIPObject){
      this.lip.export( () => {
        console.log('export complete');
        NotificationManager.Notify(NotificationManager.Types.SUCCESS, 'File Saved');
      })
    }
  }

  SaveAs(){
    if(this.lip instanceof LIPObject){
      this.lip.exportAs( () => {
        console.log('export complete');
        NotificationManager.Notify(NotificationManager.Types.SUCCESS, 'File Saved');
      })
    }
  }

  ImportPHN(file = '', onLoad = null){
    fs.readFile(file, 'utf-8', (err, data) => {
      if (err){
        dialog.showErrorBox('KotOR Forge', 'Failed: To load .phn file.');
        if(typeof onLoad === 'function')
          onLoad();
      }else{
        console.log(data);
        let eoh = data.indexOf('END OF HEADER');
        if(eoh > -1){
          data = data.substr(eoh+14);
          let keyframes = data.trim().split('\r\n');

          console.log(keyframes);

          this.lip.keyframes = [];

          let PHN_INVALID = -1;
          let PHN_EE = 0;
          let PHN_EH = 1;
          let PHN_SCHWA = 2;
          let PHN_AH = 3;
          let PHN_OH = 4;
          let PHN_OOH = 5;
          let PHN_Y = 6;
          let PHN_S = 7;
          let PHN_FV = 8;
          let PHN_NNG = 9;
          let PHN_TH = 0xA;
          let PHN_MPB = 0xB;
          let PHN_TD = 0xC;
          let PHN_JSH = 0xD;
          let PHN_L = 0xE;
          let PHN_KG = 0xF;
          let PHN_USE_NEXT = 0x10;

          let last_shape = PHN_INVALID;

          for(let i = 0; i < keyframes.length; i++){

            let keyframe_data = keyframes[i].trim().split(' ');

            if(!keyframe_data.length){
              continue;
            }

            let keyframe = {
              lip: PHN_INVALID,
              time: parseFloat(keyframe_data[0]) * .001
            };
            console.log(keyframes[i], keyframe_data[2]);
            switch(keyframe_data[2]){
              case "i:":
                keyframe.shape = PHN_EE;
                break;
              case "I":
                keyframe.shape = PHN_EH;
                break;
              case "I_x":
                eyframe.lip = PHN_EH;
                break;
              case "E":
                keyframe.shape = PHN_EH;
                break;
              case "@":
                keyframe.shape = PHN_AH;
                break;
              case "A":
                keyframe.shape = PHN_AH;
                break;
              case "^":
                keyframe.shape = PHN_AH;
                break;
              case ">":
                keyframe.shape = PHN_SCHWA;
                break;
              case "U":
                keyframe.shape = PHN_OH;
                break;
              case "u":
                keyframe.shape = PHN_OOH;
                break;
              case "u_x":
                keyframe.shape = PHN_OOH;
                break;
              case "&":
                keyframe.shape = PHN_OH;
                break;
              case "&_0":
                keyframe.shape = PHN_OH;
                break;
              case "3r":
                keyframe.shape = PHN_SCHWA;
                break;
              case "&r":
                keyframe.shape = PHN_SCHWA;
                break;
              case "5":
                keyframe.shape = PHN_OH;
                break;
              
              case "ei":
                keyframe.shape = PHN_EH;
                break;
              case ">i":
                keyframe.shape = PHN_OH;
                break;
              case "aI":
                keyframe.shape = PHN_AH;
                break;
              case "aU":
                keyframe.shape = PHN_AH;
                break;
              case "oU":
                keyframe.shape = PHN_OH;
                break;
              case "iU":
                keyframe.shape = PHN_EE;
                break;
              case "i&":
                keyframe.shape = PHN_EE;
                break;
              case "u&":
                keyframe.shape = PHN_OOH;
                break;
              case "e&":
                keyframe.shape = PHN_EH;
                break;
              
              case "ph":
                keyframe.shape = PHN_MPB;
                break;
              case "pc":
                keyframe.shape = PHN_MPB;
                break;
              case "b":
                keyframe.shape = PHN_MPB;
                break;
              case "bc":
                keyframe.shape = PHN_MPB;
                break;
              case "th":
                keyframe.shape = PHN_TD;
                break;
              case "tc":
                keyframe.shape = PHN_TD;
                break;
              case "d":
                keyframe.shape = PHN_TD;
                break;
              case "dc":
                keyframe.shape = PHN_TD;
                break;
              case "kh":
                keyframe.shape = PHN_KG;
                break;
              case "kc":
                keyframe.shape = PHN_KG;
                break;
              case "g":
                keyframe.shape = PHN_KG;
                break;
              case "gc":
                keyframe.shape = PHN_KG;
                break;
              case "f":
                keyframe.shape = PHN_FV;
                break;
              case "v":
                keyframe.shape = PHN_FV;
                break;
              case "T":
                keyframe.shape = PHN_TH;
                break;
              case "D":
                keyframe.shape = PHN_TH;
                break;
              case "s":
                keyframe.shape = PHN_S;
                break;
              case "z":
                keyframe.shape = PHN_S;
                break;
              case "S":
                keyframe.shape = PHN_JSH;
                break;
              case "Z":
                keyframe.shape = PHN_JSH;
                break;
              case "h":
                keyframe.shape = PHN_USE_NEXT;
                break;
              case "h_v":
                keyframe.shape = PHN_USE_NEXT;
                break;
              case "tS":
                keyframe.shape = PHN_JSH;
                break;
              case "tSc":
                keyframe.shape = PHN_JSH;
                break;
              case "dZ":
                keyframe.shape = PHN_JSH;
                break;
              case "dZc":
                keyframe.shape = PHN_JSH;
                break;
              case "m":
                keyframe.shape = PHN_MPB;
                break;
              case "n":
                keyframe.shape = PHN_NNG;
                break;
              case "N":
                keyframe.shape = PHN_NNG;
                break;
              case "d_(":
                keyframe.shape = PHN_TD;
                break;
              case "th_(":
                keyframe.shape = PHN_TD;
                break;
              case "n_(":
                keyframe.shape = PHN_NNG;
                break;
              case "l=":
                keyframe.shape = PHN_L;
                break;
              case "m=":
                keyframe.shape = PHN_MPB;
                break;
              case "n=":
                keyframe.shape = PHN_NNG;
                break;
              case "l":
                keyframe.shape = PHN_L;
                break;
              case "9r":
                keyframe.shape = PHN_L;
                break;
              case "j":
                keyframe.shape = PHN_Y;
                break;
              case "w":
                keyframe.shape = PHN_OOH;
                break;
              case "+":
                keyframe.shape = PHN_MPB;
                break;
              default:
                keyframe.shape = PHN_INVALID;
              break;
            }

            if(keyframe.shape == last_shape || keyframe.shape == PHN_INVALID){
              console.log('skipping');
              continue;
            }

            this.lip.keyframes.push(keyframe);
            this.lip.Header.Length = parseFloat(keyframe_data[1]) * .001;

            this.$input_lip_length.val(this.lip.Header.Length);

            last_shape = keyframe.shape;

          }

          this.selected_frame = this.lip.keyframes[0];

          this.lip.reIndexKeyframes();
          this.lip.elapsed = 0;

          this.UpdateKeyframeOptions();

        }

        if(typeof onLoad == 'function')
          onLoad();

      }
    });
  }

  InitWindowEventHandlers(){
    $(window).on('mousemove', (e) => {

      if(this.$ui_bar_seek.hasClass('targeted')){

        //Update the lips elapsed time based on the seekbar position
        let offset = this.$ui_bar.offset();
        let position = e.pageX - offset.left + this.$ui_bar.scrollLeft();
        let percentage = position / (this.lip.Header.Length * this.timeline_zoom);

        if(this.lip instanceof LIPObject){
          this.lip.elapsed = this.lip.Header.Length * percentage;
        }
        
        this.SeekAudio(this.lip.elapsed);
        this.Play();
        this.$btn_play.removeClass('glyphicon-pause').removeClass('glyphicon-play').addClass('glyphicon-play');
        setTimeout( () => {
          this.Pause();
        }, 25);
        
        this.seeking = true;

      }else if(this.dragging_frame && this.dragging_frame.$ele.hasClass('targeted')){

        let keyframe = this.dragging_frame;
        //Update the keyframe time based on the drag position
        let offset = this.$ui_bar.offset();
        let position = e.pageX - offset.left + this.$ui_bar.scrollLeft();
        let percentage = position / (this.lip.Header.Length * this.timeline_zoom);
        keyframe.time = this.lip.Header.Length * percentage;

        keyframe.$ele.css({
          left: keyframe.time * this.timeline_zoom
        });

      }

    });

    $(window).on('mouseup', (e) => {

      this.$ui_bar_seek.removeClass('targeted');
      this.seeking = false;
      //this.Pause();

      if(this.dragging_frame){
        this.dragging_frame.$ele.removeClass('targeted');
        this.lip.reIndexKeyframes();
        this.BuildKeyframes();
        this.dragging_frame.$ele.addClass('selected');
        this.selected_frame = this.dragging_frame;
        this.dragging_frame = undefined;
        this.UpdateKeyframeOptions();
      }

    });
  }

}

module.exports = LIPEditorTab;
