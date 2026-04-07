import React, { useEffect, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { TabWOKEditorControlMode, TabWOKEditorState } from "@/apps/forge/states/tabs";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { UI3DRendererView } from "@/apps/forge/components/UI3DRendererView";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { MenuItem } from "@/apps/forge/components/common/MenuBar";
import { CameraView } from "@/apps/forge/UI3DRenderer";

import * as KotOR from "@/apps/forge/KotOR";
import { SectionContainer } from "@/apps/forge/components/SectionContainer";
import { Button, ButtonGroup, Form } from "react-bootstrap";

export const TabWOKEditor = function(props: BaseTabProps) {
  const tab: TabWOKEditorState = props.tab as TabWOKEditorState;
  const [walkmesh, setWalkmesh] = useState<KotOR.OdysseyWalkMesh>();
  const [wireframeVisible, setWireframeVisible] = useState(() => tab.wireframeVisible);
  const [edgeNormalHelpersVisible, setEdgeNormalHelpersVisible] = useState(() => tab.edgeNormalHelpersVisible);
  const [faceNormalHelpersVisible, setFaceNormalHelpersVisible] = useState(() => tab.faceNormalHelpersVisible);
  const [hasSelectedFace, setHasSelectedFace] = useState(false);

  const onEditorFileLoad = () => {
    setWalkmesh(tab.wok);
    setHasSelectedFace(false);
  };

  const onUndoRedoApplied = () => {
    setWalkmesh(tab.wok);
  };

  const onWireframeVisibilityChange = () => {
    setWireframeVisible(tab.wireframeVisible);
  };

  const onEdgeNormalHelpersVisibilityChange = () => {
    setEdgeNormalHelpersVisible(tab.edgeNormalHelpersVisible);
  };

  const onFaceNormalHelpersVisibilityChange = () => {
    setFaceNormalHelpersVisible(tab.faceNormalHelpersVisible);
  };

  const onFaceSelectedForMenu = (face?: KotOR.OdysseyFace3) => {
    setHasSelectedFace(face != null);
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    tab.addEventListener('onUndoApplied', onUndoRedoApplied);
    tab.addEventListener('onRedoApplied', onUndoRedoApplied);
    tab.addEventListener('onWireframeVisibilityChange', onWireframeVisibilityChange);
    tab.addEventListener('onEdgeNormalHelpersVisibilityChange', onEdgeNormalHelpersVisibilityChange);
    tab.addEventListener('onFaceNormalHelpersVisibilityChange', onFaceNormalHelpersVisibilityChange);
    tab.addEventListener('onFaceSelected', onFaceSelectedForMenu);
    return () => { //destructor
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener('onUndoApplied', onUndoRedoApplied);
      tab.removeEventListener('onRedoApplied', onUndoRedoApplied);
      tab.removeEventListener('onWireframeVisibilityChange', onWireframeVisibilityChange);
      tab.removeEventListener('onEdgeNormalHelpersVisibilityChange', onEdgeNormalHelpersVisibilityChange);
      tab.removeEventListener('onFaceNormalHelpersVisibilityChange', onFaceNormalHelpersVisibilityChange);
      tab.removeEventListener('onFaceSelected', onFaceSelectedForMenu);
    };
  })

  const menuItems: MenuItem[] = [
    {
      label: 'Edit',
      children: [
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => tab.undo() },
        { label: 'Redo', shortcut: 'Ctrl+Y', onClick: () => tab.redo() },
        { separator: true },
        {
          label: 'Flip Normal',
          disabled: !hasSelectedFace,
          onClick: () => tab.flipNormalOfSelectedFace(),
        },
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
        { separator: true },
        { label: 'Wireframe', checked: wireframeVisible, onClick: () => tab.toggleWireframe() },
        { label: 'Edge Normal Helpers', checked: edgeNormalHelpersVisible, onClick: () => tab.toggleEdgeNormalHelpers() },
        { label: 'Face Normal Helpers', checked: faceNormalHelpersVisible, onClick: () => tab.toggleFaceNormalHelpers() },
      ],
    },
  ];

  const eastPanel = (
    <WOKSidebarComponent tab={tab} walkmesh={walkmesh} />
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer eastContent={eastPanel} eastSize={280}>
        <UI3DRendererView context={tab.ui3DRenderer} showMenuBar={true} menuItems={menuItems} />
        <UI3DToolPalette tab={tab} />
      </LayoutContainer>
    </LayoutContainerProvider>
  )
}

