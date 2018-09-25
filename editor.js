'use strict';
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

// In renderer process (web page).
const remote = require('electron').remote;
const app = remote.app;
const {BrowserWindow} = require('electron').remote;
const {ipcRenderer} = require('electron');
const {Menu, MenuItem} = remote;
const {dialog} = require('electron').remote;
const fs = require('fs');
const path = require('path');
//const jBinary = require('jbinary');
const Signal = require('signals');
const MD5 = require('blueimp-md5');
const Int64 = require('node-int64');
//const pcm = require('pcm-util');
const recursive = require('recursive-readdir');
const StringDecoder = require('string_decoder').StringDecoder;

const Games = {
  KOTOR: 1,
  TSL: 2
}

const IMAGE_TYPE = {
  TPC: 0,
  TGA: 1,
  PNG: 2,
  JPG: 3
}

let _Game = Games.KOTOR;
let GameKey = 'KOTOR';

/* Library Includes */
const Utility = require(path.join(app.getAppPath(), 'js/Utility.js'));
const Mouse = require(path.join(app.getAppPath(), 'js/Mouse.js'));

const BinaryReader = require(path.join(app.getAppPath(), 'js/BinaryReader.js'));
const BinaryWriter = require(path.join(app.getAppPath(), 'js/BinaryWriter.js'));
//const ffmpeg = require("ffmpeg.js");




const ConfigManager = require(path.join(app.getAppPath(), 'js/ConfigManager.js'));
const TemplateEngine = require(path.join(app.getAppPath(), 'js/TemplateEngine.js'));
const NotificationManager = require(path.join(app.getAppPath(), 'js/editor/NotificationManager.js'));


const Wizard = require(path.join(app.getAppPath(), 'js/editor/Wizard.js'));
const Modal = require(path.join(app.getAppPath(), 'js/editor/Modal.js'));
const Project = require(path.join(app.getAppPath(), 'js/editor/Project.js'));
const GameFinderWizard = require(path.join(app.getAppPath(), 'js/editor/GameFinderWizard.js'));
const NewProjectWizard = require(path.join(app.getAppPath(), 'js/editor/NewProjectWizard.js'));
const LevelSelectWizard = require(path.join(app.getAppPath(), 'js/editor/LevelSelectWizard.js'));
const ObjectPropertiesWizard = require(path.join(app.getAppPath(), 'js/editor/ObjectPropertiesWizard.js'));
const TemplateResRefPickerWizard = require(path.join(app.getAppPath(), 'js/editor/TemplateResRefPickerWizard.js'));
const CExoLocStringWizard = require(path.join(app.getAppPath(), 'js/editor/CExoLocStringWizard.js'));
const CExoLocSubStringWizard = require(path.join(app.getAppPath(), 'js/editor/CExoLocSubStringWizard.js'));
const CreatureAppearanceWizard = require(path.join(app.getAppPath(), 'js/editor/CreatureAppearanceWizard.js'));
const ConfigWizard = require(path.join(app.getAppPath(), 'js/editor/ConfigWizard.js'));
const {TreeView} = require(path.join(app.getAppPath(), 'js/editor/TreeView.js'));
const {TreeViewNode} = require(path.join(app.getAppPath(), 'js/editor/TreeView.js'));
const EditorControls = require(path.join(app.getAppPath(), 'js/editor/EditorControls.js'));
const ModelViewerControls = require(path.join(app.getAppPath(), 'js/editor/ModelViewerControls.js'));

const LoadingScreen = require(path.join(app.getAppPath(), 'js/LoadingScreen.js'));
const FileTypeManager = require(path.join(app.getAppPath(), 'js/FileTypeManager.js'));
const FileLoader = require(path.join(app.getAppPath(), 'js/FileLoader.js'));
const VerticalTabs = require(path.join(app.getAppPath(), 'js/editor/VerticalTabs.js'));

const MaterialCache = require(path.join(app.getAppPath(), 'js/MaterialCache.js'));
const GameInitializer = require(path.join(app.getAppPath(), 'js/GameInitializer.js'));
const OffscreenRenderer = require(path.join(app.getAppPath(), 'js/OffscreenRenderer.js'));
const AppearanceLoader = require(path.join(app.getAppPath(), 'js/AppearanceLoader.js'));


