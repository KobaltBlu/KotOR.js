import React, { useEffect, useState } from "react";
import { TabModuleEditorState } from "@/apps/forge/states/tabs";
import { SceneGraphTreeView } from "@/apps/forge/components/SceneGraphTreeView";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import * as THREE from 'three';
import { BlueprintType } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";
import { openBlueprintBrowser, openScriptBrowser } from "@/apps/forge/helpers/openGameResRefPicker";
import { CExoLocStringEditor } from "@/apps/forge/components/CExoLocStringEditor/CExoLocStringEditor";
import { ForgeColorField, ForgeTwoDAIndexField } from "@/apps/forge/components/ui";
import { ForgeCreature } from "@/apps/forge/module-editor/ForgeCreature";
import { ForgeDoor } from "@/apps/forge/module-editor/ForgeDoor";
import { ForgeEncounter } from "@/apps/forge/module-editor/ForgeEncounter";
import { ForgeItem } from "@/apps/forge/module-editor/ForgeItem";
import { ForgePlaceable } from "@/apps/forge/module-editor/ForgePlaceable";
import { ForgeSound } from "@/apps/forge/module-editor/ForgeSound";
import { ForgeStore } from "@/apps/forge/module-editor/ForgeStore";
import { ForgeTrigger } from "@/apps/forge/module-editor/ForgeTrigger";
import { ForgeWaypoint } from "@/apps/forge/module-editor/ForgeWaypoint";
import { ForgeMiniGame } from "@/apps/forge/module-editor/ForgeMiniGame";
import { MiniGameNestedEditors } from "@/apps/forge/components/ModuleEditorMiniGameEditors";
import { dwordToRgb01, rgb01ToDword } from "@/apps/forge/helpers/forgeColor";
import { facingFromYaw } from "@/apps/forge/helpers/gitFacing";
import * as KotOR from "@/apps/forge/KotOR";
import { GroupType } from "@/apps/forge/UI3DRenderer";
import "@/apps/forge/components/ModuleEditorSidebarComponent.scss";

const SCENE_TYPE_CHIPS: Array<{ key: GroupType; label: string; icon: string }> = [
  { key: GroupType.ROOMS, label: 'Rooms', icon: 'fa-solid fa-dungeon' },
  { key: GroupType.CREATURE, label: 'Creatures', icon: 'fa-solid fa-person' },
  { key: GroupType.DOOR, label: 'Doors', icon: 'fa-solid fa-door-open' },
  { key: GroupType.PLACEABLE, label: 'Placeables', icon: 'fa-solid fa-toolbox' },
  { key: GroupType.ITEM, label: 'Items', icon: 'fa-solid fa-wand-sparkles' },
  { key: GroupType.TRIGGER, label: 'Triggers', icon: 'fa-solid fa-triangle-exclamation' },
  { key: GroupType.WAYPOINT, label: 'Waypoints', icon: 'fa-solid fa-location-pin' },
  { key: GroupType.SOUND, label: 'Sounds', icon: 'fa-solid fa-music' },
  { key: GroupType.STORE, label: 'Stores', icon: 'fa-solid fa-store' },
  { key: GroupType.ENCOUNTER, label: 'Encounters', icon: 'fa-solid fa-paw' },
  { key: GroupType.CAMERA, label: 'Cameras', icon: 'fa-solid fa-video' },
];

