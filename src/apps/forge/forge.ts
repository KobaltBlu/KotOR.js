import * as monaco from 'monaco-editor';
import { ApplicationEnvironment } from "../../enums/ApplicationEnvironment";
import { ConfigClient } from "../../utility/ConfigClient";

declare const KotOR: any;

const query = new URLSearchParams(window.location.search);
let env: ApplicationEnvironment;
let app_profile: any;
let _Game: any;
let GameKey: any;

const Games = {
  KOTOR: 1,
  TSL: 2
}

switch(query.get('key')){ 
  case 'kotor':
  case 'tsl':

  break;
  default:
    query.set('key', 'kotor');
  break;
}

if(window.location.origin === 'file://'){
  env = ApplicationEnvironment.ELECTRON;
}else{
  env = ApplicationEnvironment.BROWSER;
}

async function getProfile(){
  await ConfigClient.Init();
  return ConfigClient.get(`Profiles.${query.get('key')}`);
}

KotOR.Forge.tabManager = new KotOR.EditorTabManager();
const explorerTabManager = new KotOR.EditorTabManager();

const projectExplorerTab = new KotOR.ProjectExplorerTab();
const resourceExplorerTab = new KotOR.ResourceExplorerTab();

explorerTabManager.AttachTo($('#tabs-explorer'));

explorerTabManager.AddTab(resourceExplorerTab);
explorerTabManager.AddTab(projectExplorerTab);

resourceExplorerTab.Show();

KotOR.Forge.MenuTop.BuildTopMenu();
KotOR.Forge.tabManager.AttachTo($('#renderer-container #tabs-container'));

