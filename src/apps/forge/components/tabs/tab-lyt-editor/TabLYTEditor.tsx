import React, { useEffect, useState } from 'react';
import MonacoEditor from 'react-monaco-editor';
import { BaseTabProps } from '@/apps/forge/interfaces/BaseTabProps';
import { TabLYTEditorState, LYTRoomEntry } from '@/apps/forge/states/tabs/TabLYTEditorState';
import { useEffectOnce } from '@/apps/forge/helpers/UseEffectOnce';
import { LayoutContainerProvider } from '@/apps/forge/context/LayoutContainerContext';
import { LayoutContainer } from '@/apps/forge/components/LayoutContainer/LayoutContainer';
import { UI3DRendererView } from '@/apps/forge/components/UI3DRendererView';
import { MenuItem } from '@/apps/forge/components/common/MenuBar';
import { CameraView } from '@/apps/forge/UI3DRenderer';
import { Form } from 'react-bootstrap';
import { SectionContainer } from '@/apps/forge/components/SectionContainer';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

export const TabLYTEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabLYTEditorState;
  const [code, setCode] = useState<string>(tab.code);

  const onEditorFileLoad = () => {
    setCode(tab.code);
  };

  const onCodeChanged = (newCode: string) => {
    setCode(newCode);
  };

  useEffectOnce(() => {
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    tab.addEventListener('onCodeChanged', onCodeChanged);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener('onCodeChanged', onCodeChanged);
    };
  });

  const onMonacoChange = (newValue: string) => {
    setCode(newValue);
    tab.setCode(newValue);
  };

  const editorDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {
    tab.setEditor(editor);
    tab.setMonaco(monaco);
  };

  const editorOptions: monacoEditor.editor.IEditorOptions = {
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    tabSize: 2,
  };

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        {
          label: 'Extract Layout Assets',
          onClick: () => tab.extractLayoutAssets(),
        },
      ],
    },
    {
      label: 'Edit',
      children: [
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => tab.undo() },
        { label: 'Redo', shortcut: 'Ctrl+Y', onClick: () => tab.redo() },
      ],
    },
    {
      label: 'View',
      children: [
        {
          label: 'Camera',
          children: [
            { label: 'Fit Camera to Scene', onClick: () => tab.ui3DRenderer.fitCameraToScene() },
            { separator: true },
            { label: 'Top View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Top) },
            { label: 'Bottom View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Bottom) },
            { label: 'Left View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Left) },
            { label: 'Right View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Right) },
            { label: 'Front View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Front) },
            { label: 'Back View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Back) },
            { label: 'Isometric View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Orthogonal) },
            { label: 'Default View', onClick: () => tab.ui3DRenderer.reorientCamera(CameraView.Default) },
          ],
        },
      ],
    },
  ];

  const eastPanel = <LYTSidebarComponent tab={tab} />;

  const southPanel = (
    <div style={{ width: '100%', height: '100%' }}>
      <MonacoEditor
        width="100%"
        height="100%"
        language="lyt"
        theme="lyt-dark"
        value={code}
        options={editorOptions}
        onChange={onMonacoChange}
        editorDidMount={editorDidMount}
      />
    </div>
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer eastContent={eastPanel} eastSize={260} southContent={southPanel} southSize={180}>
        <UI3DRendererView context={tab.ui3DRenderer} showMenuBar={true} menuItems={menuItems} />
      </LayoutContainer>
    </LayoutContainerProvider>
  );
};

const PropRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px', fontSize: '12px' }}>
    <span style={{ color: '#aaa' }}>{label}</span>
    <span>{value}</span>
  </div>
);

const LYTSidebarComponent = function (props: { tab: TabLYTEditorState }) {
  const tab = props.tab;
  const [rooms, setRooms] = useState<LYTRoomEntry[]>(tab.roomEntries);
  const [selectedIndex, setSelectedIndex] = useState<number>(tab.selectedRoomIndex);
  const [, forceUpdate] = useState({});

  const onRoomsLoaded = () => {
    setRooms([...tab.roomEntries]);
  };

  const onRoomSelected = (index: number) => {
    setSelectedIndex(index);
  };

  const onRoomPositionChanged = () => {
    forceUpdate({});
  };

  useEffectOnce(() => {
    tab.addEventListener('onRoomsLoaded', onRoomsLoaded);
    tab.addEventListener('onRoomSelected', onRoomSelected);
    tab.addEventListener('onRoomPositionChanged', onRoomPositionChanged);
    tab.addEventListener('onEditorFileLoad', onRoomsLoaded);
    return () => {
      tab.removeEventListener('onRoomsLoaded', onRoomsLoaded);
      tab.removeEventListener('onRoomSelected', onRoomSelected);
      tab.removeEventListener('onRoomPositionChanged', onRoomPositionChanged);
      tab.removeEventListener('onEditorFileLoad', onRoomsLoaded);
    };
  });

  const selectedEntry = rooms[selectedIndex];

  const onPositionChange = (axis: 'x' | 'y' | 'z', value: string) => {
    if (selectedIndex < 0 || !selectedEntry) return;
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const pos = selectedEntry.lytRoom.position;
    const x = axis === 'x' ? num : pos.x;
    const y = axis === 'y' ? num : pos.y;
    const z = axis === 'z' ? num : pos.z;
    tab.updateRoomPosition(selectedIndex, x, y, z);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', fontSize: '12px' }}>
      <SectionContainer name="Rooms" slim={true}>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {rooms.map((entry, i) => (
            <div
              key={i}
              onClick={() => tab.selectRoom(i)}
              style={{
                padding: '3px 6px',
                cursor: 'pointer',
                backgroundColor: i === selectedIndex ? '#3a3d41' : 'transparent',
                borderLeft: i === selectedIndex ? '2px solid #007acc' : '2px solid transparent',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {entry.lytRoom.name}
            </div>
          ))}
          {rooms.length === 0 && <div style={{ padding: '6px', color: '#888' }}>No rooms</div>}
        </div>
      </SectionContainer>

      {selectedEntry && (
        <SectionContainer name="Properties" slim={true}>
          <PropRow label="Name" value={selectedEntry.lytRoom.name} />
          <PropRow label="Index" value={selectedIndex} />
          <div style={{ padding: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <span style={{ width: '14px', color: '#f44' }}>X</span>
              <Form.Control
                type="number"
                size="sm"
                step="0.1"
                value={selectedEntry.lytRoom.position.x}
                onChange={(e) => onPositionChange('x', e.target.value)}
                style={{ fontSize: '11px', padding: '2px 4px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <span style={{ width: '14px', color: '#4f4' }}>Y</span>
              <Form.Control
                type="number"
                size="sm"
                step="0.1"
                value={selectedEntry.lytRoom.position.y}
                onChange={(e) => onPositionChange('y', e.target.value)}
                style={{ fontSize: '11px', padding: '2px 4px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '14px', color: '#48f' }}>Z</span>
              <Form.Control
                type="number"
                size="sm"
                step="0.1"
                value={selectedEntry.lytRoom.position.z}
                onChange={(e) => onPositionChange('z', e.target.value)}
                style={{ fontSize: '11px', padding: '2px 4px' }}
              />
            </div>
          </div>
        </SectionContainer>
      )}

      {tab.lyt && (
        <SectionContainer name="Layout Info" slim={true}>
          <PropRow label="Rooms" value={tab.lyt.rooms.length} />
          <PropRow label="Door Hooks" value={tab.lyt.doorhooks.length} />
          <PropRow label="Tracks" value={tab.lyt.tracks.length} />
          <PropRow label="Obstacles" value={tab.lyt.obstacles.length} />
        </SectionContainer>
      )}
    </div>
  );
};
