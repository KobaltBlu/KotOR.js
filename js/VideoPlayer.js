/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The VideoPlayer class. I converted all the BINK videos into MP4's so I could test loading them in.
 * Going to have to write an actual BINK decoder at some point
 */

class VideoPlayer {

  static Init(){

    if(VideoPlayer.$video){
      try{
        $('body').remove(VideoPlayer.$video);
      }catch(e){}
    }

    VideoPlayer.$video = $('<video />');

    VideoPlayer.$video[0].onended = function(){
      VideoPlayer.$video.hide();
      VideoPlayer.$video.attr('src', '');
      if(typeof VideoPlayer.onEnded === 'function')
        VideoPlayer.onEnded();

    };

    VideoPlayer.$video.on('click', function(e){
      this.currentTime = this.duration;
    });

    VideoPlayer.$video.css({
      'position': 'absolute',
      'top': 0,
      'left': 0,
      'width': '100%',
      'height': '100%',
      'background': 'black'
    });

    $('body').append(VideoPlayer.$video);
  }

  static Load(sName = '', onEnded = null){

    VideoPlayer.Init();

    VideoPlayer.onEnded = onEnded;
    VideoPlayer.$video.show();
    VideoPlayer.$video.attr('src', 
      path.join(app_profile.directory, 'Movies', sName+'.m4v')  
    );
    VideoPlayer.$video.currentTime = 0;
    VideoPlayer.Play();

  }

  static Play(){
    VideoPlayer.$video[0].play();
  }

  static Pause(){
    VideoPlayer.$video[0].pause();
  }

}

module.exports = VideoPlayer;