/* Aurora */
const ResourceTypes = require(path.join(app.getAppPath(), 'js/ResourceTypes.js'));
const ResourceTypeInfo = require(path.join(app.getAppPath(), 'js/ResourceTypeInfo.js'));
const ResourceLoader = require(path.join(app.getAppPath(), 'js/ResourceLoader.js'));

const AuroraFile = require(path.join(app.getAppPath(), 'js/aurora/AuroraFile.js'));
const AuroraModel = require(path.join(app.getAppPath(), 'js/aurora/AuroraModel.js'));
const AuroraModelNode = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNode.js'));
const AuroraModelNodeAABB = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeAABB.js'));
const AuroraModelNodeDangly = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeDangly.js'));
const AuroraModelNodeEmitter = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeEmitter.js'));
const AuroraModelNodeLight = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeLight.js'));
const AuroraModelNodeMesh = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeMesh.js'));
const AuroraModelNodeReference = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeReference.js'));
const AuroraModelNodeSkin = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeSkin.js'));
const AuroraModelAnimation = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelAnimation.js'));
const AuroraModelAnimationNode = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelAnimationNode.js'));

const PixelManager = require(path.join(app.getAppPath(), 'js/PixelManager.js'));

const TLKObject = require(path.join(app.getAppPath(), 'js/TLKObject.js'));
const TLKString = require(path.join(app.getAppPath(), 'js/TLKString.js'));
const GFFObject = require(path.join(app.getAppPath(), 'js/GFFObject.js')).GFFObject;
const GFFDataTypes = require(path.join(app.getAppPath(), 'js/GFFObject.js')).GFFDataTypes;
const Struct = require(path.join(app.getAppPath(), 'js/GFFObject.js')).Struct;
const Field = require(path.join(app.getAppPath(), 'js/GFFObject.js')).Field;
const CExoLocString = require(path.join(app.getAppPath(), 'js/GFFObject.js')).CExoLocString;
const CExoLocSubString = require(path.join(app.getAppPath(), 'js/GFFObject.js')).CExoLocSubString;
const KEYObject = require(path.join(app.getAppPath(), 'js/KEYObject.js'));
const BIFObject = require(path.join(app.getAppPath(), 'js/BIFObject.js'));
const ERFObject = require(path.join(app.getAppPath(), 'js/ERFObject.js'));
const RIMObject = require(path.join(app.getAppPath(), 'js/RIMObject.js'));
const LYTObject = require(path.join(app.getAppPath(), 'js/LYTObject.js'));
const UTCObject = require(path.join(app.getAppPath(), 'js/UTCObject.js'));
const UTDObject = require(path.join(app.getAppPath(), 'js/UTDObject.js'));
const UTIObject = require(path.join(app.getAppPath(), 'js/UTIObject.js'));
//const UTMObject = require(path.join(app.getAppPath(), 'js/UTMObject.js'));
const UTPObject = require(path.join(app.getAppPath(), 'js/UTPObject.js'));
const UTSObject = require(path.join(app.getAppPath(), 'js/UTSObject.js'));
const UTTObject = require(path.join(app.getAppPath(), 'js/UTTObject.js'));
const UTWObject = require(path.join(app.getAppPath(), 'js/UTWObject.js'));
const VISObject = require(path.join(app.getAppPath(), 'js/VISObject.js'));
const TPCObject = require(path.join(app.getAppPath(), 'js/TPCObject.js'));
const TGAObject = require(path.join(app.getAppPath(), 'js/TGAObject.js'));
const TwoDAObject = require(path.join(app.getAppPath(), 'js/TwoDAObject.js'));



const TXI = require(path.join(app.getAppPath(), 'js/TXI.js'));
const AnimatedTexture = require(path.join(app.getAppPath(), 'js/AnimatedTexture.js'));
const NWScript = require(path.join(app.getAppPath(), 'js/nwscript/NWScript.js'));
const NWScriptStack = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptStack.js'));
const NWScriptInstruction = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptInstruction.js'));
const NWScriptBlock = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptBlock.js'));
const NWScriptDef = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptDef.js'));
const NWScriptDefK1 = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptDefK1.js'));
const NWScriptDefK2 = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptDefK2.js'));

/* EDITOR TABS */
const EditorTabManager = require(path.join(app.getAppPath(), 'js/editor/EditorTabManager.js'));
const EditorTab = require(path.join(app.getAppPath(), 'js/editor/EditorTab.js'));

