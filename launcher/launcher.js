const isMac = process.platform === 'darwin';
const remote = require('electron').remote;
const app = remote.app;
app.allowRendererProcessReuse = false;
const {BrowserWindow, dialog} = require('electron').remote;
const {ipcRenderer} = require('electron');
const shell = require('electron').shell;
const fs = require('fs');
const path = require('path');
const request = require('request');

const ConfigManager = require(path.join(app.getAppPath(), 'js/ConfigManager.js'));
const Config = new ConfigManager('settings.json');

const profile_categories = {
  game: { name: 'Games', $list: null },
  tools: { name: 'Modding Tools', $list: null }
};

//Load in the launcher profiles
let profiles = Config.get('Profiles');

function initProfiles(){
  let _profiles = fs.readdirSync(path.join(app.getAppPath(), 'launcher/profiles'));
  for(let i = 0; i < _profiles.length; i++){
    let _profilePath = path.parse(_profiles[i]);
    let cached_profile = Config.get(['Profiles', _profilePath.name]);
    if(typeof cached_profile == 'undefined'){
      cached_profile = require(path.join(app.getAppPath(), 'launcher/profiles', _profilePath.base));
      cached_profile.key = _profilePath.name;
      cached_profile.sort = i;
      Config.set(['Profiles', _profilePath.name], cached_profile);
    }else{
      cached_profile = Object.assign(require(path.join(app.getAppPath(), 'launcher/profiles', _profilePath.base)), cached_profile);
      cached_profile.key = _profilePath.name;
      cached_profile.sort = i;
      Config.set(['Profiles', _profilePath.name], cached_profile);
    }
  }
  profiles = Config.get('Profiles');
}

function elementParser(element){

  let tpl_element = '';

  switch(element.type){
    case 'video':
      tpl_element = `
      <div class="promo-element video">
        <video src="${element.url}" onloadstart="this.volume=0" loop autoplay style="height: 250px;"></video>
      </div>`;
    break;
    case 'webview':
      tpl_element = `
      <div class="promo-element webview">
        <webview src="${element.url}" frameborder="0" width="646" height="190" allowpopups></webview>
      </div>`;
    break;
    case 'gallery':
      tpl_element = `
      <div class="promo-element gallery">
        <div class="gallery-left"><i class="fas fa-chevron-left"></i></div>
        <div class="gallery-images">
          ${element.images.map((image, i) => `<div class="gallery-image ${i == 0 ? 'active' : ''}" data-full="${image.path_full}" style="background-image: url(${image.path_thumbnail});"></div>` ).join('')}
        </div>
        <div class="gallery-right"><i class="fas fa-chevron-right"></i></div>
      </div>`;
    break;
  }

  return tpl_element;

}

