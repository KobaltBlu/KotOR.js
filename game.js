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
const remote = require('electron').remote;
const app = remote.app;
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
const beamcoder = require('beamcoder');
const dxt = require('dxt');

const isRunningInAsar = function(){
  return false;
};//require('electron-is-running-in-asar');

const LoadingScreen = require(path.join(app.getAppPath(), 'js/LoadingScreen.js'));
const loader = new LoadingScreen();
loader.SetLogo(remote.getCurrentWindow().state.logo);
loader.SetBackgroundImage(remote.getCurrentWindow().state.background);
$( function(){
  loader.Show();
})

let gamepads = {};
let currentGamepad = -1;
let gpMenu = new MenuItem(    {
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
  } else {

    if(currentGamepad == gamepad.index)
      currentGamepad = undefined;
    
    delete gamepads[gamepad.index];
  }
}

window.addEventListener("gamepadconnected", function(e) { gamepadHandler(e, true); }, false);
window.addEventListener("gamepaddisconnected", function(e) { gamepadHandler(e, false); }, false);


const Games = {
  KOTOR: 1,
  TSL: 2
}

switch(remote.getCurrentWindow().state.launch.args.gameChoice){
  case 2:
    window._Game = Games.TSL;
    window.GameKey = 'TSL';
  break;
  default:
    window._Game = Games.KOTOR;
    window.GameKey = 'KOTOR';
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

const ConfigManager = require(path.join(app.getAppPath(), 'js/ConfigManager.js'));
const TemplateEngine = require(path.join(app.getAppPath(), 'js/TemplateEngine.js'));
const FileTypeManager = require(path.join(app.getAppPath(), 'js/FileTypeManager.js'));
const FileLoader = require(path.join(app.getAppPath(), 'js/FileLoader.js'));
const MaterialCache = require(path.join(app.getAppPath(), 'js/MaterialCache.js'));
const GameInitializer = require(path.join(app.getAppPath(), 'js/GameInitializer.js'));
const AppearanceLoader = require(path.join(app.getAppPath(), 'js/AppearanceLoader.js'));
//const UI3DRenderer = require(path.join(app.getAppPath(), 'js/UI3DRenderer.js'));
const PixelManager = require(path.join(app.getAppPath(), 'js/PixelManager.js'));

/* Aurora */

const ResourceTypes = require(path.join(app.getAppPath(), 'js/ResourceTypes.js'));
const ResourceTypeInfo = require(path.join(app.getAppPath(), 'js/ResourceTypeInfo.js'));
const AnimatedTexture = require(path.join(app.getAppPath(), 'js/AnimatedTexture.js'));
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
const AuroraModelAnimationManager = require(path.join(app.getAppPath(), 'js/aurora/AuroraModelAnimationManager.js'));
const AuroraWalkMesh = require(path.join(app.getAppPath(), 'js/aurora/AuroraWalkMesh.js'));

const Shaders = {};
let _shaders = fs.readdirSync(path.join(app.getAppPath(), 'shaders'));
for(let i = 0; i < _shaders.length; i++){
  let _shaderPath = path.parse(_shaders[i]);
  Shaders[_shaderPath.name] = require(path.join(app.getAppPath(), 'shaders', _shaderPath.base)); 
}

const BIKObject = require(path.join(app.getAppPath(), 'js/BIKObject.js'));

const BIFObject = require(path.join(app.getAppPath(), 'js/BIFObject.js'));
const ERFObject = require(path.join(app.getAppPath(), 'js/ERFObject.js'));
const GFFObject = require(path.join(app.getAppPath(), 'js/GFFObject.js')).GFFObject;
const GFFDataTypes = require(path.join(app.getAppPath(), 'js/GFFObject.js')).GFFDataTypes;
const Struct = require(path.join(app.getAppPath(), 'js/GFFObject.js')).Struct;
const Field = require(path.join(app.getAppPath(), 'js/GFFObject.js')).Field;
const CExoLocString = require(path.join(app.getAppPath(), 'js/GFFObject.js')).CExoLocString;
const CExoLocSubString = require(path.join(app.getAppPath(), 'js/GFFObject.js')).CExoLocSubString;
const KEYObject = require(path.join(app.getAppPath(), 'js/KEYObject.js'));
const LIPObject = require(path.join(app.getAppPath(), 'js/LIPObject.js')); 
const LYTObject = require(path.join(app.getAppPath(), 'js/LYTObject.js'));
const RIMObject = require(path.join(app.getAppPath(), 'js/RIMObject.js'));
const TGAObject = require(path.join(app.getAppPath(), 'js/TGAObject.js'));
const SSFObject = require(path.join(app.getAppPath(), 'js/SSFObject.js'));
const LTRObject = require(path.join(app.getAppPath(), 'js/LTRObject.js'));
const TLKObject = require(path.join(app.getAppPath(), 'js/TLKObject.js'));
const TLKString = require(path.join(app.getAppPath(), 'js/TLKString.js'));
const TPCObject = require(path.join(app.getAppPath(), 'js/TPCObject.js'));
const TwoDAObject = require(path.join(app.getAppPath(), 'js/TwoDAObject.js'));
const TXI = require(path.join(app.getAppPath(), 'js/TXI.js'));
const UTCObject = require(path.join(app.getAppPath(), 'js/UTCObject.js')); //Obsolete
const UTDObject = require(path.join(app.getAppPath(), 'js/UTDObject.js')); //Obsolete
const UTIObject = require(path.join(app.getAppPath(), 'js/UTIObject.js')); //Obsolete
//const UTMObject = require(path.join(app.getAppPath(), 'js/UTMObject.js')); //Obsolete
const UTPObject = require(path.join(app.getAppPath(), 'js/UTPObject.js')); //Obsolete
const UTSObject = require(path.join(app.getAppPath(), 'js/UTSObject.js')); //Obsolete
const UTTObject = require(path.join(app.getAppPath(), 'js/UTTObject.js')); //Obsolete
const UTWObject = require(path.join(app.getAppPath(), 'js/UTWObject.js')); //Obsolete
const VISObject = require(path.join(app.getAppPath(), 'js/VISObject.js'));

/* NWScript */

const { NWScript, NWScriptEffect, NWScriptEvent } = require(path.join(app.getAppPath(), 'js/nwscript/NWScript.js'));
const NWScriptStack = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptStack.js'));
const NWScriptInstruction = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptInstruction.js'));
const NWScriptInstance = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptInstance.js'));
const NWScriptBlock = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptBlock.js'));
const NWScriptDef = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptDef.js'));
const NWScriptDefK1 = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptDefK1.js'));
const NWScriptDefK2 = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptDefK2.js'));
const NWScriptDecompiler = require(path.join(app.getAppPath(), 'js/nwscript/NWScriptDecompiler.js'));

/* Effects */
const GameEffect = require(path.join(app.getAppPath(), 'js/effects/GameEffect.js'));
const EffectBeam = require(path.join(app.getAppPath(), 'js/effects/EffectBeam.js'));
const EffectDeath = require(path.join(app.getAppPath(), 'js/effects/EffectDeath.js'));
const EffectDisguise = require(path.join(app.getAppPath(), 'js/effects/EffectDisguise.js'));
const EffectVisualEffect = require(path.join(app.getAppPath(), 'js/effects/EffectVisualEffect.js'));

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

const TextureLoader = require(path.join(app.getAppPath(), 'js/TextureLoader.js'));
const TemplateLoader = require(path.join(app.getAppPath(), 'js/TemplateLoader.js'));
const ResourceLoader = require(path.join(app.getAppPath(), 'js/ResourceLoader.js'));

const IngameControls = require(path.join(app.getAppPath(), 'js/IngameControls.js'));
const LightManager = require(path.join(app.getAppPath(), 'js/LightManager.js'));
const JournalManager = require(path.join(app.getAppPath(), 'js/JournalManager.js'));

let Config = new ConfigManager('settings.json');
const SaveGame = require(path.join(app.getAppPath(), 'js/SaveGame.js'));
let Global = remote.getCurrentWebContents().MyGlobal;
let Clipboard = null;

/* GUI Controls */

const LBL_3DView = require(path.join(app.getAppPath(), 'js/gui/LBL_3DView.js')); 
const GUIControl = require(path.join(app.getAppPath(), 'js/gui/GUIControl.js'));
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
    window[menuPath.name] = require(path.join(app.getAppPath(), 'js/game/tsl/menu/', menuPath.base)); 
  }
  
  window.iniConfig = new INIConfig(path.join(Config.options.Games[GameKey].Location, 'swkotor2.ini'));
  Game = require(path.join(app.getAppPath(), 'js/game/tsl/'+GameKey+'.js')); 

}else{

  let menus = fs.readdirSync(path.join(app.getAppPath(), 'js/game/', 'kotor', 'menu'));
  for(let i = 0; i < menus.length; i++){
    let menuPath = path.parse(menus[i]);
    window[menuPath.name] = require(path.join(app.getAppPath(), 'js/game/kotor/menu/', menuPath.base)); 
  }

  window.iniConfig = new INIConfig(path.join(Config.options.Games[GameKey].Location, 'swkotor.ini'))
  Game = require(path.join(app.getAppPath(), 'js/game/kotor/'+GameKey+'.js')); 

}

