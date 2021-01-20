class InlineAudioPlayer {

  constructor(){
    this.position = 0;
    this.startedAt = 0;
    this.pausedAt = 0;
    this.playing = false;
    this.loading = false;
    this.loop = false;

    this.$audioPlayer = $('<div class="inline-audio-player" style="display:none; overflow:hidden;" />');
    //Info
    this.$infoHolder = $('<div />');

    this.$titleInfo = $('<span>Now Playing: </span>');
    this.$title = $('<span/>');
    this.$titleMarquee = $('<span />');

    this.$titleMarquee.append(this.$title);
    this.$infoHolder.append(this.$titleInfo).append(this.$titleMarquee);

    //Controls
    this.$btnPlay = $('<span class="glyphicon glyphicon-play btn-play" title="Play" style="cursor: pointer; flex:1;"/>');
    this.$btnStop = $('<span class="glyphicon glyphicon-stop btn-stop" title="Stop" style="cursor: pointer; flex:1;"/>');
    this.$btnExport = $('<span class="glyphicon glyphicon-save btn-save" title="Export Audio" style="cursor: pointer; flex:1; margin-left: 3px;"/>');
    this.$audioProgress = $('<input class="track" type="range" step="0.01" min="0" value="0" disabled/>');
    this.$audioTime = $('<span time>0:00 / 0:00</span>');

    this.$audioProgressPopup = $('<span class="track-pop" style="display:none; position:fixed;" />');

    this.$btnClose = $('<span class="glyphicon glyphicon-remove" style="cursor: pointer; position:absolute; top:3px; right:3px; z-index:101;" />');
    this.$controls = $('<div class="audio-player-controls" />');

    this.$controls.append(this.$btnPlay)
    .append(this.$btnStop)
    .append(this.$audioProgress)
    .append(this.$audioTime)
    .append(this.$btnExport)
    .append(this.$audioProgressPopup);

    this.InitializeControls();

    this.$btnClose.on('click', (e) => {
      e.preventDefault();
      this.Close();
    });

    this.$btnExport.on('click', async (e) => {
      e.preventDefault();

      let payload = await dialog.showSaveDialog({
        title: 'Export Audio File',
        defaultPath: this.audioFile.filename,
        properties: ['createDirectory'],
        filters: [
          {name: 'Wave File', extensions: ['wav']},
          {name: 'MP3 File', extensions: ['mp3']}
        ]
      });

      if(!payload.canceled && typeof payload.filePath != 'undefined'){
        this.audioFile.Export({
          file: payload.filePath,
          onComplete: () => {
            NotificationManager.Notify(NotificationManager.Types.SUCCESS, 'Audio file saved');
          },
          onError: () => {
            NotificationManager.Notify(NotificationManager.Types.WARNING, 'Audio file failed to save');
          }
        });
      }
      
    });

    this.gainNode = Game.audioEngine.audioCtx.createGain();
    this.gainNode.gain.value = 0.25;
    this.source = Game.audioEngine.audioCtx.createBufferSource();

    this.buffer = null;

    this.$audioPlayer.append(this.$infoHolder)
    .append(this.$controls)
    .append(this.$btnClose);

    this.$audioPlayer.width(300);

    this.loader = new LoadingScreen(this.$audioPlayer, false);
    this.loader.$loader.css({top: '0', zIndex: 100});

    $('body').append(this.$audioPlayer);
  }

  Reset(){
    this.position = 0;
    this.startedAt = 0;
    this.pausedAt = 0;
    this.playing = false;
    this.loading = false;
    this.loop = false;
  }

  OpenAudio(file){
    this.Reset();
    this.Stop();
    
    if(file instanceof EditorFile){
      file.readFile( (buffer) => {
        try{
          this.$title.text(file.resref+'.'+file.ext);
          this.audioFile = new AudioFile(buffer);
          if(this.isPlaying()){
            this.Stop();
          }
          if(this.buffer){
            this.buffer = null;
          }
          this.Play();
          this.Show();
        }
        catch (e) {
          console.error(e);
          //this.Hide();
        }
      });
    }
  }

  GetAudioBuffer(onBuffered = null){
    if(this.buffer == null){
      this.audioFile.GetPlayableByteStream((data) => {
        //console.log('format', )
        try{
          Game.audioEngine.audioCtx.decodeAudioData(data, (buffer) => {
            this.buffer = buffer;
            if(onBuffered != null)
              onBuffered(this.buffer);
          }, (error) => {
              console.error("decodeAudioData error", error);

              this.buffer = pcm.toAudioBuffer(data);
              console.log('Caught PCM error converting ADPCM to PCM', this.buffer, this.buffer instanceof AudioBuffer)
              if(onBuffered != null)
                onBuffered(this.buffer);
          });
        }catch( e ){

        }
      });
    }else{
      if(onBuffered != null)
        onBuffered(this.buffer);
    }
  }

  Play(){
    this.source = Game.audioEngine.audioCtx.createBufferSource();
    if(!this.loading){
      this.loader.Show();
      this.GetAudioBuffer((data) => {
        this.loading = false;
        let offset = this.pausedAt;
        this.source.buffer = this.buffer;
        this.source.connect(this.gainNode);
        this.gainNode.connect(Game.audioEngine.audioCtx.destination);
        this.source.loop = false;
        this.source.start(0, offset);

        this.startedAt = Game.audioEngine.audioCtx.currentTime - offset;
        this.pausedAt = 0;
        this.playing = true;

        this.source.onended = () => {
          this.$audioProgress.val(0.00);
          this.Stop();
          if(this.loop)
            this.Play();
        };

        this.$audioProgress.attr('max', this.GetDuration()).prop('disabled', false)
        .off('input').on('input', (e) => {
          let newPoint, newPlace, offset;
          // Measure width of range input
           let width = this.$audioProgress.innerWidth();

           // Figure out placement percentage between left and right of input
           newPoint = (this.$audioProgress.val() - this.$audioProgress.attr("min")) / (this.$audioProgress.attr("max") - this.$audioProgress.attr("min"));

           // Prevent bubble from going beyond left or right (unsupported browsers)
           if (newPoint < 0) { newPlace = 0; }
           else if (newPoint > 1) { newPlace = width; }
           else { newPlace = width * newPoint; }

          this.$audioProgressPopup.css({
             left: this.$audioProgress.offset().left + newPlace - (this.$audioProgressPopup.width() / 2),
             top: this.$audioProgress.offset().top - (this.$audioProgressPopup.height() + 5)
          }).text(this.SecondsToTimeString(this.$audioProgress.val())).show();;

          this.StopLoop();
          $(this).trigger('change');
        }).off('change').on('change', () => {
          this.Stop();
          this.pausedAt = this.$audioProgress.val();
          this.Play();
          this.$audioProgressPopup.hide();
        });

        this.ResumeLoop();
        this.UpdateIconStates();
        this.loader.Hide();
      });
    }
  }

  ResumeLoop(){
    this.loopId = global.setInterval(() => {
      this.UpdateAudioTime();
      this.$audioProgress.val(this.GetCurrentTime());
    }, 100);
  }

  StopLoop(){
    clearInterval(this.loopId);
  }

  Pause(){
    let elapsed = Game.audioEngine.audioCtx.currentTime - this.startedAt;
    this.Stop();
    this.pausedAt = elapsed;

    this.UpdateIconStates();
  }

  Stop(){
    try{
      this.source.disconnect();
      this.source.stop(0);
      this.source = null;
    }catch(e){ console.error(e); }
    this.pausedAt = 0;
    this.startedAt = 0;
    this.playing = false;
    this.$audioProgress.prop('disabled', true);
    this.UpdateIconStates();
    this.StopLoop();
  }

  Show(){
    this.$audioPlayer.show();
  }

  Hide(){
    this.Close();
  }

  IsVisible(){
    return this.$audioPlayer.is(":visible");
  }

  Close(){
    if(this.isPlaying()){
      this.Stop();
    }
    this.$audioPlayer.hide();
  }

  isPlaying() {
    return this.playing;
  }

  GetCurrentTime() {
    try{
      if(this.pausedAt) {
          return this.pausedAt;
      }
      if(this.startedAt) {
          return Game.audioEngine.audioCtx.currentTime - this.startedAt;
      }
    }catch(e){
      return 0;
    }
  }

  GetDuration() {
    try{
      return this.buffer.duration;
    }catch(e){
      return 0;
    }
  }

  UpdateIconStates(){
    if(this.isPlaying()){
      this.$btnPlay.removeClass('glyphicon-play')
      .removeClass('glyphicon-pause')
      .addClass('glyphicon-pause');
    }else{
      this.$btnPlay.removeClass('glyphicon-play')
      .removeClass('glyphicon-pause')
      .addClass('glyphicon-play');
    }

    this.UpdateAudioTime();
  }

  UpdateAudioTime(){
    this.$audioTime.text(this.SecondsToTimeString(Number(this.GetCurrentTime())) + ' / ' + this.SecondsToTimeString(Number(this.GetDuration())));
  }

  SecondsToTimeString(time){
    time = time | 0
    let h = Math.floor(time / 3600);
    let m = Math.floor(time % 3600 / 60);
    let s = Math.floor(time % 3600 % 60);
    return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);
  }

  InitializeControls(){
    this.$btnPlay.on('click', ()=>{
      if (this.audioFile) {
        if(this.isPlaying()){
          this.Pause();
        }else{
          this.Play();
        }
      }else{
        alert('Nothing to play');
      }
    });

    this.$btnStop.on('click', ()=>{
      this.Stop();
      this.$audioProgress.val('0.00');
    });
  }

}

module.exports = InlineAudioPlayer;