const GFFEditorTab = require(path.join(app.getAppPath(), 'js/tabs/GFFEditorTab.js'));
const DLGEditorTab = require(path.join(app.getAppPath(), 'js/tabs/DLGEditorTab.js'));
const UTCEditorTab = require(path.join(app.getAppPath(), 'js/tabs/UTCEditorTab.js'));
const UTPEditorTab = require(path.join(app.getAppPath(), 'js/tabs/UTPEditorTab.js'));
const UTDEditorTab = require(path.join(app.getAppPath(), 'js/tabs/UTDEditorTab.js'));
const ScriptEditorTab = require(path.join(app.getAppPath(), 'js/tabs/ScriptEditorTab.js'));
const ModuleEditorTab = require(path.join(app.getAppPath(), 'js/tabs/ModuleEditorTab.js'));
const QuickStartTab = require(path.join(app.getAppPath(), 'js/tabs/QuickStartTab.js'));
const TwoDAEditorTab = require(path.join(app.getAppPath(), 'js/tabs/TwoDAEditorTab.js'));
const ImageViewerTab = require(path.join(app.getAppPath(), 'js/tabs/ImageViewerTab.js'));
const ModelViewerTab = require(path.join(app.getAppPath(), 'js/tabs/ModelViewerTab.js'));

/* Module */
const ModuleObject = require(path.join(app.getAppPath(), 'js/module/ModuleObject.js'));
const Module = require(path.join(app.getAppPath(), 'js/module/Module.js'));
const ModuleArea = require(path.join(app.getAppPath(), 'js/module/ModuleArea.js'));
const ModuleCreatureController = require(path.join(app.getAppPath(), 'js/module/ModuleCreatureController.js'));
const ModuleCamera = require(path.join(app.getAppPath(), 'js/module/ModuleCamera.js'));
const ModuleDoor = require(path.join(app.getAppPath(), 'js/module/ModuleDoor.js'));
const ModuleRoom = require(path.join(app.getAppPath(), 'js/module/ModuleRoom.js'));
const ModuleItem = require(path.join(app.getAppPath(), 'js/module/ModuleItem.js'));
const ModuleSound = require(path.join(app.getAppPath(), 'js/module/ModuleSound.js'));
const ModuleTrigger = require(path.join(app.getAppPath(), 'js/module/ModuleTrigger.js'));
const ModuleCreature = require(path.join(app.getAppPath(), 'js/module/ModuleCreature.js'));
const ModuleWaypoint = require(path.join(app.getAppPath(), 'js/module/ModuleWaypoint.js'));
//const ModuleMerchant = require(path.join(app.getAppPath(), 'js/module/ModuleMerchant.js'));
const ModulePlaceable = require(path.join(app.getAppPath(), 'js/module/ModulePlaceable.js'));
const ModulePath = require(path.join(app.getAppPath(), 'js/module/ModulePath.js'));

/* Module MiniGame Objects */

const ModuleMGTrack = require(path.join(app.getAppPath(), 'js/module/ModuleMGTrack.js'));
const ModuleMGPlayer = require(path.join(app.getAppPath(), 'js/module/ModuleMGPlayer.js'));
const ModuleMGEnemy = require(path.join(app.getAppPath(), 'js/module/ModuleMGEnemy.js'));
const ModuleMGObstacle = require(path.join(app.getAppPath(), 'js/module/ModuleMGObstacle.js'));

const LightManager = require(path.join(app.getAppPath(), 'js/LightManager.js'));

//Class Initiators
const Notification = new NotificationManager();
const Template = new TemplateEngine();
const InlineAudioPlayer = require(path.join(app.getAppPath(), 'js/editor/InlineAudioPlayer.js'));
const AudioFile = require(path.join(app.getAppPath(), 'js/audio/AudioFile.js'));
const AudioLoader = require(path.join(app.getAppPath(), 'js/audio/AudioLoader.js'));
const ADPCMDecoder = require(path.join(app.getAppPath(), 'js/audio/ADPCMDecoder.js'));
const ADPCMBlock = require(path.join(app.getAppPath(), 'js/audio/ADPCMBlock.js'));
const AudioEngine = require(path.join(app.getAppPath(), 'js/audio/AudioEngine.js'));
const AudioEmitter = require(path.join(app.getAppPath(), 'js/audio/AudioEmitter.js'));

