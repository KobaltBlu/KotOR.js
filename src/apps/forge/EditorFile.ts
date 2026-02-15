import * as fs from "fs";



import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";
import { FileLocationType } from "@/apps/forge/enum/FileLocationType";
import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import { pathParse } from "@/apps/forge/helpers/PathParse";
import { EditorFileOptions } from "@/apps/forge/interfaces/EditorFileOptions";
import type { ProjectFileSystem as ProjectFileSystemType } from "@/apps/forge/ProjectFileSystem";
import * as KotOR from "@/KotOR";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

let _projectFileSystemClass: typeof ProjectFileSystemType | null = null;
async function getProjectFileSystem(): Promise<typeof ProjectFileSystemType> {
  if (!_projectFileSystemClass) {
    const mod = await import("./ProjectFileSystem") as { ProjectFileSystem: typeof ProjectFileSystemType };
    _projectFileSystemClass = mod.ProjectFileSystem;
  }
  return _projectFileSystemClass;
}

export type EditorFileEventListenerTypes =
  'onNameChanged' | 'onSaveStateChanged' | 'onSaved'

/** Callback for editor file events: (editorFile: EditorFile) => void. */
type EditorFileEventCallback = (editorFile: EditorFile) => void;

export interface EditorFileEventListeners {
  onNameChanged: EditorFileEventCallback[];
  onSaveStateChanged: EditorFileEventCallback[];
  onSaved: EditorFileEventCallback[];
}

export interface EditorFileReadResponse {
  buffer: Uint8Array;
  buffer2?: Uint8Array;
}

export class EditorFile extends EventListenerModel {

  protocol: EditorFileProtocol | unknown;

  handle?: FileSystemFileHandle;
  handle2?: FileSystemFileHandle;
  useGameFileSystem: boolean = false;
  useProjectFileSystem: boolean = false;
  useSystemFileSystem: boolean = false;

  buffer: Uint8Array = new Uint8Array(0);
  buffer2?: Uint8Array; //for dual file types like mdl/mdx
  gffObject?: KotOR.GFFObject;
  isBlueprint: boolean = false;

  path: string;
  path2: string | null; //for dual file types like mdl/mdx
  archive_path: string | undefined;
  archive_path2: string | undefined; //for dual file types like mdl/mdx

  location: unknown;
  _unsaved_changes: boolean = false;
  _resref: string = '';
  _reskey: number = 0;
  _ext: string = '';

  get unsaved_changes() {
    return this._unsaved_changes;
  }

  set unsaved_changes(value) {
    this._unsaved_changes = (value || (this.location == FileLocationType.OTHER)) ? true : false;
    this.processEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', [this]);
    if (!this.unsaved_changes) {
      type ForgeStateModule = { ForgeState: { addRecentFile: (file: EditorFile) => void } };
      void import("./states/ForgeState").then((m: ForgeStateModule) => {
        m.ForgeState.addRecentFile(this);
      });
    }
  }

  get resref() {
    return this._resref;
  }

  set resref(value: string) {
    this._resref = value;
    this.processEventListener<EditorFileEventListenerTypes>('onNameChanged', [this]);
  }

  get reskey() {
    return this._reskey;
  }

  set reskey(value: number) {
    this._reskey = value;
    this._ext = KotOR.ResourceTypes.getKeyByValue(this.reskey);
    this.processEventListener<EditorFileEventListenerTypes>('onNameChanged', [this]);
  }

  get ext() {
    return this._ext;
  }

  set ext(value: string) {
    this._ext = value;
    this._reskey = (KotOR.ResourceTypes as Record<string, number>)[value] ?? 0;
    this.processEventListener<EditorFileEventListenerTypes>('onNameChanged', [this]);
  }

