'use strict';
require('v8-compile-cache');
const obj_undefined = 2130706432;
const partySlot0 = 2147483647;
const partySlot1 = 2147483646;
const partySlot2 = 2147483645;

var saturationShader = {
  uniforms: {
    "tDiffuse": { type: "t", value: null },
    "saturation": { type: "f", value: 1.0 },
  },
  vertexShader: [
    "varying vec2 vUv;",
    "void main() {",
      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
    "}"
  ].join("\n"),
  fragmentShader: [
    "uniform sampler2D tDiffuse;",
    "varying vec2 vUv;",
    "uniform float saturation;",
    "void main() {",
      "vec3 original_color = texture2D(tDiffuse, vUv).rgb;",
      "vec3 lumaWeights = vec3(.25,.50,.25);",
      "vec3 grey = vec3(dot(lumaWeights,original_color));",
      "gl_FragColor = vec4(grey + saturation * (original_color - grey) ,1.0);",
    "}"
  ].join("\n")
};

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

/* NodeJS Libraries */
const isMac = process.platform === 'darwin';
const remote = require('electron').remote;
const app = remote.app;
app.allowRendererProcessReuse = false; //is required for loading modules like dxt because it isn't context aware
const {BrowserWindow} = require('electron').remote;
const {ipcRenderer} = require('electron');
const {Menu, MenuItem} = remote;
const {dialog} = require('electron').remote;
const fs = require('fs');
const path = require('path');
const Signal = require('signals');
const MD5 = require('blueimp-md5');
const Int64 = require('node-int64');
const recursive = require('recursive-readdir');
const StringDecoder = require('string_decoder').StringDecoder;
const objectHash = require('object-hash');
var Promise = require("bluebird");
const Reverb = require('soundbank-reverb');
const BitBuffer = require('bit-buffer');
//const beamcoder = require('beamcoder');
const dxt = require('dxt');

const ConfigManager = require(path.join(app.getAppPath(), 'js/ConfigManager.js'));
let Config = new ConfigManager('settings.json');

//app_profile is the selected game's profile
const app_profile = (() => {
  let app_profile = remote.getCurrentWindow().state;
  if(typeof app_profile != 'object' || !app_profile.key){
    alert('Fatal Error: Window Profile Missing');
    window.close();
  }
  return Config.get(['Profiles', app_profile.key]);
})();

const LoadingScreen = require(path.join(app.getAppPath(), 'js/LoadingScreen.js'));
const loader = new LoadingScreen();
loader.SetLogo(app_profile.logo);
loader.SetBackgroundImage(app_profile.background);
$( function(){
  loader.Show();
})

let gamepads = {};
let currentGamepad = -1;
let gpMenu = new MenuItem({
  label: 'GamePads',
  submenu: [
    new MenuItem(    {
      label: 'No Gamepad',
      type: 'radio'
    })
  ]
});

function gamepadHandler(e, connecting) {
  let gamepad = e.gamepad;
  // Note:
  // gamepad === navigator.getGamepads()[gamepad.index]
  console.log('gamepadHandler', e, connecting);
  if (connecting) {
    gamepads[gamepad.index] = gamepad;
    if(currentGamepad == -1){
      currentGamepad = gamepad;
    }
  } else {

    if(currentGamepad == gamepad.index)
      currentGamepad = undefined;
    
    delete gamepads[gamepad.index];
  }

  let keys = Object.keys(gamepads);
  gpMenu.submenu.clear();

  let noPad = new MenuItem({
    label: 'No Gamepad',
    type: 'radio',
    checked: (currentGamepad == -1) ? true : false,
    click: () => {
      currentGamepad = -1;
    }
  });

  gpMenu.submenu.append(noPad);

  for(let i = 0; i < keys.length; i++){
    let gpNode = gamepads[keys[i]];
    if(gpNode instanceof Gamepad){
      let newGamePad = new MenuItem({
        label: 'Gamepad: '+(i+1),
        type: 'radio',
        checked: (currentGamepad == gpNode) ? true : false,
        click: () => {
          currentGamepad = gpNode;
        }
      });
      gpMenu.submenu.append(newGamePad);
    }
  }

  Menu.setApplicationMenu(menu);
}

global.addEventListener("gamepadconnected", function(e) { gamepadHandler(e, true); }, false);
global.addEventListener("gamepaddisconnected", function(e) { gamepadHandler(e, false); }, false);

const APP_MODE = 'GAME';

