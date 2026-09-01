import { GameState } from "@/GameState";
import { OdysseyModel3D } from "@/three/odyssey";
import { ModuleArea } from "@/module/ModuleArea";
import { WeatherCondition } from "@/enums/module/WeatherCondition";
import * as THREE from "three";
import { MDLLoader } from "@/loaders";

/** retail weather FX slot count (SetWeather). */
const WEATHER_SLOT_COUNT = 6;

/** Retail weather spread radius (retail constant = 4.5). */
const WEATHER_SPREAD = 4.5;

/** Retail player Z offset for weather base (Update). */
const WEATHER_BASE_Z = 8;

/** Retail StartWeather/StopWeather transition length (ms). */
const WEATHER_TRANSITION_MS = 6000;

/** Retail AIUpdate weather re-roll interval (ms). */
const WEATHER_CHECK_INTERVAL_MS = 300000;

/**
 * Hexagon offsets (right, forward, height) around the camera.
 * Built once in Update from spread radius and 60° steps.
 */
const WEATHER_OFFSETS: ReadonlyArray<Readonly<[number, number, number]>> = (() => {
  const r = WEATHER_SPREAD;
  const s = Math.sin(Math.PI / 3) * r;
  const c = Math.cos(Math.PI / 3) * r;
  return [
    [0, r, 0],
    [-s, c, 5],
    [-s, -c, 5],
    [0, -r, 0],
    [s, -c, 5],
    [s, c, 5],
  ];
})();

const THUNDER_CLOSE = ['as_wt_thundercl1', 'as_wt_thundercl2'] as const;
const THUNDER_ROLLING = ['as_wt_thunderds1', 'as_wt_thunderds2'] as const;

/**
 * AreaWeather class.
 *
 * retail weather roll + retail visual weather (rain/snow/lightning).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file AreaWeather.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @memberof KotOR
 */
export class AreaWeather {

  area: ModuleArea;

  /** Active rain/snow FX models (up to 6). */
  models: OdysseyModel3D[] = [];

  /** Lightning overlay model (fx_lightning01). */
  lightningModel: OdysseyModel3D;

  chanceSnow: number = 0;
  chanceRain: number = 0;
  chanceLightning: number = 0;

  /**
   * Last rolled weather type (GIT CurrentWeather / retail).
   * CLEAR while weather is off after a stop roll still keeps the prior type in retail saves
   * when WeatherStarted is cleared — we store the type used for the last start/stop.
   */
  currentWeather: WeatherCondition = WeatherCondition.CLEAR;

  /** Whether weather is active (GIT WeatherStarted / retail). */
  started: boolean = false;

  /** When true, load() restores saved weather instead of rolling immediately. */
  fromSave: boolean = false;

  /** Target type during a StartWeather/StopWeather transition (retail). */
  private targetWeather: WeatherCondition = WeatherCondition.CLEAR;

  /** Currently applied visual type (retail). */
  private appliedWeather: WeatherCondition = WeatherCondition.CLEAR;

  /** Transition countdown in ms (retail). */
  private transitionMs: number = 0;

  /** Intensity 0–100 driven by the transition (retail). */
  private intensity: number = 0;

  /** Auto re-roll countdown in ms (retail). */
  private checkTimerMs: number = 0;

  /** Lightning strike delay (seconds) before next chance roll. */
  private lightningDelaySec: number = 0;

  /** Active flash remaining (seconds). */
  private lightningFlashSec: number = 0;

  private readonly _forward = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _up = new THREE.Vector3(0, 0, 1);
  private readonly _pos = new THREE.Vector3();
  private readonly _camPos = new THREE.Vector3();
  private _loadingWeather: boolean = false;
  private _loadingLightning: boolean = false;

  constructor(area: ModuleArea){
    this.area = area;
  }

  /** Indoor areas (ARE Flags bit 0) never run weather. */
  isIndoor(): boolean {
    return (this.area.flags & 1) !== 0;
  }

  /** Retail GetRoomDisableWeather — player's current room. */
  isWeatherDisabledInCurrentRoom(): boolean {
    const player = GameState.getCurrentPlayer?.();
    return !!player?.room?.disableWeather;
  }

