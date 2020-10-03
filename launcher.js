const remote = require('electron').remote;
const app = remote.app;
app.allowRendererProcessReuse = false;
const {BrowserWindow, dialog} = require('electron').remote;
const {ipcRenderer} = require('electron');
const shell = require('electron').shell;
const fs = require('fs');
const path = require('path');
const request = require('request');

const profile_categories = {
  game: { name: 'Games', $list: undefined },
  tools: { name: 'Modding Tools', $list: undefined }
};

//Load in the launcher profiles
const profiles = {};
let _profiles = fs.readdirSync(path.join(app.getAppPath(), 'launcher/profiles'));
for(let i = 0; i < _profiles.length; i++){
  let _profilePath = path.parse(_profiles[i]);
  profiles[_profilePath.name] = require(path.join(app.getAppPath(), 'launcher/profiles', _profilePath.base));
  profiles[_profilePath.name].key = _profilePath.name;
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
  console.log(webview);
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

function buildProfileElement(profile = {}){

  profile = Object.assign({
    name: '',
    full_name: '',
    background: '',
    icon: '',
    steam_id: null,
    directory: null,
    launch: {
      type: "electron",
      path: "game.html",
      args: { gameChoice: 1 }
    },
    elements: [],
  }, profile);

  let tpl_listItem = `
<li class="launcher-option ${profile.key}">
  <span class="icon" style="background-image: url(${profile.icon});"></span>
  <a href="#${profile.key}" data-background="${profile.background}" data-icon="${profile.icon}">${profile.name}</a>
</li>`;

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
  <a href="#" class="btn-launch${ profile.directory ? '' : '' }"></a>
</div>`;

  let $listItem = $(tpl_listItem);
  let $launcherEle = $(tpl_launcherTab);

  profile.nodes = {
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
  let max = $('.launcher-contents').width() - profile.nodes.$promoElements.width();
  let canScroll = false;

  profile.nodes.$promoElements.css({'margin-left': 0, position: 'absolute'});

  let updateScroll = function(){
    max = $('.launcher-contents').width() - profile.nodes.$promoElements.width();

    if(max > 0){
      canScroll = false;
      offset = 0;
      profile.nodes.$promoElements.css({ marginLeft: offset, position: 'absolute' });
    }else{
      canScroll = true;
    }
  }

  let updateScrollButtons = function(){
    profile.nodes.$promoElementsWrapper.removeClass('scroll-left').removeClass('scroll-right');
    max = $('.launcher-contents').width() - profile.nodes.$promoElements.width();
    let marginLeft = parseInt(profile.nodes.$promoElements.css('margin-left'));
    if(canScroll){
      if(marginLeft < 0){
        profile.nodes.$promoElementsWrapper.addClass('scroll-left');
      }

      if(marginLeft > max){
        profile.nodes.$promoElementsWrapper.addClass('scroll-right');
      }
    }
  }

  $(window).on('resize', function(){
    updateScroll();
    updateScrollButtons();
  });

  profile.nodes.$promoLeft.on('click', function(e){
    if(!canScroll)
      return;

    offset += 320;

    if(offset >= 0)
      offset = 0;

    profile.nodes.$promoElements.css({ marginLeft: offset, position: 'absolute' });

    updateScrollButtons();
  });

  profile.nodes.$promoRight.on('click', function(e){
    if(!canScroll)
      return;

    offset -= 320;

    let max = $('.launcher-contents').width() - profile.nodes.$promoElements.width();

    if(Math.abs(offset) >= max)
      offset = max;

    profile.nodes.$promoElements.css({ marginLeft: offset, position: 'absolute' });

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

  });

  $('a.btn-launch', $launcherEle).on('click', function(e){
    e.preventDefault();
    let $btn = $(this);
    if($btn.hasClass('locate') && !profile.directory){
      dialog.showOpenDialog({title: 'KotOR Game Install Folder', properties: ['openDirectory',]}).then(result => {
        console.log(result.canceled);
        console.log(result.filePaths);
        if(result.filePaths.length && !result.canceled){
          profile.directory = result.filePaths[0];
          $btn.removeClass('locate');
        }
      }).catch(err => {
        alert(err);
      });
    }else{
      let clean_profle = Object.assign({}, profile);
      delete clean_profle.nodes;
      console.log(clean_profle);
      ipcRenderer.send('launch_profile', clean_profle);
    }
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

          profile.nodes.$logo.attr('src', `https://steamcdn-a.akamaihd.net/steam/apps/${profile.steam_id}/logo.png?t=1437496165`);

          if(app_data.screenshots && app_data.screenshots.length){

            //Gallery element
            let $promoElement = $(elementParser({ 
              type: 'gallery', 
              images: app_data.screenshots 
            }));
            profile.nodes.$promoElements.append($promoElement);
            $promoElement.hide().fadeIn('slow');
            //Initialize the new element
            initPromoElement.call( $promoElement, $promoElement );

            //Buy from steam element
            /*let $promoElement2 = $(elementParser({ 
              type: 'webview', 
              url: `https://store.steampowered.com/widget/${profile.steam_id}/` 
            }));
            profile.nodes.$promoElements.append($promoElement2);
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

  profile_categories[profile.category].$list.append($listItem);
  //$('.launcher-options ul').append($listItem);
  $('.launcher-contents').append($launcherEle);

}

function setLauncherOption(id = 'kotor'){
  console.log('setLauncherOption', `.launcher-option.${id}`);
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
    console.log(id, $(id));
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

  setLauncherOption('kotor');
  $('body').fadeIn(1500);

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

});