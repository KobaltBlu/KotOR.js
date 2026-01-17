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
import "./ModuleEditorSidebarComponent.scss";

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
    <div className="module-editor-sidebar">
      <div className="nodes-container">
        <div className="toolbar-header">
          <b>Scene</b>
        </div>
        <SceneGraphTreeView manager={tab.ui3DRenderer.sceneGraphManager}></SceneGraphTreeView>
      </div>
      <div className="tab-host">
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
    </div>
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
      <div className="git-instance-properties-editor__empty-state">
        No object selected. Select a game object to edit its GIT instance properties.
      </div>
    );
  }

  const propertyDefs = getGITPropertyDefinitions(selectedObject);

  return (
    <div className="git-instance-properties-editor">
      <div>
        <div className="git-instance-properties-editor__header">
          {`[${selectedObject.constructor.name.replace('Forge', '')}] ${selectedObject.getEditorName() || 'Untitled Object'}`}
        </div>
        <ul className="git-instance-properties-editor__list">
          {propertyDefs.map((prop, index) => (
            <li 
              key={index}
              className="git-instance-properties-editor__list-item"
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
        <div className="property-editor-row">
          <label className="property-editor-label property-editor-label--ellipsis">
            {propertyDef.label}:
          </label>
          <input
            type="number"
            value={currentValue || 0}
            onChange={(e) => updateValue(parseFloat(e.target.value) || 0)}
            className="property-editor-input"
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
        <div className="property-editor-row">
          <label className="property-editor-label property-editor-label--ellipsis">
            {propertyDef.label}:
          </label>
          <div className="property-editor-input-group">
            <input
              type="text"
              value={currentValue || ''}
              onChange={(e) => {
                const value = isResRefField
                  ? gameObject.sanitizeResRef(e.target.value)
                  : e.target.value;
                updateValue(value);
              }}
              className="property-editor-input"
            />
            {isResRefField && blueprintType && (
              <button
                onClick={handleBrowseClick}
                title={`Browse ${blueprintType.toUpperCase()} blueprints`}
                className="property-editor-browse-button"
              >
                <i className="fa-solid fa-folder-open"></i>
              </button>
            )}
          </div>
        </div>
      );

    case 'boolean':
      return (
        <div className="property-editor-row">
          <label className="property-editor-label property-editor-label--ellipsis">
            {propertyDef.label}:
          </label>
          <input
            type="checkbox"
            checked={currentValue || false}
            onChange={(e) => updateValue(e.target.checked)}
            className="property-editor-checkbox"
          />
        </div>
      );

    case 'position':
      // Position is a reference to container.position, so we update it directly
      return (
        <>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
        </>
      );

    case 'rotation':
      if(nestedPath === 'rotation.z'){
        // Rotation is a reference to container.rotation, so we update it directly
        return (
          <div className="property-editor-row">
            <label className="property-editor-label property-editor-label--ellipsis">
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
              className="property-editor-input"
            />
          </div>
        );
      }
      // Full rotation editor
      return (
        <>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
        </>
      );

    case 'quaternion':
      return (
        <>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
        </>
      );

    case 'vector3':
      return (
        <>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
          <div className="property-editor-row">
            <label className="property-editor-label">
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
              className="property-editor-input"
            />
          </div>
        </>
      );

    case 'CExoLocString':
      return (
        <div className="property-editor-row">
          <label className="property-editor-label property-editor-label--ellipsis">
            {propertyDef.label}:
          </label>
          <div className="property-editor-message property-editor-message--italic">
            CExoLocString editing not yet implemented. Use the blueprint editor for complex string types.
          </div>
        </div>
      );

    case 'array':
      return (
        <div className="property-editor-row">
          <label className="property-editor-label property-editor-label--ellipsis">
            {propertyDef.label}:
          </label>
          <div className="property-editor-message">
            {propertyDef.propertyName === 'vertices' && (
              <span>Vertices: {Array.isArray(currentValue) ? currentValue.length : 0} points</span>
            )}
            {propertyDef.propertyName === 'spawnPointList' && (
              <span>Spawn Points: {Array.isArray(currentValue) ? currentValue.length : 0} points</span>
            )}
            {!propertyDef.propertyName || (propertyDef.propertyName !== 'vertices' && propertyDef.propertyName !== 'spawnPointList') && (
              <span className="property-editor-message--italic">Array editing not yet implemented. Use specialized editors for complex array types.</span>
            )}
          </div>
        </div>
      );

    default:
      return (
        <div className="property-editor-row">
          <label className="property-editor-label property-editor-label--ellipsis">
            {propertyDef.label}:
          </label>
          <div className="property-editor-message property-editor-message--italic">
            Editing for this property type is not yet implemented.
          </div>
        </div>
      );
  }
}