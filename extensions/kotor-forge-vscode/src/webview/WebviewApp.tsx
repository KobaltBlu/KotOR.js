import React, { useState, useEffect } from 'react';
import WebviewBridge from './WebviewBridge';

// Import editor components
import UTCEditor from './editors/UTCEditor';
import GFFEditor from './editors/GFFEditor';
import TwoDAEditor from './editors/TwoDAEditor';
import ImageViewer from './editors/ImageViewer';
import ModelViewer from './editors/ModelViewer';

interface EditorProps {
  editorType: string;
  fileData: Uint8Array;
  fileName: string;
  mdxData?: Uint8Array | null;
  onEdit: (data: Uint8Array, label: string) => void;
  onSave: () => Uint8Array;
}

/**
 * Editor router - selects the appropriate editor component
 */
const EditorRouter: React.FC<EditorProps> = ({ editorType, fileName, fileData, mdxData, onEdit, onSave }) => {
  switch (editorType) {
    case 'utc':
      return <UTCEditor fileData={fileData} fileName={fileName} onEdit={onEdit} />;

    case 'utd':
    case 'utp':
    case 'uti':
    case 'ute':
    case 'uts':
    case 'utt':
    case 'utw':
    case 'utm':
    case 'gff':
      return <GFFEditor fileData={fileData} fileName={fileName} onEdit={onEdit} />;

    case '2da':
      return <TwoDAEditor fileData={fileData} fileName={fileName} onEdit={onEdit} />;

    case 'image':
      return <ImageViewer fileData={fileData} fileName={fileName} />;

    case 'model':
      return <ModelViewer fileData={fileData} fileName={fileName} mdxData={mdxData ?? null} />;

    default:
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '20px',
          textAlign: 'center',
          background: '#1e1e1e',
          color: '#fff'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>KotOR Forge Editor</h1>
          <p style={{ fontSize: '16px', color: '#888', marginBottom: '20px' }}>
            Editor Type: <strong>{editorType}</strong>
          </p>
          <p style={{ fontSize: '14px', color: '#888' }}>
            File: {fileName}
          </p>
          <p style={{ fontSize: '14px', color: '#888' }}>
            Size: {fileData.length} bytes
          </p>
          <div style={{
            marginTop: '40px',
            padding: '20px',
            background: '#2a2a2a',
            borderRadius: '8px',
            maxWidth: '600px'
          }}>
            <p style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.6' }}>
              Editor for <strong>{editorType}</strong> files is not yet implemented.
              The infrastructure is ready and editors can be added by importing
              existing Forge components.
            </p>
          </div>
        </div>
      );
  }
};

/**
 * Main webview application component
 */
export const WebviewApp: React.FC = () => {
  const [editorType, setEditorType] = useState<string>('');
  const [fileData, setFileData] = useState<Uint8Array>(new Uint8Array());
  const [fileName, setFileName] = useState<string>('');
  const [mdxData, setMdxData] = useState<Uint8Array | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const bridge = WebviewBridge;

    // Handle init message from extension
    bridge.on('init', (message: any) => {
      setEditorType(message.editorType);
      setFileData(new Uint8Array(message.fileData));
      setFileName(message.fileName);
      setMdxData(message.mdxData != null ? new Uint8Array(message.mdxData) : null);
      setIsReady(true);
    });

    // Handle undo message
    bridge.on('undo', (message: any) => {
      // TODO: Implement undo handling
      console.log('Undo requested', message);
    });

    // Handle redo message
    bridge.on('redo', (message: any) => {
      // TODO: Implement redo handling
      console.log('Redo requested', message);
    });

    // Handle getFileData request
    bridge.on('getFileData', (message: any) => {
      // Return current file data
      bridge.sendFileData(fileData, message.requestId);
    });

    // Notify extension that webview is ready
    bridge.notifyReady();
  }, [fileData]);

  const handleEdit = (data: Uint8Array, label: string) => {
    setFileData(data);
    WebviewBridge.notifyEdit(label, data);
  };

  const handleSave = (): Uint8Array => {
    return fileData;
  };

  if (!isReady) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #0078d4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#666' }}>Loading editor...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Route to the appropriate editor based on editorType
  return (
    <EditorRouter
      editorType={editorType}
      fileData={fileData}
      fileName={fileName}
      mdxData={mdxData}
      onEdit={handleEdit}
      onSave={handleSave}
    />
  );
};

export default WebviewApp;