const Games = {
  KOTOR: 1,
  TSL: 2
}

switch(app_profile.launch.args.gameChoice){
  case 2:
    global._Game = Games.TSL;
    global.GameKey = 'TSL';
  break;
  default:
    global._Game = Games.KOTOR;
    global.GameKey = 'KOTOR';
  break;
}

const IMAGE_TYPE = {
  TPC: 0,
  TGA: 1,
  PNG: 2,
  JPG: 3
}



/* Utility Includes */
const Utility = require(path.join(app.getAppPath(), 'js/Utility.js'));
const Mouse = require(path.join(app.getAppPath(), 'js/Mouse.js'));
const BinaryReader = require(path.join(app.getAppPath(), 'js/BinaryReader.js'));
const BinaryWriter = require(path.join(app.getAppPath(), 'js/BinaryWriter.js'));
const INIConfig = require(path.join(app.getAppPath(), 'js/INIConfig.js'));

const TemplateEngine = require(path.join(app.getAppPath(), 'js/TemplateEngine.js'));
const FileTypeManager = require(path.join(app.getAppPath(), 'js/resource/FileTypeManager.js'));
const FileLoader = require(path.join(app.getAppPath(), 'js/resource/FileLoader.js'));
const MaterialCache = require(path.join(app.getAppPath(), 'js/MaterialCache.js'));
const GameInitializer = require(path.join(app.getAppPath(), 'js/GameInitializer.js'));
const AppearanceLoader = require(path.join(app.getAppPath(), 'js/resource/AppearanceLoader.js'));
//const UI3DRenderer = require(path.join(app.getAppPath(), 'js/editor/UI3DRenderer.js'));
const PixelManager = require(path.join(app.getAppPath(), 'js/PixelManager.js'));

/* Aurora */

const OdysseyController = require(path.join(app.getAppPath(), 'js/aurora/controllers/OdysseyController.js'));
let odysseyControllers = fs.readdirSync(path.join(app.getAppPath(), 'js/aurora/controllers'));
for(let i = 0; i < odysseyControllers.length; i++){
  let controllerPath = path.parse(odysseyControllers[i]);
  try{
    global[controllerPath.name] = require(path.join(app.getAppPath(), 'js/aurora/controllers', controllerPath.base));
  }catch(e){
    console.error(e);
  }
}

const ResourceTypes = require(path.join(app.getAppPath(), 'js/resource/ResourceTypes.js'));
const ResourceTypeInfo = require(path.join(app.getAppPath(), 'js/resource/ResourceTypeInfo.js'));
const AnimatedTexture = require(path.join(app.getAppPath(), 'js/AnimatedTexture.js'));
const AuroraFile = require(path.join(app.getAppPath(), 'js/aurora/AuroraFile.js'));
const AuroraModel = require(path.join(app.getAppPath(), 'js/aurora/AuroraModel.js'));
const AuroraModelNode = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNode.js'));
const AuroraModelNodeMesh = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeMesh.js'));
const AuroraModelNodeAABB = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeAABB.js'));
const AuroraModelNodeDangly = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeDangly.js'));
const AuroraModelNodeEmitter = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeEmitter.js'));
const AuroraModelNodeLight = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeLight.js'));
const AuroraModelNodeReference = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeReference.js'));
const AuroraModelNodeSkin = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeSkin.js'));
const AuroraModelNodeSaber = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelNodeSaber.js'));
const AuroraModelAnimation = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelAnimation.js'));
const AuroraModelAnimationNode = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelAnimationNode.js'));
const AuroraModelAnimationManager = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelAnimationManager.js'));
const AuroraWalkMesh = require(path.join(app.getAppPath(), 'js/aurora/AuroraWalkMesh.js'));

const Shaders = {};
let _shaders = fs.readdirSync(path.join(app.getAppPath(), 'shaders'));
for(let i = 0; i < _shaders.length; i++){
  let _shaderPath = path.parse(_shaders[i]);
  Shaders[_shaderPath.name] = require(path.join(app.getAppPath(), 'shaders', _shaderPath.base)); 
}

const BIKObject = require(path.join(app.getAppPath(), 'js/resource/BIKObject.js'));

