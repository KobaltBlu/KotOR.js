import * as THREE from "three";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { GameState } from "@/GameState";
import { TextureLoader } from "@/loaders/TextureLoader";
import { EngineMode } from "@/enums/engine/EngineMode";
import { EngineState } from "@/enums/engine/EngineState";
import { AudioEngine } from "@/audio/AudioEngine";
import { AudioEngineChannel } from "@/enums/audio/AudioEngineChannel";

/**
 * LegalScreenManager — TSL retail legal screen (swkotor2.exe).
 *
 * After intro movies (leclogo, obsidianent), BeginIntro shows the "legal" texture GUI:
 * fade-in 250ms → hold 2000ms → fade-out 250ms (empty resref second Show call), then main menu.
 * K1 plays legal as a BIK in the movie queue instead; this manager is TSL-only.
 */
const FADE_MS = 250;
const HOLD_MS = 2000;
const FADE_SEC = FADE_MS / 1000;
const HOLD_SEC = HOLD_MS / 1000;

enum LegalPhase {
  FADE_IN = 0,
  HOLD = 1,
  FADE_OUT = 2,
  DONE = 3,
}

export class LegalScreenManager {

  static plane: THREE.Mesh;
  static backPlane: THREE.Mesh;
  static scene: THREE.Scene;
  static geometry: THREE.PlaneGeometry;
  static material: THREE.MeshBasicMaterial;
  static backMaterial: THREE.MeshBasicMaterial;
  static texture: OdysseyTexture;

  static timer: number = 0;
  static phase: LegalPhase = LegalPhase.FADE_IN;
  static width: number = 800;
  static height: number = 600;
  static aspectRatio: number = 4 / 3;
  static active: boolean = false;

  static async Initialize(){
    this.scene = new THREE.Scene();
    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.backMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false, depthWrite: false });
    this.material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    this.backPlane = new THREE.Mesh(this.geometry, this.backMaterial);
    this.plane = new THREE.Mesh(this.geometry, this.material);
    this.backPlane.position.z = -1;
    this.scene.add(this.backPlane);
    this.scene.add(this.plane);
    const texture = await TextureLoader.Load('legal');
    this.texture = texture;
    this.material.map = texture;
    this.material.needsUpdate = true;
    this.width = texture.image.width;
    this.height = texture.image.height;
    this.aspectRatio = this.width / this.height;
  }

  /**
   * Enter LEGAL mode after intro movies (retail post-PlayMovieQueue path).
   */
  static Start(){
    this.timer = 0;
    this.phase = LegalPhase.FADE_IN;
    this.active = true;
    this.material.opacity = 0;
    this.plane.visible = true;
    this.backPlane.visible = true;
    GameState.SetEngineMode(EngineMode.LEGAL);
    GameState.State = EngineState.RUNNING;
  }

  static Update(delta: number = 0){
    if(!this.active){
      return;
    }

    const width = GameState.ResolutionManager.getViewportWidth();
    const height = GameState.ResolutionManager.getViewportHeight();
    this.backPlane.scale.set(width, height, 1);
    const scale = Math.min(width / this.width, height / this.height);
    this.plane.scale.set(this.width * scale, this.height * scale, 1);

    this.timer += delta;

    switch(this.phase){
      case LegalPhase.FADE_IN:
        this.material.opacity = Math.min(1, this.timer / FADE_SEC);
        if(this.timer >= FADE_SEC){
          this.material.opacity = 1;
          this.timer = 0;
          this.phase = LegalPhase.HOLD;
        }
        break;
      case LegalPhase.HOLD:
        this.material.opacity = 1;
        if(this.timer >= HOLD_SEC){
          this.timer = 0;
          this.phase = LegalPhase.FADE_OUT;
        }
        break;
      case LegalPhase.FADE_OUT:
        this.material.opacity = Math.max(0, 1 - this.timer / FADE_SEC);
        if(this.timer >= FADE_SEC){
          this.material.opacity = 0;
          this.finish();
        }
        break;
    }
  }

  private static finish(){
    this.active = false;
    this.phase = LegalPhase.DONE;
    this.plane.visible = false;
    this.backPlane.visible = false;
    window.dispatchEvent(new Event('resize'));
    GameState.MenuManager.MainMenu.Start();
    GameState.SetEngineMode(EngineMode.GUI);
    GameState.State = EngineState.RUNNING;
    AudioEngine.Unmute(AudioEngineChannel.ALL);
    AudioEngine.Mute(AudioEngineChannel.MOVIE);
  }

  static Dispose(){
    this.geometry?.dispose();
    this.material?.dispose();
    this.backMaterial?.dispose();
    this.texture?.dispose();
  }
}
