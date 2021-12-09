/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The VideoPlayer class. I converted all the BINK videos into MP4's so I could test loading them in.
 * Going to have to write an actual BINK decoder at some point
 */

class VideoPlayer {

  static Load(sName = '', onEnded = null){
    let playerSession = new VideoPlayerSession(
      path.join(app_profile.directory, 'Movies', sName+'.mp4'),
      onEnded
    );

    VideoPlayer.CurrentSession = playerSession;
    VideoPlayer.Sessions.push(playerSession);
    playerSession.play();

  }

}

VideoPlayer.CurrentSession = undefined;
VideoPlayer.Sessions = [];

class VideoPlayerSession {

  src = '';
  onEnded = undefined;
  hasEnded = false;

  constructor(src, onEnded){
    this.src = src;
    this.onEnded = onEnded;
    let self = this;

    this.$video = $('<video />');

    this.$video[0].onended = function(){
      if(!self.hasEnded){
        self.hasEnded = true;
        $(this).attr('src', '');
        try{
          $(this).remove();
        }catch(e){ console.error(e) }
        if(typeof self.onEnded === 'function')
          self.onEnded();
      }
    };

    this.$video[0].onerror = this.$video[0].onended;

    this.$video.on('click', function(e){
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

    this.$video.attr('src', src);
    this.$video.currentTime = 0;
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
      if(this.$video[0]){
        this.$video[0].currentTime = this.$video[0].duration;
      }
    }catch(e){ console.error(e) }
    let idx = VideoPlayer.Sessions.indexOf(this);
    if(idx >= 0){
      VideoPlayer.Sessions.splice(idx, 1);
    }
  }
}

module.exports = VideoPlayer;