  constructor(options: EditorFileOptions = {}) {
    super();
    log.trace('EditorFile constructor');
    options = Object.assign({
      path: null,
      path2: null,
      handle: this.handle,
      handle2: this.handle2,
      buffer: [],
      buffer2: [],
      resref: null,
      reskey: null,
      ext: null,
      archive_path: null,
      location: FileLocationType.OTHER,
      useGameFileSystem: false,
      useProjectFileSystem: false,
    }, options);

    this.buffer = options.buffer ?? new Uint8Array(0);
    this.buffer2 = options.buffer2;
    this.path = options.path ?? '';
    this.path2 = options.path2 ?? null;
    log.trace('EditorFile constructor path', this.path || '(empty)');
    if (options.ext != null) this.ext = options.ext;
    if (options.resref != null) this.resref = options.resref;
    if (options.reskey != null) this.reskey = options.reskey;
    this.archive_path = options.archive_path;
    this.location = options.location;
    this.unsaved_changes = false;
    this.handle = options.handle;
    this.handle2 = options.handle2;
    this.useGameFileSystem = !!options.useGameFileSystem;
    this.useProjectFileSystem = !!options.useProjectFileSystem;

    if (!this.ext && this.reskey) {
      this.ext = KotOR.ResourceTypes.getKeyByValue(this.reskey);
    }

    if (typeof this.path === 'string') {
      this.setPath(this.path);
    }

    if (!this.ext && this.reskey) {
      this.ext = KotOR.ResourceTypes.getKeyByValue(this.reskey);
    }

    if (this.location == FileLocationType.OTHER)
      this.unsaved_changes = true;
    log.debug('EditorFile constructor done', this.resref || this.path);
  }

  setGFFObject(gffObject: KotOR.GFFObject) {
    this.gffObject = gffObject;
  }

  setPath(filepath: string) {
    log.trace('EditorFile.setPath()', filepath?.slice(0, 80));
    this.path = filepath;
    if (typeof this.path === 'string') {
      this.path = filepath.replace(/\\/g, "/");
      const url = new URL(filepath);

      this.protocol = url.protocol as EditorFileProtocol;
      let pathname = url.pathname.replace(/%20/g, " ");
      log.trace('EditorFile.setPath() pathname', pathname?.slice(0, 60));

      pathname = pathname.replace(/^\/+|\/+$/g, '');

      if (pathname.indexOf('game.dir') >= 0) { //Use: GameFileSystem
        pathname = pathname.replace('game.dir', '').replace(/^\/+|\/+$/g, '');
        this.useGameFileSystem = true;
      }

      if (pathname.indexOf('project.dir') >= 0) { //Use: ProjectFileSystem
        pathname = pathname.replace('project.dir', '').replace(/^\/+|\/+$/g, '');
        this.useProjectFileSystem = true;
      }

      if (pathname.indexOf('system.dir') >= 0) { //Use: SystemFileSytem
        pathname = pathname.replace('system.dir', '').replace(/^\/+|\/+$/g, '');
        this.useSystemFileSystem = true;
      }
      pathname = pathname.replace(/^\/+|\/+$/g, '');

      const path_obj = pathParse(pathname);
      switch (this.protocol) {
        case EditorFileProtocol.BIF:
        case EditorFileProtocol.ERF:
        case EditorFileProtocol.MOD:
        case EditorFileProtocol.RIM:
        case EditorFileProtocol.ZIP:
        case EditorFileProtocol._7ZIP:
          this.location = FileLocationType.ARCHIVE;
          this.archive_path = pathname;

          if (url.searchParams.has('resref')) {
            this.resref = url.searchParams.get('resref');
          }

          if (url.searchParams.has('restype')) {
            const restype = url.searchParams.get('restype');
            if (restype != null) {
              const num = parseInt(restype, 10);
              if (!Number.isNaN(num)) {
                this.ext = KotOR.ResourceTypes.getKeyByValue(num);
                this.reskey = num;
              } else {
                this.ext = restype;
                this.reskey = (KotOR.ResourceTypes as Record<string, number>)[restype] ?? 0;
              }
            }
          }

          break;
        case EditorFileProtocol.FILE:
          this.location = FileLocationType.LOCAL;
          this.path = pathname;
          this.resref = path_obj.name;
          if (!this.reskey) {
            this.reskey = KotOR.ResourceTypes[path_obj.ext];
          }

          this.ext = KotOR.ResourceTypes.getKeyByValue(this.reskey);
          break;
        default:
          log.warn('Unhandled Protocol', this.protocol, url);
          break;
      }
      log.trace('setPath', this);
    }
  }

