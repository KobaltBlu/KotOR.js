import React, { useEffect, useState, ChangeEvent, useCallback } from "react";
import { TabModuleEditorState } from "../states/tabs";
import { SceneGraphTreeView } from "./SceneGraphTreeView";
import { ForgeGameObject } from "../module-editor/ForgeGameObject";
import * as THREE from 'three';
import { ModalBlueprintBrowserState, BlueprintType } from "../states/modal/ModalBlueprintBrowserState";
import { ForgeState } from "../states/ForgeState";
import { ForgeCreature } from "../module-editor/ForgeCreature";
import { ForgeDoor } from "../module-editor/ForgeDoor";
import { ForgeEncounter } from "../module-editor/ForgeEncounter";
import { ForgeItem } from "../module-editor/ForgeItem";
import { ForgePlaceable } from "../module-editor/ForgePlaceable";
import { ForgeSound } from "../module-editor/ForgeSound";
import { ForgeStore } from "../module-editor/ForgeStore";
import { ForgeTrigger } from "../module-editor/ForgeTrigger";
import { ForgeWaypoint } from "../module-editor/ForgeWaypoint";

import * as KotOR from "../KotOR";
import { UI3DRenderer } from "../UI3DRenderer";

export const ModuleEditorSidebarComponent = function(props: any){
  const tab: TabModuleEditorState = props.tab as TabModuleEditorState;

  const [selectedTab, setSelectedTab] = useState<string>('object-properties');
  const [selectedGameObject, setSelectedGameObject] = useState<ForgeGameObject | undefined>(undefined);

  useEffect(() => {
    const onSelectionChanged = (gameObject: ForgeGameObject | undefined) => {
      console.log('onSelectionChanged', gameObject);
      setSelectedGameObject(gameObject);
    };

    tab.addEventListener('onSelectionChanged', onSelectionChanged);
    
    // Set initial selection
    setSelectedGameObject(tab.selectedGameObject);

    return () => {
      tab.removeEventListener('onSelectionChanged', onSelectionChanged);
    };
  }, [tab]);

  return (
    <>
      <div className="nodes-container" style={{ flex: 0.25, overflowY: 'auto' }}>
        <div className="toolbar-header">
          <b>Scene</b>
        </div>
        <SceneGraphTreeView manager={tab.ui3DRenderer.sceneGraphManager}></SceneGraphTreeView>
      </div>
      <div className="tab-host" style={{ flex: 0.75 }}>
        <div className="tabs">
          <ul className="tabs-menu tabs-flex-wrap">
            <li className={`btn btn-tab ${selectedTab == 'object-properties' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('object-properties') }>Properties</a></li>
          </ul>
        </div>
        <div className="tab-container">
          {selectedTab === 'object-properties' && (
            <GITInstancePropertiesEditor gameObject={selectedGameObject} tab={tab} />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Property definition for GIT instance properties
 */
interface GITPropertyDef {
  /** Property name on the ForgeGameObject class */
  propertyName: string;
  /** Display label */
  label: string;
  /** Property type */
  type: 'number' | 'string' | 'boolean' | 'CExoLocString' | 'position' | 'rotation' | 'quaternion' | 'vector3' | 'array';
  /** GFF field label (for reference) */
  gitFieldLabel?: string;
  /** Optional nested property path (e.g., 'position.x') */
  nestedPath?: string;
}

/**
 * Get the blueprint type for a game object based on its class type
 */
function getBlueprintTypeForGameObject(gameObject: ForgeGameObject): BlueprintType | null {
  if(gameObject instanceof ForgeCreature) return 'utc';
  if(gameObject instanceof ForgeDoor) return 'utd';
  if(gameObject instanceof ForgeEncounter) return 'ute';
  if(gameObject instanceof ForgeItem) return 'uti';
  if(gameObject instanceof ForgePlaceable) return 'utp';
  if(gameObject instanceof ForgeStore) return 'utm';
  if(gameObject instanceof ForgeSound) return 'uts';
  if(gameObject instanceof ForgeTrigger) return 'utt';
  if(gameObject instanceof ForgeWaypoint) return 'utw';
  return null;
}

/**
 * Get property definitions for a ForgeGameObject based on its class type
 */
function getGITPropertyDefinitions(gameObject: ForgeGameObject): GITPropertyDef[] {
  const className = gameObject.constructor.name;
  let props: GITPropertyDef[] = [];

  // Common properties for all game objects
  props.push(
    { propertyName: 'templateResRef', label: 'Template ResRef', type: 'string', gitFieldLabel: 'TemplateResRef' },
    { propertyName: 'position', label: 'Position', type: 'position' },
    { propertyName: 'rotation', label: 'Rotation (Z/Bearing)', type: 'rotation', nestedPath: 'rotation.z' }
  );

  // Class-specific properties
  switch(className){
    case 'ForgeRoom':
      props = [];
      props.push(
        { propertyName: 'roomName', label: 'Model', type: 'string', gitFieldLabel: 'ResRef' },
        { propertyName: 'ambientScale', label: 'Ambient Scale', type: 'number', gitFieldLabel: 'AmbientScale' },
        { propertyName: 'envAudio', label: 'Env Audio', type: 'number', gitFieldLabel: 'EnvAudio' },
        { propertyName: 'position', label: 'Position', type: 'vector3', gitFieldLabel: 'Position' }
      );
      break;
    case 'ForgeCreature':
      // Creatures use container.position/rotation
      // XOrientation/YOrientation are derived from rotation.z, so we only show rotation.z
      break;

    case 'ForgeDoor':
      props.push(
        { propertyName: 'linkedTo', label: 'Linked To', type: 'string', gitFieldLabel: 'LinkedTo' },
        { propertyName: 'linkedToFlags', label: 'Linked To Flags', type: 'number', gitFieldLabel: 'LinkedToFlags' },
        { propertyName: 'linkedToModule', label: 'Linked To Module', type: 'string', gitFieldLabel: 'LinkedToModule' },
        { propertyName: 'tag', label: 'Tag', type: 'string', gitFieldLabel: 'Tag' },
        { propertyName: 'transitionDestin', label: 'Transition Destination', type: 'string', gitFieldLabel: 'TransitionDestin' }
      );
      break;

    case 'ForgeItem':
      // Items only have position and rotation
      break;

    case 'ForgePlaceable':
      // Placeables only have position and rotation
      break;

    case 'ForgeTrigger':
      props.push(
        { propertyName: 'vertices', label: 'Vertices', type: 'array', gitFieldLabel: 'Geometry' }
      );
      break;

    case 'ForgeWaypoint':
      props.push(
        { propertyName: 'appearance', label: 'Appearance', type: 'number', gitFieldLabel: 'Appearance' },
        { propertyName: 'description', label: 'Description', type: 'CExoLocString', gitFieldLabel: 'Description' },
        { propertyName: 'hasMapNote', label: 'Has Map Note', type: 'boolean', gitFieldLabel: 'HasMapNote' },
        { propertyName: 'linkedTo', label: 'Linked To', type: 'string', gitFieldLabel: 'LinkedTo' },
        { propertyName: 'mapNote', label: 'Map Note', type: 'CExoLocString', gitFieldLabel: 'MapNote' },
        { propertyName: 'mapNoteEnabled', label: 'Map Note Enabled', type: 'boolean', gitFieldLabel: 'MapNoteEnabled' },
        { propertyName: 'tag', label: 'Tag', type: 'string', gitFieldLabel: 'Tag' }
      );
      break;

    case 'ForgeStore':
      props.push(
        { propertyName: 'resref', label: 'ResRef', type: 'string', gitFieldLabel: 'ResRef' }
      );
      break;

    case 'ForgeSound':
      props.push(
        { propertyName: 'generatedType', label: 'Generated Type', type: 'number', gitFieldLabel: 'GeneratedType' }
      );
      break;

    case 'ForgeCamera':
      // Remove common position/rotation and add camera-specific ones
      props.splice(1, 2); // Remove position and rotation
      props.push(
        { propertyName: 'cameraID', label: 'Camera ID', type: 'number', gitFieldLabel: 'CameraID' },
        { propertyName: 'fov', label: 'Field of View', type: 'number', gitFieldLabel: 'FieldOfView' },
        { propertyName: 'height', label: 'Height', type: 'number', gitFieldLabel: 'Height' },
        { propertyName: 'micRange', label: 'Mic Range', type: 'number', gitFieldLabel: 'MicRange' },
        { propertyName: 'quaternion', label: 'Orientation', type: 'quaternion', gitFieldLabel: 'Orientation' },
        { propertyName: 'pitch', label: 'Pitch', type: 'number', gitFieldLabel: 'Pitch' },
        { propertyName: 'position', label: 'Position', type: 'vector3', gitFieldLabel: 'Position' }
      );
      break;

    case 'ForgeEncounter':
      props.push(
        { propertyName: 'vertices', label: 'Vertices', type: 'array', gitFieldLabel: 'Geometry' },
        { propertyName: 'spawnPointList', label: 'Spawn Points', type: 'array', gitFieldLabel: 'SpawnPointList' }
      );
      break;
  }

  return props;
}

/**
 * Component for editing GIT instance properties of a selected game object
 * This edits the class properties directly, not GFF fields
 */
const GITInstancePropertiesEditor = function(props: { gameObject: ForgeGameObject | undefined; tab: TabModuleEditorState }){
  const { gameObject, tab } = props;
  const [selectedObject, setSelectedObject] = useState<ForgeGameObject | undefined>(gameObject);

  useEffect(() => {
    setSelectedObject(gameObject);
  }, [gameObject]);

  if(!selectedObject){
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
        No object selected. Select a game object to edit its GIT instance properties.
      </div>
    );
  }

  const propertyDefs = getGITPropertyDefinitions(selectedObject);

  return (
    <div style={{ display: 'block', height: '100%', width: '100%', overflow: 'auto' }}>
      <div>
        <div style={{ fontSize: '12px', marginBottom: '5px', color: '#999' }}>
          {`[${selectedObject.constructor.name.replace('Forge', '')}] ${selectedObject.getEditorName() || 'Untitled Object'}`}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {propertyDefs.map((prop, index) => (
            <li 
              key={index}
              style={{
                marginBottom: '2px'
              }}
            >
              <PropertyEditor propertyDef={prop} gameObject={selectedObject} tab={tab} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Component for editing a single property on a ForgeGameObject
 */
const PropertyEditor = function(props: { propertyDef: GITPropertyDef; gameObject: ForgeGameObject; tab: TabModuleEditorState }){
  const { propertyDef, gameObject, tab } = props;
  const propertyName = propertyDef.propertyName;
  const nestedPath = propertyDef.nestedPath;

  // Get current value
  const getValue = (): any => {
    if(nestedPath){
      const parts = nestedPath.split('.');
      let value: any = gameObject;
      for(const part of parts){
        value = value?.[part];
      }
      return value;
    }
    return (gameObject as any)[propertyName];
  };

  const currentValue = getValue();

  // Update value
  const updateValue = (newValue: any) => {
    if(nestedPath){
      const parts = nestedPath.split('.');
      if(parts.length === 2){
        // Handle nested like position.x or rotation.z
        const [objProp, subProp] = parts;
        const obj = (gameObject as any)[objProp];
        if(obj){
          // For position/rotation which are references to container properties,
          // we update the reference directly, then trigger property change
          obj[subProp] = newValue;
          // Trigger property change event for the parent property
          gameObject.setProperty(objProp as keyof ForgeGameObject, obj);
        }
      }
    } else {
      // Direct property update
      gameObject.setProperty(propertyName as keyof ForgeGameObject, newValue);
    }
    tab.updateFile();
  };

  switch(propertyDef.type){
    case 'number':
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '4px 8px',
          borderBottom: '1px solid #333'
        }}>
          <label style={{ 
            flex: '0 0 120px', 
            fontSize: '12px', 
            color: '#ccc',
            marginRight: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {propertyDef.label}:
          </label>
          <input
            type="number"
            value={currentValue || 0}
            onChange={(e) => updateValue(parseFloat(e.target.value) || 0)}
            style={{
              flex: 1,
              padding: '2px 6px',
              fontSize: '12px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              color: '#fff',
              borderRadius: '2px',
              minWidth: 0
            }}
          />
        </div>
      );

    case 'string':
      // Check if this is a ResRef field that should have a browse button
      const isResRefField = propertyDef.gitFieldLabel === 'TemplateResRef' || propertyDef.gitFieldLabel === 'ResRef';
      const blueprintType = isResRefField ? getBlueprintTypeForGameObject(gameObject) : null;
      
      const handleBrowseClick = () => {
        if(!blueprintType) return;
        
        const modal = new ModalBlueprintBrowserState(blueprintType, (blueprint) => {
          // Update the property with the selected blueprint's resref
          const sanitized = gameObject.sanitizeResRef(blueprint.resref);
          updateValue(sanitized);
        });
        modal.attachToModalManager(ForgeState.modalManager);
        modal.open();
      };
      
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '4px 8px',
          borderBottom: '1px solid #333'
        }}>
          <label style={{ 
            flex: '0 0 120px', 
            fontSize: '12px', 
            color: '#ccc',
            marginRight: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {propertyDef.label}:
          </label>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flex: 1 }}>
            <input
              type="text"
              value={currentValue || ''}
              onChange={(e) => {
                const value = isResRefField
                  ? gameObject.sanitizeResRef(e.target.value)
                  : e.target.value;
                updateValue(value);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
            {isResRefField && blueprintType && (
              <button
                onClick={handleBrowseClick}
                title={`Browse ${blueprintType.toUpperCase()} blueprints`}
                style={{
                  padding: '2px 6px',
                  fontSize: '12px',
                  backgroundColor: '#444',
                  border: '1px solid #666',
                  color: '#fff',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '24px',
                  height: '22px'
                }}
              >
                <i className="fa-solid fa-folder-open"></i>
              </button>
            )}
          </div>
        </div>
      );

    case 'boolean':
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '4px 8px',
          borderBottom: '1px solid #333'
        }}>
          <label style={{ 
            flex: '0 0 120px', 
            fontSize: '12px', 
            color: '#ccc',
            marginRight: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {propertyDef.label}:
          </label>
          <input
            type="checkbox"
            checked={currentValue || false}
            onChange={(e) => updateValue(e.target.checked)}
            style={{ 
              width: '16px', 
              height: '16px',
              cursor: 'pointer'
            }}
          />
        </div>
      );

    case 'position':
      // Position is a reference to container.position, so we update it directly
      return (
        <>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} X:
            </label>
            <input
              type="number"
              value={currentValue?.x || 0}
              onChange={(e) => {
                if(currentValue){
                  currentValue.x = parseFloat(e.target.value) || 0;
                  gameObject.setProperty('position' as keyof ForgeGameObject, currentValue);
                  tab.updateFile();
                }
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} Y:
            </label>
            <input
              type="number"
              value={currentValue?.y || 0}
              onChange={(e) => {
                if(currentValue){
                  currentValue.y = parseFloat(e.target.value) || 0;
                  gameObject.setProperty('position' as keyof ForgeGameObject, currentValue);
                  tab.updateFile();
                }
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} Z:
            </label>
            <input
              type="number"
              value={currentValue?.z || 0}
              onChange={(e) => {
                if(currentValue){
                  currentValue.z = parseFloat(e.target.value) || 0;
                  gameObject.setProperty('position' as keyof ForgeGameObject, currentValue);
                  tab.updateFile();
                }
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
        </>
      );

    case 'rotation':
      if(nestedPath === 'rotation.z'){
        // Rotation is a reference to container.rotation, so we update it directly
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {propertyDef.label}:
            </label>
            <input
              type="number"
              value={gameObject.rotation?.z || 0}
              onChange={(e) => {
                if(gameObject.rotation){
                  gameObject.rotation.z = parseFloat(e.target.value) || 0;
                  gameObject.setProperty('rotation' as keyof ForgeGameObject, gameObject.rotation);
                  tab.updateFile();
                }
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
        );
      }
      // Full rotation editor
      return (
        <>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} X:
            </label>
            <input
              type="number"
              value={currentValue?.x || 0}
              onChange={(e) => {
                const rot = currentValue || new THREE.Euler();
                rot.x = parseFloat(e.target.value) || 0;
                updateValue(rot);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} Y:
            </label>
            <input
              type="number"
              value={currentValue?.y || 0}
              onChange={(e) => {
                const rot = currentValue || new THREE.Euler();
                rot.y = parseFloat(e.target.value) || 0;
                updateValue(rot);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} Z:
            </label>
            <input
              type="number"
              value={currentValue?.z || 0}
              onChange={(e) => {
                const rot = currentValue || new THREE.Euler();
                rot.z = parseFloat(e.target.value) || 0;
                updateValue(rot);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
        </>
      );

    case 'quaternion':
      return (
        <>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} X:
            </label>
            <input
              type="number"
              value={currentValue?.x || 0}
              onChange={(e) => {
                const quat = currentValue || new THREE.Quaternion();
                quat.x = parseFloat(e.target.value) || 0;
                updateValue(quat);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} Y:
            </label>
            <input
              type="number"
              value={currentValue?.y || 0}
              onChange={(e) => {
                const quat = currentValue || new THREE.Quaternion();
                quat.y = parseFloat(e.target.value) || 0;
                updateValue(quat);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} Z:
            </label>
            <input
              type="number"
              value={currentValue?.z || 0}
              onChange={(e) => {
                const quat = currentValue || new THREE.Quaternion();
                quat.z = parseFloat(e.target.value) || 0;
                updateValue(quat);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} W:
            </label>
            <input
              type="number"
              value={currentValue?.w || 0}
              onChange={(e) => {
                const quat = currentValue || new THREE.Quaternion();
                quat.w = parseFloat(e.target.value) || 0;
                updateValue(quat);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
        </>
      );

    case 'vector3':
      return (
        <>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} X:
            </label>
            <input
              type="number"
              value={currentValue?.x || 0}
              onChange={(e) => {
                const vec = currentValue || new THREE.Vector3();
                vec.x = parseFloat(e.target.value) || 0;
                updateValue(vec);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} Y:
            </label>
            <input
              type="number"
              value={currentValue?.y || 0}
              onChange={(e) => {
                const vec = currentValue || new THREE.Vector3();
                vec.y = parseFloat(e.target.value) || 0;
                updateValue(vec);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px',
            borderBottom: '1px solid #333'
          }}>
            <label style={{ 
              flex: '0 0 120px', 
              fontSize: '12px', 
              color: '#ccc',
              marginRight: '8px',
              whiteSpace: 'nowrap'
            }}>
              {propertyDef.label} Z:
            </label>
            <input
              type="number"
              value={currentValue?.z || 0}
              onChange={(e) => {
                const vec = currentValue || new THREE.Vector3();
                vec.z = parseFloat(e.target.value) || 0;
                updateValue(vec);
              }}
              style={{
                flex: 1,
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '2px',
                minWidth: 0
              }}
            />
          </div>
        </>
      );

    case 'CExoLocString':
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '4px 8px',
          borderBottom: '1px solid #333'
        }}>
          <label style={{ 
            flex: '0 0 120px', 
            fontSize: '12px', 
            color: '#ccc',
            marginRight: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {propertyDef.label}:
          </label>
          <div style={{ flex: 1, fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
            CExoLocString editing not yet implemented. Use the blueprint editor for complex string types.
          </div>
        </div>
      );

    case 'array':
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '4px 8px',
          borderBottom: '1px solid #333'
        }}>
          <label style={{ 
            flex: '0 0 120px', 
            fontSize: '12px', 
            color: '#ccc',
            marginRight: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {propertyDef.label}:
          </label>
          <div style={{ flex: 1, fontSize: '11px', color: '#999' }}>
            {propertyDef.propertyName === 'vertices' && (
              <span>Vertices: {Array.isArray(currentValue) ? currentValue.length : 0} points</span>
            )}
            {propertyDef.propertyName === 'spawnPointList' && (
              <span>Spawn Points: {Array.isArray(currentValue) ? currentValue.length : 0} points</span>
            )}
            {!propertyDef.propertyName || (propertyDef.propertyName !== 'vertices' && propertyDef.propertyName !== 'spawnPointList') && (
              <span style={{ fontStyle: 'italic' }}>Array editing not yet implemented. Use specialized editors for complex array types.</span>
            )}
          </div>
        </div>
      );

    default:
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '4px 8px',
          borderBottom: '1px solid #333'
        }}>
          <label style={{ 
            flex: '0 0 120px', 
            fontSize: '12px', 
            color: '#ccc',
            marginRight: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {propertyDef.label}:
          </label>
          <div style={{ flex: 1, fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
            Editing for this property type is not yet implemented.
          </div>
        </div>
      );
  }
}

/**
 * Legacy component - kept for reference but not used
 * Component for editing a single GFF field from GIT instance
 * This updates the ForgeGameObject property that maps to this GIT field
 */
const GFFFieldEditor = function(props: { field: KotOR.GFFField | KotOR.GFFStruct; gameObject: ForgeGameObject; tab: TabModuleEditorState }){
  const { field, gameObject, tab } = props;

  if(field instanceof KotOR.GFFStruct){
    return (
      <div>
        <fieldset>
          <legend>[STRUCT] - Unnamed Struct</legend>
          <div style={{ padding: '10px', color: '#999' }}>
            Struct editing not yet implemented. Use the GFF Editor for complex structures.
          </div>
        </fieldset>
      </div>
    );
  }

  const gffField = field as KotOR.GFFField;
  const fieldType = gffField.getType();
  const fieldLabel = gffField.getLabel();
  const [value, setValue] = useState<any>('');
  const [valueX, setValueX] = useState<number>(0);
  const [valueY, setValueY] = useState<number>(0);
  const [valueZ, setValueZ] = useState<number>(0);
  const [valueW, setValueW] = useState<number>(0);

  // Update the ForgeGameObject property that corresponds to this GIT field
  const updateGameObjectProperty = (newValue: any) => {
    // Map GIT field labels to ForgeGameObject properties
    // Note: Some fields like XOrientation/YOrientation for creatures need special handling
    const propertyMap: { [key: string]: string } = {
      'TemplateResRef': 'templateResRef',
      'XPosition': 'position.x',
      'YPosition': 'position.y',
      'ZPosition': 'position.z',
      'X': 'position.x',
      'Y': 'position.y',
      'Z': 'position.z',
      'Bearing': 'rotation.z',
      'Tag': 'tag',
      'LinkedTo': 'linkedTo',
      'LinkedToFlags': 'linkedToFlags',
      'LinkedToModule': 'linkedToModule',
      'ResRef': 'resref',
      'TransitionDestin': 'transitionDestin',
    };

    const propertyPath = propertyMap[fieldLabel];
    if(propertyPath){
      if(propertyPath.includes('.')){
        // Handle nested properties like position.x
        const [objProp, subProp] = propertyPath.split('.');
        const obj = (gameObject as any)[objProp];
        if(obj){
          obj[subProp] = newValue;
          gameObject.setProperty(objProp as keyof ForgeGameObject, obj);
        }
      } else {
        // Direct property
        gameObject.setProperty(propertyPath as keyof ForgeGameObject, newValue);
      }
      
      tab.updateFile();
    } else if(fieldLabel === 'XOrientation' || fieldLabel === 'YOrientation' || fieldLabel === 'ZOrientation'){
      // Special handling for orientation fields - they map to rotation.z
      // For creatures, XOrientation and YOrientation are calculated from rotation.z
      // So we can't directly edit them - they're read-only derived values
      // But we can update rotation.z if needed (though this is complex for creatures)
      console.warn(`Orientation field ${fieldLabel} is a derived value and cannot be directly edited. Edit rotation instead.`);
    } else {
      console.warn(`No property mapping found for GIT field: ${fieldLabel}`);
    }
  };

  // Refresh field values when the field or game object changes
  useEffect(() => {
    if(gffField && gameObject && typeof (gameObject as any).getGITInstance === 'function'){
      // Get fresh GIT instance to ensure we have current values
      const instance = (gameObject as any).getGITInstance();
      const currentField = instance.getFieldByLabel(fieldLabel);
      if(currentField){
        setValue(currentField.getValue());
        if(fieldType === KotOR.GFFDataType.VECTOR){
          const vec = currentField.getVector();
          setValueX(vec.x);
          setValueY(vec.y);
          setValueZ(vec.z);
        }
        if(fieldType === KotOR.GFFDataType.ORIENTATION){
          const orient = currentField.getOrientation();
          setValueX(orient.x);
          setValueY(orient.y);
          setValueZ(orient.z);
          setValueW(orient.w);
        }
      }
    }
  }, [gffField, fieldType, fieldLabel, gameObject]);

  const handleValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    let newValue: any = e.target.value;
    
    switch(fieldType){
      case KotOR.GFFDataType.RESREF:
        newValue = newValue.substring(0, 16).toLowerCase();
        break;
      case KotOR.GFFDataType.FLOAT:
      case KotOR.GFFDataType.DOUBLE:
        newValue = parseFloat(newValue) || 0;
        break;
      case KotOR.GFFDataType.BYTE:
        newValue = parseInt(newValue) & 0xFF;
        break;
      case KotOR.GFFDataType.CHAR:
        newValue = parseInt(newValue) << 24 >> 24;
        break;
      case KotOR.GFFDataType.WORD:
        newValue = parseInt(newValue) & 0xFFFF;
        break;
      case KotOR.GFFDataType.SHORT:
        newValue = parseInt(newValue) << 16 >> 16;
        break;
      case KotOR.GFFDataType.DWORD:
        newValue = parseInt(newValue) & 0xFFFFFFFF;
        break;
      case KotOR.GFFDataType.INT:
        newValue = parseInt(newValue) << 0 >> 0;
        break;
    }

    setValue(newValue);
    updateGameObjectProperty(newValue);
  };

  const handleVectorChange = (e: ChangeEvent<HTMLInputElement>, component: 'x' | 'y' | 'z') => {
    const numValue = parseFloat(e.target.value) || 0;
    
    switch(component){
      case 'x': setValueX(numValue); break;
      case 'y': setValueY(numValue); break;
      case 'z': setValueZ(numValue); break;
    }
    
    // For vector fields, we need to update the entire vector
    // This is a simplified approach - in practice, you'd need to handle this per field
    const vec = gffField.getVector();
    vec[component] = numValue;
    updateGameObjectProperty(vec);
  };

  const handleOrientationChange = (e: ChangeEvent<HTMLInputElement>, component: 'x' | 'y' | 'z' | 'w') => {
    const numValue = parseFloat(e.target.value) || 0;
    
    switch(component){
      case 'x': setValueX(numValue); break;
      case 'y': setValueY(numValue); break;
      case 'z': setValueZ(numValue); break;
      case 'w': setValueW(numValue); break;
    }
    
    // For orientation fields, update the entire orientation
    const orient = gffField.getOrientation();
    orient[component] = numValue;
    updateGameObjectProperty(orient);
  };

  switch(fieldType){
    case KotOR.GFFDataType.BYTE:
    case KotOR.GFFDataType.CHAR:
    case KotOR.GFFDataType.WORD:
    case KotOR.GFFDataType.SHORT:
    case KotOR.GFFDataType.DWORD:
    case KotOR.GFFDataType.INT:
    case KotOR.GFFDataType.FLOAT:
    case KotOR.GFFDataType.DOUBLE:
    case KotOR.GFFDataType.RESREF:
    case KotOR.GFFDataType.CEXOSTRING:
      return (
        <fieldset>
          <legend>[{KotOR.GFFDataType[fieldType]}] - {gffField.getLabel()}</legend>
          <div style={{ padding: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Value:</label>
            <input
              type="text"
              value={value}
              onChange={handleValueChange}
              style={{
                width: '100%',
                padding: '5px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                color: '#fff',
                borderRadius: '3px'
              }}
            />
          </div>
        </fieldset>
      );
    
    case KotOR.GFFDataType.VECTOR:
      return (
        <fieldset>
          <legend>[{KotOR.GFFDataType[fieldType]}] - {gffField.getLabel()}</legend>
          <div style={{ padding: '10px' }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>X:</label>
              <input
                type="number"
                value={valueX}
                onChange={(e) => handleVectorChange(e, 'x')}
                style={{
                  width: '100%',
                  padding: '5px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#fff',
                  borderRadius: '3px'
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Y:</label>
              <input
                type="number"
                value={valueY}
                onChange={(e) => handleVectorChange(e, 'y')}
                style={{
                  width: '100%',
                  padding: '5px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#fff',
                  borderRadius: '3px'
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Z:</label>
              <input
                type="number"
                value={valueZ}
                onChange={(e) => handleVectorChange(e, 'z')}
                style={{
                  width: '100%',
                  padding: '5px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#fff',
                  borderRadius: '3px'
                }}
              />
            </div>
          </div>
        </fieldset>
      );
    
    case KotOR.GFFDataType.ORIENTATION:
      return (
        <fieldset>
          <legend>[{KotOR.GFFDataType[fieldType]}] - {gffField.getLabel()}</legend>
          <div style={{ padding: '10px' }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>X:</label>
              <input
                type="number"
                value={valueX}
                onChange={(e) => handleOrientationChange(e, 'x')}
                style={{
                  width: '100%',
                  padding: '5px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#fff',
                  borderRadius: '3px'
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Y:</label>
              <input
                type="number"
                value={valueY}
                onChange={(e) => handleOrientationChange(e, 'y')}
                style={{
                  width: '100%',
                  padding: '5px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#fff',
                  borderRadius: '3px'
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Z:</label>
              <input
                type="number"
                value={valueZ}
                onChange={(e) => handleOrientationChange(e, 'z')}
                style={{
                  width: '100%',
                  padding: '5px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#fff',
                  borderRadius: '3px'
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>W:</label>
              <input
                type="number"
                value={valueW}
                onChange={(e) => handleOrientationChange(e, 'w')}
                style={{
                  width: '100%',
                  padding: '5px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#fff',
                  borderRadius: '3px'
                }}
              />
            </div>
          </div>
        </fieldset>
      );
    
    default:
      return (
        <fieldset>
          <legend>[{KotOR.GFFDataType[fieldType]}] - {gffField.getLabel()}</legend>
          <div style={{ padding: '10px', color: '#999' }}>
            Editing for this field type is not yet implemented.
          </div>
        </fieldset>
      );
  }
}