( async () => {
  await ConfigClient.Init();

  //@ts-expect-error
  $('#container').layout({
    applyDefaultStyles: false,
    west__spacing_open:		8,		// no resizer-bar when open (zero height)
    west__spacing_closed:		14,		// big resizer-bar when open (zero height)
    'onopen': (pane: any) => {
      switch(pane){
        case 'west':
          ConfigClient.options.Panes.left.open = true;
        break;
        case 'east':
          ConfigClient.options.Panes.right.open = true;
        break;
      }
      ConfigClient.save(undefined, true);
    },
    'onclose': (pane: any) => {
      switch(pane){
        case 'west':
          ConfigClient.options.Panes.left.open = false;
        break;
        case 'east':
          ConfigClient.options.Panes.right.open = false;
        break;
      }
      ConfigClient.save(undefined, true);
    },
    'onresize_end': (pane: any) => {
      //Make sure the ModuleEditorTab canvas is updated on resize
      KotOR.Forge.tabManager.TriggerResize();
      /*switch(pane){
        case 'center':
          //Make sure the ModuleEditorTab canvas is updated on resize
          tabManager.TriggerResize();
        break;
      }*/
    }
  });


  window.addEventListener('resize', () => {
    try{
      //tabManager.TriggerResize();
    }catch(e){
      console.error(e);
    }
  });

  if(!ConfigClient.options.Panes.left.open){
    //@ts-expect-error
    $('#container').layout().close('west');
  }

  if(!ConfigClient.options.Panes.right.open){
    //@ts-expect-error
    $('#container').layout().close('east');
  }

  $(window).on('keyup', (e) => {
    if(e.keyCode == 83 && e.ctrlKey == true){
      if(e.shiftKey == true){
        const target = KotOR.Forge.TopMenu.items[0].items.find( (item: any) => item.name == 'Save File As' );
        if(target && typeof target.onClick == 'function') target.onClick(); 
      }else{
        const target = KotOR.Forge.TopMenu.items[0].items.find( (item: any) => item.name == 'Save File' );
        if(target && typeof target.onClick == 'function') target.onClick(); 
      }
    }else if(e.keyCode == 67 && e.ctrlKey == true && e.ctrlKey == true && e.shiftKey == true){
      const target = KotOR.Forge.TopMenu.items[0].items.find( (item: any) => item.name == 'Compile File' );
      if(target && typeof target.onClick == 'function') target.onClick(); 
    }
  });

  

  //Window Resize Event: Update Config
  ( function(){
    let _resizeTimer: any = undefined;
    function resizeConfigManager(){
      _resizeTimer = setTimeout(function(){
        // if(!remote.getCurrentWindow().isFullScreen()){
          // ConfigClient.set(['Profiles', window_profile.key, 'width'], window.outerWidth);
          // ConfigClient.set(['Profiles', window_profile.key, 'height'], window.outerHeight);
        // }
      }, 500);
    }
    window.addEventListener('resize', () => {
      clearTimeout(_resizeTimer);
      resizeConfigManager();
    });
  })();

  const initializeApp = function(){
    KotOR.ApplicationProfile.ENV = env;
    if(env == ApplicationEnvironment.ELECTRON){
      KotOR.ApplicationProfile.directory = KotOR.GameFileSystem.rootDirectoryPath = app_profile.directory;
    }else{
      KotOR.GameFileSystem.rootDirectoryHandle = app_profile.directory_handle;
    }
    console.log('loading game...')
    KotOR.LoadingScreen.main.SetLogo(app_profile.logo);
    KotOR.LoadingScreen.main.SetBackgroundImage(app_profile.background);
    KotOR.LoadingScreen.main.Show();
    KotOR.GameState.GameKey = GameKey;
    KotOR.GameInitializer.Init({
      game: GameKey,
      onLoad: () => {
        KotOR.OdysseyWalkMesh.Init();
        KotOR.LightManager.toggleLightHelpers(ConfigClient.get('Game.debug.light_helpers') ? true : false);
              
        resourceExplorerTab.initialize( () => {
          KotOR.LoadingScreen.main.Hide();
          setTimeout( () => {
            KotOR.LoadingScreen.main.loader.style.display = 'none';
          }, 500);
          KotOR.Forge.tabManager.AddTab(new KotOR.QuickStartTab());
        });

        // console.log('loaded')
        // KotOR.GameState.OpeningMoviesComplete = true;
        // KotOR.GUIListBox.InitTextures();
        // KotOR.OdysseyWalkMesh.Init();
        // KotOR.GameState.Init();
        // KotOR.GameState.audioEngine.musicGain.gain.value = 0;
        // document.body.append(KotOR.GameState.stats.domElement)
      }
    });
  };

  async function showRequestDirectoryDialog(){
    let handle = await window.showDirectoryPicker({
      mode: "readwrite"
    });
    if(handle){
      if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
        return handle;
      }
    }
    return;
  }

  async function spawnRequestDirectory(){
    let modal = document.getElementById('modal-grant-access');
    let btnGrant = document.getElementById('btn-grant-access');
    let btnQuit = document.getElementById('btn-quit');
    if(modal){
      modal?.classList.remove('show');
      modal?.classList.add('show');

      btnGrant?.addEventListener('click', async function(e: any) {
        let handle = await showRequestDirectoryDialog();
        if(handle){
          KotOR.GameFileSystem.rootDirectoryHandle = handle;
          ConfigClient.set(`Profiles.${app_profile.key}.directory_handle`, handle);
          modal?.classList.remove('show');
          initializeApp();
        }
      });

      btnQuit?.addEventListener('click', async function(e: any) {
        window.close();
      });
    }
  }

  async function validateDirectoryHandle(handle: FileSystemDirectoryHandle){
    if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
      return true;
    }
    return false;
  }

  ( async () => {

    app_profile = await getProfile();
    
    switch(app_profile.launch.args.gameChoice){
      case 2:
        _Game = Games.TSL;
        GameKey = 'TSL';
      break;
      default:
        _Game = Games.KOTOR;
        GameKey = 'KOTOR';
      break;
    }

    if(env == ApplicationEnvironment.ELECTRON){
      initializeApp();
    }else{
      if(KotOR.GameFileSystem.rootDirectoryHandle){
        let validated = await validateDirectoryHandle(KotOR.GameFileSystem.rootDirectoryHandle);
        if(validated){
          initializeApp();
        }else{
          spawnRequestDirectory();
        }
      }else{
        spawnRequestDirectory();
      }
    }

  })();

})();