function initVideoPromoElement($element){
  $element.on('click', function(e){
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

  $("video", $element).on('dblclick', function(e) {
    if($(this)[0] === document.webkitFullscreenElement){
      document.webkitExitFullscreen()
    }
  });
}

function initGalleryPromoElement($gallery){
  let $images = $('.gallery-image', $gallery);

  let $btnLeft = $('.gallery-left', $gallery);
  let $btnRight = $('.gallery-right', $gallery);

  $images.on('click', function(e){
    clearTimeout($gallery.timer);
    let $lightbox = $('#lightbox');
    $('body').removeClass('lightbox_open').addClass('lightbox_open');
    $lightbox.removeClass('active').addClass('active');
    $('.lightbox-content', $lightbox).css({
      backgroundImage: `url(${$(this).data('full')})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    });
  });

  $btnLeft.on('click', function(e) {
    clearTimeout($gallery.timer);
    let count = $('.gallery-images', $gallery).children().length;
    let $current = $('.gallery-image.active', $gallery);
    let index = $current.index() - 1;

    $images.removeClass('active');

    if(index <= 0)
      $($images.get(count - 1)).addClass('active');
    else
      $($images.get(index)).addClass('active');
  });

  $btnRight.on('click', function(e) {
    clearTimeout($gallery.timer);
    let count = $('.gallery-images', $gallery).children().length;
    let $current = $('.gallery-image.active', $gallery);
    let index = $current.index() + 1;

    $images.removeClass('active');

    if(index >= count)
      $($images.get(0)).addClass('active');
    else
      $($images.get(index)).addClass('active');
  });

  let cycle = function(){
    $btnRight.click();
    $gallery.timer = setTimeout(cycle, 2500);
  };
  cycle();

}

function initWebviewPromoElement($webview_wrapper){

  let webview = $('webview', $webview_wrapper)[0];
  if(webview){
    webview.getWebContents().on('will-navigate', (event, url) => {
      event.preventDefault();
      shell.openExternal(url);
    });
  }
}

function initPromoElement($element){

  if($(this).hasClass('initialized'))
    return;

  $(this).removeClass('initialized').addClass('initialized');

  if($(this).hasClass('video'))
    initVideoPromoElement($(this));

  if($(this).hasClass('gallery'))
    initGalleryPromoElement($(this));

  if($(this).hasClass('webview'))
    initWebviewPromoElement($(this));
}

function initPromoElements($wrapper){
  $('.promo-element', $wrapper).each( initPromoElement );
}

const profile_doms = { };

function buildProfileElement(profile = {}){

  profile = Config.get(['Profiles', profile.key]);

  profile = Object.assign({
    name: '',
    full_name: '',
    background: '',
    icon: '',
    steam_id: null,
    directory: null,
    executable: null,
    width: 1200,
    height: 600,
    launch: {
      type: "electron",
      path: "game.html",
      args: { gameChoice: 1 }
    },
    elements: [],
  }, profile);

  let tpl_listItem = `
<li class="launcher-option ${profile.key}" data-sort="${profile.sort}">
  <span class="icon" style="background-image: url(${profile.icon});"></span>
  <a href="#${profile.key}" data-background="${profile.background}" data-icon="${profile.icon}">${profile.name}</a>
</li>`;

  let executable_btn = '';
  if(profile.executable){
    executable_btn = `<a href="#" class="btn-launch-executable" data-executable="${ isMac ? profile.executable.mac : profile.executable.win }" title="Click here to launch the original game.">Launch Original</a>`;
  }

  let tpl_launch_locate = `<a href="#" class="btn-launch locate">Locate</a>`;

  let tpl_launch_buttons = `<a href="#" class="btn-launch">Launch</a> ${ executable_btn }`;

  let tpl_launcherTab = `
<div id="${profile.key}" class="launcher-content">
  <div class="logo-wrapper">
    <img class="logo" src="${ profile.steam_id ? `https://steamcdn-a.akamaihd.net/steam/apps/${profile.steam_id}/logo.png?t=1437496165` : profile.logo }" />
  </div>
  <div class="promo-elements">
    <div class="promo-elements-left"><i class="fas fa-chevron-left"></i></div>
    <div class="promo-elements-container">
      ${profile.elements.map((item, i) => elementParser(item).trim()).join('')}
    </div>
    <div class="promo-elements-right"><i class="fas fa-chevron-right"></i></div>
  </div>
  <div class="launch-btns">
    ${ !profile.directory && profile.locate_required ? tpl_launch_locate : tpl_launch_buttons }
  </div>
</div>`;

  let $listItem = $(tpl_listItem);
  let $launcherEle = $(tpl_launcherTab);
  let needsDomInsert = true;

  //Reset the profiles DOM elements if it was already created
  if(typeof profile_doms[profile.key] == 'object'){
    profile_doms[profile.key].$listItem.replaceWith($listItem);
    profile_doms[profile.key].$launcherEle.replaceWith($launcherEle);
    needsDomInsert = false;
  }

  //Reset the profile dom cache
  let profile_dom = profile_doms[profile.key] = {
    $listItem:      $listItem,
    $launcherEle:   $launcherEle,
    $logoWrapper:   $('.logo-wrapper', $launcherEle),
    $logo:          $('.logo-wrapper .logo', $launcherEle),
    $promoElementsWrapper: $('.promo-elements', $launcherEle),
    $promoElements: $('.promo-elements .promo-elements-container', $launcherEle),
    $promoLeft: $('.promo-elements .promo-elements-left', $launcherEle),
    $promoRight: $('.promo-elements .promo-elements-right', $launcherEle)
  };

  let offset = 0;
  let max = $('.launcher-contents').width() - profile_dom.$promoElements.width();
  let canScroll = false;

  profile_dom.$promoElements.css({'margin-left': 0, position: 'absolute'});

  let updateScroll = function(){
    max = $('.launcher-contents').width() - profile_dom.$promoElements.width();

    if(max > 0){
      canScroll = false;
      offset = 0;
      profile_dom.$promoElements.css({ marginLeft: offset, position: 'absolute' });
    }else{
      canScroll = true;
    }
  }

  let updateScrollButtons = function(){
    profile_dom.$promoElementsWrapper.removeClass('scroll-left').removeClass('scroll-right');
    max = $('.launcher-contents').width() - profile_dom.$promoElements.width();
    let marginLeft = parseInt(profile_dom.$promoElements.css('margin-left'));
    if(canScroll){
      if(marginLeft < 0){
        profile_dom.$promoElementsWrapper.addClass('scroll-left');
      }

      if(marginLeft > max){
        profile_dom.$promoElementsWrapper.addClass('scroll-right');
      }
    }
  }

  $(window).on('resize', function(){
    updateScroll();
    updateScrollButtons();
  });

  profile_dom.$promoLeft.on('click', function(e){
    if(!canScroll)
      return;

    offset += 320;

    if(offset >= 0)
      offset = 0;

    profile_dom.$promoElements.css({ marginLeft: offset, position: 'absolute' });

    updateScrollButtons();
  });

  profile_dom.$promoRight.on('click', function(e){
    if(!canScroll)
      return;

    offset -= 320;

    let max = $('.launcher-contents').width() - profile_dom.$promoElements.width();

    if(Math.abs(offset) >= max)
      offset = max;

    profile_dom.$promoElements.css({ marginLeft: offset, position: 'absolute' });

    updateScrollButtons();
  });

  initPromoElements($launcherEle);

  $('a', $listItem).on('click', function(e){
    e.preventDefault();

    $('.launcher-content').removeClass('active');
    $launcherEle.addClass('active');

    $('.launcher-option').removeClass('selected');
    $listItem.addClass('selected');

    $('#container').css({
      'background-image': `url("${profile.background}")`
    });

    updateScroll();
    updateScrollButtons();

    Config.set(['Launcher', 'selected_profile'], profile.key);
  });

  $('a.btn-launch', $launcherEle).on('click', function(e){
    e.preventDefault();
    let $btn = $(this);
    if($btn.hasClass('locate') && !profile.directory){
      dialog.showOpenDialog({title: 'KotOR Game Install Folder', properties: ['openDirectory',]}).then(result => {
        if(result.filePaths.length && !result.canceled){
          if(result.filePaths[0]){
            Config.set('Profiles.'+profile.key+'.directory', result.filePaths[0]);
          }
          buildProfileElement(Config.get('Profiles.'+profile.key));
          setLauncherOption(profile.key);
        }
      }).catch(err => {
        alert(err);
      });
    }else{
      let clean_profle = Object.assign({}, profile);
      ipcRenderer.send('launch_profile', clean_profle);
    }
  });

  $('a.btn-launch-executable', $launcherEle).on('click', function(e){
    e.preventDefault();
    ipcRenderer.send('launch_executable', path.join(profile.directory, $(this).attr('data-executable')) );
  });

  //Attempt to fetch steam data
  if(profile.steam_id){
    profile.logo = `https://steamcdn-a.akamaihd.net/steam/apps/${profile.steam_id}/logo.png`;
    request.get({
      url: `https://store.steampowered.com/api/appdetails?appids=${profile.steam_id}`,
      json: true,
      headers: {'User-Agent': 'request'}
    }, (err, res, data) => {
      if (err) {
        console.log('Error:', err);
      } else if (res.statusCode !== 200) {
        console.log('Status:', res.statusCode);
      } else {
        
        let app_data = data[profile.steam_id].data;
        if(app_data){

          profile_dom.$logo.attr('src', `https://steamcdn-a.akamaihd.net/steam/apps/${profile.steam_id}/logo.png?t=1437496165`);

          if(app_data.screenshots && app_data.screenshots.length){

            //Gallery element
            let $promoElement = $(elementParser({ 
              type: 'gallery', 
              images: app_data.screenshots 
            }));
            profile_dom.$promoElements.append($promoElement);
            $promoElement.hide().fadeIn('slow');
            //Initialize the new element
            initPromoElement.call( $promoElement, $promoElement );

            //Buy from steam element
            /*let $promoElement2 = $(elementParser({ 
              type: 'webview', 
              url: `https://store.steampowered.com/widget/${profile.steam_id}/` 
            }));
            profile_dom.$promoElements.append($promoElement2);
            $promoElement2.hide().fadeIn('slow');
            //Initialize the new element
            initPromoElement.call( $promoElement2, $promoElement2 );*/

            updateScroll();
            updateScrollButtons();

          }

        }

      }
    });
  }

  if(needsDomInsert){
    let profile_category = profile_categories[profile.category];
    if(profile_category){
      profile_category.$list.append($listItem);
      //$('.launcher-options ul').append($listItem);
      $('.launcher-contents').append($launcherEle);
    }else{
      console.error('profile_category', profile.category, profile);
    }
  }

}

function setLauncherOption(id = 'kotor'){
  $(`.launcher-option.${id} a`).click();
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
  
  initProfiles();

  $('.launcher-options').html('');
  for(let key in profile_categories){
    let category = profile_categories[key];
    category.$list = $(`<ul class="${key}"></ul>`);
    $('.launcher-options').append(`<h3>${category.name}</h3>`);
    $('.launcher-options').append(category.$list);
  }

  for(let key in profiles){
    let profile = profiles[key];
    buildProfileElement(profile);
  }

  $('a[href^="http"]').on('click', function(e) {
    e.preventDefault();
    shell.openExternal($(this).attr('href'));
  });

  $('.tab-btn a').on('click', function(e) {
    e.preventDefault();
    let id = $(this).attr('href');
    //console.log(id, $(id));
    $('.tab').removeClass('selected');
   $(id).addClass('selected');

  });

  $('.launcher-min').on('click', function(e){
    e.preventDefault();
    remote.BrowserWindow.getFocusedWindow().minimize();
  });

  $('.launcher-max').on('click', function(e){
    e.preventDefault();

    let win = remote.BrowserWindow.getFocusedWindow();
    if(win.isMaximized()){
      win.unmaximize();
    }else{
      win.maximize();
    }
  });

  $('.launcher-close').on('click', function(e){
    e.preventDefault();
    window.close();
  });

  $('.lightbox').each( function() {
    let $lightbox = $(this);

    let open = function(){
      $lightbox.removeClass('active').addClass('active');
      //return the lightbox so it can be chained
      return $lightbox;
    };

    let close = function(){
      $('body').removeClass('lightbox_open');
      $lightbox.removeClass('active');
      //return the lightbox so it can be chained
      return $lightbox;
    };

    let $close = $('.lightbox-close', $lightbox);
    $close.on('click', function(e){
      e.preventDefault();
      close();
    });

    $('.lightbox').on('click', function(e){
      e.preventDefault();
      close();
    });

  });

  initProfiles();

  window.addEventListener('focus', function(){
    if(window.app_loaded){
      initProfiles();
      let keys = Object.keys(profiles);
      for(let i = 0, len = keys.length; i < len; i++){
        buildProfileElement(profiles[keys[i]]);
      }
      setLauncherOption(Config.get(['Launcher', 'selected_profile'], 'kotor'));
    }
  });

  setLauncherOption(Config.get(['Launcher', 'selected_profile'], 'kotor'));
  $('body').fadeIn(1500);

  window.app_loaded = true;

});

//Window Resize Event: Update Config
( function(){
  let _resizeTimer = undefined;
  function resizeConfigManager(){
    _resizeTimer = setTimeout(function(){
      if(!remote.getCurrentWindow().isFullScreen()){
        Config.set(['Launcher', 'width'], window.outerWidth);
        Config.set(['Launcher', 'height'], window.outerHeight);
      }
    }, 500);
  }
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    resizeConfigManager();
  });
})();