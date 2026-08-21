/**
 * 2D document canvas with pointer tools and optional 3D material preview.
 *
 * @file ImageCanvas.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { UI3DRendererView } from "@/apps/forge/components/UI3DRendererView";
import { UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { OdysseyMaterialBuilder } from "@/three/odyssey/OdysseyMaterialBuilder";
import { TXI } from "@/resource/TXI";
import * as KotOR from "@/apps/forge/KotOR";
import type { TabImageViewerState } from "@/apps/forge/states/tabs/TabImageViewerState";
import { useForgeSettings } from "@/apps/forge/settings/useForgeSettings";
import { forgeImageSettings } from "@/apps/forge/settings/forgeEditorsSettings";

function clampScale(value: number): number {
  if (value < 0.1) return 0.1;
  if (value > 16) return 16;
  return value;
}

function eventPixel(e: React.PointerEvent<HTMLCanvasElement>, width: number, height: number): { x: number; y: number } {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
  return {
    x: Math.max(0, Math.min(width - 1, x)),
    y: Math.max(0, Math.min(height - 1, y)),
  };
}

export function ImageCanvas(props: { tab: TabImageViewerState; txiPreview: string }) {
  const tab = props.tab;
  const doc = tab.document;
  const [imagePrefs] = useForgeSettings(forgeImageSettings);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const preview3DContextRef = useRef<UI3DRenderer>(new UI3DRenderer());
  const previewPlaneRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null>(null);
  const previewTextureRef = useRef<KotOR.OdysseyTexture | null>(null);
  const previewMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const previewManagedTexturesRef = useRef<Set<KotOR.OdysseyTexture>>(new Set());

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;
    const width = doc.width;
    const height = doc.height;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      overlay.width = width;
      overlay.height = height;
    }
    const ctx = canvas.getContext("2d");
    const octx = overlay.getContext("2d");
    if (!ctx || !octx) return;
    const image = ctx.createImageData(width, height);
    const src = tab.composite;
    for (let i = 0; i < src.length; i += 4) {
      let r = src[i];
      let g = src[i + 1];
      let b = src[i + 2];
      let a = src[i + 3];
      if (tab.viewChannel === "r") { g = r; b = r; a = 255; }
      else if (tab.viewChannel === "g") { r = g; b = g; a = 255; }
      else if (tab.viewChannel === "b") { r = b; g = b; a = 255; }
      else if (tab.viewChannel === "a") { r = a; g = a; b = a; a = 255; }
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = a;
    }
    ctx.putImageData(image, 0, 0);
    if (previewTextureRef.current) {
      previewTextureRef.current.needsUpdate = true;
    }
    octx.clearRect(0, 0, width, height);
    if (doc.selection) {
      const sel = octx.createImageData(width, height);
      for (let i = 0; i < doc.selection.length; i++) {
        if (!doc.selection[i]) continue;
        const o = i * 4;
        sel.data[o] = 40;
        sel.data[o + 1] = 140;
        sel.data[o + 2] = 255;
        sel.data[o + 3] = 56;
      }
      octx.putImageData(sel, 0, 0);
    }
    const rect = tab.liveRect;
    if (rect && rect.w > 0 && rect.h > 0) {
      octx.strokeStyle = tab.dragKind === "crop" ? "#ffcc66" : "#4da3ff";
      octx.lineWidth = Math.max(1, 1 / tab.canvasScale);
      octx.setLineDash([4, 3]);
      octx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w, rect.h);
      octx.setLineDash([]);
    }
  }, [doc, tab.composite, tab.viewChannel, tab.liveRect, tab.dragKind, tab.canvasScale]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const context = preview3DContextRef.current;
    const onBeforeRender = (delta: number) => {
      const mesh = previewPlaneRef.current;
      const material = previewMaterialRef.current;
      const texture = previewTextureRef.current;
      if (!mesh || !material || !texture) return;
      if (material.uniforms.time) {
        material.uniforms.time.value += delta;
      }
      mesh.rotation.y += delta * 0.5;
      mesh.rotation.x = Math.sin(material.uniforms.time?.value || 0) * 0.12;
      texture.needsUpdate = true;
    };
    context.addEventListener("onBeforeRender", onBeforeRender);
    return () => {
      context.removeEventListener("onBeforeRender", onBeforeRender);
      OdysseyMaterialBuilder.disposeManagedTextures(previewManagedTexturesRef.current);
      if (previewTextureRef.current) {
        previewTextureRef.current.dispose();
        previewTextureRef.current = null;
      }
      context.destroy();
    };
  }, []);

  useEffect(() => {
    const context = preview3DContextRef.current;
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) return;
    let texture = previewTextureRef.current;
    if (!texture) {
      texture = new KotOR.OdysseyTexture(sourceCanvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      previewTextureRef.current = texture;
    } else if (texture.image !== sourceCanvas) {
      texture.image = sourceCanvas;
    }
    texture.txi = new TXI(props.txiPreview || "");
    texture.needsUpdate = true;
    texture.updateMatrix();

    let material = previewMaterialRef.current;
    if (!material) {
      material = OdysseyMaterialBuilder.createOdysseyMaterial(texture);
      previewMaterialRef.current = material;
    } else {
      material.uniforms.map.value = texture;
      material.uniforms.uvTransform.value = texture.matrix;
    }

    let mesh = previewPlaneRef.current;
    const planeAspect = doc.width > 0 && doc.height > 0 ? doc.width / doc.height : 1;
    const planeW = Math.max(1, planeAspect);
    const planeH = Math.max(1, 1 / Math.max(planeAspect, 0.0001));
    if (!mesh) {
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), material);
      previewPlaneRef.current = mesh;
      context.attachObject(mesh, false);
    } else {
      const nextGeo = new THREE.PlaneGeometry(planeW, planeH);
      mesh.geometry.dispose();
      mesh.geometry = nextGeo;
      mesh.material = material;
    }

    let cancelled = false;
    OdysseyMaterialBuilder.disposeManagedTextures(previewManagedTexturesRef.current);
    OdysseyMaterialBuilder.resetMaterialTXIState(material);
    void OdysseyMaterialBuilder.applyTXIToMaterial(texture, material, {
      resolveTexture: (resRef: string, noCache?: boolean) => KotOR.TextureLoader.Load(resRef, !!noCache),
      noCache: KotOR.TextureLoader.NOCACHE,
      managedTextures: previewManagedTexturesRef.current,
    }).then(() => {
      if (cancelled || !previewMaterialRef.current) return;
      previewMaterialRef.current.side = THREE.DoubleSide;
      previewMaterialRef.current.needsUpdate = true;
      previewMaterialRef.current.uniformsNeedUpdate = true;
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [props.txiPreview, doc.width, doc.height]);

  useEffect(() => {
    const context = preview3DContextRef.current;
    if (tab.preview3D) {
      context.clearColor = new THREE.Color(0x0d1118);
      context.camera.position.set(0, 0, 2.25);
      context.camera.lookAt(0, 0, 0);
      context.orbitControls.target.set(0, 0, 0);
      context.orbitControls.update();
      context.enabled = true;
      context.render();
    } else {
      context.enabled = false;
    }
  }, [tab.preview3D]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      tab.canvasScale = clampScale(tab.canvasScale + delta);
      tab.notifyUi();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [tab]);

  useEffect(() => {
    if (imagePrefs.defaultZoom !== "fit") {
      return;
    }
    const el = containerRef.current;
    if (!el) {
      return;
    }
    let applied = false;
    const applyFit = () => {
      if (applied || el.clientWidth < 8 || el.clientHeight < 8 || !doc.width || !doc.height) {
        return;
      }
      applied = true;
      const pad = 32;
      tab.canvasScale = clampScale(Math.min((el.clientWidth - pad) / doc.width, (el.clientHeight - pad) / doc.height));
      tab.notifyUi();
    };
    applyFit();
    const observer = new ResizeObserver(applyFit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [doc.width, doc.height, imagePrefs.defaultZoom, tab]);

  const displayW = Math.max(1, Math.round(doc.width * tab.canvasScale));
  const displayH = Math.max(1, Math.round(doc.height * tab.canvasScale));

  return (
    <>
      <div
        ref={containerRef}
        className="image-canvas-wrap"
        style={{ display: tab.preview3D ? "none" : "flex" }}
      >
        <div
          className={`image-canvas-stack${imagePrefs.checkerboard ? " checkerboard" : ""} image-canvas-stack--${imagePrefs.filter}`}
          style={{ width: displayW, height: displayH }}
        >
          <canvas
            ref={canvasRef}
            className="tab-image-viewer-canvas"
            style={{ width: displayW, height: displayH }}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const p = eventPixel(e, doc.width, doc.height);
              tab.pointerDown(p.x, p.y, e.button);
            }}
            onPointerMove={(e) => {
              const p = eventPixel(e, doc.width, doc.height);
              tab.pointerMove(p.x, p.y, e.buttons);
            }}
            onPointerUp={() => tab.pointerUp()}
          />
          <canvas
            ref={overlayRef}
            style={{ position: "absolute", left: 0, top: 0, width: displayW, height: displayH, pointerEvents: "none" }}
          />
        </div>
      </div>
      {tab.preview3D ? (
        <div className="image-canvas-wrap image-canvas-wrap--3d">
          <UI3DRendererView context={preview3DContextRef.current} />
        </div>
      ) : null}
    </>
  );
}
