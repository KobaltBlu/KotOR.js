import React from "react";
import { SectionContainer } from "@/apps/forge/components/SectionContainer";
import * as KotOR from "@/apps/forge/KotOR";

export interface MeshSectionProps {
  modelNode: KotOR.OdysseyModelNodeMesh;
}

function colorHex(c: { r: number; g: number; b: number }): string {
  const to255 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `#${to255(c.r).toString(16).padStart(2, '0')}${to255(c.g).toString(16).padStart(2, '0')}${to255(c.b).toString(16).padStart(2, '0')}`;
}

export const MeshSection: React.FC<MeshSectionProps> = ({ modelNode }) => {
  const vertCount = modelNode.verticesCount ?? modelNode.vertices?.length / 3 ?? 0;
  const faceCount = modelNode.faces?.length ?? 0;
  const uvChannels = modelNode.textureCount ?? 0;

  const bb = modelNode.boundingBox;
  let bbStr = '—';
  if (bb) {
    const w = (bb.max.x - bb.min.x).toFixed(2);
    const h = (bb.max.y - bb.min.y).toFixed(2);
    const d = (bb.max.z - bb.min.z).toFixed(2);
    bbStr = `${w} × ${h} × ${d}`;
  }

  return (
    <SectionContainer name="Mesh">
      <div className="property-editor-row">
        <span className="property-editor-label">Vertices</span>
        <span className="property-editor-value">{vertCount}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Faces</span>
        <span className="property-editor-value">{faceCount}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">UV Channels</span>
        <span className="property-editor-value">{uvChannels}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Bounding Box</span>
        <span className="property-editor-value">{bbStr}</span>
      </div>
      {modelNode.diffuse && (
        <div className="property-editor-row">
          <span className="property-editor-label">Diffuse</span>
          <span className="property-editor-value">
            <span className="mvp-color-swatch" style={{ backgroundColor: colorHex(modelNode.diffuse) }} />
            {colorHex(modelNode.diffuse)}
          </span>
        </div>
      )}
      {modelNode.ambient && (
        <div className="property-editor-row">
          <span className="property-editor-label">Ambient</span>
          <span className="property-editor-value">
            <span className="mvp-color-swatch" style={{ backgroundColor: colorHex(modelNode.ambient) }} />
            {colorHex(modelNode.ambient)}
          </span>
        </div>
      )}
      <div className="property-editor-row">
        <span className="property-editor-label">Transparency</span>
        <span className="property-editor-value">{modelNode.transparencyHint ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Shadow</span>
        <span className="property-editor-value">{modelNode.flagShadow ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Render</span>
        <span className="property-editor-value">{modelNode.flagRender ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Beaming</span>
        <span className="property-editor-value">{modelNode.beaming ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Background Geo</span>
        <span className="property-editor-value">{modelNode.backgroundGeometry ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Lightmap</span>
        <span className="property-editor-value">{modelNode.hasLightmap ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Rotate Texture</span>
        <span className="property-editor-value">{modelNode.rotateTexture ? 'Yes' : 'No'}</span>
      </div>
      {modelNode.nAnimateUV && (
        <>
          <div className="property-editor-row">
            <span className="property-editor-label">UV Dir X</span>
            <span className="property-editor-value">{modelNode.fUVDirectionX?.toFixed(4)}</span>
          </div>
          <div className="property-editor-row">
            <span className="property-editor-label">UV Dir Y</span>
            <span className="property-editor-value">{modelNode.fUVDirectionY?.toFixed(4)}</span>
          </div>
          <div className="property-editor-row">
            <span className="property-editor-label">UV Jitter</span>
            <span className="property-editor-value">{modelNode.fUVJitter?.toFixed(4)}</span>
          </div>
          <div className="property-editor-row">
            <span className="property-editor-label">UV Jitter Speed</span>
            <span className="property-editor-value">{modelNode.fUVJitterSpeed?.toFixed(4)}</span>
          </div>
        </>
      )}
    </SectionContainer>
  );
};
