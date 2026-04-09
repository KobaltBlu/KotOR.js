import React from "react";
import { SectionContainer } from "@/apps/forge/components/SectionContainer";
import * as KotOR from "@/apps/forge/KotOR";

export interface LightSectionProps {
  modelNode: KotOR.OdysseyModelNodeLight;
}

function colorHex(c: { r: number; g: number; b: number }): string {
  const to255 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `#${to255(c.r).toString(16).padStart(2, '0')}${to255(c.g).toString(16).padStart(2, '0')}${to255(c.b).toString(16).padStart(2, '0')}`;
}

export const LightSection: React.FC<LightSectionProps> = ({ modelNode }) => {
  const hasFlare = modelNode.flare && modelNode.flare.textures && modelNode.flare.textures.length > 0;

  return (
    <SectionContainer name="Light">
      {modelNode.color && (
        <div className="property-editor-row">
          <span className="property-editor-label">Color</span>
          <span className="property-editor-value">
            <span className="mvp-color-swatch" style={{ backgroundColor: colorHex(modelNode.color) }} />
            {colorHex(modelNode.color)}
          </span>
        </div>
      )}
      <div className="property-editor-row">
        <span className="property-editor-label">Radius</span>
        <span className="property-editor-value">{modelNode.radius?.toFixed(2)}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Intensity</span>
        <span className="property-editor-value">{modelNode.intensity?.toFixed(2)}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Multiplier</span>
        <span className="property-editor-value">{modelNode.multiplier?.toFixed(2)}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Priority</span>
        <span className="property-editor-value">{modelNode.lightPriority}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Ambient</span>
        <span className="property-editor-value">{modelNode.ambientFlag ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Dynamic</span>
        <span className="property-editor-value">{modelNode.dynamicFlag ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Shadow</span>
        <span className="property-editor-value">{modelNode.shadowFlag ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Fading</span>
        <span className="property-editor-value">{modelNode.fadingLightFlag ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Affect Dynamic</span>
        <span className="property-editor-value">{modelNode.affectDynamicFlag ? 'Yes' : 'No'}</span>
      </div>
      {hasFlare && (
        <>
          <div className="property-editor-row">
            <span className="property-editor-label">Flare Radius</span>
            <span className="property-editor-value">{modelNode.flare.radius?.toFixed(2)}</span>
          </div>
          <div className="property-editor-row">
            <span className="property-editor-label">Flare Textures</span>
            <span className="property-editor-value mvp-defines">{modelNode.flare.textures.join(', ')}</span>
          </div>
        </>
      )}
    </SectionContainer>
  );
};