TextureLoader.Anisotropy = iniConfig.getProperty('Graphics Options.Anisotropy').value;
TextureLoader.onAnisotropyChanged();

AudioEngine.GAIN_MUSIC = iniConfig.getProperty('Sound Options.Music Volume').value * .01;
AudioEngine.GAIN_VO = iniConfig.getProperty('Sound Options.Voiceover Volume').value * .01;
AudioEngine.GAIN_SFX = iniConfig.getProperty('Sound Options.Sound Effects Volume').value * .01;
AudioEngine.GAIN_MOVIE = iniConfig.getProperty('Sound Options.Movie Volume').value * .01;

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








// // Looping animation constants.
// const ANIMATION_LOOPING_PAUSE         = 0;
// const ANIMATION_LOOPING_PAUSE2        = 1;
// const ANIMATION_LOOPING_LISTEN        = 2;
// const ANIMATION_LOOPING_MEDITATE      = 3;
// const ANIMATION_LOOPING_WORSHIP       = 4;
// //const ANIMATION_LOOPING_LOOK_FAR    = 5;
// //const ANIMATION_LOOPING_SIT_CHAIR   = 6;
// //const ANIMATION_LOOPING_SIT_CROSS   = 7;
// const ANIMATION_LOOPING_TALK_NORMAL   = 5;
// const ANIMATION_LOOPING_TALK_PLEADING = 6;
// const ANIMATION_LOOPING_TALK_FORCEFUL = 7;
// const ANIMATION_LOOPING_TALK_LAUGHING = 8;
// const ANIMATION_LOOPING_TALK_SAD      = 9;
// const ANIMATION_LOOPING_GET_LOW       = 10;
// const ANIMATION_LOOPING_GET_MID       = 11;
// const ANIMATION_LOOPING_PAUSE_TIRED   = 12;
// const ANIMATION_LOOPING_PAUSE_DRUNK   = 13;
// const ANIMATION_LOOPING_FLIRT         = 14;
// const ANIMATION_LOOPING_USE_COMPUTER  = 15;
// const ANIMATION_LOOPING_DANCE         = 16;
// const ANIMATION_LOOPING_DANCE1        = 17;
// const ANIMATION_LOOPING_HORROR        = 18;
// const ANIMATION_LOOPING_READY         = 19;
// const ANIMATION_LOOPING_DEACTIVATE    = 20;
// const ANIMATION_LOOPING_SPASM         = 21;
// const ANIMATION_LOOPING_SLEEP         = 22;
// const ANIMATION_LOOPING_PRONE         = 23;
// const ANIMATION_LOOPING_PAUSE3        = 24;
// const ANIMATION_LOOPING_WELD              = 25;
// const ANIMATION_LOOPING_DEAD              = 26;
// const ANIMATION_LOOPING_TALK_INJURED      = 27;
// const ANIMATION_LOOPING_LISTEN_INJURED    = 28;
// const ANIMATION_LOOPING_TREAT_INJURED     = 29;
// const ANIMATION_LOOPING_DEAD_PRONE        = 30;
// const ANIMATION_LOOPING_KNEEL_TALK_ANGRY  = 31;
// const ANIMATION_LOOPING_KNEEL_TALK_SAD    = 32;
// const ANIMATION_LOOPING_CHECK_BODY        = 33;
// const ANIMATION_LOOPING_UNLOCK_DOOR       = 34;
// const ANIMATION_LOOPING_SIT_AND_MEDITATE  = 35;

