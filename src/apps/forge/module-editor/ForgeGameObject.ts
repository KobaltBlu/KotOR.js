import { EventListenerModel } from "../EventListenerModel";
import * as KotOR from "../KotOR";
import { TabState } from "../states/tabs/TabState";
import { UI3DRenderer } from "../UI3DRenderer";
import * as THREE from 'three';
import type { ForgeArea } from "./ForgeArea";

export class ForgeGameObject extends EventListenerModel {
  context: UI3DRenderer;
  container: THREE.Object3D = new THREE.Object3D();
  blueprint: KotOR.GFFObject = new KotOR.GFFObject();
  uuid: string = crypto.randomUUID();

  area: ForgeArea;

  position: THREE.Vector3 = new THREE.Vector3();
  rotation: THREE.Euler = new THREE.Euler();
  scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  quaternion: THREE.Quaternion = new THREE.Quaternion();
  box: THREE.Box3 = new THREE.Box3();
  sphere: THREE.Sphere = new THREE.Sphere();

  templateResRef: string = '';
  templateResType: typeof KotOR.ResourceTypes = KotOR.ResourceTypes.NA;

  constructor(){
    super();
    this.position = this.container.position;
    this.rotation = this.container.rotation;
    this.scale = this.container.scale;
    this.quaternion = this.container.quaternion;
    this.container.userData.forgeGameObject = this;
  }

  setArea(area: ForgeArea){
    this.area = area;
  }

  setContext(context: UI3DRenderer){
    this.context = context;
  }

  setTemplateResRef(resRef: string, resType: typeof KotOR.ResourceTypes){
    this.templateResRef = resRef;
    this.templateResType = resType;
  }

  async loadBlueprint(){
    if(!this.templateResRef || this.templateResType === KotOR.ResourceTypes.NA) return;
    const buffer = await KotOR.ResourceLoader.loadCachedResource(this.templateResType, this.templateResRef);
    if(buffer){
      const gff = new KotOR.GFFObject(buffer);
      this.blueprint = gff;
      this.loadFromBlueprint();
    }
  }

  loadFromBlueprint(){
    // stub method to be overridden by child classes
  }

  async load(){
    
  }

  updateBoundingBox(){
    this.box.setFromObject(this.container);
  }
  
  getEditorName(): string {
    return this.templateResRef;
  }

  setGITInstance(instance: KotOR.GFFStruct){
    // stub method to be overridden by child classes
    console.error(`setGITInstance not implemented for ${this.constructor.name}`);
  }

  /**
   * Sanitizes a string to be a valid ResRef (max 16 chars, lowercase, alphanumeric + underscore only)
   */
  sanitizeResRef = (value: string): string => {
    return value.substring(0, 16).toLowerCase().replace(/[^a-z0-9_]/g, '');
  };
  
  /**
   * Clamps a number to valid BYTE range (0-255)
   */
  clampByte = (value: number): number => {
    return Math.max(0, Math.min(255, value));
  };
  
  /**
   * Clamps a number to valid WORD range (1-65535)
   */
  clampWord = (value: number): number => {
    return Math.max(1, Math.min(0xFFFF, value || 1));
  };
  
  /**
   * Creates a handler for updating number fields on a tab state
   */
  createNumberFieldHandler = <T extends ForgeGameObject>(
    setter: (value: number) => void,
    property: keyof T,
    instance: T,
    tab: TabState,
    parser: (value: number) => number = (v) => v
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
      const raw = parseInt(e.target.value) || 0;
      const value = parser(raw);
      setter(value);
      instance.setProperty(property as keyof T, value);
      tab.updateFile();
    };
  };
  
  createNumberArrayFieldHandler = <T extends ForgeGameObject>(
    setter: (value: number[]) => void,
    index: number,
    property: keyof T,
    instance: T,
    tab: TabState,
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
      const raw = parseInt(e.target.value) || 0;
      const value = instance.getProperty(property) as number[];
      value[index] = raw;
      setter([...value]);
      instance.setProperty(property as keyof T, value);
      tab.updateFile();
    };
  };
  
  
  /**
   * Creates a handler for updating BYTE fields (0-255)
   */
  createByteFieldHandler = <T extends ForgeGameObject>(
    setter: (value: number) => void,
    property: keyof T,
    instance: T,
    tab: TabState,
  ) => {
    return this.createNumberFieldHandler(setter, property, instance, tab, this.clampByte);
  };
  
  /**
   * Creates a handler for updating WORD fields (1-65535)
   */
  createWordFieldHandler = <T extends ForgeGameObject>(
    setter: (value: number) => void,
    property: keyof T,
    instance: T,
    tab: TabState,
  ) => {
    return this.createNumberFieldHandler(setter, property, instance, tab, this.clampWord);
  };
  
  /**
   * Creates a handler for updating boolean/checkbox fields
   */
  createBooleanFieldHandler = <T extends ForgeGameObject>(
    setter: (value: boolean) => void,
    property: keyof T,
    instance: T,
    tab: TabState,
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.checked;
      setter(value);
      instance.setProperty(property as keyof T, value);
      tab.updateFile();
    };
  };
  
  /**
   * Creates a handler for updating boolean/checkbox fields
   */
  createForgeCheckboxFieldHandler = <T extends ForgeGameObject>(
    setter: (value: boolean) => void,
    property: keyof T,
    instance: T,
    tab: TabState,
  ) => {
    return (value: boolean) => {
      setter(value);
      instance.setProperty(property as keyof T, value);
      tab.updateFile();
    };
  };
  
  /**
   * Creates a handler for updating ResRef string fields
   */
  createResRefFieldHandler = <T extends ForgeGameObject>(
    setter: (value: string) => void,
    property: keyof T,
    instance: T,
    tab: TabState,
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = this.sanitizeResRef(e.target.value);
      setter(value);
      instance.setProperty(property as keyof T, value);
      tab.updateFile();
    };
  };
  
  /**
   * Creates a handler for updating CExoString (textarea) fields
   */
  createCExoStringFieldHandler = <T extends ForgeGameObject>(
    setter: (value: string) => void,
    property: keyof T,
    instance: T,
    tab: TabState,
  ) => {
    return (e: React.ChangeEvent<HTMLTextAreaElement|HTMLInputElement>) => {
      setter(e.target.value);
      instance.setProperty(property as keyof T, e.target.value);
      tab.updateFile();
    };
  };
  
  /**
   * Creates a handler for updating CExoLocString fields
   */
  createCExoLocStringFieldHandler = <T extends ForgeGameObject>(
    setter: (value: KotOR.CExoLocString) => void,
    property: keyof T,
    instance: T,
    tab: TabState,
  ) => {
    return (value: KotOR.CExoLocString) => {
      setter(value);
      instance.setProperty(property as keyof T, value);
      tab.updateFile();
    };
  };

  getProperty(property: keyof this): any{
    return (this as any)[property];
  }

  setProperty(property: keyof this, value: any){
    const old = (this as any)[property];
    (this as any)[property] = value;
    this.processEventListener('onPropertyChange', [property, value, old]);
    return value;
  }
}