const BIFObject = require(path.join(app.getAppPath(), 'js/resource/BIFObject.js'));
const ERFObject = require(path.join(app.getAppPath(), 'js/resource/ERFObject.js'));
const GFFObject = require(path.join(app.getAppPath(), 'js/resource/GFFObject.js')).GFFObject;
const GFFDataTypes = require(path.join(app.getAppPath(), 'js/resource/GFFObject.js')).GFFDataTypes;
const Struct = require(path.join(app.getAppPath(), 'js/resource/GFFObject.js')).Struct;
const Field = require(path.join(app.getAppPath(), 'js/resource/GFFObject.js')).Field;
const CExoLocString = require(path.join(app.getAppPath(), 'js/resource/GFFObject.js')).CExoLocString;
const CExoLocSubString = require(path.join(app.getAppPath(), 'js/resource/GFFObject.js')).CExoLocSubString;
const KEYObject = require(path.join(app.getAppPath(), 'js/resource/KEYObject.js'));
const LIPObject = require(path.join(app.getAppPath(), 'js/resource/LIPObject.js')); 
const LYTObject = require(path.join(app.getAppPath(), 'js/resource/LYTObject.js'));
const RIMObject = require(path.join(app.getAppPath(), 'js/resource/RIMObject.js'));
const TGAObject = require(path.join(app.getAppPath(), 'js/resource/TGAObject.js'));
const SSFObject = require(path.join(app.getAppPath(), 'js/resource/SSFObject.js'));
const LTRObject = require(path.join(app.getAppPath(), 'js/resource/LTRObject.js'));
const TLKObject = require(path.join(app.getAppPath(), 'js/resource/TLKObject.js'));
const TLKString = require(path.join(app.getAppPath(), 'js/resource/TLKString.js'));
const TPCObject = require(path.join(app.getAppPath(), 'js/resource/TPCObject.js'));
const TwoDAObject = require(path.join(app.getAppPath(), 'js/resource/TwoDAObject.js'));
const TXI = require(path.join(app.getAppPath(), 'js/resource/TXI.js'));
const UTCObject = require(path.join(app.getAppPath(), 'js/resource/UTCObject.js')); //Obsolete
const UTDObject = require(path.join(app.getAppPath(), 'js/resource/UTDObject.js')); //Obsolete
const UTIObject = require(path.join(app.getAppPath(), 'js/resource/UTIObject.js')); //Obsolete
//const UTMObject = require(path.join(app.getAppPath(), 'js/resource/UTMObject.js')); //Obsolete
const UTPObject = require(path.join(app.getAppPath(), 'js/resource/UTPObject.js')); //Obsolete
const UTSObject = require(path.join(app.getAppPath(), 'js/resource/UTSObject.js')); //Obsolete
const UTTObject = require(path.join(app.getAppPath(), 'js/resource/UTTObject.js')); //Obsolete
const UTWObject = require(path.join(app.getAppPath(), 'js/resource/UTWObject.js')); //Obsolete
const VISObject = require(path.join(app.getAppPath(), 'js/resource/VISObject.js'));

const DLGObject = require(path.join(app.getAppPath(), 'js/resource/DLGObject.js'));
const DLGNode = require(path.join(app.getAppPath(), 'js/resource/DLGNode.js'));

const FactionManager = require(path.join(app.getAppPath(), 'js/FactionManager.js'));

/* NWScript */

const { NWScript, NWScriptEffect } = require(path.join(app.getAppPath(), 'js/nwscript/NWScript.js'));

/* NWScriptEvents */
const NWScriptEvent = require(path.join(app.getAppPath(), 'js/nwscript/events/NWScriptEvent.js'));
let odysseyScriptEvents = fs.readdirSync(path.join(app.getAppPath(), 'js/nwscript/events'));
for(let i = 0; i < odysseyScriptEvents.length; i++){
  let controllerPath = path.parse(odysseyScriptEvents[i]);
  try{
    global[controllerPath.name] = require(path.join(app.getAppPath(), 'js/nwscript/events', controllerPath.base));
  }catch(e){
    console.error(e);
  }
}

const NWScriptStack = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptStack.js'));
const NWScriptInstruction = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptInstruction.js'));
const NWScriptSubroutine = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptSubroutine.js'));
const NWScriptInstance = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptInstance.js'));
const NWScriptDef = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptDef.js'));
const NWScriptDefK1 = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptDefK1.js'));
const NWScriptDefK2 = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptDefK2.js'));
const { NWScriptParser } = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptParser.js'));
const { NWScriptCompiler } = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptCompiler.js'));