// const ANIMATION_LOOPING_SIT_CHAIR         = 36;//AWD-OEI 07/06/2004
// const ANIMATION_LOOPING_SIT_CHAIR_DRINK   = 37;//AWD-OEI 07/06/2004
// const ANIMATION_LOOPING_SIT_CHAIR_PAZAK   = 38;//AWD-OEI 07/06/2004
// const ANIMATION_LOOPING_SIT_CHAIR_COMP1   = 39;//AWD-OEI 07/06/2004
// const ANIMATION_LOOPING_SIT_CHAIR_COMP2   = 40;//AWD-OEI 07/06/2004

// const ANIMATION_LOOPING_RAGE              = 41;//JAB-OEI 07/15/2004
// //const ANIMATION_LOOPING_DIVE_ROLL       = 42;//BMA-OEI 08/18/2004
// const ANIMATION_LOOPING_CLOSED            = 43;//AWD-OEI 08/23/2004
// const ANIMATION_LOOPING_STEALTH           = 44;//BMA-OEI 08/31/2004
// const ANIMATION_LOOPING_CHOKE_WORKING     = 45;//DJS-OEI 09/09/2004
// const ANIMATION_LOOPING_MEDITATE_STAND    = 46;//DJS-OEI 9/10/2004

// // NOTE: Choke is really a looping animation.  The fire and forget constant has
// //       been left in because it has already been used in many places.  Please
// //       use this constant from now on.
// const ANIMATION_LOOPING_CHOKE                    = 116;

