import React, { useEffect, useState } from 'react';
import * as KotOR from '@kotor/KotOR';

interface GFFEditorProps {
  fileData: Uint8Array;
  fileName: string;
  onEdit: (data: Uint8Array, label: string) => void;
}

/**
 * Generic GFF Editor
 * 
 * Provides a tree view of GFF structure with inline editing
 */
export const GFFEditor: React.FC<GFFEditorProps> = ({ fileData, fileName, onEdit }) => {
  const [gff, setGff] = useState<KotOR.GFFObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  useEffect(() => {
    try {
      const parsed = new KotOR.GFFObject(fileData.buffer);
      setGff(parsed);
      setError(null);
    } catch (err) {
      setError(`Failed to parse GFF file: ${err}`);
      console.error('Error parsing GFF:', err);
    }
  }, [fileData]);

  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const renderField = (field: any, path: string, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(path);
    const indent = depth * 20;

    if (field.type === KotOR.GFFDataType.STRUCT) {
      return (
        <div key={path} style={{ marginLeft: `${indent}px` }}>
          <div
            onClick={() => toggleNode(path)}
            style={{
              cursor: 'pointer',
              padding: '4px 8px',
              background: '#2d2d30',
              marginBottom: '2px',
              borderRadius: '2px',
              fontSize: '13px'
            }}
          >
            <span style={{ color: '#808080', marginRight: '8px' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
            <span style={{ color: '#4ec9b0' }}>{field.label}</span>
            <span style={{ color: '#808080', marginLeft: '8px' }}>
              {'{Struct}'}
            </span>
          </div>
          {isExpanded && field.getChildStructs && (
            <div>
              {field.getChildStructs().map((child: any, i: number) =>
                renderField(child, `${path}.${i}`, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    if (field.type === KotOR.GFFDataType.LIST) {
      return (
        <div key={path} style={{ marginLeft: `${indent}px` }}>
          <div
            onClick={() => toggleNode(path)}
            style={{
              cursor: 'pointer',
              padding: '4px 8px',
              background: '#2d2d30',
              marginBottom: '2px',
              borderRadius: '2px',
              fontSize: '13px'
            }}
          >
            <span style={{ color: '#808080', marginRight: '8px' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
            <span style={{ color: '#4ec9b0' }}>{field.label}</span>
            <span style={{ color: '#808080', marginLeft: '8px' }}>
              {'[List]'}
            </span>
          </div>
          {isExpanded && (
            <div>
              {/* Render list items */}
            </div>
          )}
        </div>
      );
    }

    // Primitive field
    return (
      <div
        key={path}
        style={{
          marginLeft: `${indent}px`,
          padding: '4px 8px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          marginBottom: '2px'
        }}
      >
        <span style={{ color: '#9cdcfe', minWidth: '150px' }}>{field.label}:</span>
        <span style={{ color: '#ce9178', marginLeft: '10px' }}>
          {String(field.value)}
        </span>
        <span style={{ color: '#808080', marginLeft: '10px', fontSize: '11px' }}>
          ({KotOR.GFFDataType[field.type]})
        </span>
      </div>
    );
  };

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#f00' }}>
        <h2>Error Loading GFF File</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!gff) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: '#1e1e1e'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px 20px',
        borderBottom: '1px solid #333',
        background: '#252526'
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
          GFF Editor
        </h2>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
          {fileName} • Type: {gff.getType()}
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '15px'
      }}>
        {gff.RootNode && renderField(gff.RootNode, 'root')}
      </div>
    </div>
  );
};

export default GFFEditor;