/* Effects */
const GameEffect = require(path.join(app.getAppPath(), 'js/effects/GameEffect.js'));
let odysseyGameEffects = fs.readdirSync(path.join(app.getAppPath(), 'js/effects'));
for(let i = 0; i < odysseyGameEffects.length; i++){
  let controllerPath = path.parse(odysseyGameEffects[i]);
  try{
    global[controllerPath.name] = require(path.join(app.getAppPath(), 'js/effects', controllerPath.base));
  }catch(e){
    console.error(e);
  }
}

/* Events */
const GameEvent = require(path.join(app.getAppPath(), 'js/events/GameEvent.js'));
let odysseyGameEvents = fs.readdirSync(path.join(app.getAppPath(), 'js/events'));
for(let i = 0; i < odysseyGameEvents.length; i++){
  let controllerPath = path.parse(odysseyGameEvents[i]);
  try{
    global[controllerPath.name] = require(path.join(app.getAppPath(), 'js/events', controllerPath.base));
  }catch(e){
    console.error(e);
  }
}

/* Actions */
const Action = require(path.join(app.getAppPath(), 'js/actions/Action.js'));
let actions = fs.readdirSync(path.join(app.getAppPath(), 'js/actions'));
for(let i = 0; i < actions.length; i++){
  let controllerPath = path.parse(actions[i]);
  try{
    global[controllerPath.name] = require(path.join(app.getAppPath(), 'js/actions', controllerPath.base));
  }catch(e){
    console.error(e);
  }
}

/* Talents */
const TalentObject = require(path.join(app.getAppPath(), 'js/talents/TalentObject.js'));
const TalentFeat = require(path.join(app.getAppPath(), 'js/talents/TalentFeat.js'));
const TalentSpell = require(path.join(app.getAppPath(), 'js/talents/TalentSpell.js'));
const TalentSkill = require(path.join(app.getAppPath(), 'js/talents/TalentSkill.js'));

const CreatureClass = require(path.join(app.getAppPath(), 'js/CreatureClass.js'));

/* Module */
const ModuleObject = require(path.join(app.getAppPath(), 'js/module/ModuleObject.js'));
const Module = require(path.join(app.getAppPath(), 'js/module/Module.js'));
const ModuleArea = require(path.join(app.getAppPath(), 'js/module/ModuleArea.js'));
const ModuleCreatureController = require(path.join(app.getAppPath(), 'js/module/ModuleCreatureController.js'));
const ModuleCamera = require(path.join(app.getAppPath(), 'js/module/ModuleCamera.js'));
const ModuleDoor = require(path.join(app.getAppPath(), 'js/module/ModuleDoor.js'));
const ModuleEncounter = require(path.join(app.getAppPath(), 'js/module/ModuleEncounter.js'));
const ModuleRoom = require(path.join(app.getAppPath(), 'js/module/ModuleRoom.js'));
const ModuleItem = require(path.join(app.getAppPath(), 'js/module/ModuleItem.js'));
const ModuleSound = require(path.join(app.getAppPath(), 'js/module/ModuleSound.js'));
const ModuleTrigger = require(path.join(app.getAppPath(), 'js/module/ModuleTrigger.js'));
const ModuleCreature = require(path.join(app.getAppPath(), 'js/module/ModuleCreature.js'));
const ModulePlayer = require(path.join(app.getAppPath(), 'js/module/ModulePlayer.js'));
const ModuleWaypoint = require(path.join(app.getAppPath(), 'js/module/ModuleWaypoint.js'));
const ModuleStore = require(path.join(app.getAppPath(), 'js/module/ModuleStore.js'));
const ModulePlaceable = require(path.join(app.getAppPath(), 'js/module/ModulePlaceable.js'));
const ModulePath = require(path.join(app.getAppPath(), 'js/module/ModulePath.js'));

/* Module MiniGame Objects */

const ModuleMGTrack = require(path.join(app.getAppPath(), 'js/module/ModuleMGTrack.js'));
const ModuleMGPlayer = require(path.join(app.getAppPath(), 'js/module/ModuleMGPlayer.js'));
const ModuleMGEnemy = require(path.join(app.getAppPath(), 'js/module/ModuleMGEnemy.js'));
const ModuleMGObstacle = require(path.join(app.getAppPath(), 'js/module/ModuleMGObstacle.js'));

/* Combat */

const CombatEngine = require(path.join(app.getAppPath(), 'js/CombatEngine.js'));  

/* Audio */