  getPath() {
    log.trace('EditorFile.getPath()');
    if (this.path && !this.archive_path) {
      return this.path;
    } else if (this.archive_path) {
      return this.archive_path + '?' + this.resref + '.' + this.ext;
    }
    return undefined;
  }

  async readFile(): Promise<EditorFileReadResponse> {
    log.trace('EditorFile.readFile()', this.path?.slice(0, 60), this.reskey);
    return new Promise<EditorFileReadResponse>((resolve, reject) => {
      void (async () => {
        if (this.reskey == KotOR.ResourceTypes.mdl || this.reskey == KotOR.ResourceTypes.mdx) {
          log.trace('EditorFile.readFile() mdl/mdx branch');
          resolve(await this.readMdlMdxFile());
          return;
        }
        if (this.buffer instanceof Uint8Array && this.buffer.length) {
          log.trace('EditorFile.readFile() use existing buffer', this.buffer.length);
          resolve({ buffer: this.buffer });
          return;
        }
        if (!this.archive_path) {
          if (typeof this.path !== 'string') {
            log.warn('EditorFile.readFile', 'unable to open file', this.protocol);
            this.buffer = new Uint8Array(0);
            resolve({ buffer: this.buffer });
            return;
          }
          switch (this.protocol) {
            case EditorFileProtocol.FILE:
              log.trace('EditorFile.readFile() FILE protocol');
              if (this.useGameFileSystem) {
                log.trace('EditorFile.readFile() GameFileSystem');
                KotOR.GameFileSystem.readFile(this.path).then((buffer: Uint8Array) => {
                  this.buffer = buffer;
                  resolve({ buffer: this.buffer });
                }).catch(reject);
                return;
              }
              if (this.useProjectFileSystem) {
                log.trace('EditorFile.readFile() ProjectFileSystem');
                getProjectFileSystem().then((PFS) => PFS.readFile(this.path)).then((buffer: Uint8Array) => {
                  this.buffer = buffer;
                  resolve({ buffer: this.buffer });
                }).catch(reject);
                return;
              }
              if (KotOR.ApplicationProfile.ENV !== KotOR.ApplicationEnvironment.ELECTRON) {
                if (this.handle) {
                  const granted = (await this.handle.queryPermission({ mode: 'read' })) === 'granted'
                    || (await this.handle.requestPermission({ mode: 'read' })) === 'granted';
                  if (granted) {
                    const file = await this.handle.getFile();
                    this.buffer = new Uint8Array(await file.arrayBuffer());
                    resolve({ buffer: this.buffer });
                  } else {
                    log.warn('EditorFile.readFile', 'unable to open file', this.protocol);
                    this.buffer = new Uint8Array(0);
                    resolve({ buffer: this.buffer });
                  }
                  return;
                }
              } else {
                fs.readFile(this.path, (err, buffer) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  this.buffer = new Uint8Array(buffer);
                  resolve({ buffer: this.buffer });
                });
                return;
              }
              break;
            default:
              log.warn('EditorFile.readFile', 'unhandled protocol', this.protocol);
          }
          resolve({ buffer: this.buffer });
          return;
        }
        const archive_path = pathParse(this.archive_path);
        log.trace('archive_path.ext', archive_path.ext);
        switch (this.protocol) {
          case EditorFileProtocol.BIF: {
            const bif = new KotOR.BIFObject(this.archive_path);
            bif.load().then((archive: KotOR.BIFObject) => {
              return archive.getResourceBuffer(archive.getResource(this.resref, this.reskey)).then((buffer: Uint8Array) => {
                this.buffer = buffer;
                resolve({ buffer: this.buffer });
              });
            }).catch(reject);
            break;
          }
          case EditorFileProtocol.ERF:
          case EditorFileProtocol.MOD: {
            const erf = new KotOR.ERFObject(this.archive_path);
            erf.load().then((archive: KotOR.ERFObject) => {
              return archive.getResourceBufferByResRef(this.resref, this.reskey).then((buffer: Uint8Array) => {
                this.buffer = buffer;
                resolve({ buffer: this.buffer });
              });
            }).catch(reject);
            break;
          }
          case EditorFileProtocol.RIM: {
            const rim = new KotOR.RIMObject(this.archive_path);
            rim.load().then((archive: KotOR.RIMObject) => {
              return archive.getResourceBuffer(archive.getResource(this.resref, this.reskey)).then((buffer: Uint8Array) => {
                this.buffer = buffer;
                resolve({ buffer: this.buffer });
              });
            }).catch(reject);
            break;
          }
          default:
            log.warn('EditorFile.readFile', 'unhandled protocol', this.protocol);
            resolve({ buffer: this.buffer });
        }
      })().catch(reject);
    });
  }

  async readMdlMdxFile(): Promise<EditorFileReadResponse> {
    return new Promise<EditorFileReadResponse>((resolve, reject) => {
      void (async () => {
        if (this.archive_path) {
        switch (this.protocol) {
          case EditorFileProtocol.BIF: {
            const key_mdl = KotOR.KEYManager.Key.getFileKey(this.resref, KotOR.ResourceTypes['mdl']);
            const key_mdx = KotOR.KEYManager.Key.getFileKey(this.resref, KotOR.ResourceTypes['mdx']);

            if ((!(this.buffer instanceof Uint8Array) || !this.buffer?.length) && key_mdl) {
              this.buffer = await KotOR.KEYManager.Key.getFileBuffer(key_mdl);
            }

            if ((!(this.buffer2 instanceof Uint8Array) || !this.buffer2?.length) && key_mdx) {
              this.buffer2 = await KotOR.KEYManager.Key.getFileBuffer(key_mdx);
            }

            resolve({
              buffer: this.buffer,
              buffer2: this.buffer2
            });
            break;
          }
          case EditorFileProtocol.ERF:
          case EditorFileProtocol.MOD: {
            const erf = new KotOR.ERFObject(this.archive_path);
            erf.load().then(async (archive: KotOR.ERFObject) => {
              //MDL
              if (!(this.buffer instanceof Uint8Array) || !this.buffer?.length) {
                this.buffer = await archive.getResourceBufferByResRef(this.resref, KotOR.ResourceTypes['mdl']);
              }

              //MDX
              if (!(this.buffer2 instanceof Uint8Array) || !this.buffer2?.length) {
                this.buffer2 = await archive.getResourceBufferByResRef(this.resref, KotOR.ResourceTypes['mdx']);
              }

              resolve({
                buffer: this.buffer,
                buffer2: this.buffer2
              });
            });
            break;
          }
          case EditorFileProtocol.RIM: {
            const rim = new KotOR.RIMObject(this.archive_path);
            rim.load().then(async (archive: KotOR.RIMObject) => {
              //MDL
              if (!(this.buffer instanceof Uint8Array) || !this.buffer?.length) {
                this.buffer = await archive.getResourceBufferByResRef(this.resref, KotOR.ResourceTypes['mdl']);
              }

              //MDX
              if (!(this.buffer2 instanceof Uint8Array) || !this.buffer2?.length) {
                this.buffer2 = await archive.getResourceBufferByResRef(this.resref, KotOR.ResourceTypes['mdx']);
              }

              resolve({
                buffer: this.buffer,
                buffer2: this.buffer2
              });
            });
            break;
          }
          default:
            break;
        }
      } else {
        switch (this.protocol) {
          case EditorFileProtocol.FILE: {
            if (this.useGameFileSystem) {
              try {
                //MDL
                if (!(this.buffer instanceof Uint8Array) || !this.buffer?.length) this.buffer = await KotOR.GameFileSystem.readFile(this.path);

                //MDX
                if (!(this.buffer2 instanceof Uint8Array) || !this.buffer2?.length) this.buffer2 = await KotOR.GameFileSystem.readFile(this.path2);
              } catch (e) {
                log.error(String(e), e);
              }

              resolve({
                buffer: this.buffer,
                buffer2: this.buffer2
              });
            } else if (this.useProjectFileSystem) {
              try {
                const PFS = await getProjectFileSystem();
                if (!(this.buffer instanceof Uint8Array) || !this.buffer?.length) this.buffer = await PFS.readFile(this.path);
                if (!(this.buffer2 instanceof Uint8Array) || !this.buffer2?.length) this.buffer2 = await PFS.readFile(this.path2 ?? "");
              } catch (e) {
                log.error(String(e), e);
              }

              resolve({
                buffer: this.buffer,
                buffer2: this.buffer2,
              });
            } else {
              if (KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON) {
                fs.readFile(this.path, (err, buffer) => {
                  if (err) throw err;

                  this.buffer = new Uint8Array(buffer);
                  fs.readFile(this.path2, (err, buffer2) => {
                    if (err) throw err;

                    this.buffer2 = new Uint8Array(buffer2);
                    resolve({
                      buffer: this.buffer,
                      buffer2: this.buffer2,
                    });
                  });
                });
              } else {
                //MDL
                let granted = false;
                if (this.handle) {
                  granted = (await this.handle.queryPermission({ mode: 'readwrite' })) === 'granted';
                  if (!granted) {
                    granted = (await this.handle.requestPermission({ mode: 'readwrite' })) === 'granted';
                  }

                  if (!granted) {
                    log.warn('EditorFile.readFile', 'unable to open (mdl) file', this.protocol);
                    resolve({
                      buffer: this.buffer,
                      buffer2: this.buffer2,
                    });
                    return;
                  }

                  const file = await this.handle.getFile();
                  if (file) {
                    this.buffer = new Uint8Array(await file.arrayBuffer());
                  }
                }

                //MDX
                let granted2 = false;
                if (this.handle2) {
                  granted2 = (await this.handle2.queryPermission({ mode: 'read' })) === 'granted';
                  if (!granted2) {
                    granted2 = (await this.handle2.requestPermission({ mode: 'read' })) === 'granted';
                  }

                  if (!granted2) {
                    log.warn('EditorFile.readFile', 'unable to open (mdx) file', this.protocol);
                    resolve({
                      buffer: this.buffer,
                      buffer2: this.buffer2,
                    });
                    return;
                  }

                  const file2 = await this.handle2.getFile();
                  if (file2) {
                    this.buffer2 = new Uint8Array(await file2.arrayBuffer());
                  }
                }

                resolve({
                  buffer: this.buffer,
                  buffer2: this.buffer2,
                });
              }
            }
            break;
          }
          default:
            log.warn('EditorFile.readMdlMdxFile', 'unhandled protocol', this.protocol);
            break;
        }
      }
      })().catch(reject);
    });
  }

  getData() {
    return this.buffer;
  }

  getLocalPath() {
    if (!this.archive_path && this.path)
      return this.path;
    else
      return null;
  }

  getFilename() {
    return this.resref + '.' + this.ext;
  }

  getPrettyPath() {
    const parsed = pathParse(this.path);
    if (this.useGameFileSystem) {
      if (this.archive_path) {
        return `${this.protocol}//~/${this.archive_path}`;
      }

      return parsed.dir;
    } else if (this.useProjectFileSystem) {
      if (this.archive_path) {
        return `${this.protocol}//~/${this.archive_path}`;
      }

      return parsed.dir;
    }

    if (this.archive_path) {
      return `${this.archive_path}`;
    }

    return parsed.dir;
  }

  /** Save to current path. Call TabState.save() on the owning tab to perform the actual save. */
  save() {
    // Stub: tab handles save via TabState.save() when user uses File → Save.
  }

  /** Save to a new path. Call TabState.saveAs() on the owning tab to perform the actual save. */
  saveAs() {
    // Stub: tab handles save-as via TabState.saveAs() when user uses File → Save As.
  }

  static From(editorFile: EditorFile): EditorFile {
    return new EditorFile({
      path: editorFile.path,
      path2: editorFile.path2,
      handle: editorFile.handle,
      handle2: editorFile.handle2,
      buffer: editorFile.buffer,
      buffer2: editorFile.buffer2,
      resref: editorFile.resref,
      reskey: editorFile.reskey,
      ext: editorFile.ext,
      archive_path: editorFile.archive_path,
      location: editorFile.location as FileLocationType,
      useGameFileSystem: editorFile.useGameFileSystem,
      useProjectFileSystem: editorFile.useProjectFileSystem,
    });
  }

}