const TextureLoader = require(path.join(app.getAppPath(), 'js/TextureLoader.js'));
const TemplateLoader = require(path.join(app.getAppPath(), 'js/TemplateLoader.js'));

let inlineAudioPlayer =  new InlineAudioPlayer();
//let offscreenRenderer = new OffscreenRenderer();


const ModelCache = { models:{} };

let ControllerType = {
  Position             : 8,
  Orientation          : 20,
  Scale                : 36,
  Color                : 76,
  Radius               : 88,
  ShadowRadius         : 96,
  VerticalDisplacement : 100,
  Multiplier           : 140,
  AlphaEnd             : 80,
  AlphaStart           : 84,
  BirthRate            : 88,
  Bounce_Co            : 92,
  ColorEnd             : 380,
  ColorStart           : 392,
  CombineTime          : 96,
  Drag                 : 124,
  FPS                  : 104,
  FrameEnd             : 108,
  FrameStart           : 112,
  Grav                 : 116,
  LifeExp              : 120,
  Mass                 : 116,
  Threshold            : 164,
  P2P_Bezier2          : 128,
  P2P_Bezier3          : 132,
  ParticleRot          : 136,
  RandVel              : 140,
  SizeStart            : 144,
  SizeEnd              : 148,
  SizeStart_Y          : 152,
  SizeEnd_Y            : 156,
  Spread               : 160,
  Threshold            : 164,
  Velocity             : 168,
  XSize                : 172,
  YSize                : 176,
  BlurLength           : 204,
  LightningDelay       : 184,
  LightningRadius      : 188,
  LightningScale       : 192,
  Detonate             : 228,
  AlphaMid             : 216,
  ColorMid             : 284,
  PercentStart         : 220,
  PercentMid           : 224,
  PercentEnd           : 228,
  SizeMid              : 232,
  SizeMid_Y            : 236,
  SelfIllumColor       : 100,
  Alpha                : 132
}

const Engine = require(path.join(app.getAppPath(), 'js/Engine.js')); 
let Game = require(path.join(app.getAppPath(), 'js/game/kotor/KOTOR.js')); 
Game.ModelLoader = new THREE.MDLLoader();
Game.audioEngine = new AudioEngine();
Game.emitters = {};
Game.group = {
  creatures: new THREE.Group(),
  doors: new THREE.Group(),
  placeables: new THREE.Group(),
  rooms: new THREE.Group(),
  sounds: new THREE.Group(),
  triggers: new THREE.Group(),
  waypoints: new THREE.Group(),
  party: new THREE.Group(),
  lights: new THREE.Group(),
  light_helpers: new THREE.Group(),
  emitters: new THREE.Group(),
  stunt: new THREE.Group()
};

LightManager.init();

let Config = new ConfigManager('./settings.json');
let Global = remote.getCurrentWebContents().MyGlobal;
let Clipboard = null;

let objProps = new ObjectPropertiesWizard({
  autoShow: false
});

let AnimatedTextures = [];

Global.templates = {
  placeable: []
};

let generateLM = function (size = 1, channels = 4){
  let width, height;
  width = height = size;
  let pixelCount = width * height * channels;
  let pixels = [];
  for(let i = 0; i < pixelCount; i+=channels){

    for(let p = 0; p < channels; p++){
      pixels[i + p] = 255;
    }

  }
  //console.log('lm', pixels);
  return new Uint8Array(pixels);

};

let GlobalLightmap = generateLM();

for (var key in Global) {
  if (Global.hasOwnProperty(key)) {
    if(typeof Global[key] !== 'undefined' && Global[key] != null){

      if(Global[key].hasOwnProperty('ClassName')){

        console.log('ClassName', Global[key]['ClassName']);
        try{
          switch (Global[key]['ClassName']) {
            case "Project":
              Global[key].__proto__ = Project.prototype;//= Object.assign(new Project(), Global[key]);
              break;
          }
          console.log(Global[key]);
        }catch(ex){
          console.log('Class Convert Failed', ex);
        }
      }
    }else{
      console.log('IsNULL', Global[key]);
    }
  }
}

//let Global = remote.process.myGlobal;