export const ModuleEditorSidebarComponent = function(props: any){
  const tab: TabModuleEditorState = props.tab as TabModuleEditorState;

  const [selectedTab, setSelectedTab] = useState<string>('object-properties');
  const [selectedGameObject, setSelectedGameObject] = useState<ForgeGameObject | undefined>(undefined);
  const [selectedCount, setSelectedCount] = useState(0);
  const [sceneFilter, setSceneFilter] = useState('');
  const [sceneTypeFilter, setSceneTypeFilter] = useState<GroupType | ''>('');

  useEffect(() => {
    const onSelectionChanged = (gameObject: ForgeGameObject | undefined) => {
      setSelectedGameObject(gameObject);
      setSelectedCount(tab.selectedGameObjects?.length || (gameObject ? 1 : 0));
      if(gameObject instanceof ForgeGameObject){
        setSelectedTab('object-properties');
      }
    };

    tab.addEventListener('onSelectionChanged', onSelectionChanged);
    
    // Set initial selection
    setSelectedGameObject(tab.selectedGameObject);
    setSelectedCount(tab.selectedGameObjects?.length || (tab.selectedGameObject ? 1 : 0));

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
      <div className="module-editor-scene-filter">
        <input
          type="search"
          value={sceneFilter}
          placeholder="Filter scene..."
          onChange={(event) => setSceneFilter(event.target.value)}
        />
      </div>
      <div className="module-editor-scene-type-chips">
        <button
          type="button"
          className={`module-editor-scene-type-chip${!sceneTypeFilter ? ' is-active' : ''}`}
          onClick={() => setSceneTypeFilter('')}
        >All</button>
        {SCENE_TYPE_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            title={chip.label}
            className={`module-editor-scene-type-chip${sceneTypeFilter === chip.key ? ' is-active' : ''}`}
            onClick={() => setSceneTypeFilter(sceneTypeFilter === chip.key ? '' : chip.key)}
          >
            <i className={chip.icon} />
          </button>
        ))}
      </div>
        <SceneGraphTreeView
          manager={tab.ui3DRenderer.sceneGraphManager}
          listStyle={{ height: "100%", overflow: "auto" }}
          filter={sceneFilter}
          typeFilter={sceneTypeFilter}
          tab={tab}
        />
      </div>
      <div className="tab-host">
        <div className="tabs">
          <ul className="tabs-menu tabs-flex-wrap">
            <li className={`forge-tab ${selectedTab == 'object-properties' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('object-properties') }>Object</a></li>
            <li className={`forge-tab ${selectedTab == 'area-properties' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('area-properties') }>Area</a></li>
            <li className={`forge-tab ${selectedTab == 'audio-properties' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('audio-properties') }>Audio</a></li>
            <li className={`forge-tab ${selectedTab == 'module-properties' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('module-properties') }>Module</a></li>
          </ul>
        </div>
        <div className="tab-container">
          {selectedTab === 'object-properties' && (
            <>
              {selectedCount > 1 ? (
                <div className="module-editor-multi-select" role="status">
                  Editing {selectedCount} objects. Shared fields apply to all; mixed values show as (multiple values).
                </div>
              ) : null}
              <GITInstancePropertiesEditor gameObject={selectedGameObject} tab={tab} />
            </>
          )}
          {selectedTab === 'area-properties' && (
            <AreaPropertiesEditor tab={tab} />
          )}
          {selectedTab === 'audio-properties' && (
            <AudioPropertiesEditor tab={tab} />
          )}
          {selectedTab === 'module-properties' && (
            <ModulePropertiesEditor tab={tab} />
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
  /** Edit yaw/bearing as degrees; store radians on the object */
  asDegrees?: boolean;
  /** Show read-only XOrientation/YOrientation derived from yaw (GIT facing vector) */
  showFacingVector?: boolean;
  /** Hide this property unless the predicate returns true */
  visibleWhen?: (gameObject: ForgeGameObject) => boolean;
  /** Collapsible section grouping */
  section?: 'Identity' | 'Transform' | 'Scripts' | 'Combat' | 'Advanced';
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
    { propertyName: 'templateResRef', label: 'Template ResRef', type: 'string', gitFieldLabel: 'TemplateResRef', section: 'Identity' },
    { propertyName: 'position', label: 'Position', type: 'position', section: 'Transform' },
    {
      propertyName: 'rotation',
      label: 'Facing (yaw °)',
      type: 'rotation',
      nestedPath: 'rotation.z',
      asDegrees: true,
      showFacingVector: true,
      section: 'Transform',
    }
  );

  // Class-specific properties
  switch(className){
    case 'ForgeRoom':
      props = [];
      props.push(
        { propertyName: 'roomName', label: 'Model', type: 'string', gitFieldLabel: 'ResRef', section: 'Identity' },
        { propertyName: 'ambientScale', label: 'Ambient Scale', type: 'number', gitFieldLabel: 'AmbientScale', section: 'Advanced' },
        { propertyName: 'envAudio', label: 'Env Audio', type: 'number', gitFieldLabel: 'EnvAudio', section: 'Advanced' },
        { propertyName: 'position', label: 'Position', type: 'vector3', gitFieldLabel: 'Position', section: 'Transform' }
      );
      break;
    case 'ForgeCreature':
      // XOrientation/YOrientation derived from facing yaw (no ZO on creature GIT)
      break;

    case 'ForgeDoor':
      // Door GIT uses Bearing (radians), not XO/YO facing vector
      props = props.map((p) =>
        p.propertyName === 'rotation'
          ? { ...p, label: 'Bearing (°)', showFacingVector: false }
          : p
      );
      props.push(
        { propertyName: 'linkedTo', label: 'Linked To', type: 'string', gitFieldLabel: 'LinkedTo', section: 'Advanced' },
        { propertyName: 'linkedToFlags', label: 'Linked To Flags', type: 'number', gitFieldLabel: 'LinkedToFlags', section: 'Advanced' },
        { propertyName: 'linkedToModule', label: 'Linked To Module', type: 'string', gitFieldLabel: 'LinkedToModule', section: 'Advanced' },
        { propertyName: 'tag', label: 'Tag', type: 'string', gitFieldLabel: 'Tag', section: 'Identity' },
        { propertyName: 'transitionDestin', label: 'Transition Destination', type: 'CExoLocString', gitFieldLabel: 'TransitionDestin', section: 'Advanced' }
      );
      break;

    case 'ForgeItem':
      // Items: position + facing vector
      break;

    case 'ForgePlaceable':
      props = props.map((p) =>
        p.propertyName === 'rotation'
          ? { ...p, label: 'Bearing (°)', showFacingVector: false }
          : p
      );
      break;

    case 'ForgeTrigger':
      props.push(
        {
          propertyName: 'zOrientation',
          label: 'Orientation Z',
          type: 'number',
          gitFieldLabel: 'ZOrientation',
          section: 'Transform',
        },
        { propertyName: 'vertices', label: 'Vertices', type: 'array', gitFieldLabel: 'Geometry', section: 'Advanced' }
      );
      break;

    case 'ForgeWaypoint':
      props.push(
        { propertyName: 'appearance', label: 'Appearance', type: 'number', gitFieldLabel: 'Appearance', section: 'Identity' },
        { propertyName: 'localizedName', label: 'Localized Name', type: 'CExoLocString', gitFieldLabel: 'LocalizedName', section: 'Identity' },
        { propertyName: 'description', label: 'Description', type: 'CExoLocString', gitFieldLabel: 'Description', section: 'Identity' },
        { propertyName: 'hasMapNote', label: 'Has Map Note', type: 'boolean', gitFieldLabel: 'HasMapNote', section: 'Advanced' },
        { propertyName: 'linkedTo', label: 'Linked To', type: 'string', gitFieldLabel: 'LinkedTo', section: 'Advanced' },
        {
          propertyName: 'mapNote',
          label: 'Map Note',
          type: 'CExoLocString',
          gitFieldLabel: 'MapNote',
          section: 'Advanced',
          visibleWhen: (go) => !!(go as ForgeWaypoint).hasMapNote,
        },
        {
          propertyName: 'mapNoteEnabled',
          label: 'Map Note Enabled',
          type: 'boolean',
          gitFieldLabel: 'MapNoteEnabled',
          section: 'Advanced',
          visibleWhen: (go) => !!(go as ForgeWaypoint).hasMapNote,
        },
        { propertyName: 'tag', label: 'Tag', type: 'string', gitFieldLabel: 'Tag', section: 'Identity' }
      );
      break;

    case 'ForgeStore':
      props = [
        { propertyName: 'resref', label: 'ResRef', type: 'string', gitFieldLabel: 'ResRef', section: 'Identity' },
        { propertyName: 'position', label: 'Position', type: 'position', section: 'Transform' },
        {
          propertyName: 'rotation',
          label: 'Facing (yaw °)',
          type: 'rotation',
          nestedPath: 'rotation.z',
          asDegrees: true,
          showFacingVector: true,
          section: 'Transform',
        }
      ];
      break;

    case 'ForgeSound':
      props = [
        { propertyName: 'templateResRef', label: 'Template ResRef', type: 'string', gitFieldLabel: 'TemplateResRef', section: 'Identity' },
        { propertyName: 'position', label: 'Position', type: 'position', section: 'Transform' },
        { propertyName: 'generatedType', label: 'Generated Type', type: 'number', gitFieldLabel: 'GeneratedType', section: 'Advanced' }
      ];
      break;

    case 'ForgeCamera':
      props = [
        { propertyName: 'cameraID', label: 'Camera ID', type: 'number', gitFieldLabel: 'CameraID', section: 'Identity' },
        { propertyName: 'fov', label: 'Field of View', type: 'number', gitFieldLabel: 'FieldOfView', section: 'Advanced' },
        { propertyName: 'height', label: 'Height', type: 'number', gitFieldLabel: 'Height', section: 'Transform' },
        { propertyName: 'micRange', label: 'Mic Range', type: 'number', gitFieldLabel: 'MicRange', section: 'Advanced' },
        { propertyName: 'quaternion', label: 'Orientation', type: 'quaternion', gitFieldLabel: 'Orientation', section: 'Transform' },
        { propertyName: 'pitch', label: 'Pitch', type: 'number', gitFieldLabel: 'Pitch', section: 'Transform' },
        { propertyName: 'position', label: 'Position', type: 'vector3', gitFieldLabel: 'Position', section: 'Transform' }
      ];
      break;

    case 'ForgeEncounter':
      // Retail encounter GIT has no orientation — position only from common props
      props = [
        { propertyName: 'templateResRef', label: 'Template ResRef', type: 'string', gitFieldLabel: 'TemplateResRef', section: 'Identity' },
        { propertyName: 'position', label: 'Position', type: 'position', section: 'Transform' },
        { propertyName: 'vertices', label: 'Vertices', type: 'array', gitFieldLabel: 'Geometry', section: 'Advanced' },
        { propertyName: 'spawnPointList', label: 'Spawn Points', type: 'array', gitFieldLabel: 'SpawnPointList', section: 'Advanced' }
      ];
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
  const [selection, setSelection] = useState<ForgeGameObject[]>(tab.selectedGameObjects || []);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onSelection = (primary: ForgeGameObject | undefined, list?: ForgeGameObject[]) => {
      setSelectedObject(primary);
      setSelection(list && list.length ? list : (primary ? [primary] : []));
    };
    tab.addEventListener('onSelectionChanged', onSelection);
    setSelectedObject(gameObject);
    setSelection(tab.selectedGameObjects?.length ? tab.selectedGameObjects : (gameObject ? [gameObject] : []));
    return () => tab.removeEventListener('onSelectionChanged', onSelection);
  }, [tab, gameObject]);

  if(selection.length > 1){
    const typeCounts = new Map<string, number>();
    for(let i = 0; i < selection.length; i++){
      const name = selection[i].constructor.name.replace('Forge', '');
      typeCounts.set(name, (typeCounts.get(name) || 0) + 1);
    }
    return (
      <div className="git-instance-properties-editor">
        <div className="git-instance-properties-editor__header">
          {selection.length} objects selected
        </div>
        <ul className="git-instance-properties-editor__multi-list">
          {Array.from(typeCounts.entries()).map(([type, count]) => (
            <li key={type}>{count}× {type}</li>
          ))}
        </ul>
        <div className="git-instance-properties-editor__object-actions">
          <button className="git-instance-properties-editor__action-btn" onClick={() => {
            tab.focusSelection();
          }}>Focus</button>
          <button className="git-instance-properties-editor__action-btn" onClick={() => tab.duplicateSelectedGameObjects()}>Duplicate</button>
          <button className="git-instance-properties-editor__action-btn" onClick={() => void tab.deleteSelectedGameObject()}>Delete</button>
        </div>
      </div>
    );
  }

  if(!selectedObject){
    return (
      <div className="git-instance-properties-editor__empty-state">
        No object selected. Select a game object to edit its GIT instance properties.
      </div>
    );
  }

  const propertyDefs = getGITPropertyDefinitions(selectedObject).filter(
    (prop) => !prop.visibleWhen || prop.visibleWhen(selectedObject)
  );
  const sectionOrder: Array<NonNullable<GITPropertyDef['section']>> = ['Identity', 'Transform', 'Scripts', 'Combat', 'Advanced'];
  const bySection = new Map<string, GITPropertyDef[]>();
  for(let i = 0; i < propertyDefs.length; i++){
    const section = propertyDefs[i].section || 'Advanced';
    const list = bySection.get(section) || [];
    list.push(propertyDefs[i]);
    bySection.set(section, list);
  }

  const missingTemplate = selectedObject.templateResType !== KotOR.ResourceTypes.NA
    && !String(selectedObject.templateResRef || '').trim();
  const selTag = String((selectedObject as any).tag || '').trim().toLowerCase();
  let duplicateTag = false;
  if(selTag && tab.module?.area){
    const area = tab.module.area;
    const objects: ForgeGameObject[] = [
      ...area.cameras, ...area.creatures, ...area.doors, ...area.encounters,
      ...area.items, ...area.placeables, ...area.sounds, ...area.stores,
      ...area.triggers, ...area.waypoints,
    ];
    let count = 0;
    for(let i = 0; i < objects.length; i++){
      if(String((objects[i] as any).tag || '').trim().toLowerCase() === selTag){
        count++;
        if(count > 1){ duplicateTag = true; break; }
      }
    }
  }

  return (
    <div className="git-instance-properties-editor">
      <div>
        <div className="git-instance-properties-editor__header">
          {`[${selectedObject.constructor.name.replace('Forge', '')}] ${selectedObject.getEditorName() || 'Untitled Object'}`}
          {missingTemplate ? <span className="git-instance-properties-editor__badge git-instance-properties-editor__badge--warn"> missing template</span> : null}
          {duplicateTag ? <span className="git-instance-properties-editor__badge git-instance-properties-editor__badge--warn"> duplicate tag</span> : null}
        </div>
        <div className="git-instance-properties-editor__object-actions">
          <button className="git-instance-properties-editor__action-btn" onClick={() => tab.focusSelection()}>Focus</button>
          <button className="git-instance-properties-editor__action-btn" onClick={() => tab.cloneGameObject(selectedObject)}>Duplicate</button>
          <button className="git-instance-properties-editor__action-btn" onClick={() => void tab.deleteSelectedGameObject()}>Delete</button>
          <button className="git-instance-properties-editor__action-btn" onClick={() => {
            tab.selectGameObject(selectedObject);
            tab.setEntryFromSelection();
            tab.updateFile();
          }}>Set Entry</button>
          {selectedObject instanceof ForgeWaypoint ? (
            <button className="git-instance-properties-editor__action-btn" onClick={() => {
              tab.selectGameObject(selectedObject);
              tab.placeWaypointAtEntry();
            }}>Clone at Entry</button>
          ) : null}
          {selectedObject instanceof ForgeWaypoint ? (
            <button className="git-instance-properties-editor__action-btn" onClick={() => {
              tab.selectGameObject(selectedObject);
              if(!tab.setPreviewWarpFromSelection()){
                window.alert("Waypoint needs a Tag to pin as preview warp.");
              }
            }}>Pin Preview Warp</button>
          ) : null}
          {getBlueprintTypeForGameObject(selectedObject) && (
            <button className="git-instance-properties-editor__action-btn" onClick={() => tab.openBlueprintBrowserForType(getBlueprintTypeForGameObject(selectedObject)!)}>Open Blueprint</button>
          )}
        </div>
        {sectionOrder.map((section) => {
          const defs = bySection.get(section);
          if(!defs?.length){
            return null;
          }
          return (
            <CollapsibleSection key={section} title={section} defaultOpen={section === 'Identity' || section === 'Transform'}>
              <ul className="git-instance-properties-editor__list">
                {defs.map((prop, index) => (
                  <li
                    key={`${prop.propertyName}-${index}`}
                    className="git-instance-properties-editor__list-item"
                  >
                    <PropertyEditor
                      propertyDef={prop}
                      gameObject={selectedObject}
                      tab={tab}
                      onEdited={() => setTick((n) => n + 1)}
                    />
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          );
        })}
        <span style={{ display: 'none' }}>{tick}</span>
      </div>
    </div>
  );
}

/**
 * String / TemplateResRef field — keeps local draft so parent re-renders do not steal focus.
 */
const StringPropertyEditor = function(props: {
  propertyDef: GITPropertyDef;
  gameObject: ForgeGameObject;
  currentValue: string;
  updateValue: (value: string) => void;
}){
  const { propertyDef, gameObject, currentValue, updateValue } = props;
  const isResRefField = propertyDef.gitFieldLabel === 'TemplateResRef' || propertyDef.gitFieldLabel === 'ResRef';
  const blueprintType = isResRefField ? getBlueprintTypeForGameObject(gameObject) : null;
  const [draft, setDraft] = useState(currentValue);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ resref: string; source?: string; localizedName: string }>>([]);

  useEffect(() => {
    setDraft(currentValue);
  }, [currentValue, gameObject.uuid, propertyDef.propertyName]);

  useEffect(() => {
    if(!blueprintType || !open){
      return;
    }
    let cancelled = false;
    void import("@/apps/forge/helpers/blueprintResRefSuggest").then(({ suggestBlueprintResRefs }) => {
      suggestBlueprintResRefs(blueprintType, draft, 50).then((items) => {
        if(!cancelled){
          setSuggestions(items);
        }
      }).catch(() => {
        if(!cancelled){
          setSuggestions([]);
        }
      });
    });
    return () => { cancelled = true; };
  }, [blueprintType, draft, open]);

  const handleBrowseClick = () => {
    if(!blueprintType) return;
    openBlueprintBrowser(blueprintType, (blueprint) => {
      const sanitized = gameObject.sanitizeResRef(blueprint.resref);
      setDraft(sanitized);
      updateValue(sanitized);
      setOpen(false);
    }, draft || "");
  };

  const commitSuggestion = (resref: string) => {
    const sanitized = gameObject.sanitizeResRef(resref);
    setDraft(sanitized);
    updateValue(sanitized);
    setOpen(false);
  };

  return (
    <div className="property-editor-row">
      <label className="property-editor-label property-editor-label--ellipsis">
        {propertyDef.label}:
      </label>
      <div className="property-editor-input-group property-editor-input-group--suggest">
        <input
          type="text"
          value={isResRefField ? draft : currentValue}
          onFocus={() => { if(blueprintType) setOpen(true); }}
          onBlur={() => { window.setTimeout(() => setOpen(false), 150); }}
          onChange={(e) => {
            if(isResRefField){
              const value = gameObject.sanitizeResRef(e.target.value);
              setDraft(value);
              updateValue(value);
              setOpen(true);
              return;
            }
            updateValue(e.target.value);
          }}
          onKeyDown={(e) => {
            if(e.key === 'Enter' && suggestions[0]){
              e.preventDefault();
              commitSuggestion(suggestions[0].resref);
            }
          }}
          className="property-editor-input"
          autoComplete="off"
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
        {open && blueprintType && suggestions.length > 0 && (
          <ul className="property-editor-suggest-list">
            {suggestions.map((item) => (
              <li key={`${item.source || 'game'}:${item.resref}`}>
                <button
                  type="button"
                  className="property-editor-suggest-item"
                  onMouseDown={(e) => { e.preventDefault(); commitSuggestion(item.resref); }}
                >
                  <span>{item.resref}</span>
                  {item.source ? <em>{item.source}</em> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/**
 * Component for editing a single property on a ForgeGameObject
 */
const PropertyEditor = function(props: {
  propertyDef: GITPropertyDef;
  gameObject: ForgeGameObject;
  tab: TabModuleEditorState;
  onEdited?: () => void;
}){
  const { propertyDef, gameObject, tab, onEdited } = props;
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
    const isStringy = propertyDef.type === 'string' || propertyDef.type === 'CExoLocString';
    if(isStringy){
      tab.updateFile({ coalesceKey: `prop-${gameObject.uuid}-${propertyName}` });
    }else{
      tab.updateFile();
    }
    onEdited?.();
  };

  switch(propertyDef.type){
    case 'number':
      return (
        <div className="property-editor-row">
          <label className="property-editor-label property-editor-label--ellipsis" title={propertyDef.gitFieldLabel === 'ZOrientation' ? 'Third component of retail orientation vector; geometry yaw uses full X/Y/Z vector' : undefined}>
            {propertyDef.label}:
          </label>
          <input
            type="number"
            step={propertyDef.gitFieldLabel === 'ZOrientation' ? '0.01' : undefined}
            value={currentValue || 0}
            onChange={(e) => updateValue(parseFloat(e.target.value) || 0)}
            className="property-editor-input"
          />
        </div>
      );

    case 'string':
      return (
        <StringPropertyEditor
          propertyDef={propertyDef}
          gameObject={gameObject}
          currentValue={String(currentValue || '')}
          updateValue={updateValue}
        />
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
        const rad = gameObject.rotation?.z || 0;
        const displayValue = propertyDef.asDegrees ? (rad * 180) / Math.PI : rad;
        const facing = propertyDef.showFacingVector ? facingFromYaw(rad) : null;
        return (
          <>
            <div className="property-editor-row">
              <label
                className="property-editor-label property-editor-label--ellipsis"
                title={propertyDef.showFacingVector ? 'GIT stores XOrientation/YOrientation as a facing unit vector' : undefined}
              >
                {propertyDef.label}:
              </label>
              <input
                type="number"
                step="0.1"
                value={Number.isFinite(displayValue) ? Number(displayValue.toFixed(3)) : 0}
                onChange={(e) => {
                  if(gameObject.rotation){
                    const raw = parseFloat(e.target.value) || 0;
                    gameObject.rotation.z = propertyDef.asDegrees ? (raw * Math.PI) / 180 : raw;
                    gameObject.setProperty('rotation' as keyof ForgeGameObject, gameObject.rotation);
                    tab.updateFile();
                    onEdited?.();
                  }
                }}
                className="property-editor-input"
              />
            </div>
            {facing ? (
              <div className="property-editor-row property-editor-row--hint">
                <label className="property-editor-label property-editor-label--ellipsis">
                  XO / YO:
                </label>
                <span className="git-instance-properties-editor__hint">
                  {facing.x.toFixed(4)}, {facing.y.toFixed(4)}
                </span>
              </div>
            ) : null}
          </>
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
          <CExoLocStringEditor
            value={currentValue instanceof KotOR.CExoLocString ? currentValue : new KotOR.CExoLocString(-1)}
            onChange={(value) => updateValue(value)}
          />
        </div>
      );

    case 'array':
      if(propertyDef.propertyName === 'vertices' && (gameObject instanceof ForgeTrigger || gameObject instanceof ForgeEncounter)){
        return <VertexArrayEditor gameObject={gameObject} tab={tab} />;
      }
      if(propertyDef.propertyName === 'spawnPointList' && gameObject instanceof ForgeEncounter){
        return <SpawnPointArrayEditor encounter={gameObject} tab={tab} />;
      }
      return (
        <div className="property-editor-row">
          <label className="property-editor-label property-editor-label--ellipsis">
            {propertyDef.label}:
          </label>
          <div className="property-editor-message property-editor-message--italic">
            Array editing is not available for this field.
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

const VertexArrayEditor = function(props: { gameObject: ForgeTrigger | ForgeEncounter; tab: TabModuleEditorState }){
  const { gameObject, tab } = props;
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  return (
    <div>
      <div className="property-editor-row">
        <label className="property-editor-label">Vertices:</label>
        <button className="forge-btn" onClick={() => { gameObject.addVertex(); tab.updateFile(); refresh(); }}>Add</button>
      </div>
      {gameObject.vertices.map((vertex, index) => (
        <div key={`${index}-${tick}`} className="property-editor-row">
          <label className="property-editor-label">{index}</label>
          <input className="property-editor-input" type="number" value={vertex.x} onChange={(e) => {
            vertex.x = parseFloat(e.target.value) || 0;
            gameObject.buildGeometry();
            gameObject.buildVertexHelpers();
            tab.updateFile({ coalesceKey: `vertex-${index}-x` });
            refresh();
          }} />
          <input className="property-editor-input" type="number" value={vertex.y} onChange={(e) => {
            vertex.y = parseFloat(e.target.value) || 0;
            gameObject.buildGeometry();
            gameObject.buildVertexHelpers();
            tab.updateFile({ coalesceKey: `vertex-${index}-y` });
            refresh();
          }} />
          <input className="property-editor-input" type="number" value={vertex.z} onChange={(e) => {
            vertex.z = parseFloat(e.target.value) || 0;
            gameObject.buildGeometry();
            gameObject.buildVertexHelpers();
            tab.updateFile({ coalesceKey: `vertex-${index}-z` });
            refresh();
          }} />
          <button className="forge-btn" onClick={() => {
            tab.selectGameObject(gameObject);
            gameObject.selectVertex(index);
            if(gameObject.vertexHelpers[index]){
              tab.ui3DRenderer.transformControls.detach();
              tab.ui3DRenderer.transformControls.attach(gameObject.vertexHelpers[index]);
            }
          }}>Sel</button>
          <button className="forge-btn" onClick={() => { gameObject.removeVertex(index); tab.updateFile(); refresh(); }}>Del</button>
        </div>
      ))}
    </div>
  );
};

const SpawnPointArrayEditor = function(props: { encounter: ForgeEncounter; tab: TabModuleEditorState }){
  const { encounter, tab } = props;
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  return (
    <div>
      <div className="property-editor-row">
        <label className="property-editor-label">Spawn Points:</label>
        <button className="forge-btn" onClick={() => { encounter.addSpawnPoint(); tab.updateFile(); refresh(); }}>Add</button>
      </div>
      {encounter.spawnPointList.map((point, index) => (
        <div key={`${index}-${tick}`} className="property-editor-row">
          <label className="property-editor-label">{index}</label>
          <input className="property-editor-input" type="number" title="X" value={point.position.x} onChange={(e) => {
            point.position.x = parseFloat(e.target.value) || 0;
            tab.updateFile({ coalesceKey: `spawn-${index}-x` });
            refresh();
          }} />
          <input className="property-editor-input" type="number" title="Y" value={point.position.y} onChange={(e) => {
            point.position.y = parseFloat(e.target.value) || 0;
            tab.updateFile({ coalesceKey: `spawn-${index}-y` });
            refresh();
          }} />
          <input className="property-editor-input" type="number" title="Z" value={point.position.z} onChange={(e) => {
            point.position.z = parseFloat(e.target.value) || 0;
            tab.updateFile({ coalesceKey: `spawn-${index}-z` });
            refresh();
          }} />
          <input
            className="property-editor-input"
            type="number"
            step="0.1"
            title="Orientation (°)"
            value={Number(((point.orientation * 180) / Math.PI).toFixed(3))}
            onChange={(e) => {
              const deg = parseFloat(e.target.value) || 0;
              point.orientation = (deg * Math.PI) / 180;
              tab.updateFile({ coalesceKey: `spawn-${index}-o` });
              refresh();
            }}
          />
          <button className="forge-btn" onClick={() => { encounter.removeSpawnPoint(index); tab.updateFile(); refresh(); }}>Del</button>
        </div>
      ))}
    </div>
  );
};

function ScalarRow(props: { label: string; children: React.ReactNode }){
  return (
    <div className="property-editor-row">
      <label className="property-editor-label property-editor-label--ellipsis">{props.label}:</label>
      {props.children}
    </div>
  );
}

function NumberField(props: { value: number; onChange: (value: number) => void; step?: string }){
  return (
    <input
      className="property-editor-input"
      type="number"
      step={props.step || "1"}
      value={props.value}
      onChange={(e) => props.onChange(parseFloat(e.target.value) || 0)}
    />
  );
}

function TextField(props: { value: string; onChange: (value: string) => void; maxLength?: number }){
  return (
    <input
      className="property-editor-input"
      type="text"
      maxLength={props.maxLength}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

function BoolField(props: { value: boolean; onChange: (value: boolean) => void }){
  return (
    <input
      className="property-editor-checkbox"
      type="checkbox"
      checked={props.value}
      onChange={(e) => props.onChange(e.target.checked)}
    />
  );
}

function ScriptField(props: { value: string; onChange: (value: string) => void }){
  return (
    <>
      <input
        className="property-editor-input"
        type="text"
        maxLength={16}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16))}
      />
      <button className="forge-btn" onClick={() => openScriptBrowser((resref) => props.onChange(resref), props.value)}>…</button>
    </>
  );
}

function CollapsibleSection(props: { title: string; children: React.ReactNode; defaultOpen?: boolean }){
  const [open, setOpen] = useState(props.defaultOpen !== false);
  return (
    <div className="git-instance-properties-editor__collapsible">
      <button
        type="button"
        className="git-instance-properties-editor__section"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <i className={`fa-solid ${open ? "fa-chevron-down" : "fa-chevron-right"}`} aria-hidden="true" />
        <span>{props.title}</span>
      </button>
      {open ? <div className="git-instance-properties-editor__section-body">{props.children}</div> : null}
    </div>
  );
}

function DwordColorField(props: { value: number; onChange: (value: number) => void }){
  return (
    <ForgeColorField
      value={dwordToRgb01(props.value)}
      onChange={(rgb) => props.onChange(rgb01ToDword(rgb))}
    />
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes || []).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

const AreaPropertiesEditor = function(props: { tab: TabModuleEditorState }){
  const area = props.tab.module?.area;
  const [tick, setTick] = useState(0);

  if(!area){
    return <div className="git-instance-properties-editor__empty-state">No area loaded.</div>;
  }
  const mark = (coalesceKey?: string) => {
    props.tab.updateFile(coalesceKey ? { coalesceKey } : undefined);
    setTick((n) => n + 1);
  };
  const map = area.areaMap;
  const miniGame = area.miniGame;
  return (
    <div className="git-instance-properties-editor" key={tick}>
      <div className="git-instance-properties-editor__header">Area (ARE)</div>
      <div className="git-instance-properties-editor__object-actions">
        <button className="git-instance-properties-editor__action-btn" onClick={() => void props.tab.openAreaPath()}>Open Path Editor</button>
      </div>

      <CollapsibleSection title="Identity">
      <ScalarRow label="Name">
        <CExoLocStringEditor value={area.name} onChange={(value) => { area.name = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Tag">
        <TextField value={area.tag} onChange={(value) => { area.tag = value; mark("are-tag"); }} />
      </ScalarRow>
      <ScalarRow label="Comments">
        <TextField value={area.comments} onChange={(value) => { area.comments = value; mark("comments"); }} />
      </ScalarRow>
      <ScalarRow label="Load Screen ID">
        <NumberField value={area.loadScreenId} onChange={(value) => { area.loadScreenId = value; mark("loadScreenId"); }} />
      </ScalarRow>
      <ScalarRow label="Creator ID">
        <NumberField value={area.creatorId} onChange={(value) => { area.creatorId = value; mark("creatorId"); }} />
      </ScalarRow>
      <ScalarRow label="ID">
        <NumberField value={area.id} onChange={(value) => { area.id = value; mark("are-id"); }} />
      </ScalarRow>
      <ScalarRow label="Version">
        <NumberField value={area.version} onChange={(value) => { area.version = value; mark("are-version"); }} />
      </ScalarRow>
</CollapsibleSection>

<CollapsibleSection title="Scripts">
      <ScalarRow label="OnEnter">
        <ScriptField value={area.onEnter} onChange={(value) => { area.onEnter = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="OnExit">
        <ScriptField value={area.onExit} onChange={(value) => { area.onExit = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="OnHeartbeat">
        <ScriptField value={area.onHeartbeat} onChange={(value) => { area.onHeartbeat = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="OnUserDefined">
        <ScriptField value={area.onUserDefined} onChange={(value) => { area.onUserDefined = value; mark(); }} />
      </ScalarRow>
</CollapsibleSection>

<CollapsibleSection title="Behavior">
      <ScalarRow label="Unescapable">
        <BoolField value={area.unescapable} onChange={(value) => { area.unescapable = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="No Rest">
        <BoolField value={area.noRest} onChange={(value) => { area.noRest = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="No Hang Back">
        <BoolField value={area.noHangBack} onChange={(value) => { area.noHangBack = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Player Only">
        <BoolField value={area.playerOnly} onChange={(value) => { area.playerOnly = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Player Vs Player">
        <BoolField value={area.playerVsPlayer} onChange={(value) => { area.playerVsPlayer = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Day/Night">
        <BoolField value={area.dayNightCycle} onChange={(value) => { area.dayNightCycle = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Is Night">
        <BoolField value={area.isNight} onChange={(value) => { area.isNight = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Stealth XP Enabled">
        <BoolField value={area.stealthXPEnabled} onChange={(value) => { area.stealthXPEnabled = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Stealth XP Loss">
        <NumberField value={area.stealthXPLoss} onChange={(value) => { area.stealthXPLoss = value; mark("stealthXPLoss"); }} />
      </ScalarRow>
      <ScalarRow label="Stealth XP Max">
        <NumberField value={area.stealthXPMax} onChange={(value) => { area.stealthXPMax = value; mark("stealthXPMax"); }} />
      </ScalarRow>
      <ScalarRow label="Flags">
        <NumberField value={area.flags} onChange={(value) => { area.flags = value; mark("flags"); }} />
      </ScalarRow>
      <ScalarRow label="Alpha Test">
        <NumberField value={area.alphaTest} step="0.01" onChange={(value) => { area.alphaTest = value; mark("alphaTest"); }} />
      </ScalarRow>
      <ScalarRow label="Camera Style">
        <NumberField value={area.cameraStyle} onChange={(value) => { area.cameraStyle = value; mark("cameraStyle"); }} />
      </ScalarRow>
      <ScalarRow label="Default Env Map">
        <TextField value={area.defaultEnvMap} maxLength={16} onChange={(value) => { area.defaultEnvMap = value; mark("defaultEnvMap"); }} />
      </ScalarRow>
      <ScalarRow label="Lighting Scheme">
        <NumberField value={area.lightingScheme} onChange={(value) => { area.lightingScheme = value; mark("lightingScheme"); }} />
      </ScalarRow>
      <ScalarRow label="Mod Listen Check">
        <NumberField value={area.modListenCheck} onChange={(value) => { area.modListenCheck = value; mark("modListenCheck"); }} />
      </ScalarRow>
      <ScalarRow label="Mod Spot Check">
        <NumberField value={area.modSpotCheck} onChange={(value) => { area.modSpotCheck = value; mark("modSpotCheck"); }} />
      </ScalarRow>
      <ScalarRow label="Shadow Opacity">
        <NumberField value={area.shadowOpacity} onChange={(value) => { area.shadowOpacity = value; mark("shadowOpacity"); }} />
      </ScalarRow>
      <ScalarRow label="Dyn Ambient">
        <DwordColorField value={area.dynamicAmbientColor} onChange={(value) => { area.dynamicAmbientColor = value; mark(); }} />
      </ScalarRow>
</CollapsibleSection>

<CollapsibleSection title="Sun">
      <ScalarRow label="Ambient">
        <DwordColorField value={area.sunAmbientColor} onChange={(value) => { area.sunAmbientColor = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Diffuse">
        <DwordColorField value={area.sunDiffuseColor} onChange={(value) => { area.sunDiffuseColor = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Fog Color">
        <DwordColorField value={area.sunFogColor} onChange={(value) => { area.sunFogColor = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Fog On">
        <BoolField value={area.sunFogOn} onChange={(value) => { area.sunFogOn = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Fog Near">
        <NumberField value={area.sunFogNear} step="0.1" onChange={(value) => { area.sunFogNear = value; mark("sunFogNear"); }} />
      </ScalarRow>
      <ScalarRow label="Fog Far">
        <NumberField value={area.sunFogFar} step="0.1" onChange={(value) => { area.sunFogFar = value; mark("sunFogFar"); }} />
      </ScalarRow>
      <ScalarRow label="Shadows">
        <BoolField value={area.sunShadows} onChange={(value) => { area.sunShadows = value; mark(); }} />
      </ScalarRow>
</CollapsibleSection>

<CollapsibleSection title="Moon">
      <ScalarRow label="Ambient">
        <DwordColorField value={area.moonAmbientColor} onChange={(value) => { area.moonAmbientColor = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Diffuse">
        <DwordColorField value={area.moonDiffuseColor} onChange={(value) => { area.moonDiffuseColor = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Fog Color">
        <DwordColorField value={area.moonFogColor} onChange={(value) => { area.moonFogColor = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Fog On">
        <BoolField value={area.moonFogOn} onChange={(value) => { area.moonFogOn = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Fog Near">
        <NumberField value={area.moonFogNear} step="0.1" onChange={(value) => { area.moonFogNear = value; mark("moonFogNear"); }} />
      </ScalarRow>
      <ScalarRow label="Fog Far">
        <NumberField value={area.moonFogFar} step="0.1" onChange={(value) => { area.moonFogFar = value; mark("moonFogFar"); }} />
      </ScalarRow>
      <ScalarRow label="Shadows">
        <BoolField value={area.moonShadows} onChange={(value) => { area.moonShadows = value; mark(); }} />
      </ScalarRow>
</CollapsibleSection>

<CollapsibleSection title="Weather">
      <ScalarRow label="Chance Rain">
        <NumberField value={area.chanceRain} onChange={(value) => { area.chanceRain = value; mark("chanceRain"); }} />
      </ScalarRow>
      <ScalarRow label="Chance Snow">
        <NumberField value={area.chanceSnow} onChange={(value) => { area.chanceSnow = value; mark("chanceSnow"); }} />
      </ScalarRow>
      <ScalarRow label="Chance Lightning">
        <NumberField value={area.chanceLightning} onChange={(value) => { area.chanceLightning = value; mark("chanceLightning"); }} />
      </ScalarRow>
      <ScalarRow label="Wind Power">
        <NumberField value={area.windPower} onChange={(value) => { area.windPower = value; mark("windPower"); }} />
      </ScalarRow>
</CollapsibleSection>

<CollapsibleSection title="Grass">
      <ScalarRow label="Density">
        <NumberField value={area.grassDensity} step="0.01" onChange={(value) => { area.grassDensity = value; mark("grassDensity"); }} />
      </ScalarRow>
      <ScalarRow label="Texture">
        <TextField value={area.grassTexName} maxLength={16} onChange={(value) => { area.grassTexName = value; mark("grassTex"); }} />
      </ScalarRow>
      <ScalarRow label="Ambient">
        <DwordColorField value={area.grassAmbient} onChange={(value) => { area.grassAmbient = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Diffuse">
        <DwordColorField value={area.grassDiffuse} onChange={(value) => { area.grassDiffuse = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Prob LL">
        <NumberField value={area.grassProbLL} step="0.01" onChange={(value) => { area.grassProbLL = value; mark("grassProbLL"); }} />
      </ScalarRow>
      <ScalarRow label="Prob LR">
        <NumberField value={area.grassProbLR} step="0.01" onChange={(value) => { area.grassProbLR = value; mark("grassProbLR"); }} />
      </ScalarRow>
      <ScalarRow label="Prob UL">
        <NumberField value={area.grassProbUL} step="0.01" onChange={(value) => { area.grassProbUL = value; mark("grassProbUL"); }} />
      </ScalarRow>
      <ScalarRow label="Prob UR">
        <NumberField value={area.grassProbUR} step="0.01" onChange={(value) => { area.grassProbUR = value; mark("grassProbUR"); }} />
      </ScalarRow>
      <ScalarRow label="Quad Size">
        <NumberField value={area.grassQuadSize} step="0.01" onChange={(value) => { area.grassQuadSize = value; mark("grassQuadSize"); }} />
      </ScalarRow>
</CollapsibleSection>

<CollapsibleSection title="Map">
      <ScalarRow label="Map Res X">
        <NumberField value={map.mapResX} onChange={(value) => { map.setResX(value); mark("mapResX"); }} />
      </ScalarRow>
      <ScalarRow label="Map Zoom">
        <NumberField value={map.mapZoom} step="0.01" onChange={(value) => { map.mapZoom = value; mark("mapZoom"); }} />
      </ScalarRow>
      <ScalarRow label="North Axis">
        <NumberField value={map.northAxis} onChange={(value) => { map.northAxis = value; mark("northAxis"); }} />
      </ScalarRow>
      <ScalarRow label="World Pt1 X">
        <NumberField value={map.worldPt1X} step="0.01" onChange={(value) => { map.worldPt1X = value; mark("worldPt1X"); }} />
      </ScalarRow>
      <ScalarRow label="World Pt1 Y">
        <NumberField value={map.worldPt1Y} step="0.01" onChange={(value) => { map.worldPt1Y = value; mark("worldPt1Y"); }} />
      </ScalarRow>
      <ScalarRow label="World Pt2 X">
        <NumberField value={map.worldPt2X} step="0.01" onChange={(value) => { map.worldPt2X = value; mark("worldPt2X"); }} />
      </ScalarRow>
      <ScalarRow label="World Pt2 Y">
        <NumberField value={map.worldPt2Y} step="0.01" onChange={(value) => { map.worldPt2Y = value; mark("worldPt2Y"); }} />
      </ScalarRow>
      <ScalarRow label="Map Pt1 X">
        <NumberField value={map.mapPt1X} step="0.01" onChange={(value) => { map.mapPt1X = value; mark("mapPt1X"); }} />
      </ScalarRow>
      <ScalarRow label="Map Pt1 Y">
        <NumberField value={map.mapPt1Y} step="0.01" onChange={(value) => { map.mapPt1Y = value; mark("mapPt1Y"); }} />
      </ScalarRow>
      <ScalarRow label="Map Pt2 X">
        <NumberField value={map.mapPt2X} step="0.01" onChange={(value) => { map.mapPt2X = value; mark("mapPt2X"); }} />
      </ScalarRow>
      <ScalarRow label="Map Pt2 Y">
        <NumberField value={map.mapPt2Y} step="0.01" onChange={(value) => { map.mapPt2Y = value; mark("mapPt2Y"); }} />
      </ScalarRow>
</CollapsibleSection>

<CollapsibleSection title="Rooms">
      {area.rooms.length === 0 ? (
        <div className="git-instance-properties-editor__empty-state">No rooms. Use Add Room from the toolbar.</div>
      ) : (
        area.rooms.map((room, index) => {
          const visible = area.getRoomVisibility(room.roomName);
          const visibleSet = new Set(visible.map((n) => n.toLocaleLowerCase()));
          return (
            <div key={`${room.roomName}-${index}`} className="property-editor-room-block">
              <div className="property-editor-room-row">
                <button
                  type="button"
                  className="property-editor-room-row__name"
                  onClick={() => props.tab.selectGameObject(room)}
                  title="Select room in Object tab"
                >
                  {room.roomName || `(room ${index})`}
                </button>
                <label className="property-editor-room-row__field">
                  Env
                  <NumberField
                    value={room.envAudio}
                    onChange={(value) => {
                      room.setEnvAudio(value);
                      mark(`room-env-${index}`);
                    }}
                  />
                </label>
                <label className="property-editor-room-row__field">
                  Amb
                  <NumberField
                    value={room.ambientScale}
                    step="0.01"
                    onChange={(value) => {
                      room.setAmbientScale(value);
                      mark(`room-amb-${index}`);
                    }}
                  />
                </label>
              </div>
              <div className="git-instance-properties-editor__hint">VIS visible from this room</div>
              <div className="git-instance-properties-editor__actions">
                <button onClick={() => {
                  area.ensureLayout();
                  area.rooms.forEach((other) => area.setRoomVisibilityLink(room.roomName, other.roomName, true));
                  area.syncLayoutAndVisInMemory();
                  mark();
                }}>Select all</button>
                <button onClick={() => {
                  area.ensureLayout();
                  area.rooms.forEach((other) => area.setRoomVisibilityLink(room.roomName, other.roomName, false));
                  area.syncLayoutAndVisInMemory();
                  mark();
                }}>Clear</button>
              </div>
              {area.rooms.map((other, j) => {
                const linked = visibleSet.has(other.roomName.toLocaleLowerCase());
                return (
                  <label key={`vis-${index}-${j}`} className="property-editor-row">
                    <input
                      type="checkbox"
                      className="property-editor-checkbox"
                      checked={linked}
                      onChange={(e) => {
                        area.ensureLayout();
                        area.setRoomVisibilityLink(room.roomName, other.roomName, e.target.checked);
                        area.syncLayoutAndVisInMemory();
                        mark();
                      }}
                    />
                    <span className="property-editor-label">{other.roomName}</span>
                  </label>
                );
              })}
            </div>
          );
        })
      )}
</CollapsibleSection>

<CollapsibleSection title="MiniGame">
      {!miniGame ? (
        <div className="git-instance-properties-editor__empty-state">
          <div>No MiniGame</div>
          <button
            type="button"
            className="forge-btn"
            onClick={() => {
              if(!area) return;
              area.miniGame = ForgeMiniGame.createDefault(KotOR.MiniGameType.SWOOPRACE);
              mark();
            }}
          >
            Add MiniGame
          </button>
        </div>
      ) : (
        <>
          <ScalarRow label="Type">
            <select
              className="property-editor-input"
              value={miniGame.type}
              onChange={(e) => {
                miniGame.type = parseInt(e.target.value, 10) as KotOR.MiniGameType;
                mark("mg-type");
              }}
            >
              <option value={KotOR.MiniGameType.SWOOPRACE}>Swoop (1)</option>
              <option value={KotOR.MiniGameType.TURRET}>Turret (2)</option>
            </select>
          </ScalarRow>
          <div className="git-instance-properties-editor__hint">
            Retail MovementPerSec defaults differ by type (swoop ≈ 6, turret ≈ 90); existing values are not overwritten.
          </div>
          <ScalarRow label="Bump Plane">
            <NumberField value={miniGame.bumpPlane} onChange={(value) => { miniGame.bumpPlane = value; mark("mg-bumpPlane"); }} />
          </ScalarRow>
          <ScalarRow label="Camera View Angle">
            <NumberField value={miniGame.cameraViewAngle} step="0.01" onChange={(value) => { miniGame.cameraViewAngle = value; mark("mg-cameraViewAngle"); }} />
          </ScalarRow>
          <ScalarRow label="DOF">
            <NumberField value={miniGame.dof} onChange={(value) => { miniGame.dof = value; mark("mg-dof"); }} />
          </ScalarRow>
          <ScalarRow label="Do Bumping">
            <BoolField value={!!miniGame.doBumping} onChange={(value) => { miniGame.doBumping = value ? 1 : 0; mark(); }} />
          </ScalarRow>
          <ScalarRow label="Far Clip">
            <NumberField value={miniGame.farClip} step="0.01" onChange={(value) => { miniGame.farClip = value; mark("mg-farClip"); }} />
          </ScalarRow>
          <ScalarRow label="Near Clip">
            <NumberField value={miniGame.nearClip} step="0.01" onChange={(value) => { miniGame.nearClip = value; mark("mg-nearClip"); }} />
          </ScalarRow>
          <ScalarRow label="Lateral Accel">
            <NumberField value={miniGame.lateralAccel} step="0.01" onChange={(value) => { miniGame.lateralAccel = value; mark("mg-lateralAccel"); }} />
          </ScalarRow>
          <ScalarRow label="Movement / Sec">
            <NumberField value={miniGame.movementPerSec} step="0.01" onChange={(value) => { miniGame.movementPerSec = value; mark("mg-movementPerSec"); }} />
          </ScalarRow>
          <ScalarRow label="Music">
            <NumberField value={miniGame.music} onChange={(value) => { miniGame.music = value; mark("mg-music"); }} />
          </ScalarRow>
          <ScalarRow label="Use Inertia">
            <BoolField value={!!miniGame.useInertia} onChange={(value) => { miniGame.useInertia = value ? 1 : 0; mark(); }} />
          </ScalarRow>
          {miniGame.type === KotOR.MiniGameType.TURRET && miniGame.player ? (
            <>
              <div className="git-instance-properties-editor__hint">
                Turret (Type 2): retail requires Player Camera when loading the player.
              </div>
              <ScalarRow label="Player Camera">
                <TextField
                  value={miniGame.player.cameraName || ''}
                  onChange={(value) => {
                    miniGame.player.cameraName = value;
                    mark("mg-player-camera");
                  }}
                />
              </ScalarRow>
              <ScalarRow label="Camera Rotate">
                <BoolField
                  value={!!miniGame.player.cameraRotate}
                  onChange={(value) => {
                    miniGame.player.cameraRotate = value ? 1 : 0;
                    mark();
                  }}
                />
              </ScalarRow>
            </>
          ) : null}
          {miniGame.mouse ? (
            <>
              <ScalarRow label="Mouse Axis X">
                <NumberField value={miniGame.mouse.axisX} onChange={(value) => {
                  miniGame.mouse!.axisX = value;
                  mark("mg-mouse-axisX");
                }} />
              </ScalarRow>
              <ScalarRow label="Mouse Axis Y">
                <NumberField value={miniGame.mouse.axisY} onChange={(value) => {
                  miniGame.mouse!.axisY = value;
                  mark("mg-mouse-axisY");
                }} />
              </ScalarRow>
              <ScalarRow label="Flip Axis X">
                <BoolField value={miniGame.mouse.flipAxisX} onChange={(value) => {
                  miniGame.mouse!.flipAxisX = value;
                  mark();
                }} />
              </ScalarRow>
              <ScalarRow label="Flip Axis Y">
                <BoolField value={miniGame.mouse.flipAxisY} onChange={(value) => {
                  miniGame.mouse!.flipAxisY = value;
                  mark();
                }} />
              </ScalarRow>
            </>
          ) : (
            <ScalarRow label="Mouse">
              <button
                type="button"
                className="forge-btn"
                onClick={() => {
                  miniGame.mouse = {
                    axisX: 0,
                    axisY: 0,
                    flipAxisX: false,
                    flipAxisY: false,
                  };
                  mark();
                }}
              >
                Add Mouse
              </button>
            </ScalarRow>
          )}
          <MiniGameNestedEditors miniGame={miniGame} mark={mark} />
        </>
      )}
</CollapsibleSection>

<CollapsibleSection title="Advanced">
      <div className="git-instance-properties-editor__hint">Expansion_List is empty on export (structural only).</div></CollapsibleSection>


    </div>
  );
};

const AudioPropertiesEditor = function(props: { tab: TabModuleEditorState }){
  const area = props.tab.module?.area;
  const [tick, setTick] = useState(0);
  if(!area){
    return <div className="git-instance-properties-editor__empty-state">No area loaded.</div>;
  }
  const mark = (coalesceKey?: string) => {
    props.tab.updateFile(coalesceKey ? { coalesceKey } : undefined);
    setTick((n) => n + 1);
  };
  const propsAudio = area.areaProperties;
  return (
    <div className="git-instance-properties-editor" key={tick}>
      <div className="git-instance-properties-editor__header">Area Audio (GIT)</div>
      <ScalarRow label="Use Templates">
        <BoolField value={area.useTemplate} onChange={(value) => { area.useTemplate = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Music Day">
        <ForgeTwoDAIndexField table="ambientmusic" labelColumn="description" value={propsAudio.musicDay} onChange={(value) => { propsAudio.musicDay = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Music Night">
        <ForgeTwoDAIndexField table="ambientmusic" labelColumn="description" value={propsAudio.musicNight} onChange={(value) => { propsAudio.musicNight = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Music Battle">
        <ForgeTwoDAIndexField table="ambientmusic" labelColumn="description" value={propsAudio.musicBattle} onChange={(value) => { propsAudio.musicBattle = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Music Delay">
        <NumberField value={propsAudio.musicDelay} onChange={(value) => { propsAudio.musicDelay = value; mark("musicDelay"); }} />
      </ScalarRow>
      <ScalarRow label="Ambient Day">
        <ForgeTwoDAIndexField table="ambientsound" value={propsAudio.ambientSndDay} onChange={(value) => { propsAudio.ambientSndDay = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Ambient Night">
        <ForgeTwoDAIndexField table="ambientsound" value={propsAudio.ambientSndNight} onChange={(value) => { propsAudio.ambientSndNight = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Day Volume">
        <NumberField value={propsAudio.ambientSndDayVol} onChange={(value) => { propsAudio.ambientSndDayVol = value; mark("dayVol"); }} />
      </ScalarRow>
      <ScalarRow label="Night Volume">
        <NumberField value={propsAudio.ambientSndNitVol} onChange={(value) => { propsAudio.ambientSndNitVol = value; mark("nitVol"); }} />
      </ScalarRow>
      <ScalarRow label="Env Audio">
        <ForgeTwoDAIndexField table="soundeax" value={propsAudio.envAudio} onChange={(value) => { propsAudio.envAudio = value; mark(); }} />
      </ScalarRow>
    </div>
  );
};

const MODULE_SCRIPT_FIELDS: Array<{ key: 'Mod_OnAcquirItem'|'Mod_OnActvtItem'|'Mod_OnClientEntr'|'Mod_OnClientLeav'|'Mod_OnHeartbeat'|'Mod_OnModLoad'|'Mod_OnModStart'|'Mod_OnPlrDeath'|'Mod_OnPlrDying'|'Mod_OnPlrLvlUp'|'Mod_OnPlrRest'|'Mod_OnSpawnBtnDn'|'Mod_OnUnAqreItem'|'Mod_OnUsrDefined'; label: string }> = [
  { key: 'Mod_OnModLoad', label: 'OnModLoad' },
  { key: 'Mod_OnModStart', label: 'OnModStart' },
  { key: 'Mod_OnClientEntr', label: 'OnClientEnter' },
  { key: 'Mod_OnClientLeav', label: 'OnClientLeave' },
  { key: 'Mod_OnHeartbeat', label: 'OnHeartbeat' },
  { key: 'Mod_OnAcquirItem', label: 'OnAcquireItem' },
  { key: 'Mod_OnUnAqreItem', label: 'OnUnAcquireItem' },
  { key: 'Mod_OnActvtItem', label: 'OnActivateItem' },
  { key: 'Mod_OnPlrDeath', label: 'OnPlayerDeath' },
  { key: 'Mod_OnPlrDying', label: 'OnPlayerDying' },
  { key: 'Mod_OnPlrLvlUp', label: 'OnPlayerLevelUp' },
  { key: 'Mod_OnPlrRest', label: 'OnPlayerRest' },
  { key: 'Mod_OnSpawnBtnDn', label: 'OnSpawnBtnDown' },
  { key: 'Mod_OnUsrDefined', label: 'OnUserDefined' },
];

const ModulePropertiesEditor = function(props: { tab: TabModuleEditorState }){
  const module = props.tab.module;
  const [tick, setTick] = useState(0);
  if(!module){
    return <div className="git-instance-properties-editor__empty-state">No module loaded.</div>;
  }
  const mark = (coalesceKey?: string) => {
    props.tab.updateFile(coalesceKey ? { coalesceKey } : undefined);
    setTick((n) => n + 1);
  };
  const refreshUi = () => setTick((n) => n + 1);
  const time = module.timeManager;
  const area = module.area;
  const objects: ForgeGameObject[] = area ? [
    ...area.cameras, ...area.creatures, ...area.doors, ...area.encounters,
    ...area.items, ...area.placeables, ...area.sounds, ...area.stores,
    ...area.triggers, ...area.waypoints,
  ] : [];
  const tagCounts = new Map<string, number>();
  objects.forEach((object) => {
    const tag = String((object as any).tag || '').trim().toLowerCase();
    if(tag) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  });
  const duplicateTags = Array.from(tagCounts.entries()).filter(([, count]) => count > 1);
  const missingTemplates = objects.filter((object) =>
    object.templateResType !== KotOR.ResourceTypes.NA && !String(object.templateResRef || '').trim()
  );
  const layoutRooms = new Set((area?.layout?.rooms || []).map((room) => room.name.toLowerCase()));
  const roomsWithoutLayout = (area?.rooms || []).filter((room) => !layoutRooms.has(room.roomName.toLowerCase()));
  return (
    <div className="git-instance-properties-editor" key={tick}>
      <div className="git-instance-properties-editor__header">Module (IFO)</div>

      <CollapsibleSection title="Diagnostics">
        {duplicateTags.length === 0 && missingTemplates.length === 0 && roomsWithoutLayout.length === 0 ? (
          <div className="git-instance-properties-editor__hint">No module diagnostics.</div>
        ) : (
          <ul>
            {duplicateTags.map(([tag, count]) => <li key={`tag-${tag}`}>Duplicate tag “{tag}” ({count})</li>)}
            {missingTemplates.map((object) => <li key={`template-${object.uuid}`}>{object.getEditorName()}: missing TemplateResRef</li>)}
            {roomsWithoutLayout.map((room) => <li key={`layout-${room.uuid}`}>{room.roomName}: missing layout entry</li>)}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Identity">
      <ScalarRow label="Name">
        <CExoLocStringEditor value={module.name} onChange={(value) => { module.name = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Description">
        <CExoLocStringEditor value={module.description} onChange={(value) => { module.description = value; mark(); }} />
      </ScalarRow>
      <ScalarRow label="Tag">
        <TextField value={module.tag} onChange={(value) => { module.tag = value; mark("mod-tag"); }} />
      </ScalarRow>
      <ScalarRow label="VO ID">
        <TextField value={module.voId} onChange={(value) => { module.voId = value; mark("voId"); }} />
      </ScalarRow>
      <ScalarRow label="Start Movie">
        <TextField value={module.startMovie} maxLength={16} onChange={(value) => { module.startMovie = value; mark("startMovie"); }} />
      </ScalarRow>
      <ScalarRow label="Entry Area">
        <TextField value={module.entryArea} maxLength={16} onChange={(value) => { module.entryArea = value; mark("entryArea"); }} />
      </ScalarRow>
      <ScalarRow label="XP Scale">
        <NumberField value={module.xpScale} onChange={(value) => { module.xpScale = value; mark("xpScale"); }} />
      </ScalarRow>
      <ScalarRow label="Mod ID">
        <input className="property-editor-input" type="text" readOnly value={bytesToHex(module.id)} title="Toolset GUID (read-only)" />
      </ScalarRow>
      <ScalarRow label="Version">
        <NumberField value={module.version} onChange={(value) => { module.version = value; mark("mod-version"); }} />
      </ScalarRow>
      <ScalarRow label="Creator ID">
        <NumberField value={module.creatorId} onChange={(value) => { module.creatorId = value; mark("mod-creatorId"); }} />
      </ScalarRow>
      <ScalarRow label="Expansion Pack">
        <NumberField value={module.expansionPack} onChange={(value) => { module.expansionPack = value; mark("expansionPack"); }} />
      </ScalarRow>
      <ScalarRow label="Hak">
        <TextField value={module.hak} onChange={(value) => { module.hak = value; mark("hak"); }} />
      </ScalarRow>
      <ScalarRow label="Is Save Game">
        <BoolField value={module.isSaveGame} onChange={(value) => { module.isSaveGame = value; mark(); }} />
      </ScalarRow>
</CollapsibleSection>

<CollapsibleSection title="Calendar">
      <ScalarRow label="Start Year">
        <NumberField value={time.year} onChange={(value) => { time.year = value; mark("startYear"); }} />
      </ScalarRow>
      <ScalarRow label="Start Month">
        <NumberField value={time.month} onChange={(value) => { time.month = value; mark("startMonth"); }} />
      </ScalarRow>
      <ScalarRow label="Start Day">
        <NumberField value={time.day} onChange={(value) => { time.day = value; mark("startDay"); }} />
      </ScalarRow>
      <ScalarRow label="Start Hour">
        <NumberField value={time.hour} onChange={(value) => { time.hour = value; mark("startHour"); }} />
      </ScalarRow>
      <ScalarRow label="Min Per Hour">
        <NumberField value={time.minutesPerHour} onChange={(value) => { time.minutesPerHour = value; mark("minPerHour"); }} />
      </ScalarRow>
      <ScalarRow label="Dawn Hour">
        <NumberField value={module.dawnHour} onChange={(value) => {
          module.dawnHour = value;
          module.timeManager.dawnHour = value;
          mark("dawnHour");
        }} />
      </ScalarRow>
      <ScalarRow label="Dusk Hour">
        <NumberField value={module.duskHour} onChange={(value) => {
          module.duskHour = value;
          module.timeManager.duskHour = value;
          mark("duskHour");
        }} />
      </ScalarRow>
</CollapsibleSection>

<CollapsibleSection title="Entry Point">
      <ScalarRow label="Entry X">
        <NumberField value={module.entryX} step="0.01" onChange={(value) => { module.entryX = value; mark("entryX"); props.tab.updateEntryMarker(); }} />
      </ScalarRow>
      <ScalarRow label="Entry Y">
        <NumberField value={module.entryY} step="0.01" onChange={(value) => { module.entryY = value; mark("entryY"); props.tab.updateEntryMarker(); }} />
      </ScalarRow>
      <ScalarRow label="Entry Z">
        <NumberField value={module.entryZ} step="0.01" onChange={(value) => { module.entryZ = value; mark("entryZ"); props.tab.updateEntryMarker(); }} />
      </ScalarRow>
      <ScalarRow label="Entry Dir X">
        <NumberField value={module.entryDirectionX} step="0.01" onChange={(value) => { module.entryDirectionX = value; mark("entryDirX"); props.tab.updateEntryMarker(); }} />
      </ScalarRow>
      <ScalarRow label="Entry Dir Y">
        <NumberField value={module.entryDirectionY} step="0.01" onChange={(value) => { module.entryDirectionY = value; mark("entryDirY"); props.tab.updateEntryMarker(); }} />
      </ScalarRow>
      <div className="property-editor-row" style={{ flexWrap: "wrap", gap: 4 }}>
        <button className="forge-btn" onClick={() => { props.tab.setEntryFromSelection(); mark(); }}>Set entry from selection</button>
        <button className="forge-btn" onClick={() => { props.tab.setEntryFromCamera(); mark(); }}>Set entry from camera</button>
        <button className="forge-btn" onClick={() => { props.tab.focusEntryMarker(); }}>Focus entry</button>
        <button className="forge-btn" onClick={() => { props.tab.placeWaypointAtEntry(); mark(); }}>Place waypoint at entry</button>
      </div>
      <div className="property-editor-row" style={{ flexWrap: "wrap", gap: 4 }}>
        <button
          className="forge-btn"
          onClick={() => {
            if(!props.tab.setPreviewWarpFromSelection()){
              window.alert("Select a waypoint with a Tag to pin as preview warp.");
            }else{
              refreshUi();
            }
          }}
        >
          Pin preview warp from selection
        </button>
        <button
          className="forge-btn"
          disabled={!props.tab.previewWarpWaypointTag}
          onClick={() => { props.tab.clearPreviewWarp(); refreshUi(); }}
        >
          Clear preview warp
        </button>
      </div>
      {props.tab.previewWarpWaypointTag ? (
        <div className="property-editor-hint">Preview warp: {props.tab.previewWarpWaypointTag}</div>
      ) : null}
</CollapsibleSection>

<CollapsibleSection title="Scripts">
      {MODULE_SCRIPT_FIELDS.map((field) => (
        <ScalarRow key={field.key} label={field.label}>
          <ScriptField
            value={module.scriptResRefs.get(field.key) || ""}
            onChange={(value) => { module.scriptResRefs.set(field.key, value); mark(); }}
          />
        </ScalarRow>
      ))}</CollapsibleSection>


    </div>
  );
};