const AudioLoader = require(path.join(app.getAppPath(), 'js/audio/AudioLoader.js'));
const AudioFile = require(path.join(app.getAppPath(), 'js/audio/AudioFile.js'));
const ADPCMDecoder = require(path.join(app.getAppPath(), 'js/audio/ADPCMDecoder.js'));
const ADPCMBlock = require(path.join(app.getAppPath(), 'js/audio/ADPCMBlock.js'));
const AudioEngine = require(path.join(app.getAppPath(), 'js/audio/AudioEngine.js'));
const AudioEmitter = require(path.join(app.getAppPath(), 'js/audio/AudioEmitter.js'));
const EAXPresets = require(path.join(app.getAppPath(), 'js/audio/EAXPresets.js'));


/* Video */
const VideoPlayer = require(path.join(app.getAppPath(), 'js/VideoPlayer.js'));

const TextureLoader = require(path.join(app.getAppPath(), 'js/resource/TextureLoader.js'));
const TemplateLoader = require(path.join(app.getAppPath(), 'js/resource/TemplateLoader.js'));
const ResourceLoader = require(path.join(app.getAppPath(), 'js/resource/ResourceLoader.js'));

const IngameControls = require(path.join(app.getAppPath(), 'js/IngameControls.js'));
const LightManager = require(path.join(app.getAppPath(), 'js/LightManager.js'));
const JournalManager = require(path.join(app.getAppPath(), 'js/JournalManager.js'));

const CurrentGame = require(path.join(app.getAppPath(), 'js/CurrentGame.js'));
const SaveGame = require(path.join(app.getAppPath(), 'js/SaveGame.js'));
let Global = {};
let Clipboard = null;

/* GUI Controls */

const LBL_3DView = require(path.join(app.getAppPath(), 'js/gui/LBL_3DView.js')); 
const GUIControl = require(path.join(app.getAppPath(), 'js/gui/GUIControl.js'));
const GUILabel = require(path.join(app.getAppPath(), 'js/gui/GUILabel.js'));
const GUIButton = require(path.join(app.getAppPath(), 'js/gui/GUIButton.js'));
const GUIProgressBar = require(path.join(app.getAppPath(), 'js/gui/GUIProgressBar.js'));
const GUIListBox = require(path.join(app.getAppPath(), 'js/gui/GUIListBox.js'));
const GUIProtoItem = require(path.join(app.getAppPath(), 'js/gui/GUIProtoItem.js'));
const GUIScrollBar = require(path.join(app.getAppPath(), 'js/gui/GUIScrollBar.js'));
const GUISlider = require(path.join(app.getAppPath(), 'js/gui/GUISlider.js'));
const GUICheckBox = require(path.join(app.getAppPath(), 'js/gui/GUICheckBox.js'));
const GameMenu = require(path.join(app.getAppPath(), 'js/gui/Menu.js'));
const MenuManager = require(path.join(app.getAppPath(), 'js/gui/MenuManager.js')); 

/* MISC Managers */
const InventoryManager = require(path.join(app.getAppPath(), 'js/InventoryManager.js')); 
const CursorManager = require(path.join(app.getAppPath(), 'js/CursorManager.js'));
const PartyManager = require(path.join(app.getAppPath(), 'js/PartyManager.js'));
const PartyTableManager = require(path.join(app.getAppPath(), 'js/PartyTableManager.js'));
const Planetary = require(path.join(app.getAppPath(), 'js/Planetary.js')).Planetary; 
const Planet = require(path.join(app.getAppPath(), 'js/Planetary.js')).Planet; 
const Template = new TemplateEngine();

const Engine = require(path.join(app.getAppPath(), 'js/Engine.js')); 


let Game;
if(GameKey == 'TSL'){

  let menus = fs.readdirSync(path.join(app.getAppPath(), 'js/game/', 'tsl', 'menu'));
  for(let i = 0; i < menus.length; i++){
    let menuPath = path.parse(menus[i]);
    global[menuPath.name] = require(path.join(app.getAppPath(), 'js/game/tsl/menu/', menuPath.base)); 
  }
  
  const configDefaults = require(path.join(app.getAppPath(), 'js/game/tsl/swkotor2-config.js'));
  global.iniConfig = new INIConfig(path.join(app_profile.directory, 'swkotor2.ini'), configDefaults);
  Game = require(path.join(app.getAppPath(), 'js/game/tsl/'+GameKey+'.js')); 

}else{

  let menus = fs.readdirSync(path.join(app.getAppPath(), 'js/game/', 'kotor', 'menu'));
  for(let i = 0; i < menus.length; i++){
    let menuPath = path.parse(menus[i]);
    global[menuPath.name] = require(path.join(app.getAppPath(), 'js/game/kotor/menu/', menuPath.base)); 
  }

  const configDefaults = require(path.join(app.getAppPath(), 'js/game/kotor/swkotor-config.js'));
  global.iniConfig = new INIConfig(path.join(app_profile.directory, 'swkotor.ini'), configDefaults)
  Game = require(path.join(app.getAppPath(), 'js/game/kotor/'+GameKey+'.js')); 

}