const UI3DToolPalette = function(props: any){
  const tab = props.tab as TabWOKEditorState;
  const [controlMode, setControlMode] = useState<TabWOKEditorControlMode>(TabWOKEditorControlMode.FACE);

  const onControlModeChange = () => {
    setControlMode(tab.controlMode);
  };

  useEffectOnce( () => {
    tab.addEventListener('onControlModeChange', onControlModeChange);
    return () => {
      tab.removeEventListener('onControlModeChange', onControlModeChange);
    };
  });

  return (
    <div className="UI3DToolPalette" style={{ marginTop: '25px' }}>
      <ul>
        <li className={`${controlMode == 0 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(0)}><a title="Face Mode"><i className="fa-solid fa-cube"></i></a></li>
        <li className={`${controlMode == 1 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(1)}><a title="Vertex Mode"><i className="fa-solid fa-draw-polygon"></i></a></li>
        <li className={`${controlMode == 2 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(2)}><a title="Edge Mode"><i className="fa-solid fa-circle-nodes"></i></a></li>
        <li className={`${controlMode == 3 ? 'selected' : ''}`} onClick={(e) => tab.setControlMode(3)}><a title="Paint Walk Type"><i className="fa-solid fa-fill-drip"></i></a></li>
      </ul>
    </div>
  );
}

const PropRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="wok-prop-row">
    <span className="wok-prop-label">{label}</span>
    <span className="wok-prop-value">{value}</span>
  </div>
);

const WOKSidebarComponent = function(props: any){
  const tab: TabWOKEditorState = props.tab as TabWOKEditorState;

  const [walkmesh, setWalkmesh] = useState<KotOR.OdysseyWalkMesh>(props.walkmesh);
  const [selectedFace, setSelectedFace] = useState<KotOR.OdysseyFace3>();
  const [selectedEdge, setSelectedEdge] = useState<KotOR.WalkmeshEdge>();
  const [controlMode, setControlMode] = useState<TabWOKEditorControlMode>(TabWOKEditorControlMode.FACE);
  const [paintWalkIndex, setPaintWalkIndex] = useState<number>(0);
  const [, setEdgeTransitionVersion] = useState(0);

  const onFaceSelected = (face: KotOR.OdysseyFace3) => setSelectedFace(face);
  const onEdgeSelected = (edge: KotOR.WalkmeshEdge) => setSelectedEdge(edge);
  const onEdgeTransitionChange = () => setEdgeTransitionVersion(v => v + 1);
  const onControlModeChange = () => setControlMode(tab.controlMode);
  const onPaintWalkIndexChange = () => setPaintWalkIndex(tab.paintWalkIndex);

  useEffectOnce( () => {
    tab.addEventListener('onFaceSelected', onFaceSelected);
    tab.addEventListener('onEdgeSelected', onEdgeSelected);
    tab.addEventListener('onControlModeChange', onControlModeChange);
    tab.addEventListener('onPaintWalkIndexChange', onPaintWalkIndexChange);
    tab.addEventListener('onEdgeTransitionChange', onEdgeTransitionChange);
    return () => {
      tab.removeEventListener('onFaceSelected', onFaceSelected);
      tab.removeEventListener('onEdgeSelected', onEdgeSelected);
      tab.removeEventListener('onControlModeChange', onControlModeChange);
      tab.removeEventListener('onPaintWalkIndexChange', onPaintWalkIndexChange);
      tab.removeEventListener('onEdgeTransitionChange', onEdgeTransitionChange);
    };
  });

  useEffect(() => { setWalkmesh(props.walkmesh); }, [props.walkmesh]);

  const surfaceMaterials = KotOR.OdysseyModelUtility.SURFACEMATERIALS || [];
  const tileColors = KotOR.OdysseyWalkMesh.TILECOLORS || [];
  const selectedFaceIndex = selectedFace != null ? walkmesh?.faces.indexOf(selectedFace) ?? -1 : -1;
  const selectedEdgeIndex = selectedEdge != null ? Array.from(walkmesh?.edges?.entries() || []).find(([, e]) => e === selectedEdge)?.[0] ?? -1 : -1;

  return (
    <div className="wok-sidebar">
      {walkmesh && (
        <>
          <SectionContainer name="Walkmesh" slim={true}>
            <div className="wok-stats-grid">
              <PropRow label="Vertices" value={walkmesh.vertices.length} />
              <PropRow label="Faces" value={walkmesh.faces.length} />
              <PropRow label="Edges" value={walkmesh.edges.size} />
              <PropRow label="Walkable" value={walkmesh.walkableFaces.length} />
            </div>
          </SectionContainer>

          <SectionContainer name="Tools" slim={true}>
            <ButtonGroup size="sm" className="wok-mode-buttons">
              <Button variant="outline-secondary" active={controlMode === 0} onClick={() => tab.setControlMode(0)} title="Face">
                <i className="fa-solid fa-cube" />
              </Button>
              <Button variant="outline-secondary" active={controlMode === 1} onClick={() => tab.setControlMode(1)} title="Vertex">
                <i className="fa-solid fa-draw-polygon" />
              </Button>
              <Button variant="outline-secondary" active={controlMode === 2} onClick={() => tab.setControlMode(2)} title="Edge">
                <i className="fa-solid fa-circle-nodes" />
              </Button>
              <Button variant="outline-secondary" active={controlMode === 3} onClick={() => tab.setControlMode(3)} title="Paint">
                <i className="fa-solid fa-fill-drip" />
              </Button>
            </ButtonGroup>
          </SectionContainer>

          {controlMode === TabWOKEditorControlMode.PAINT && (
            <SectionContainer name="Paint Brush" slim={true}>
              <Form.Select size="sm" value={paintWalkIndex} onChange={(e) => tab.setPaintWalkIndex(parseInt(e.target.value, 10))}>
                {surfaceMaterials.length === 0 ? (
                  <option value={0}>0: (load surfacemat 2DA)</option>
                ) : (
                  surfaceMaterials.map((mat, i) => (
                    <option key={i} value={i}>{i}: {mat?.label || '(unknown)'}</option>
                  ))
                )}
              </Form.Select>
              <div className="wok-color-swatches">
                {tileColors.slice(0, Math.min(24, tileColors.length)).map((tc, i) => (
                  <button
                    key={i}
                    type="button"
                    title={`${i}: ${surfaceMaterials[i]?.label || ''}`}
                    className={`wok-swatch ${paintWalkIndex === i ? 'selected' : ''}`}
                    style={{ backgroundColor: tc?.color?.getStyle?.() ?? '#888' }}
                    onClick={() => tab.setPaintWalkIndex(i)}
                  />
                ))}
              </div>
            </SectionContainer>
          )}

          <SectionContainer name="Selection" slim={true}>
            {controlMode === TabWOKEditorControlMode.FACE && (
              <>
                <PropRow label="Face" value={selectedFaceIndex >= 0 ? selectedFaceIndex : '—'} />
                <PropRow label="Walk Type" value={selectedFace ? selectedFace.walkIndex : '—'} />
                {selectedFace && (
                  <>
                    <PropRow label="Adjacent" value={`[${selectedFace.adjacent?.[0] ?? '?'}, ${selectedFace.adjacent?.[1] ?? '?'}, ${selectedFace.adjacent?.[2] ?? '?'}]`} />
                    <PropRow label="Walkable" value={selectedFace.surfacemat?.walk ? 'Yes' : 'No'} />
                    <PropRow label="Blocks LOS" value={selectedFace.surfacemat?.lineOfSight ? 'Yes' : 'No'} />
                    <PropRow label="Grass" value={selectedFace.surfacemat?.grass ? 'Yes' : 'No'} />
                    <PropRow label="Sound" value={selectedFace.surfacemat?.sound || '—'} />
                  </>
                )}
              </>
            )}
            {controlMode === TabWOKEditorControlMode.VERTEX && (
              <PropRow label="Vertex" value={tab.selectedVertexIndex >= 0 ? tab.selectedVertexIndex : '—'} />
            )}
            {controlMode === TabWOKEditorControlMode.EDGE && (
              <>
                <PropRow label="Edge" value={selectedEdgeIndex >= 0 ? selectedEdgeIndex : '—'} />
                <div className="wok-prop-row">
                  <span className="wok-prop-label">Transition</span>
                  <Form.Control
                    className="wok-transition-input"
                    type="number"
                    size="sm"
                    min={-1}
                    value={selectedEdge != null ? selectedEdge.transition : ''}
                    placeholder="—"
                    disabled={selectedEdge == null}
                    onChange={(e) => {
                      if (selectedEdge == null || selectedEdgeIndex < 0) return;
                      const raw = e.target.value.trim();
                      const val = raw === '' ? -1 : parseInt(raw, 10);
                      if (!isNaN(val) && val >= -1) {
                        tab.setEdgeTransition(selectedEdgeIndex, val);
                      }
                    }}
                  />
                </div>
                <PropRow label="Face" value={selectedEdge?.face ? walkmesh?.faces.indexOf(selectedEdge.face) : '—'} />
              </>
            )}
            {controlMode === TabWOKEditorControlMode.PAINT && (
              <div className="wok-hint">Click or drag on faces to paint.</div>
            )}
          </SectionContainer>
        </>
      )}
    </div>
  );
}