// // Fire and forget animation constants.
// const ANIMATION_FIREFORGET_HEAD_TURN_LEFT     = 100;
// const ANIMATION_FIREFORGET_HEAD_TURN_RIGHT    = 101;
// const ANIMATION_FIREFORGET_PAUSE_SCRATCH_HEAD = 102;
// const ANIMATION_FIREFORGET_PAUSE_BORED        = 103;
// const ANIMATION_FIREFORGET_SALUTE             = 104;
// const ANIMATION_FIREFORGET_BOW                = 105;
// //const ANIMATION_FIREFORGET_STEAL            = 106;
// const ANIMATION_FIREFORGET_GREETING           = 106;
// const ANIMATION_FIREFORGET_TAUNT              = 107;
// const ANIMATION_FIREFORGET_VICTORY1           = 108;
// const ANIMATION_FIREFORGET_VICTORY2           = 109;
// const ANIMATION_FIREFORGET_VICTORY3           = 110;
// //const ANIMATION_FIREFORGET_READ             = 111;
// const ANIMATION_FIREFORGET_INJECT             = 112;
// const ANIMATION_FIREFORGET_USE_COMPUTER       = 113;
// const ANIMATION_FIREFORGET_PERSUADE           = 114;
// const ANIMATION_FIREFORGET_ACTIVATE           = 115;
// // NOTE: Please do not use this choke constant anymore.  The choke is not a fire
// //       and forget animation.  The looping choke constant above should be used
// //       instead.
// const ANIMATION_FIREFORGET_CHOKE              = 116;
// const ANIMATION_FIREFORGET_THROW_HIGH         = 117;
// const ANIMATION_FIREFORGET_THROW_LOW          = 118;
// const ANIMATION_FIREFORGET_CUSTOM01           = 119;
// const ANIMATION_FIREFORGET_TREAT_INJURED      = 120;
// const ANIMATION_FIREFORGET_FORCE_CAST         = 121;
// const ANIMATION_FIREFORGET_OPEN               = 122;//AWD-OEI 08/23/2004
// const ANIMATION_FIREFORGET_DIVE_ROLL          = 123;//DJS-OEI 08/29/2004
// const ANIMATION_FIREFORGET_SCREAM             = 124;//DJS-OEI 09/09/2004

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

      children[ i ].updateMatrixWorld( force );

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