TextureLoader.Anisotropy = iniConfig.getProperty('Graphics Options.Anisotropy');
TextureLoader.onAnisotropyChanged();

AudioEngine.GAIN_MUSIC = iniConfig.getProperty('Sound Options.Music Volume') * .01;
AudioEngine.GAIN_VO = iniConfig.getProperty('Sound Options.Voiceover Volume') * .01;
AudioEngine.GAIN_SFX = iniConfig.getProperty('Sound Options.Sound Effects Volume') * .01;
AudioEngine.GAIN_MOVIE = iniConfig.getProperty('Sound Options.Movie Volume') * .01;

const ModelCache = { models:{} };

let AnimatedTextures = [];

Global.templates = {
  placeable: []
};

for (var key in Global) {
  if (Global.hasOwnProperty(key)) {
    if(typeof Global[key] !== 'undefined' && Global[key] != null){

      if(Global[key].hasOwnProperty('ClassName')){

        //console.log('ClassName', Global[key]['ClassName']);
        try{
          switch (Global[key]['ClassName']) {
            case "Project":
              Global[key].__proto__ = Project.prototype;//= Object.assign(new Project(), Global[key]);
              break;
          }
          //console.log(Global[key]);
        }catch(ex){
          //console.log('Class Convert Failed', ex);
        }
      }
    }else{
      //console.log('IsNULL', Global[key]);
    }
  }
}

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

const    OBJECT_TYPE_CREATURE         = 1;
const    OBJECT_TYPE_ITEM             = 2;
const    OBJECT_TYPE_TRIGGER          = 4;
const    OBJECT_TYPE_DOOR             = 8;
const    OBJECT_TYPE_AREA_OF_EFFECT   = 16;
const    OBJECT_TYPE_WAYPOINT         = 32;
const    OBJECT_TYPE_PLACEABLE        = 64;
const    OBJECT_TYPE_STORE            = 128;
const    OBJECT_TYPE_ENCOUNTER        = 256;
const    OBJECT_TYPE_SOUND            = 512;
const    OBJECT_TYPE_ALL              = 32767;



// the thing after CREATURE_TYPE_ should refer to the
// actual "subtype" in the lists given above.
const CREATURE_TYPE_RACIAL_TYPE     = 0;
const CREATURE_TYPE_PLAYER_CHAR     = 1;
const CREATURE_TYPE_CLASS           = 2;
const CREATURE_TYPE_REPUTATION      = 3;
const CREATURE_TYPE_IS_ALIVE        = 4;
const CREATURE_TYPE_HAS_SPELL_EFFECT = 5;
const CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT = 6;
const CREATURE_TYPE_PERCEPTION                = 7;
//const CREATURE_TYPE_ALIGNMENT       = 2;

const REPUTATION_TYPE_FRIEND        = 0;
const REPUTATION_TYPE_ENEMY         = 1;
const REPUTATION_TYPE_NEUTRAL       = 2;

const PERCEPTION_SEEN_AND_HEARD           = 0;
const PERCEPTION_NOT_SEEN_AND_NOT_HEARD   = 1;
const PERCEPTION_HEARD_AND_NOT_SEEN       = 2;
const PERCEPTION_SEEN_AND_NOT_HEARD       = 3;
const PERCEPTION_NOT_HEARD                = 4;
const PERCEPTION_HEARD                    = 5;
const PERCEPTION_NOT_SEEN                 = 6;
const PERCEPTION_SEEN                     = 7;

const PLAYER_CHAR_NOT_PC            = false;
const PLAYER_CHAR_IS_PC             = true;