if (typeof window.TopMenu == 'undefined') {
    window.TopMenu = {
      title: 'KotOR Forge',
      items: [
        {name: 'File', items: [
          {name: 'Open Project', onClick: () => {
            let toOpen = dialog.showOpenDialog({
              properties: ['openFile'],
              filters: [
                {name: 'KForge Project', extensions: ['json']}
            ]});
            Global.Project = new Project(path.dirname(toOpen[0]));
            Global.Project.Open(() => {

              loader.SetMessage("Loading Complete");
              //Fade out the loading screen because the app is ready
              loader.Dismiss();
            });
          }},
          {name: 'New Project', onClick: () => {
            let newProjectWizard = new NewProjectWizard();
            newProjectWizard.Show();
          }},
          {name: 'Save Project'},
          {name: 'Close Project', onClick: () => {
            Global.Project = undefined;
            for(let i = 0; i < tabManager.tabs.length; i++){
              tabManager.tabs[i].Remove();
            }
            tabManager.AddTab(new QuickStartTab());
          }},
          {type: 'separator'},
          {name: 'New File'},
          {name: 'Open File', onClick: function(){
            dialog.showOpenDialog(
              {
                title: 'Open File',
                filters: [
                  {name: 'All Formats', extensions: ['*']},
                  {name: 'TPC Image', extensions: ['tpc']},
                  {name: 'TGA Image', extensions: ['tga']},
                  {name: 'GFF', extensions: ['gff']},
                  {name: 'Creature Template', extensions: ['utc']},
                  {name: 'Door Template', extensions: ['utd']},
                  {name: 'Placeable Template', extensions: ['utp']},
                  {name: 'Merchant Template', extensions: ['utm']},
                  {name: 'Sound Template', extensions: ['uts']},
                  {name: 'Trigger Template', extensions: ['utt']},
                  {name: 'Waypoint Template', extensions: ['utw']}
              ]}, 
              (paths) => {
                if(paths.length){
                  let filename = paths[0].split(path.separator).pop();
                  let fileParts = filename.split('.');

                  FileTypeManager.onOpenFile({path: paths[0], filename: filename, name: fileParts[0], ext: fileParts[1]});
                }
              }
            );
          }},
          {name: 'Save File'},
          {name: 'Save All Files'},
          {name: 'Close File'},
          {type: 'separator'},
          {name: 'Recent Projects', type: 'title'},
          {type: 'separator'},
          {name: 'Exit', onClick: function(){
            window.canUnload = true;
            ipcRenderer.send('CloseMain', true);
          }}
        ]},
        {name: 'View', items: [
          {name: 'Left Pane Toggle', onClick: () => {
            $('#container').layout().toggle('west');
          }},
          {name: 'Right Pane Toggle', onClick: () => {
            $('#container').layout().toggle('east');
          }},
          {name: 'Audio Player Toggle', onClick: () => {
            if(inlineAudioPlayer.IsVisible()){
              inlineAudioPlayer.Hide();
            }else{
              inlineAudioPlayer.Show();
            }
          }},{name: 'Audio Engine Toggle Mute', onClick: () => {
            AudioEngine.ToggleMute();
          }},
          {name: 'Module Editor Toggle', onClick: () => {
            if(typeof window.project !== 'undefined'){
              let moduleEditorTab = tabManager.GetTabByType('ModuleEditorTab');
              if(moduleEditorTab){
                tabManager.RemoveTab(moduleEditorTab);
              }else{
                moduleEditorTab= new ModuleEditorTab();
                tabManager.AddTab(moduleEditorTab);
                moduleEditorTab.Init();
              }
            }
          }},
          {name: 'Test: Image Viewer', onClick: () => {
            let imageViewerTab= new ImageViewerTab();
            tabManager.AddTab(imageViewerTab);
            imageViewerTab.Init();
          }}
        ]},
        {name: 'Settings', onClick: function(){
          let configWizard = new ConfigWizard();
        }}
      ]
    };
}

