import React from "react";
import { SectionContainer } from "@/apps/forge/components/SectionContainer";
import * as KotOR from "@/apps/forge/KotOR";

export interface AnimationControllersSectionProps {
  modelNode: KotOR.OdysseyModelNode;
  currentAnimation: KotOR.OdysseyModelAnimation | undefined;
}

const controllerTypeNames: Record<number, string> = {
  8: 'Position',
  20: 'Orientation',
  36: 'Scale',
  76: 'Color',
  80: 'AlphaEnd',
  84: 'AlphaStart',
  88: 'Radius / BirthRate',
  92: 'Bounce_Co',
  96: 'ShadowRadius / CombineTime',
  100: 'SelfIllumColor / Drag',
  104: 'FPS',
  108: 'FrameEnd',
  112: 'FrameStart',
  116: 'Gravity',
  120: 'LifeExp',
  124: 'Mass',
  132: 'Alpha',
  140: 'Multiplier',
  164: 'Threshold',
};

function getControllerName(type: number): string {
  return controllerTypeNames[type] || `Controller(${type})`;
}

export const AnimationControllersSection: React.FC<AnimationControllersSectionProps> = ({ modelNode, currentAnimation }) => {
  if (!currentAnimation) return null;

  const animNode = currentAnimation.nodes.find(n => n.name === modelNode.name);
  if (!animNode || !animNode.controllers || animNode.controllers.size === 0) return null;

  const controllers = Array.from(animNode.controllers.entries());

  return (
    <SectionContainer name="Animation Controllers">
      <div className="property-editor-row">
        <span className="property-editor-label">Animation</span>
        <span className="property-editor-value">{currentAnimation.name}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Tracks</span>
        <span className="property-editor-value">{controllers.length}</span>
      </div>
      {controllers.map(([type, controller]) => (
        <div key={type} className="property-editor-row">
          <span className="property-editor-label">{getControllerName(type)}</span>
          <span className="property-editor-value">
            {(controller as any).data?.length ?? (controller as any).rows?.length ?? '—'} keys
          </span>
        </div>
      ))}
    </SectionContainer>
  );
};
