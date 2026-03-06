import * as THREE from "three";
import { OdysseyTexture } from "../three/odyssey/OdysseyTexture";
import { GameState } from "../GameState";
import { TextureLoader } from "../loaders/TextureLoader";
import { EngineMode } from "../enums/engine/EngineMode";
import { EngineState } from "../enums/engine/EngineState";
import { AudioEngine } from "../audio/AudioEngine";
import { AudioEngineChannel } from "../enums/audio/AudioEngineChannel";
import { TextureType } from "../enums/loaders/TextureType";

const LEGAL_TIME = 3;
const FADE_TIME = 1;

export class LegalScreenManager {

  static plane: THREE.Mesh;
  static scene: THREE.Scene;
  static geometry: THREE.PlaneGeometry;
  static material: THREE.MeshBasicMaterial;
  static texture: OdysseyTexture;

  static timer: number = 0;
  static width: number = 800;
  static height: number = 600;
  static aspectRatio: number = 4 / 3;

  static async Initialize(){
    this.scene = new THREE.Scene();
    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.material = new THREE.MeshBasicMaterial({color: 0xFFFFFF, transparent: true, opacity: 1});
    this.plane = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.plane);
    TextureLoader.Load('Legal').then((texture: OdysseyTexture) => {
      this.texture = texture;
      this.material.map = texture;
      this.width = texture.image.width;
      this.height = texture.image.height;
      this.aspectRatio = this.width / this.height;
    });
  }

  static Update(delta: number = 0){
    //the aspect ratio of the legal screen is 4:3
    const width = GameState.ResolutionManager.getViewportWidth();
    const height = GameState.ResolutionManager.getViewportHeight();
    const scale = Math.min(width / this.width, height / this.height);
    this.plane.scale.set(this.width * scale, this.height * scale, 1);
    this.timer += delta;
    let opacity = this.timer < FADE_TIME ? this.timer / FADE_TIME : this.timer > LEGAL_TIME - FADE_TIME ? (LEGAL_TIME - this.timer) / FADE_TIME : 1;
    this.material.opacity = opacity;
    if(this.timer >= LEGAL_TIME){
      this.timer = 0;
      this.plane.visible = !this.plane.visible;
      window.dispatchEvent(new Event('resize'));
      GameState.MenuManager.MainMenu.Start();
      GameState.SetEngineMode(EngineMode.GUI);
      GameState.State = EngineState.RUNNING;
      AudioEngine.Unmute(AudioEngineChannel.ALL);
      AudioEngine.Mute(AudioEngineChannel.MOVIE);
    }
    GameState.renderer.render(this.scene, GameState.camera_gui);
  }

  static Dispose(){
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}