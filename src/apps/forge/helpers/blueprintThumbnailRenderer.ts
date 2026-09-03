/**
 * Offscreen renderer + queue for blueprint browser model thumbnails.
 *
 * @file blueprintThumbnailRenderer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as THREE from "three";
import * as KotOR from "@/apps/forge/KotOR";
import { UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ForgeCreature } from "@/apps/forge/module-editor/ForgeCreature";
import { ForgeDoor } from "@/apps/forge/module-editor/ForgeDoor";
import { ForgePlaceable } from "@/apps/forge/module-editor/ForgePlaceable";
import type { UtxPreviewObject } from "@/apps/forge/helpers/utxPreview3D";
import {
  computeBlueprintThumbnailFingerprint,
  isBlueprintThumbnailType,
} from "@/apps/forge/helpers/blueprintThumbnailFingerprint";
import {
  blueprintThumbnailCacheKey,
  getBlueprintThumbnailFromCache,
  installBlueprintThumbnailGameDataHook,
  putBlueprintThumbnailInCache,
} from "@/apps/forge/helpers/blueprintThumbnailCache";
import { resolveBlueprintBuffer } from "@/apps/forge/helpers/blueprintThumbnailResolve";
import type { BlueprintItem, BlueprintType } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";

const THUMB_SIZE = 256;

class ThumbnailJobQueue {
  private running = 0;
  private pending: Array<() => void> = [];

  constructor(private readonly concurrency: number = 2) {}

  run<T>(job: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = () => {
        this.running++;
        job()
          .then(resolve, reject)
          .finally(() => {
            this.running--;
            this.pump();
          });
      };
      if (this.running < this.concurrency) {
        execute();
      } else {
        this.pending.push(execute);
      }
    });
  }

  private pump(): void {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const next = this.pending.shift();
      next?.();
    }
  }
}

let sharedRenderer: UI3DRenderer | undefined;
let sharedCanvas: HTMLCanvasElement | undefined;
const queue = new ThumbnailJobQueue(2);
const inFlight = new Map<string, Promise<string | null>>();

function getSharedRenderer(): UI3DRenderer {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement("canvas");
    sharedCanvas.width = THUMB_SIZE;
    sharedCanvas.height = THUMB_SIZE;
  }
  if (!sharedRenderer) {
    sharedRenderer = new UI3DRenderer(sharedCanvas, THUMB_SIZE, THUMB_SIZE);
    sharedRenderer.enabled = true;
    ensurePreserveDrawingBuffer(sharedRenderer);
    installBlueprintThumbnailGameDataHook();
  }
  return sharedRenderer;
}

function ensurePreserveDrawingBuffer(ui: UI3DRenderer): void {
  if (!ui.canvas) {
    return;
  }
  if (ui.renderer) {
    ui.renderer.dispose();
  }
  ui.renderer = new THREE.WebGLRenderer({
    canvas: ui.canvas,
    antialias: true,
    alpha: true,
    depth: true,
    preserveDrawingBuffer: true,
  });
  ui.renderer.setClearColor(ui.clearColor);
  ui.renderer.setSize(ui.width, ui.height);
}

function createPreviewObject(type: BlueprintType, buffer: Uint8Array, resref: string): UtxPreviewObject {
  if (type === "utc") {
    return new ForgeCreature(buffer, resref);
  }
  if (type === "utd") {
    return new ForgeDoor(buffer, resref);
  }
  return new ForgePlaceable(buffer, resref);
}

function getPreviewModel(object: UtxPreviewObject): THREE.Object3D | undefined {
  const anyObj = object as ForgeCreature | ForgeDoor | ForgePlaceable;
  return anyObj.model ?? object.container;
}

function frameModel(ui: UI3DRenderer, model: THREE.Object3D, type: BlueprintType): void {
  const oldRotZ = model.rotation.z;
  model.rotation.z = 0;
  model.position.set(0, 0, 0);

  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  model.position.set(-center.x, -center.y, -center.z);

  const span = Math.max(size.x, size.y, size.z, 0.5);
  const dist = type === "utd" ? span * 2.2 : span * 2.8;
  ui.camera.position.set(0, dist, 0);
  ui.camera.lookAt(0, 0, 0);
  ui.currentCamera = ui.camera;
  ui.camera.updateProjectionMatrix();

  model.rotation.z = oldRotZ;
}

async function waitForTextures(): Promise<void> {
  while (KotOR.TextureLoader.queue.length > 0) {
    await KotOR.TextureLoader.LoadQueue((ref) => {
      const material = ref.material as { map?: THREE.Texture };
      if (material?.map) {
        KotOR.GameState?.renderer?.initTexture?.(material.map);
      }
    });
  }
}

async function renderFrame(ui: UI3DRenderer): Promise<void> {
  await waitForTextures();
  if (!ui.renderer || !ui.currentCamera) {
    return;
  }
  ui.lightManager.update(0, ui.currentCamera);
  ui.currentCamera.updateProjectionMatrix();
  ui.renderer.clear();
  ui.renderer.render(ui.scene, ui.currentCamera);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      "image/webp",
      0.85
    );
  });
}

function disposePreviewObject(object: UtxPreviewObject, ui: UI3DRenderer): void {
  ui.detachObject(object.container);
  const anyObj = object as ForgeCreature | ForgeDoor | ForgePlaceable;
  if (anyObj.model) {
    try {
      anyObj.model.dispose();
    } catch {
      /* ignore */
    }
    anyObj.model = undefined as any;
  }
}