const CLASS_TYPE_SOLDIER       = 0;
const CLASS_TYPE_SCOUT         = 1;
const CLASS_TYPE_SCOUNDREL     = 2;
const CLASS_TYPE_JEDIGUARDIAN  = 3;
const CLASS_TYPE_JEDICONSULAR  = 4;
const CLASS_TYPE_JEDISENTINEL  = 5;
const CLASS_TYPE_COMBATDROID   = 6;
const CLASS_TYPE_EXPERTDROID   = 7;
const CLASS_TYPE_MINION        = 8;

const CLASS_TYPE_INVALID   = 255;

// These are for GetFirstInPersistentObject() and GetNextInPersistentObject()
const PERSISTENT_ZONE_ACTIVE = 0;
const PERSISTENT_ZONE_FOLLOW = 1;

const INVALID_STANDARD_FACTION        = -1;
const STANDARD_FACTION_HOSTILE_1      = 1;
const STANDARD_FACTION_FRIENDLY_1     = 2;
const STANDARD_FACTION_HOSTILE_2      = 3;
const STANDARD_FACTION_FRIENDLY_2     = 4;
const STANDARD_FACTION_NEUTRAL        = 5;
const STANDARD_FACTION_INSANE         = 6;
const STANDARD_FACTION_PTAT_TUSKAN    = 7;
const STANDARD_FACTION_GLB_XOR        = 8;
const STANDARD_FACTION_SURRENDER_1    = 9;
const STANDARD_FACTION_SURRENDER_2    = 10;
const STANDARD_FACTION_PREDATOR       = 11;
const STANDARD_FACTION_PREY           = 12;
const STANDARD_FACTION_TRAP           = 13;
const STANDARD_FACTION_ENDAR_SPIRE    = 14;
const STANDARD_FACTION_RANCOR         = 15;
const STANDARD_FACTION_GIZKA_1        = 16;
const STANDARD_FACTION_GIZKA_2        = 17;

// Skill defines
const SKILL_COMPUTER_USE    = 0;
const SKILL_DEMOLITIONS     = 1;
const SKILL_STEALTH         = 2;
const SKILL_AWARENESS       = 3;
const SKILL_PERSUADE        = 4;
const SKILL_REPAIR          = 5;
const SKILL_SECURITY        = 6;
const SKILL_TREAT_INJURY    = 7;
const SKILL_MAX_SKILLS      = 8;

const SUBSKILL_FLAGTRAP      = 100;
const SUBSKILL_RECOVERTRAP   = 101;
const SUBSKILL_EXAMINETRAP   = 102;

THREE.Object3D.prototype.updateMatrixWorld = function ( force ) {

  //This is a performance tweak from https://discourse.threejs.org/t/updatematrixworld-performance/3217
  if( !this.visible ){ return false; }

  if ( this.matrixAutoUpdate ) this.updateMatrix();

  if ( this.matrixWorldNeedsUpdate || force ) {

    if ( this.parent === null ) {

      this.matrixWorld.copy( this.matrix );

    } else {

      this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

    }

    this.matrixWorldNeedsUpdate = false;

    force = true;

  }

  // update children

  var children = this.children;

  for ( var i = 0, l = children.length; i < l; i ++ ) {

    children[ i ].updateMatrixWorld( force, true );

  }

}

THREE.Object3D.prototype.traverseIgnore = function( ignoreName = '', callback ){

  if(this.name == ignoreName)
    return;

  callback( this );

  var children = this.children;

  for ( var i = 0, l = children.length; i < l; i ++ ) {
    if(typeof children[ i ].traverseIgnore === 'function'){
      children[ i ].traverseIgnore( ignoreName, callback );
    }
  }

}

