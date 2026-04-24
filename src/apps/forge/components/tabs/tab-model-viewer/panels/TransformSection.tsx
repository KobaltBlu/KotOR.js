import React from "react";
import { SectionContainer } from "@/apps/forge/components/SectionContainer";
import * as KotOR from "@/apps/forge/KotOR";

export interface TransformSectionProps {
  node: KotOR.OdysseyObject3D;
  modelNode: KotOR.OdysseyModelNode;
}

const nodeTypeLabels: [number, string][] = [
  [KotOR.OdysseyModelNodeType.Skin, 'Skin'],
  [KotOR.OdysseyModelNodeType.Dangly, 'Dangly'],
  [KotOR.OdysseyModelNodeType.Saber, 'Saber'],
  [KotOR.OdysseyModelNodeType.AABB, 'AABB'],
  [KotOR.OdysseyModelNodeType.Mesh, 'Mesh'],
  [KotOR.OdysseyModelNodeType.Light, 'Light'],
  [KotOR.OdysseyModelNodeType.Emitter, 'Emitter'],
  [KotOR.OdysseyModelNodeType.Reference, 'Reference'],
  [KotOR.OdysseyModelNodeType.Camera, 'Camera'],
  [KotOR.OdysseyModelNodeType.Header, 'Header'],
];

function getNodeTypeLabel(nodeType: number): string {
  const labels: string[] = [];
  for (const [flag, name] of nodeTypeLabels) {
    if ((nodeType & flag) === flag) labels.push(name);
  }
  return labels.length ? labels.join(' | ') : 'Unknown';
}

function fmtNum(v: number): string {
  return Number.isFinite(v) ? v.toFixed(4) : '—';
}

export const TransformSection: React.FC<TransformSectionProps> = ({ node, modelNode }) => {
  const euler = node.rotation;
  const degX = (euler.x * 180 / Math.PI).toFixed(2);
  const degY = (euler.y * 180 / Math.PI).toFixed(2);
  const degZ = (euler.z * 180 / Math.PI).toFixed(2);

  return (
    <SectionContainer name="Transform">
      <div className="property-editor-row">
        <span className="property-editor-label">Name</span>
        <span className="property-editor-value">{node.name || '(unnamed)'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Type</span>
        <span className="property-editor-value">{getNodeTypeLabel(modelNode.nodeType)}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Position</span>
        <span className="property-editor-value mvp-vec3">
          <span>X: {fmtNum(node.position.x)}</span>
          <span>Y: {fmtNum(node.position.y)}</span>
          <span>Z: {fmtNum(node.position.z)}</span>
        </span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Rotation</span>
        <span className="property-editor-value mvp-vec3">
          <span>X: {degX}°</span>
          <span>Y: {degY}°</span>
          <span>Z: {degZ}°</span>
        </span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Scale</span>
        <span className="property-editor-value mvp-vec3">
          <span>X: {fmtNum(node.scale.x)}</span>
          <span>Y: {fmtNum(node.scale.y)}</span>
          <span>Z: {fmtNum(node.scale.z)}</span>
        </span>
      </div>
    </SectionContainer>
  );
};
