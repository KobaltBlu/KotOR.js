const remote = require('electron').remote;
const app = remote.app;
const {BrowserWindow} = require('electron').remote;
const {ipcRenderer} = require('electron');
const shell = require('electron').shell;

function setLauncherOption(id = '#kotor'){
  let background = $('a[href="'+id+'"]').attr('data-background');
  let icon = $('a[href="'+id+'"]').attr('data-icon');

  $('.launcher-content').removeClass('active');
  $(id).addClass('active');
  $('#container').css({
    'background-image': 'url("'+background+'")'
  });

  $('.launcher-menu-background').css({
    'background-image': 'url("'+background+'")'
  });
}

document.onwebkitfullscreenchange = function ( event ) { 
  console.log(document.webkitFullscreenElement);
  console.log("FULL SCREEN CHANGE", event)
  if(document.webkitFullscreenElement == null){
    if(event.target instanceof HTMLVideoElement){
      event.target.volume = 0;
      event.target.loop = true;
      if(event.target.currentTime == event.target.duration){
        event.target.currentTime = 0;
      }
      event.target.play();
    }
  }
}; 

$( function() {

  $('a[href^="http"]').on('click', function(e) {
    e.preventDefault();
    shell.openExternal($(this).attr('href'));
  });

  $('.tab-btn a').on('click', function(e) {
    e.preventDefault();
    let id = $(this).attr('href');
    console.log(id, $(id));
    $('.tab').removeClass('selected');
   $(id).addClass('selected');

  });

  $('.launcher-option').each( function(){
    let icon = $('a', $(this)).attr('data-icon');
    $('span', $(this)).css({
      'background-image': 'url("'+icon+'")'
    });
  });

  $('.launcher-options a').on('click', function(e){
    e.preventDefault();
    $('.launcher-option').removeClass('selected');
    $(this).parent().addClass('selected');
    setLauncherOption($(this).attr('href'));    
  });

  $('#kotor a.btn-launch').on('click', function(e){
    e.preventDefault();
    ipcRenderer.send('run_game');
  });

  $('#kotor-2 a.btn-launch').on('click', function(e){
    e.preventDefault();
    ipcRenderer.send('run_game_ii');
  });

  $('#kotor-forge a.btn-launch').on('click', function(e){
    e.preventDefault();
    ipcRenderer.send('run_forge');
  });

  $('.launcher-min').on('click', function(e){
    e.preventDefault();
    remote.BrowserWindow.getFocusedWindow().minimize();
  });

  $('.launcher-max').on('click', function(e){
    e.preventDefault();
    if(remote.BrowserWindow.getFocusedWindow().isMaximized()){
      remote.BrowserWindow.getFocusedWindow().unmaximize();
    }else{
      remote.BrowserWindow.getFocusedWindow().maximize();
    }
  });

  $('.launcher-close').on('click', function(e){
    e.preventDefault();
    window.close();
  });

  $('.video').on('click', function(e){
    e.preventDefault();

    var elem = $('video', this)[0];
    if(elem === document.webkitFullscreenElement){
      if (elem.paused == false) {
        elem.pause();
      } else {
        elem.play();
      }
    }else{
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }

      //elem.currentTime = 0;
      elem.volume = 0.25;
      elem.loop = false;
    }

  });

  $(".video video").on('dblclick', function(e) {
    if($(this)[0] === document.webkitFullscreenElement){
      document.webkitExitFullscreen()
    }
  });

  setLauncherOption('#kotor');

});