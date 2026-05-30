import React from "react";
import * as KotOR from "@/apps/forge/KotOR";
import { TabModelViewerState } from "@/apps/forge/states/tabs";
import { TransformSection } from "./TransformSection";
import { MeshSection } from "./MeshSection";
import { MaterialTextureSection } from "./MaterialTextureSection";
import { LightSection } from "./LightSection";
import { EmitterSection } from "./EmitterSection";
import { SkinSection } from "./SkinSection";
import { DanglySection } from "./DanglySection";
import { AnimationControllersSection } from "./AnimationControllersSection";

export interface NodePropertiesPanelProps {
  node: KotOR.OdysseyObject3D;
  modelNode: KotOR.OdysseyModelNode;
  tab: TabModelViewerState;
}

export const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({ node, modelNode, tab }) => {
  const nodeType = modelNode.nodeType;

  const isMesh = (nodeType & KotOR.OdysseyModelNodeType.Mesh) === KotOR.OdysseyModelNodeType.Mesh;
  const isLight = (nodeType & KotOR.OdysseyModelNodeType.Light) === KotOR.OdysseyModelNodeType.Light;
  const isEmitter = (nodeType & KotOR.OdysseyModelNodeType.Emitter) === KotOR.OdysseyModelNodeType.Emitter;
  const isSkin = (nodeType & KotOR.OdysseyModelNodeType.Skin) === KotOR.OdysseyModelNodeType.Skin;
  const isDangly = (nodeType & KotOR.OdysseyModelNodeType.Dangly) === KotOR.OdysseyModelNodeType.Dangly;

  return (
    <div className="mvp-node-properties">
      <TransformSection node={node} modelNode={modelNode} />

      {isMesh && (
        <MeshSection modelNode={modelNode as KotOR.OdysseyModelNodeMesh} />
      )}

      {isMesh && (
        <MaterialTextureSection
          node={node}
          modelNode={modelNode as KotOR.OdysseyModelNodeMesh}
          tab={tab}
        />
      )}

      {isLight && (
        <LightSection modelNode={modelNode as KotOR.OdysseyModelNodeLight} />
      )}

      {isEmitter && (
        <EmitterSection node={node} modelNode={modelNode as KotOR.OdysseyModelNodeEmitter} />
      )}

      {isSkin && (
        <SkinSection modelNode={modelNode as KotOR.OdysseyModelNodeSkin} />
      )}

      {isDangly && (
        <DanglySection modelNode={modelNode as KotOR.OdysseyModelNodeDangly} />
      )}

      <AnimationControllersSection
        modelNode={modelNode}
        currentAnimation={tab.currentAnimation}
      />
    </div>
  );
};
