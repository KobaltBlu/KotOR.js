import React, { useEffect, useRef, useState } from 'react';
import WebviewBridge from '../WebviewBridge';
import * as KotOR from '@kotor/KotOR';

interface UTCEditorProps {
  fileData: Uint8Array;
  fileName: string;
  onEdit: (data: Uint8Array, label: string) => void;
}

/**
 * UTC (Creature Template) Editor
 * 
 * This editor provides:
 * - 3D preview of the creature on the left
 * - Property editing panels on the right
 * - Full GFF property access
 */
export const UTCEditor: React.FC<UTCEditorProps> = ({ fileData, fileName, onEdit }) => {
  const [blueprint, setBlueprint] = useState<KotOR.GFFObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Parse the UTC file
    try {
      const gff = new KotOR.GFFObject(fileData.buffer);
      setBlueprint(gff);
      setError(null);
    } catch (err) {
      setError(`Failed to parse UTC file: ${err}`);
      console.error('Error parsing UTC:', err);
    }
  }, [fileData]);

  useEffect(() => {
    // TODO: Initialize Three.js renderer and load creature model
    // This would use the UI3DRenderer from Forge and ForgeCreature class
    if (blueprint && canvasRef.current) {
      // const renderer = new UI3DRenderer();
      // const creature = new ForgeCreature(blueprint);
      // creature.setContext(renderer);
      // creature.load();
      // renderer.attachObject(creature.container, false);
    }
  }, [blueprint]);

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#f00' }}>
        <h2>Error Loading UTC File</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Left: 3D Preview */}
      <div style={{
        background: '#2a2a2a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            cursor: 'grab'
          }}
        />
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.7)',
          padding: '10px',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '12px'
        }}>
          <div><strong>3D Preview</strong></div>
          <div>{fileName}</div>
        </div>
      </div>

      {/* Right: Properties */}
      <div style={{
        background: '#1e1e1e',
        overflowY: 'auto',
        padding: '20px'
      }}>
        <h2 style={{ marginTop: 0, color: '#fff' }}>Creature Properties</h2>
        
        {/* Basic Info */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#4ec9b0', fontSize: '14px' }}>Basic</h3>
          <div style={{ fontSize: '13px' }}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ color: '#9cdcfe' }}>Template ResRef:</label>
              <input
                type="text"
                value={blueprint.getFieldByLabel('TemplateResRef')?.getValue() || ''}
                onChange={(e) => {
                  const field = blueprint.getFieldByLabel('TemplateResRef');
                  if (field) {
                    field.setValue(e.target.value);
                    onEdit(new Uint8Array(blueprint.toBuffer()), 'Edit Template ResRef');
                  }
                }}
                style={{
                  marginLeft: '10px',
                  padding: '4px 8px',
                  background: '#3c3c3c',
                  border: '1px solid #555',
                  color: '#fff',
                  borderRadius: '2px'
                }}
              />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ color: '#9cdcfe' }}>Appearance Type:</label>
              <input
                type="number"
                value={blueprint.getFieldByLabel('Appearance_Type')?.getValue() || 0}
                onChange={(e) => {
                  const field = blueprint.getFieldByLabel('Appearance_Type');
                  if (field) {
                    field.setValue(parseInt(e.target.value));
                    onEdit(new Uint8Array(blueprint.toBuffer()), 'Edit Appearance');
                  }
                }}
                style={{
                  marginLeft: '10px',
                  padding: '4px 8px',
                  background: '#3c3c3c',
                  border: '1px solid #555',
                  color: '#fff',
                  borderRadius: '2px',
                  width: '100px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#4ec9b0', fontSize: '14px' }}>Stats</h3>
          <div style={{ fontSize: '13px' }}>
            {['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'].map(stat => {
              const field = blueprint.getFieldByLabel(stat);
              return (
                <div key={stat} style={{ marginBottom: '8px' }}>
                  <label style={{ color: '#9cdcfe', width: '60px', display: 'inline-block' }}>
                    {stat}:
                  </label>
                  <input
                    type="number"
                    value={field?.getValue() || 10}
                    onChange={(e) => {
                      if (field) {
                        field.setValue(parseInt(e.target.value));
                        onEdit(new Uint8Array(blueprint.toBuffer()), `Edit ${stat}`);
                      }
                    }}
                    style={{
                      marginLeft: '10px',
                      padding: '4px 8px',
                      background: '#3c3c3c',
                      border: '1px solid #555',
                      color: '#fff',
                      borderRadius: '2px',
                      width: '60px'
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Raw GFF View */}
        <div>
          <h3 style={{ color: '#4ec9b0', fontSize: '14px' }}>GFF Structure</h3>
          <pre style={{
            background: '#252526',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#d4d4d4',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(blueprint.json, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default UTCEditor;
