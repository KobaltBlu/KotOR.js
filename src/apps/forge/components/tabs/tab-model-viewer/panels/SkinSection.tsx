import React from 'react';
import { SectionContainer } from '@/apps/forge/components/SectionContainer';
import * as KotOR from '@/apps/forge/KotOR';

export interface SkinSectionProps {
  modelNode: KotOR.OdysseyModelNodeSkin;
}

export const SkinSection: React.FC<SkinSectionProps> = ({ modelNode }) => {
  const boneCount = modelNode.bone_parts?.filter((b) => b !== 0xffff && b !== 65535).length ?? 0;
  const boneMapCount = modelNode.boneMapCount ?? 0;

  return (
    <SectionContainer name="Skin">
      <div className="property-editor-row">
        <span className="property-editor-label">Bone Count</span>
        <span className="property-editor-value">{boneCount}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Bone Map Size</span>
        <span className="property-editor-value">{boneMapCount}</span>
      </div>
      {modelNode.bone_parts && (
        <div className="property-editor-row">
          <span className="property-editor-label">Bone Indices</span>
          <span className="property-editor-value mvp-defines">
            {modelNode.bone_parts.filter((b) => b !== 0xffff && b !== 65535).join(', ')}
          </span>
        </div>
      )}
    </SectionContainer>
  );
};
