import React, { useState } from "react";
import { SectionContainer } from "@/apps/forge/components/SectionContainer";
import { TextureCanvas } from "@/apps/forge/components/TextureCanvas/TextureCanvas";
import * as KotOR from "@/apps/forge/KotOR";
import * as THREE from "three";
import { TabModelViewerState } from "@/apps/forge/states/tabs";

export interface MaterialTextureSectionProps {
  node: KotOR.OdysseyObject3D;
  modelNode: KotOR.OdysseyModelNodeMesh;
  tab: TabModelViewerState;
}

function getShaderDefines(material: THREE.ShaderMaterial): string[] {
  if (!material.defines) return [];
  return Object.keys(material.defines);
}

function getMaterial(node: KotOR.OdysseyObject3D): THREE.ShaderMaterial | undefined {
  for (const child of node.children) {
    if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
      const mat = (child as THREE.Mesh).material;
      if (mat instanceof THREE.ShaderMaterial) return mat;
    }
  }
  const nodeMat = (node as any).material;
  if (nodeMat instanceof THREE.ShaderMaterial) return nodeMat;
  return undefined;
}

function colorHex(c: { r: number; g: number; b: number }): string {
  const to255 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `#${to255(c.r).toString(16).padStart(2, '0')}${to255(c.g).toString(16).padStart(2, '0')}${to255(c.b).toString(16).padStart(2, '0')}`;
}

export const MaterialTextureSection: React.FC<MaterialTextureSectionProps> = ({ node, modelNode, tab }) => {
  const [swapTexture, setSwapTexture] = useState<string>('');
  const [swapping, setSwapping] = useState<boolean>(false);
  const material = getMaterial(node);

  const tex1 = modelNode.textureMap1 || '';
  const tex2 = modelNode.textureMap2 || '';
  const tex3 = modelNode.textureMap3 || '';
  const tex4 = modelNode.textureMap4 || '';

  const defines = material ? getShaderDefines(material) : [];

  const selfIllum = material?.uniforms?.selfIllumColor?.value;
  const tweakColor = material?.uniforms?.tweakColor?.value;
  const shininess = material?.uniforms?.shininess?.value;

  const handleSwapTexture = async () => {
    if (!swapTexture.trim() || swapping) return;
    setSwapping(true);
    try {
      await tab.swapTexture(node, swapTexture.trim().toLowerCase());
    } finally {
      setSwapping(false);
    }
  };

  const handleSwapKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSwapTexture();
  };

  return (
    <SectionContainer name="Material / Textures">
      {tex1 && (
        <div className="mvp-texture-preview">
          <div className="property-editor-row">
            <span className="property-editor-label">Diffuse</span>
            <span className="property-editor-value">{tex1}</span>
          </div>
          <TextureCanvas texture={tex1} width={128} height={128} />
        </div>
      )}
      {tex2 && (
        <div className="property-editor-row">
          <span className="property-editor-label">Lightmap</span>
          <span className="property-editor-value">{tex2}</span>
        </div>
      )}
      {tex3 && (
        <div className="property-editor-row">
          <span className="property-editor-label">Texture 3</span>
          <span className="property-editor-value">{tex3}</span>
        </div>
      )}
      {tex4 && (
        <div className="property-editor-row">
          <span className="property-editor-label">Texture 4</span>
          <span className="property-editor-value">{tex4}</span>
        </div>
      )}

      <div className="mvp-texture-swap">
        <div className="property-editor-row">
          <span className="property-editor-label">Swap Texture</span>
        </div>
        <div className="mvp-swap-controls">
          <input
            type="text"
            className="input"
            placeholder="resref..."
            value={swapTexture}
            onChange={(e) => setSwapTexture(e.target.value)}
            onKeyDown={handleSwapKeyDown}
          />
          <button
            className="btn btn-sm"
            onClick={handleSwapTexture}
            disabled={swapping || !swapTexture.trim()}
          >
            {swapping ? 'Loading...' : 'Apply'}
          </button>
        </div>
      </div>

      {selfIllum && (
        <div className="property-editor-row">
          <span className="property-editor-label">Self Illum</span>
          <span className="property-editor-value">
            <span className="mvp-color-swatch" style={{ backgroundColor: colorHex(selfIllum) }} />
            {colorHex(selfIllum)}
          </span>
        </div>
      )}
      {tweakColor && (
        <div className="property-editor-row">
          <span className="property-editor-label">Tweak Color</span>
          <span className="property-editor-value">
            <span className="mvp-color-swatch" style={{ backgroundColor: colorHex(tweakColor) }} />
            {colorHex(tweakColor)}
          </span>
        </div>
      )}
      {shininess !== undefined && (
        <div className="property-editor-row">
          <span className="property-editor-label">Shininess</span>
          <span className="property-editor-value">{Number(shininess).toFixed(2)}</span>
        </div>
      )}
      {defines.length > 0 && (
        <div className="property-editor-row">
          <span className="property-editor-label">Defines</span>
          <span className="property-editor-value mvp-defines">{defines.join(', ')}</span>
        </div>
      )}
    </SectionContainer>
  );
};