async function renderBlueprintThumbnail(
  type: BlueprintType,
  item: BlueprintItem,
  buffer: Uint8Array,
  fingerprint: string
): Promise<Blob | null> {
  if (!ForgeState.hasGameData) {
    return null;
  }

  const ui = getSharedRenderer();
  const object = createPreviewObject(type, buffer, item.resref);
  object.setContext(ui);

  try {
    await object.load();
    const model = getPreviewModel(object);
    if (!model) {
      return null;
    }

    ui.attachObject(object.container, false);
    frameModel(ui, model, type);
    await renderFrame(ui);

    if (!ui.canvas) {
      return null;
    }
    let blob = await canvasToBlob(ui.canvas);
    if (!blob) {
      blob = await new Promise<Blob | null>((resolve) => {
        ui.canvas!.toBlob((b) => resolve(b), "image/png");
      });
    }
    if (blob) {
      const key = blueprintThumbnailCacheKey(type, item.source, item.resref);
      await putBlueprintThumbnailInCache(key, {
        blob,
        fingerprint,
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        createdAt: Date.now(),
      });
    }
    return blob;
  } catch (e) {
    console.warn(`renderBlueprintThumbnail ${type}:${item.resref}`, e);
    return null;
  } finally {
    disposePreviewObject(object, ui);
  }
}

async function fetchThumbnailBlob(
  type: BlueprintType,
  item: BlueprintItem
): Promise<Blob | null> {
  const buffer = await resolveBlueprintBuffer(item, type);
  if (!buffer?.byteLength) {
    return null;
  }

  const fingerprint = computeBlueprintThumbnailFingerprint(type, buffer);
  const key = blueprintThumbnailCacheKey(type, item.source, item.resref);
  const cached = await getBlueprintThumbnailFromCache(key, fingerprint);
  if (cached?.blob) {
    return cached.blob;
  }

  return queue.run(() => renderBlueprintThumbnail(type, item, buffer, fingerprint));
}

/**
 * Returns an object URL for the blueprint thumbnail, or null when unavailable.
 * Caller should revoke the URL on unmount.
 */
export async function requestBlueprintThumbnail(
  type: BlueprintType,
  item: BlueprintItem
): Promise<string | null> {
  if (!isBlueprintThumbnailType(type) || !ForgeState.hasGameData) {
    return null;
  }

  const dedupeKey = blueprintThumbnailCacheKey(type, item.source, item.resref);
  const existing = inFlight.get(dedupeKey);
  if (existing) {
    return existing;
  }

  const promise = fetchThumbnailBlob(type, item).then((blob) => {
    inFlight.delete(dedupeKey);
    if (!blob) {
      return null;
    }
    return URL.createObjectURL(blob);
  }).catch((e) => {
    inFlight.delete(dedupeKey);
    console.warn("requestBlueprintThumbnail", e);
    return null;
  });

  inFlight.set(dedupeKey, promise);
  return promise;
}

export async function prefetchBlueprintThumbnailCacheHit(
  type: BlueprintType,
  item: BlueprintItem
): Promise<string | null> {
  if (!isBlueprintThumbnailType(type) || !ForgeState.hasGameData) {
    return null;
  }
  const buffer = await resolveBlueprintBuffer(item, type);
  if (!buffer?.byteLength) {
    return null;
  }
  const fingerprint = computeBlueprintThumbnailFingerprint(type, buffer);
  const key = blueprintThumbnailCacheKey(type, item.source, item.resref);
  const cached = await getBlueprintThumbnailFromCache(key, fingerprint);
  if (!cached?.blob) {
    return null;
  }
  return URL.createObjectURL(cached.blob);
}
