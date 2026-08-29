import React, { useEffect, useState } from "react"
import { UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import * as THREE from 'three';
import type { TabModuleEditorState } from "@/apps/forge/states/tabs/TabModuleEditorState";
import { TabModuleEditorControlMode } from "@/apps/forge/states/tabs/TabModuleEditorState";
import { ModuleEditorTabMode } from "@/apps/forge/enum/ModuleEditorTabMode";

export const UI3DOverlayComponent = function(props: { context: UI3DRenderer; tab?: TabModuleEditorState }){
  const ui3DRenderer = props.context;
  const tab = props.tab;
  const [camera, setCamera] = useState<THREE.PerspectiveCamera>(ui3DRenderer?.currentCamera);
  const [, refresh] = useState(0);

  const onAfterRender = () => {
    setCamera(ui3DRenderer.currentCamera);
  };

  useEffect(() => {
    if(tab){
      const update = () => refresh((value) => value + 1);
      tab.addEventListener('onSelectionChanged', update);
      tab.addEventListener('onControlModeChange', update);
      tab.addEventListener('onPreviewModeChange', update);
      tab.addEventListener('onPlaceStickyChange', update);
      tab.addEventListener('onKeymapHelpChange', update);
      tab.addEventListener('onPreviewSpawnModeChange', update);
      ui3DRenderer.addEventListener('onMouseMove', update);
      return () => {
        tab.removeEventListener('onSelectionChanged', update);
        tab.removeEventListener('onControlModeChange', update);
        tab.removeEventListener('onPreviewModeChange', update);
        tab.removeEventListener('onPlaceStickyChange', update);
        tab.removeEventListener('onKeymapHelpChange', update);
        tab.removeEventListener('onPreviewSpawnModeChange', update);
        ui3DRenderer.removeEventListener('onMouseMove', update);
      };
    }
    ui3DRenderer.addEventListener('onAfterRender', onAfterRender);
    return () => ui3DRenderer.removeEventListener('onAfterRender', onAfterRender);
  }, [tab, ui3DRenderer]);

  if(tab){
    const modeLabels: Record<number, string> = {
      [TabModuleEditorControlMode.SELECT]: 'Select (Q)',
      [TabModuleEditorControlMode.TRANSFORM_CONTROL]: 'Translate (W)',
      [TabModuleEditorControlMode.ROTATE_CONTROL]: 'Rotate (E)',
      [TabModuleEditorControlMode.SCALE_CONTROL]: 'Scale (R)',
      [TabModuleEditorControlMode.ADD_GAME_OBJECT]: 'Place Object',
    };
    const placing = tab.controlMode === TabModuleEditorControlMode.ADD_GAME_OBJECT;
    const previewing = tab.tabMode === ModuleEditorTabMode.PREVIEW;
    const multiCount = tab.selectedGameObjects.length;
    const unsaved: string[] = [];
    if(tab.file?.unsaved_changes) unsaved.push('IFO');
    if(tab.areFile?.unsaved_changes) unsaved.push('ARE');
    if(tab.gitFile?.unsaved_changes) unsaved.push('GIT');
    const spawnLabel = tab.previewSpawnMode === 'camera'
      ? 'Camera'
      : tab.previewSpawnMode === 'waypoint'
        ? 'Waypoint'
        : 'Entry';
    return (
      <div className="info-overlay module-editor-overlay">
        <b>{previewing ? 'Playable Preview (Esc to exit)' : modeLabels[tab.controlMode]}</b><br />
        {previewing && <span>GameState.module is live — walk and interact in the area</span>}
        {!previewing && placing && (
          <>
            <span>{tab.selectedGameObjectType}: {tab.selectedBlueprintResRef || 'untitled'}</span><br />
            <span style={{ color: tab.previewValid ? '#66ff88' : '#ff6666' }}>
              {tab.previewValid ? 'Valid placement' : 'Invalid placement'}
            </span><br />
            <span>
              Sticky place: {tab.placeSticky ? 'ON' : 'OFF'} (T) — Shift+click one-shot
            </span><br />
            <span>Esc: cancel</span>
          </>
        )}
        {!previewing && !placing && multiCount > 1 && (
          <span>{multiCount} objects selected</span>
        )}
        {!previewing && !placing && multiCount <= 1 && tab.selectedGameObject && (
          <span>{tab.selectedGameObject.getEditorName()}</span>
        )}
        {!previewing && (
          <div className="module-editor-status-strip">
            Snap {tab.snapEnabled ? `${tab.snapPosition}` : 'off'} · Sel {Math.max(multiCount, tab.selectedGameObject ? 1 : 0)}
            {tab.placeSticky ? ' · Sticky' : ''}
            {unsaved.length ? ` · Unsaved ${unsaved.join('/')}` : ''}
            {' · '}
            <button
              type="button"
              className="module-editor-status-strip__link"
              onClick={() => tab.cyclePreviewSpawnMode()}
              title="Cycle preview spawn (entry / camera / waypoint)"
            >
              Spawn {spawnLabel}
            </button>
            {' · ? help'}
          </div>
        )}
        {tab.showKeymapHelp && !previewing && (
          <div className="module-editor-keymap-help">
            <div><b>Keymap</b></div>
            <div>Q Select · W Move · E Rotate · R Scale</div>
            <div>P Preview · T Sticky place · F Focus · Shift+F Fit</div>
            <div>Esc Cancel / Exit preview · Delete Remove</div>
            <div>Shift+Click additive select / one-shot place</div>
            <div>? Toggle this help</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {
        camera ? (
          <div className="info-overlay">
            <b>Camera</b><br />
            <span>Position - x: {camera.position.x.toFixed(4)}, y: {camera.position.y.toFixed(4)}, z: {camera.position.z.toFixed(4)}</span><br/>
            <span>Rotation - x: {camera.quaternion.x.toFixed(4)}, y: {camera.quaternion.y.toFixed(4)}, z: {camera.quaternion.z.toFixed(4)}, w: {camera.quaternion.w.toFixed(4)}</span><br/>
          </div>
        ) : <></>
      }
    </>
  )
}
