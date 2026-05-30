import React from "react";
import { SectionContainer } from "@/apps/forge/components/SectionContainer";
import * as KotOR from "@/apps/forge/KotOR";

export interface DanglySectionProps {
  modelNode: KotOR.OdysseyModelNodeDangly;
}

export const DanglySection: React.FC<DanglySectionProps> = ({ modelNode }) => {
  const constraintCount = modelNode.constraints?.length ?? 0;

  return (
    <SectionContainer name="Dangly">
      <div className="property-editor-row">
        <span className="property-editor-label">Displacement</span>
        <span className="property-editor-value">{modelNode.danglyDisplacement?.toFixed(4)}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Tightness</span>
        <span className="property-editor-value">{modelNode.danglyTightness?.toFixed(4)}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Period</span>
        <span className="property-editor-value">{modelNode.danglyPeriod?.toFixed(4)}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Constraints</span>
        <span className="property-editor-value">{constraintCount}</span>
      </div>
    </SectionContainer>
  );
};