  /**
   * Retail AIUpdate weather selection.
   * ChanceRain, ChanceSnow, and ChanceLightning are mutually exclusive by priority
   * (rain > snow > lightning-as-rain-type). Lightning FX still uses ChanceLightning
   * as an overlay while rain/snow is active.
   */
  rollWeatherChange(): { type: WeatherCondition; started: boolean; changed: boolean } {
    const roll = Math.floor(Math.random() * 100);
    let type = this.currentWeather;
    let started = this.started;
    let changed = false;

    if(this.chanceRain > 0){
      type = WeatherCondition.RAIN;
      if(roll < this.chanceRain){
        if(!this.started){
          started = true;
          changed = true;
        }
      }else if(this.started){
        started = false;
        changed = true;
      }
    }else if(this.chanceSnow > 0){
      type = WeatherCondition.SNOW;
      if(roll < this.chanceSnow){
        if(!this.started){
          started = true;
          changed = true;
        }
      }else if(this.started){
        started = false;
        changed = true;
      }
    }else if(this.chanceLightning > 0){
      // Lightning-only areas still use weather type RAIN for messaging/visual gate.
      type = WeatherCondition.RAIN;
      if(roll < this.chanceLightning){
        if(!this.started){
          started = true;
          changed = true;
        }
      }else if(this.started){
        started = false;
        changed = true;
      }
    }

    return { type, started, changed };
  }

  /**
   * Retail StartWeather — begin fade-in to type over 6000ms.
   */
  startWeather(type: WeatherCondition){
    this.targetWeather = type;
    this.currentWeather = type;
    this.started = true;
    this.transitionMs = WEATHER_TRANSITION_MS;
  }

  /**
   * Retail StopWeather — begin fade-out over 6000ms.
   */
  stopWeather(){
    this.targetWeather = WeatherCondition.CLEAR;
    this.started = false;
    this.transitionMs = WEATHER_TRANSITION_MS;
  }

  /**
   * Apply a weather state change (from roll or save restore).
   */
  setWeatherState(type: WeatherCondition, started: boolean){
    this.currentWeather = type;
    if(started){
      this.startWeather(type);
    }else{
      this.stopWeather();
    }
  }

  getWeatherModelNameFor(condition: WeatherCondition): string {
    switch(condition){
      case WeatherCondition.SNOW:
        return 'fx_snow';
      case WeatherCondition.RAIN:
        return 'fx_rain';
    }
    return '';
  }

  /**
   * Load weather for the area (called from ModuleArea.loadScene).
   * Indoor areas clear chances. Saved WeatherStarted restores visuals;
   * otherwise the first update roll runs immediately (check timer = 0).
   */
  async load(){
    if(this.isIndoor()){
      this.chanceRain = 0;
      this.chanceSnow = 0;
      this.chanceLightning = 0;
      // Retail LoadGIT indoor: CurrentWeather = 0xFF, WeatherStarted = 0
      this.currentWeather = 0xFF as WeatherCondition;
      this.started = false;
      this.fromSave = false;
      this.checkTimerMs = WEATHER_CHECK_INTERVAL_MS;
      return;
    }

    if(this.fromSave && this.started && this.currentWeather !== WeatherCondition.CLEAR){
      this.setWeatherState(this.currentWeather, true);
      this.checkTimerMs = WEATHER_CHECK_INTERVAL_MS;
    }else if(this.fromSave){
      this.started = false;
      this.targetWeather = WeatherCondition.CLEAR;
      this.appliedWeather = WeatherCondition.CLEAR;
      this.checkTimerMs = WEATHER_CHECK_INTERVAL_MS;
    }else{
      // Fresh area enter — retail AIUpdate rolls when timer is 0.
      this.checkTimerMs = 0;
    }
  }

  /**
   * Retail AIUpdate weather re-roll (every 300s).
   * Visual FX continue in update().
   */
  aiUpdate(delta: number = 0){
    if(this.isIndoor()) return;
    this.updateAutoRoll(delta * 1000);
  }

  /**
   * Per-frame update: transition, FX placement, lightning.
   * Weather re-roll lives in aiUpdate (retail AIUpdate).
   */
  update(delta: number = 0){
    if(this.isIndoor()){
      return;
    }

    const deltaMs = delta * 1000;

    this.updateTransition(deltaMs);
    this.updateWeatherPositions(delta);
    this.updateLightning(delta);
  }

  private updateAutoRoll(deltaMs: number){
    if(this.checkTimerMs > 0){
      this.checkTimerMs = Math.max(0, this.checkTimerMs - deltaMs);
      return;
    }

    const result = this.rollWeatherChange();
    if(result.changed){
      this.setWeatherState(result.type, result.started);
    }else{
      this.currentWeather = result.type;
      this.started = result.started;
    }
    this.checkTimerMs = WEATHER_CHECK_INTERVAL_MS;
  }

