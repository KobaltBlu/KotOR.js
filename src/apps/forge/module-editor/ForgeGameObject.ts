import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import * as KotOR from "@/apps/forge/KotOR";
import * as THREE from 'three';
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";

/** TabState.tsx is not type-checkable under Jest (`JSX` types). */
interface BlueprintEditorTab {
  updateFile(): void;
}

type FieldChangeEvent = { target: { value: string; checked?: boolean } };

export class ForgeGameObject extends EventListenerModel {
  context: any;
  container: THREE.Object3D = new THREE.Object3D();
  blueprint: KotOR.GFFObject = new KotOR.GFFObject();
  uuid: string = crypto.randomUUID();

  area: any;

  position: THREE.Vector3 = new THREE.Vector3();
  rotation: THREE.Euler = new THREE.Euler();
  scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  quaternion: THREE.Quaternion = new THREE.Quaternion();
  box: THREE.Box3 = new THREE.Box3();
  sphere: THREE.Sphere = new THREE.Sphere();

  templateResRef: string = '';
  templateResType: typeof KotOR.ResourceTypes = KotOR.ResourceTypes.NA;

  private static projectTemplatePathCache = new Map<string, string>();
  private blueprintReloadTimer: ReturnType<typeof setTimeout> | undefined;
  private blueprintReloadToken = 0;

  constructor(){
    super();
    this.position = this.container.position;
    this.rotation = this.container.rotation;
    this.scale = this.container.scale;
    this.quaternion = this.container.quaternion;
    this.container.userData.forgeGameObject = this;
  }

  static invalidateProjectTemplatePathCache(): void {
    ForgeGameObject.projectTemplatePathCache.clear();
  }

  setArea(area: any){
    this.area = area;
  }

  setContext(context: any){
    this.context = context;
  }

  setTemplateResRef(resRef: string, resType: typeof KotOR.ResourceTypes){
    this.templateResRef = resRef;
    this.templateResType = resType;
  }

  /**
   * Debounced blueprint reload so typing a resref does not thrash disk/KEY loads.
   */
  protected scheduleBlueprintReload(): void {
    if(this.blueprintReloadTimer){
      clearTimeout(this.blueprintReloadTimer);
    }
    this.blueprintReloadTimer = setTimeout(() => {
      this.blueprintReloadTimer = undefined;
      const token = ++this.blueprintReloadToken;
      void this.loadBlueprint().then(() => {
        if(token !== this.blueprintReloadToken){
          return;
        }
        return this.load();
      });
    }, 350);
  }

  private async resolveTemplateBuffer(): Promise<Uint8Array | undefined> {
    if(!this.templateResRef || this.templateResType === KotOR.ResourceTypes.NA){
      return undefined;
    }
    const ext = String(KotOR.ResourceTypes.getKeyByValue?.(this.templateResType) || "").toLowerCase();
    if(ext && ProjectFileSystem.hasRoot()){
      const fromProject = await ForgeGameObject.readProjectTemplate(this.templateResRef, ext);
      if(fromProject?.byteLength){
        return fromProject;
      }
    }
    try{
      return await KotOR.ResourceLoader.loadResource(this.templateResType, this.templateResRef);
    }catch{
      return undefined;
    }
  }

  private static async readProjectTemplate(resRef: string, ext: string): Promise<Uint8Array | undefined> {
    const key = `${resRef}.${ext}`.toLowerCase();
    let path = ForgeGameObject.projectTemplatePathCache.get(key);
    if(!path){
      try{
        const files = await ProjectFileSystem.readdir("", { recursive: true });
        for(let i = 0; i < files.length; i++){
          const rel = String(files[i] || "").replace(/\\/g, "/");
          const base = rel.split("/").pop() || "";
          if(base){
            ForgeGameObject.projectTemplatePathCache.set(base.toLowerCase(), rel);
          }
        }
      }catch{
        return undefined;
      }
      path = ForgeGameObject.projectTemplatePathCache.get(key);
    }
    if(!path){
      return undefined;
    }
    try{
      return await ProjectFileSystem.readFile(path);
    }catch{
      return undefined;
    }
  }

  async loadBlueprint(){
    if(!this.templateResRef || this.templateResType === KotOR.ResourceTypes.NA) return;
    try{
      const buffer = await this.resolveTemplateBuffer();
      if(buffer?.byteLength){
        const gff = new KotOR.GFFObject(buffer);
        this.blueprint = gff;
        this.loadFromBlueprint();
      }
    }catch(e){
      console.warn(`loadBlueprint failed for ${this.templateResRef}.${KotOR.ResourceTypes.getKeyByValue?.(this.templateResType) || this.templateResType}`, e);
    }
  }

  loadFromBlueprint(){
    // stub method to be overridden by child classes
  }

  /**
   * Seed a retail-style blueprint GFF. Child classes replace this with the
   * pipeline field list for their UT* FileType.
   */
  exportToBlueprint(): KotOR.GFFObject {
    return this.blueprint;
  }

  /**
   * Parse an existing GFF buffer, or seed a blank template when File → New
   * passes an empty/undefined buffer (empty Uint8Array is truthy).
   */
  protected applySourceBuffer(buffer?: Uint8Array){
    if(buffer instanceof Uint8Array && buffer.length >= KotOR.GFFObject.HEADER_SIZE){
      this.loadFromBuffer(buffer);
      return;
    }
    this.exportToBlueprint();
  }

  loadFromBuffer(buffer: Uint8Array){
    this.blueprint = new KotOR.GFFObject(buffer);
    this.loadFromBlueprint();
  }

  protected isTslGame(){
    return KotOR.ApplicationProfile.GameKey === KotOR.GameEngineType.TSL;
  }

  async load(){
    
  }

  update(delta: number = 0){
    // Stub method to be overridden by child classes
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
    tab: BlueprintEditorTab,
    parser: (value: number) => number = (v) => v
  ) => {
    return (e: FieldChangeEvent) => {
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
    tab: BlueprintEditorTab,
  ) => {
    return (e: FieldChangeEvent) => {
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
    tab: BlueprintEditorTab,
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
    tab: BlueprintEditorTab,
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
    tab: BlueprintEditorTab,
  ) => {
    return (e: FieldChangeEvent) => {
      const value = !!e.target.checked;
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
    tab: BlueprintEditorTab,
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
    tab: BlueprintEditorTab,
  ) => {
    return (e: FieldChangeEvent) => {
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
    tab: BlueprintEditorTab,
  ) => {
    return (e: FieldChangeEvent) => {
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
    tab: BlueprintEditorTab,
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
    if(property === 'templateResRef' && value !== old && this.templateResType !== KotOR.ResourceTypes.NA){
      this.scheduleBlueprintReload();
    }
    this.processEventListener('onPropertyChange', [property, value, old]);
    return value;
  }
}