function BuildTopMenu() {

  let $newMenu = $('<nav class="top-menu navbar navbar-default" role="navigation">'+
    '<div class="menu-accent"><span class="inner"></span></div>'+
    '<b id="app-title"></b>'+
    '<div class="navbar-header">'+
      '<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">'+
        '<span class="icon-bar"></span>'+
        '<span class="icon-bar"></span>'+
        '<span class="icon-bar"></span>'+
      '</button>'+
    '</div>'+
    '<div class="navbar-collapse collapse">'+
      '<ul id="topmenu-left" class="nav navbar-nav navbar-left">'+
      '</ul>'+
      '<ul id="topmenu-right" class="nav navbar-nav navbar-right">'+
        '<li><a href="#" id="devtools-toggle"><span class="glyphicon glyphicon-cog"></span></a></li>'+
        '<li><a href="#" id="minimize-toggle"><span class="glyphicon glyphicon-minus"></span></a></li>'+
        '<li><a href="#" id="maximize-toggle"><span class="glyphicon glyphicon-resize-full"></span></a></li>'+
        '<li><a href="#" id="close-toggle"><span class="glyphicon glyphicon-remove"></span></a></li>'+
      '</ul>'+
    '</div>'+
  '</nav>');

  if (typeof window.TopMenu.title == 'undefined') {
    window.TopMenu.title = 'KotOR Modding Suite';
  }

  Object.defineProperty(window.TopMenu, 'windowTitle', {
    get: function() {
      return windowTitle;
    },
    set: function(windowTitle) {
      $('b#app-title', $newMenu).text(windowTitle);
    }
  });

  $('body').prepend($newMenu);

  $('b#app-title', $newMenu).text(window.TopMenu.title);

  $.each(window.TopMenu.items, function(i, item){
    BuildMenuItem(item, null)
  });

}

function BuildMenuItem(item, $parent){
  let topLevel = false;
  let $item;
  if($parent == null){
    topLevel = true;
    $parent = $('#topmenu-left');
  }

  if (typeof item.type == 'undefined') {
    item.type = 'item';
  }

  if (typeof item.name == 'undefined') {
    item.name = '';
  }

  //Build Item
  if(item.type === 'separator' || item.type === 'sep')
    $item = $('<li role="separator" class="divider" />');
  else if(item.type === 'title')
    $item = $('<li class="title">'+item.name+'</li>');
  else
    $item = $('<li><a href="#">'+item.name+'</a></li>');

  $parent.append($item);

  //Set onClick Event
  if (typeof item.onClick !== 'undefined') {
    $item.on('click', item.onClick);
  }else{
    $item.on('click', function(e){
      e.preventDefault();
    });
  }

  //If there are child items
  if(typeof item.items !== 'undefined'){
    if(item.items.length){
      $parent = $('<ul class="dropdown-menu"/>');
      $item.append($parent);
      $item.addClass('dropdown');
      $('a', $item).addClass('dropdown-toggle').attr('data-toggle','dropdown').attr('role','button').attr('aria-haspopup','true').attr('aria-expanded','false');
    }

    $.each(item.items, function(i, cItem){
      BuildMenuItem(cItem, $parent)
    });
  }

}

BuildTopMenu();

const loader = new LoadingScreen();
const devtoolsToggle = document.getElementById("devtools-toggle");
const minimizeToggle = document.getElementById("minimize-toggle");
const maximizeToggle = document.getElementById("maximize-toggle");
const closeToggle = document.getElementById("close-toggle");

//Custom Window Event Handlers
devtoolsToggle.onclick = () => {
  ipcRenderer.send('devtools-toggle', this);
};

minimizeToggle.onclick = () => {
  ipcRenderer.send('minimize-toggle', true);
};

maximizeToggle.onclick = () => {
  ipcRenderer.send('maximize-toggle', true);
};

closeToggle.onclick = () => {
  ipcRenderer.send('close-toggle', true);
};


$.fn.isVisible = function() {
    // Am I visible?
    // Height and Width are not explicitly necessary in visibility detection, the bottom, right, top and left are the
    // essential checks. If an image is 0x0, it is technically not visible, so it should not be marked as such.
    // That is why either width or height have to be > 0.
    var rect = this[0].getBoundingClientRect();
    return (
        (rect.height > 0 || rect.width > 0) &&
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.left <= (window.innerWidth || document.documentElement.clientWidth)
    );
};


function hasClass(el, className) {
  if (el.classList)
    return el.classList.contains(className)
  else
    return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
}

function addClass(el, className) {
  if (el.classList)
    el.classList.add(className)
  else if (!hasClass(el, className)) el.className += " " + className
}

function removeClass(el, className) {
  if (el.classList)
    el.classList.remove(className)
  else if (hasClass(el, className)) {
    var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
    el.className=el.className.replace(reg, ' ')
  }
}