  private updateTransition(deltaMs: number){
    if(this.transitionMs <= 0){
      return;
    }

    if(deltaMs < this.transitionMs){
      if(this.targetWeather === WeatherCondition.CLEAR){
        this.intensity = (this.transitionMs / WEATHER_TRANSITION_MS) * 100;
        void this.applyWeatherVisual(this.appliedWeather || this.currentWeather, this.intensity);
      }else{
        this.intensity = ((WEATHER_TRANSITION_MS - this.transitionMs) / WEATHER_TRANSITION_MS) * 100;
        void this.applyWeatherVisual(this.targetWeather, this.intensity);
      }
      this.transitionMs -= deltaMs;
    }else{
      this.transitionMs = 0;
      if(this.targetWeather === WeatherCondition.CLEAR){
        this.intensity = 0;
        void this.applyWeatherVisual(WeatherCondition.CLEAR, 0);
      }else{
        this.intensity = 100;
        void this.applyWeatherVisual(this.targetWeather, 100);
      }
    }
  }

  /**
   * Retail SetWeather — swap FX models and drive intensity.
   */
  private async applyWeatherVisual(type: WeatherCondition, intensity: number){
    if(this.isWeatherDisabledInCurrentRoom()){
      this.clearWeatherModels();
      this.clearLightningModel();
      this.appliedWeather = WeatherCondition.CLEAR;
      return;
    }

    if(intensity <= 0 || type === WeatherCondition.CLEAR){
      this.clearWeatherModels();
      this.clearLightningModel();
      this.appliedWeather = WeatherCondition.CLEAR;
      return;
    }

    if(this.appliedWeather !== type){
      this.clearWeatherModels();
      this.appliedWeather = type;
      await this.ensureWeatherModels(type);
    }

    const animName = type === WeatherCondition.SNOW ? 'snow' : 'rain';
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      if(!model) continue;
      model.visible = intensity > 0;
      if(!model.animationManager?.currentAnimation ||
         model.animationManager.currentAnimation.name?.toLowerCase() !== animName){
        model.playAnimation(animName, true);
      }
    }

