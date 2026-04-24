import React, { useState, useCallback, useEffect } from 'react';
import { SectionContainer } from '@/apps/forge/components/SectionContainer';
import { TextureCanvas } from '@/apps/forge/components/TextureCanvas/TextureCanvas';
import * as KotOR from '@/apps/forge/KotOR';

export interface EmitterSectionProps {
  node: KotOR.OdysseyObject3D;
  modelNode: KotOR.OdysseyModelNodeEmitter;
}

export const EmitterSection: React.FC<EmitterSectionProps> = ({ node, modelNode }) => {
  const flagEntries = Object.entries(modelNode.flags || {}).filter(([, v]) => v);

  const refNode = node.emitter?.referenceNode;
  const hasRefNode = refNode && refNode.name;

  const [refX, setRefX] = useState<string>(hasRefNode ? refNode.position.x.toFixed(4) : '0');
  const [refY, setRefY] = useState<string>(hasRefNode ? refNode.position.y.toFixed(4) : '0');
  const [refZ, setRefZ] = useState<string>(hasRefNode ? refNode.position.z.toFixed(4) : '0');

  useEffect(() => {
    if (hasRefNode) {
      setRefX(refNode.position.x.toFixed(4));
      setRefY(refNode.position.y.toFixed(4));
      setRefZ(refNode.position.z.toFixed(4));
    }
  }, [refNode, hasRefNode]);

  const applyRefPosition = useCallback(
    (axis: 'x' | 'y' | 'z', raw: string) => {
      if (!refNode) return;
      const val = parseFloat(raw);
      if (!Number.isFinite(val)) return;
      refNode.position[axis] = val;
    },
    [refNode]
  );

  const handleRefChange = useCallback(
    (axis: 'x' | 'y' | 'z', value: string) => {
      if (axis === 'x') setRefX(value);
      else if (axis === 'y') setRefY(value);
      else setRefZ(value);
      applyRefPosition(axis, value);
    },
    [applyRefPosition]
  );

  return (
    <SectionContainer name="Emitter">
      {modelNode.textureResRef && (
        <div className="mvp-texture-preview">
          <div className="property-editor-row">
            <span className="property-editor-label">Texture</span>
            <span className="property-editor-value">{modelNode.textureResRef}</span>
          </div>
          <TextureCanvas texture={modelNode.textureResRef} width={64} height={64} />
        </div>
      )}
      {modelNode.chunkResRef && (
        <div className="property-editor-row">
          <span className="property-editor-label">Chunk</span>
          <span className="property-editor-value">{modelNode.chunkResRef}</span>
        </div>
      )}
      <div className="property-editor-row">
        <span className="property-editor-label">Update Mode</span>
        <span className="property-editor-value">{modelNode.updateMode || '—'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Render Mode</span>
        <span className="property-editor-value">{modelNode.renderMode || '—'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Blend Mode</span>
        <span className="property-editor-value">{modelNode.blendMode || '—'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Grid</span>
        <span className="property-editor-value">
          {modelNode.gridX} × {modelNode.gridY}
        </span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Loop</span>
        <span className="property-editor-value">{modelNode.loop ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Two-Sided</span>
        <span className="property-editor-value">{modelNode.twoSidedTex ? 'Yes' : 'No'}</span>
      </div>
      <div className="property-editor-row">
        <span className="property-editor-label">Render Order</span>
        <span className="property-editor-value">{modelNode.renderOrder}</span>
      </div>
      {modelNode.blastRadius > 0 && (
        <div className="property-editor-row">
          <span className="property-editor-label">Blast Radius</span>
          <span className="property-editor-value">{modelNode.blastRadius?.toFixed(2)}</span>
        </div>
      )}
      {modelNode.blastLength > 0 && (
        <div className="property-editor-row">
          <span className="property-editor-label">Blast Length</span>
          <span className="property-editor-value">{modelNode.blastLength?.toFixed(2)}</span>
        </div>
      )}
      {flagEntries.length > 0 && (
        <div className="property-editor-row">
          <span className="property-editor-label">Flags</span>
          <span className="property-editor-value mvp-defines">{flagEntries.map(([k]) => k).join(', ')}</span>
        </div>
      )}

      {hasRefNode && (
        <>
          <div className="property-editor-row" style={{ marginTop: 8 }}>
            <span className="property-editor-label">Ref Node</span>
            <span className="property-editor-value">{refNode.name}</span>
          </div>
          <div className="property-editor-row">
            <span className="property-editor-label">Ref Position</span>
            <span className="property-editor-value mvp-vec3-input">
              <label>
                X <input type="number" step="0.1" value={refX} onChange={(e) => handleRefChange('x', e.target.value)} />
              </label>
              <label>
                Y <input type="number" step="0.1" value={refY} onChange={(e) => handleRefChange('y', e.target.value)} />
              </label>
              <label>
                Z <input type="number" step="0.1" value={refZ} onChange={(e) => handleRefChange('z', e.target.value)} />
              </label>
            </span>
          </div>
        </>
      )}
    </SectionContainer>
  );
};
