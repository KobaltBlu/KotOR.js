import React, { useEffect, useState } from 'react';
import * as KotOR from '@kotor/KotOR';

interface TwoDAEditorProps {
  fileData: Uint8Array;
  fileName: string;
  onEdit: (data: Uint8Array, label: string) => void;
}

/**
 * 2DA Table Editor
 * 
 * Spreadsheet-style editor for 2DA files
 */
export const TwoDAEditor: React.FC<TwoDAEditorProps> = ({ fileData, fileName, onEdit }) => {
  const [twoDA, setTwoDA] = useState<KotOR.TwoDAObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parsed = new KotOR.TwoDAObject(fileData.buffer);
      setTwoDA(parsed);
      setError(null);
    } catch (err) {
      setError(`Failed to parse 2DA file: ${err}`);
      console.error('Error parsing 2DA:', err);
    }
  }, [fileData]);

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#f00' }}>
        <h2>Error Loading 2DA File</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!twoDA) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const columns = twoDA.columns || [];
  const rows = twoDA.rows || [];

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
          2DA Table Editor
        </h2>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
          {fileName} • {rows.length} rows × {columns.length} columns
        </div>
      </div>

      {/* Table */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '15px'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          color: '#d4d4d4'
        }}>
          <thead>
            <tr style={{ background: '#2d2d30', position: 'sticky', top: 0 }}>
              <th style={{
                padding: '8px 12px',
                textAlign: 'left',
                borderBottom: '2px solid #007acc',
                fontWeight: 600,
                color: '#4ec9b0'
              }}>
                Row
              </th>
              {columns.map((col: string, i: number) => (
                <th
                  key={i}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #007acc',
                    fontWeight: 600,
                    color: '#4ec9b0',
                    minWidth: '100px'
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, rowIndex: number) => (
              <tr
                key={rowIndex}
                style={{
                  background: rowIndex % 2 === 0 ? '#1e1e1e' : '#252526'
                }}
              >
                <td style={{
                  padding: '6px 12px',
                  borderBottom: '1px solid #333',
                  color: '#9cdcfe',
                  fontWeight: 500
                }}>
                  {rowIndex}
                </td>
                {columns.map((col: string, colIndex: number) => (
                  <td
                    key={colIndex}
                    style={{
                      padding: '6px 12px',
                      borderBottom: '1px solid #333',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <input
                      type="text"
                      value={row[col.toLowerCase()] || '****'}
                      onChange={(e) => {
                        row[col.toLowerCase()] = e.target.value;
                        onEdit(new Uint8Array(twoDA.toBuffer()), `Edit ${col}`);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#d4d4d4',
                        width: '100%',
                        outline: 'none',
                        padding: '2px 4px'
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TwoDAEditor;
