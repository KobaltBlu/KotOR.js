import React, { useCallback, useEffect, useRef, useState } from "react";
import MonacoEditor from "react-monaco-editor";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import * as THREE from "three";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { ForgeRasterImage, TabImageViewerState } from "@/apps/forge/states/tabs/TabImageViewerState";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import { UI3DRendererView } from "@/apps/forge/components/UI3DRendererView";
import { UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { TXI } from "@/resource/TXI";
import { OdysseyMaterialBuilder } from "@/three/odyssey/OdysseyMaterialBuilder";

import "@/apps/forge/components/tabs/tab-image-viewer/TabImageViewer.scss";

import * as KotOR from "@/apps/forge/KotOR";

export const TabImageViewer = function(props: BaseTabProps){

  const tab = props.tab as TabImageViewerState;
  const [render, rerender] = useState<boolean>(false);
  const [canvasScale, setCanvasScale] = useState<number>(1);
  const [canvasWidth, setCanvasWidth] = useState<number>(512);
  const [canvasHeight, setCanvasHeight] = useState<number>(512);
  const [preview3D, setPreview3D] = useState<boolean>(false);
  const [txiDraft, setTxiDraft] = useState<string>("");
  const [txiApplied, setTxiApplied] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const preview3DContextRef = useRef<UI3DRenderer>(new UI3DRenderer());
  const previewPlaneRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null>(null);
  const previewTextureRef = useRef<KotOR.OdysseyTexture | null>(null);
  const previewMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const previewManagedTexturesRef = useRef<Set<KotOR.OdysseyTexture>>(new Set());
  const txiEditorOptions: monacoEditor.editor.IEditorOptions = {
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: "off",
    lineNumbers: "on",
    fontSize: 12,
  };

  const TXI_DIRECTIVES = new Set([
    "proceduretype","mipmap","filter","defaultwidth","defaultheight","downsamplemin","downsamplemax",
    "decal","blending","compresstexture","isbumpmap","islightmap","cube","bumpmapscaling",
    "bumpmaptexture","bumpyshinytexture","envmaptexture","wateralpha","numx","numy","fps",
    "numchars","fontheight","baselineheight","texturewidth","spacingr","spacingb","caretindent",
    "upperleftcoords","lowerrightcoords",
  ]);
  
  const clampScale = (value: number) => {
    if(value < 0.25) return 0.25;
    if(value > 10) return 10;
    return value;
  };

  const setPixelData = (image: KotOR.TPCObject|KotOR.TGAObject|ForgeRasterImage) => {
    rerender(!render);
    if(canvasRef.current){
      const canvas = canvasRef.current;
      tab.getPixelData().then( (pixelData) => {
        console.log('pixel data', pixelData);
        let ctx = canvas.getContext('2d');
        if(ctx){
          // let data = pixelData;
          tab.workingData = pixelData;

          let width = image.header.width;
          let height = image.header.height;

          //If the image is a TPC we will need to times the height by the number of faces
          //to correct the height incase we have a cubemap
          if(image instanceof KotOR.TPCObject){
            if(image.txi.procedureType == 1){
              width = image.header.width;
              height = image.header.height;
            }else{
              height = image.header.height * ((image.header as any).faces || 1);
            }
          }

          setCanvasWidth(width);
          setCanvasHeight(height);

          tab.bitsPerPixel = image.header.bitsPerPixel;

          canvas.width = width;
          canvas.height = height;

          let imageData = ctx.getImageData(0, 0, width, height);
          if(image instanceof KotOR.TPCObject){
            //FlipY
            TabImageViewerState.FlipY(tab.workingData, width, height);

          }

          if(image instanceof KotOR.TGAObject){
            
            switch(tab.bitsPerPixel){
              case 32:
                tab.workingData = TabImageViewerState.TGAColorFix(tab.workingData);
              break;
              case 24:
                //HTML Canvas requires 32bpp pixel data so we will need to add an alpha channel
                tab.workingData = TabImageViewerState.RGBToRGBA(tab.workingData, width, height);
                tab.workingData = TabImageViewerState.TGAColorFix(tab.workingData);
              break;
              case 8:
                tab.workingData = TabImageViewerState.TGAGrayFix(tab.workingData);
              break;
            }

            TabImageViewerState.FlipY(tab.workingData, width, height);

          }

          //Set the preview image to opaque
          //this.PreviewAlphaFix(this.workingData);

          imageData.data.set(tab.workingData);
          ctx.putImageData(imageData, 0, 0);
        }
      });
    }
  }

  const onMouseWheel = useCallback((e: WheelEvent) => {
    if(!e.ctrlKey){
      return;
    }
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setCanvasScale((prev) => clampScale(prev + delta));
  }, []);

  const zoomIn = () => {
    setCanvasScale((prev) => clampScale(prev + 0.25));
  };

  const zoomOut = () => {
    setCanvasScale((prev) => clampScale(prev - 0.25));
  };

  const zoomReset = () => {
    setCanvasScale(1);
  };

  const zoomFit = () => {
    const el = containerRef.current;
    if(!el || canvasWidth <= 0 || canvasHeight <= 0){
      return;
    }
    const padding = 40;
    const fitWidth = Math.max(50, el.clientWidth - padding);
    const fitHeight = Math.max(50, el.clientHeight - padding);
    const next = Math.min(fitWidth / canvasWidth, fitHeight / canvasHeight);
    setCanvasScale(clampScale(next));
  };

  const formatTxiValue = (value: unknown): string => {
    if (value == null) return String(value);
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      return value.map((item) => {
        if (item != null && typeof item === 'object' && 'x' in item && 'y' in item && 'z' in item) {
          return `(${item.x}, ${item.y}, ${item.z})`;
        }
        return typeof item === 'object' ? JSON.stringify(item) : String(item);
      }).join(', ');
    }
    if (typeof value === 'object' && value !== null && 'x' in value && 'y' in value && 'z' in value) {
      return `(${(value as {x: number; y: number; z: number}).x}, ${(value as {x: number; y: number; z: number}).y}, ${(value as {x: number; y: number; z: number}).z})`;
    }
    return JSON.stringify(value);
  };

  const onEditorFileLoad = () => {
    setPixelData(tab.image);
    const nextTXI = tab.getTXIText();
    setTxiDraft(nextTXI);
    setTxiApplied(nextTXI);
  };

  const validateTXI = (text: string): string[] => {
    const issues: string[] = [];
    const lines = text.split(/\r?\n/);
    for(let i = 0; i < lines.length; i++){
      const raw = lines[i];
      const line = raw.trim();
      if(!line || line.startsWith("//") || line.startsWith("#")) continue;
      const [directiveRaw, ...rest] = line.split(/\s+/);
      const directive = directiveRaw.toLowerCase();
      if(!TXI_DIRECTIVES.has(directive)){
        issues.push(`Line ${i + 1}: Unknown directive "${directiveRaw}"`);
        continue;
      }
      if((directive === "upperleftcoords" || directive === "lowerrightcoords") && rest.length){
        const n = Number.parseInt(rest[0], 10);
        if(!Number.isFinite(n) || n < 0){
          issues.push(`Line ${i + 1}: "${directive}" requires non-negative point count`);
        }
      }
    }
    return issues;
  };

  const txiIssues = validateTXI(txiDraft);
  const txiDirty = txiDraft !== txiApplied;

  const onApplyTXI = () => {
    tab.applyTXIText(txiDraft);
    setTxiApplied(txiDraft);
  };

  const onRevertTXI = () => {
    setTxiDraft(txiApplied);
  };

  useEffectOnce(() => {
    const context = preview3DContextRef.current;
    const onBeforeRender = (delta: number) => {
      const mesh = previewPlaneRef.current;
      const material = previewMaterialRef.current;
      const texture = previewTextureRef.current;
      if(!mesh || !material || !texture){
        return;
      }
      if(material.uniforms.time){
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
      if(previewTextureRef.current){
        previewTextureRef.current.dispose();
        previewTextureRef.current = null;
      }
      context.destroy();
    };
  });

  useEffect(() => {
    const context = preview3DContextRef.current;
    const sourceCanvas = canvasRef.current;
    if(!sourceCanvas){
      return;
    }

    let texture = previewTextureRef.current;
    if(!texture){
      texture = new KotOR.OdysseyTexture(sourceCanvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      previewTextureRef.current = texture;
    }else if(texture.image !== sourceCanvas){
      texture.image = sourceCanvas;
    }
    texture.txi = new TXI(txiApplied || "");
    texture.needsUpdate = true;
    texture.updateMatrix();

    let material = previewMaterialRef.current;
    if(!material){
      material = OdysseyMaterialBuilder.createOdysseyMaterial(texture);
      previewMaterialRef.current = material;
    } else {
      material.uniforms.map.value = texture;
      material.uniforms.uvTransform.value = texture.matrix;
    }

    let mesh = previewPlaneRef.current;
    const planeAspect = canvasWidth > 0 && canvasHeight > 0 ? canvasWidth / canvasHeight : 1;
    const planeW = Math.max(1, planeAspect);
    const planeH = Math.max(1, 1 / Math.max(planeAspect, 0.0001));
    if(!mesh){
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
    void OdysseyMaterialBuilder.applyTXIToMaterial(
      texture,
      material,
      {
        resolveTexture: (resRef: string, noCache?: boolean) => KotOR.TextureLoader.Load(resRef, !!noCache),
        noCache: KotOR.TextureLoader.NOCACHE,
        managedTextures: previewManagedTexturesRef.current,
      },
    ).then(() => {
      if(cancelled || !previewMaterialRef.current){
        return;
      }
      // Image viewer preview should always render as two-sided.
      previewMaterialRef.current.side = THREE.DoubleSide;
      previewMaterialRef.current.needsUpdate = true;
      previewMaterialRef.current.uniformsNeedUpdate = true;
    }).catch(() => {
      // Keep rendering without optional TXI-linked textures.
    });

    return () => {
      cancelled = true;
    };
  }, [txiApplied, canvasWidth, canvasHeight, render]);

  useEffect(() => {
    const context = preview3DContextRef.current;
    if(preview3D){
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
  }, [preview3D]);

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        {
          label: 'Export TGA',
          onClick: () => {
            void tab.exportAs('tga');
          }
        },
        {
          label: 'Export PNG',
          onClick: () => {
            void tab.exportAs('png');
          }
        },
        {
          label: 'Export JPG',
          onClick: () => {
            void tab.exportAs('jpg');
          }
        },
        {
          label: 'Export TPC',
          onClick: () => {
            void tab.exportAs('tpc');
          }
        }
      ]
    }
  ];

  useEffectOnce( () => {
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    // Restored tabs can finish openFile before this component mounts/listens.
    // If image data already exists, hydrate immediately.
    if(tab.image){
      onEditorFileLoad();
    }
    return () => {
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
    }
  });

  useEffect(() => {
    if(containerRef.current){
      containerRef.current.addEventListener('wheel', onMouseWheel, { passive: false });
    }
    return () => {
      if(containerRef.current){
        containerRef.current.removeEventListener('wheel', onMouseWheel);
      }
    }
  }, [onMouseWheel]);

  const eastContent = (
    tab.image ? (
      <div className="txi-pane">
        <div className="txi-pane__toolbar">
          <button
            type="button"
            className="txi-pane__btn"
            disabled={!txiDirty || txiIssues.length > 0}
            onClick={onApplyTXI}
          >
            Apply TXI
          </button>
          <button
            type="button"
            className="txi-pane__btn txi-pane__btn--secondary"
            disabled={!txiDirty}
            onClick={onRevertTXI}
          >
            Revert
          </button>
          <span className="txi-pane__status">
            {txiIssues.length ? `${txiIssues.length} issue(s)` : (txiDirty ? "Unsaved changes" : "Clean")}
          </span>
        </div>
        <div className="txi-pane__editor">
          <MonacoEditor
            width="100%"
            height="100%"
            language="txi"
            theme="txi-dark"
            value={txiDraft}
            options={txiEditorOptions}
            onChange={(value) => setTxiDraft(value || "")}
          />
        </div>
        <div className="txi-pane__issues">
          {txiIssues.slice(0, 8).map((issue, index) => (
            <div key={`txi-issue-${index}`} className="txi-pane__issue">{issue}</div>
          ))}
          {txiIssues.length > 8 ? <div className="txi-pane__issue">...and {txiIssues.length - 8} more</div> : null}
          {!txiIssues.length && tab.image instanceof KotOR.TPCObject ? Object.entries(tab.image.txi).map((element: [string, unknown]) => (
            <div key={`txi-value-${element[0]}`} className="txi-pane__issue">
              {element[0]}: {formatTxiValue(element[1])}
            </div>
          )) : null}
        </div>
      </div>
    ) : (
      <></>
    )
  );

  return (
    <>
      <LayoutContainer eastContent={eastContent}>
        <MenuBar items={menuItems} />
        <div className="tab-image-viewer-menubar">
          <div className="tab-image-viewer-menubar__group">
            <span className="tab-image-viewer-menubar__label">Zoom</span>
            <button type="button" className="tab-image-viewer-menubar__btn" onClick={zoomOut}>-</button>
            <button type="button" className="tab-image-viewer-menubar__btn" onClick={zoomIn}>+</button>
            <button type="button" className="tab-image-viewer-menubar__btn" onClick={zoomReset}>100%</button>
            <button type="button" className="tab-image-viewer-menubar__btn" onClick={zoomFit}>Fit</button>
            <button
              type="button"
              className="tab-image-viewer-menubar__btn"
              onClick={() => setPreview3D((v) => !v)}
            >
              {preview3D ? "2D" : "3D"}
            </button>
            <span className="tab-image-viewer-menubar__readout">{Math.round(canvasScale * 100)}%</span>
          </div>
          <div className="tab-image-viewer-menubar__group">
            <span className="tab-image-viewer-menubar__meta">{canvasWidth}x{canvasHeight}</span>
          </div>
        </div>
        <div ref={containerRef} className="tab-image-viewer-viewport" style={{display: preview3D ? "none" : "flex"}}>
          <canvas ref={canvasRef} className="checkerboard tab-image-viewer-canvas" style={{width: `${canvasWidth}px`, height: `${canvasHeight}px`, transform: `scale(${canvasScale})`}} />
        </div>
        {preview3D ? (
          <div className="tab-image-viewer-viewport tab-image-viewer-viewport--3d">
            <UI3DRendererView context={preview3DContextRef.current} />
          </div>
        ) : null}
      </LayoutContainer>
    </>
  );

}