const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { label: 'Close', role: 'close' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'close' }
    ]
  },
  // { role: 'editMenu' }
  {
    label: 'Debug',
    submenu: [
      { label: 'Collision', submenu: [
        { label: 'Creature Collision', type: 'checkbox', checked: Config.get('Game.debug.creature_collision'), 'accelerator': 'Alt+1', click: () => {
          Config.set('Game.debug.creature_collision', !Config.get('Game.debug.creature_collision'));
        }},
        { label: 'Door Collision', type: 'checkbox', checked: Config.get('Game.debug.door_collision'), 'accelerator': 'Alt+2', click: () => {
          Config.set('Game.debug.door_collision', !Config.get('Game.debug.door_collision'));
        }},
        { label: 'Placeable Collision', type: 'checkbox', checked: Config.get('Game.debug.placeable_collision'), 'accelerator': 'Alt+3', click: () => {
          Config.set('Game.debug.placeable_collision', !Config.get('Game.debug.placeable_collision'));
        }},
        { label: 'World Collision', type: 'checkbox', checked: Config.get('Game.debug.world_collision'), 'accelerator': 'Alt+4', click: () => {
          Config.set('Game.debug.world_collision', !Config.get('Game.debug.world_collision'));
        }},
        { label: 'Show Collision Meshes', type: 'checkbox', checked: Config.get('Game.debug.show_collision_meshes'), 'accelerator': 'Alt+0', click: () => {
          Config.set('Game.debug.show_collision_meshes', !Config.get('Game.debug.show_collision_meshes'));
        }},
      ]},
      { label: 'Module Objects', submenu: [
        { label: 'Tiggers: Show ', type: 'checkbox', checked: Config.get('Game.debug.trigger_geometry_show'), click: () => {
          Config.set('Game.debug.trigger_geometry_show', !Config.get('Game.debug.trigger_geometry_show'));
        }}
      ]},
      { label: 'Light Helpers', type: 'checkbox', checked: Config.get('Game.debug.light_helpers'), 'accelerator': 'Alt+l', click: () => {
        Config.set('Game.debug.light_helpers', !Config.get('Game.debug.light_helpers'));
        LightManager.setLightHelpersVisible(Config.get('Game.debug.light_helpers') ? true : false);
      }},
      { label: 'Show FPS', type: 'checkbox', checked: Config.get('Game.debug.show_fps'), 'accelerator': 'Alt+F', click: () => {
        Config.set('Game.debug.show_fps', !Config.get('Game.debug.show_fps'));

        if(!Config.get(['Game','debug','show_fps'], false)){
          Game.stats.showPanel(false);
        }else{
          Game.stats.showPanel(0);
        }

      }},
      { label: 'Disable Intro Movies', type: 'checkbox', checked: Config.get('Game.debug.disable_intro_movies'), 'accelerator': 'Alt+M', click: () => {
        Config.set('Game.debug.disable_intro_movies', !Config.get('Game.debug.disable_intro_movies'));
      }},
      { label: 'Shipping Build', type: 'checkbox', checked: Config.get('Game.debug.is_shipping_build'), click: () => {
        Config.set('Game.debug.is_shipping_build', !Config.get('Game.debug.is_shipping_build'));
      }},
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'toggleFullscreen' },
      { label: 'Toggle Menu', type: 'checkbox', checked: Config.get('Game.show_application_menu'), 'accelerator': process.platform === 'darwin' ? 'Alt+D' : 'Alt+D', click: () => {
        Config.set('Game.show_application_menu', !Config.get('Game.show_application_menu'));
        remote.getCurrentWindow().setMenuBarVisibility(Config.get('Game.show_application_menu'));
      } }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'KotOR.js - Github',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://github.com/KobaltBlu/KotOR.js')
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
menu.append(gpMenu);
Menu.setApplicationMenu(menu);

remote.getCurrentWindow().setMenuBarVisibility(Config.get(['Game','show_application_menu'], false));

//Fullccreen Events
remote.getCurrentWindow().addListener('enter-full-screen', () => {
  Config.set(['Profiles', app_profile.key, 'settings', 'fullscreen', 'value'], true);
});

remote.getCurrentWindow().addListener('leave-full-screen', () => {
  Config.set(['Profiles', app_profile.key, 'settings', 'fullscreen', 'value'], false);
});

//Devtools at launch
if(Config.get(['Profiles', app_profile.key, 'settings', 'devtools', 'value'], false)){
  remote.getCurrentWindow().openDevTools();
}

//Devtools Events
remote.getCurrentWebContents().on('devtools-opened', () => {
  Config.set(['Profiles', app_profile.key, 'settings', 'devtools', 'value'], true);
});

remote.getCurrentWebContents().on('devtools-closed', () => {
  Config.set(['Profiles', app_profile.key, 'settings', 'devtools', 'value'], false);
});

//Window Resize Event: Update Config
( function(){
  let _resizeTimer = undefined;
  function resizeConfigManager(){
    _resizeTimer = setTimeout(function(){
      if(!remote.getCurrentWindow().isFullScreen()){
        Config.set(['Profiles', app_profile.key, 'width'], window.outerWidth);
        Config.set(['Profiles', app_profile.key, 'height'], window.outerHeight);
      }
    }, 500);
  }
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    resizeConfigManager();
  });
})();