    // Lightning overlay when ChanceLightning is set and rain/snow is active.
    if(this.chanceLightning > 0 &&
      (type === WeatherCondition.RAIN || type === WeatherCondition.SNOW)){
      await this.ensureLightningModel();
    }else{
      this.clearLightningModel();
    }
  }

  private async ensureWeatherModels(type: WeatherCondition){
    if(this._loadingWeather) return;
    const resRef = this.getWeatherModelNameFor(type);
    if(!resRef) return;

    // Rain FX is skipped when ChanceRain is 0 (lightning-only areas).
    if(type === WeatherCondition.RAIN && this.chanceRain <= 0){
      return;
    }

    this._loadingWeather = true;
    try{
      const mdl = await MDLLoader.loader.load(resRef);
      const group = GameState.group.weather_effects;
      for(let i = 0; i < WEATHER_SLOT_COUNT; i++){
        if(this.models[i]) continue;
        const model = await OdysseyModel3D.FromMDL(mdl, { context: GameState });
        model.playAnimation(type === WeatherCondition.SNOW ? 'snow' : 'rain', true);
        // Retail SetEmitterAsWeather(1) — PartEmitter
        this.markEmittersAsWeather(model);
        this.models[i] = model;
        group.add(model);
      }
    }catch(e){
      console.error(e);
    }finally{
      this._loadingWeather = false;
    }
  }

  private async ensureLightningModel(){
    if(this.lightningModel || this._loadingLightning) return;
    this._loadingLightning = true;
    try{
      const mdl = await MDLLoader.loader.load('fx_lightning01');
      const model = await OdysseyModel3D.FromMDL(mdl, { context: GameState });
      this.lightningModel = model;
      GameState.group.weather_effects.add(model);
    }catch(e){
      console.error(e);
    }finally{
      this._loadingLightning = false;
    }
  }

  /** Retail SetEmitterAsWeather — mark every emitter under the weather Gob. */
  private markEmittersAsWeather(model: OdysseyModel3D){
    const emitters = model.emitters;
    if(!emitters) return;
    for(let i = 0; i < emitters.length; i++){
      emitters[i].isWeather = true;
    }
  }

  private updateWeatherPositions(delta: number = 0){
    if(!this.models.length) return;

    const player = GameState.getCurrentPlayer?.();
    if(!player) return;

    const camera = GameState.currentCamera || GameState.camera;
    if(!camera) return;

    // Disable weather FX while standing in a DisableWeather room.
    if(this.isWeatherDisabledInCurrentRoom()){
      for(let i = 0; i < this.models.length; i++){
        if(this.models[i]) this.models[i].visible = false;
      }
      if(this.lightningModel) this.lightningModel.visible = false;
      return;
    }

    camera.getWorldPosition(this._camPos);
    camera.getWorldDirection(this._forward);
    this._forward.z = 0;
    if(this._forward.lengthSq() < 1e-6){
      this._forward.set(0, 1, 0);
    }else{
      this._forward.normalize();
    }
    this._right.crossVectors(this._forward, this._up).normalize();

    const baseX = this._camPos.x;
    const baseY = this._camPos.y;
    const baseZ = player.position.z + WEATHER_BASE_Z;
    const yaw = Math.atan2(this._forward.x, this._forward.y);

    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      if(!model) continue;
      const [rightScale, forwardScale, height] = WEATHER_OFFSETS[i];
      this._pos.set(
        baseX + this._right.x * rightScale + this._forward.x * forwardScale,
        baseY + this._right.y * rightScale + this._forward.y * forwardScale,
        baseZ + height
      );
      model.position.copy(this._pos);
      model.rotation.set(0, 0, -yaw);
      model.visible = this.intensity > 0;
      model.update(delta);
    }
  }

  /**
   * Retail lightning strike loop inside Update.
   */
  private updateLightning(delta: number){
    if(!this.lightningModel || this.chanceLightning <= 0) return;
    if(this.isWeatherDisabledInCurrentRoom()){
      this.lightningModel.visible = false;
      return;
    }
    if(this.appliedWeather !== WeatherCondition.RAIN &&
       this.appliedWeather !== WeatherCondition.SNOW) return;

    const player = GameState.getCurrentPlayer?.();
    if(!player) return;

    this.lightningModel.update(delta);

    let ready = true;
    if(this.lightningFlashSec > 0){
      this.lightningFlashSec = Math.max(0, this.lightningFlashSec - delta);
      if(this.lightningFlashSec > 0){
        ready = false;
      }else{
        this.lightningModel.visible = false;
      }
    }
    if(this.lightningDelaySec > 0){
      this.lightningDelaySec = Math.max(0, this.lightningDelaySec - delta);
      if(this.lightningDelaySec > 0) ready = false;
    }
    if(!ready) return;

    this.lightningDelaySec = (Math.floor(Math.random() * 5000) / 1000) + 5;
    if(Math.floor(Math.random() * 100) >= this.chanceLightning){
      return;
    }

    // 50% distant thunder only; 50% flash + close thunder.
    if((Math.random() * 2 | 0) === 0){
      this.playThunder(false);
      return;
    }

    const xOff = (Math.random() * 2 | 0) === 0
      ? -(Math.floor(Math.random() * 100) / 10)
      : (Math.floor(Math.random() * 100) / 10);
    const yOff = (Math.random() * 2 | 0) === 0
      ? -(Math.floor(Math.random() * 100) / 10)
      : (Math.floor(Math.random() * 100) / 10);

    this.lightningModel.position.set(
      player.position.x + xOff,
      player.position.y + yOff,
      player.position.z + 10
    );
    this.lightningModel.visible = true;

    const flashName = `flash0${(Math.floor(Math.random() * 3) + 1)}`;
    const anim = this.lightningModel.playAnimation(flashName, false);
    this.lightningFlashSec = anim?.length || 1;
    this.playThunder(true);
  }

  private playThunder(close: boolean){
    const list = close ? THUNDER_CLOSE : THUNDER_ROLLING;
    const resRef = list[Math.floor(Math.random() * list.length)];
    try{
      GameState.audioEmitter?.playSound(resRef);
    }catch(e){
      // Ambient thunder is best-effort if the WAV is missing.
    }
  }

  private clearWeatherModels(){
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      if(!model) continue;
      model.remove();
      model.dispose();
    }
    this.models = [];
  }

  private clearLightningModel(){
    if(this.lightningModel){
      this.lightningModel.remove();
      this.lightningModel.dispose();
      this.lightningModel = undefined;
    }
  }

  destroy(){
    this.clearWeatherModels();
    this.clearLightningModel();
    this.started = false;
    this.transitionMs = 0;
    this.intensity = 0;
    this.appliedWeather = WeatherCondition.CLEAR;
    this.targetWeather = WeatherCondition.CLEAR;
  }

}
