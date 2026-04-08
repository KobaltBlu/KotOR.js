import React from "react";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { TabResourceExplorer } from "@/apps/forge/components/tabs/tab-resource-explorer/TabResourceExplorer";
import * as path from "path";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { AsyncLoop } from "@/utility/AsyncLoop";
import * as KotOR from "@/apps/forge/KotOR";
import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";

export class TabResourceExplorerState extends TabState {

  static Resources: FileBrowserNode[] = [];
  static readonly ARCHIVE_RESOURCE_TYPES = new Set(['sav', 'mod', 'erf']);
  resourceNodes: FileBrowserNode[] = [];
  tabName: string = `Game`;

  onReload?: Function;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.isClosable = false;

    this.setContentView(
      <TabResourceExplorer tab={this} nodes={TabResourceExplorerState.Resources}></TabResourceExplorer>
    );

  }

  reload(){
    if(typeof this.onReload === 'function'){
      this.onReload();
    }
  }

  getBifSounds(){
    const folderNode = TabResourceExplorerState.Resources.find( (node: FileBrowserNode) => node.name.toLocaleLowerCase() == 'bifs' );
    if(!folderNode){
      return [];
    }
    const soundNodes = folderNode.nodes.find( (node: FileBrowserNode) => node.type == 'group' && node.name.toLocaleLowerCase() === 'sounds' );
    if(!soundNodes){
      return [];
    }
    return soundNodes.nodes.filter( (node: FileBrowserNode) => node.type == 'resource' && node.name.toLocaleLowerCase().endsWith('.wav') );
  }

  getStreamSounds(){
    const folderNode = TabResourceExplorerState.Resources.find( (node: FileBrowserNode) => node.name.toLocaleLowerCase() == 'streamsounds' );
    if(!folderNode){
      return [];
    }
    return folderNode.nodes.filter( (node: FileBrowserNode) => node.type == 'resource' && node.name.toLocaleLowerCase().endsWith('.wav') );
  }

  static async GenerateResourceList( state: TabResourceExplorerState ){
    ForgeState.loaderMessage('Loading [BIFs]...');
    const bifs      = await TabResourceExplorerState.LoadBifs();
    ForgeState.loaderMessage('Loading [RIMs]...');
    const rims      = await TabResourceExplorerState.LoadRims();
    ForgeState.loaderMessage('Loading [Modules]...');
    const modules   = await TabResourceExplorerState.LoadModules();
    ForgeState.loaderMessage('Loading [LIPs]...');
    const lips      = await TabResourceExplorerState.LoadLips();
    ForgeState.loaderMessage('Loading [Textures]...');
    const textures  = await TabResourceExplorerState.LoadTextures();
    ForgeState.loaderMessage('Loading [StreamWaves]...');
    const waves     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamWaves');   //KOTOR
    ForgeState.loaderMessage('Loading [StreamSounds]...');
    const sounds    = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamSounds');  //KOTOR & TSL
    ForgeState.loaderMessage('Loading [StreamMusic]...');
    const music     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamMusic');   //KOTOR & TSL
    ForgeState.loaderMessage('Loading [StreamVoice]...');
    const voice     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamVoice');   //TSL
    ForgeState.loaderMessage('Loading [Override]...');
    const override  = await TabResourceExplorerState.LoadFolderForFileBrowser('Override');      //KOTOR & TSL
    ForgeState.loaderMessage('Loading [Saves]...');
    const saves     = await TabResourceExplorerState.LoadSaves();                                //KOTOR & TSL

    bifs.sort();
    rims.sort();
    modules.sort();
    lips.sort();
    textures.sort();
    // waves.sort();
    // sounds.sort();
    // music.sort();
    // voice.sort();

    TabResourceExplorerState.Resources.push( 
      ...[
        bifs, rims, modules, lips, textures, waves, sounds, music, voice, override
        , saves
      ].filter((node: FileBrowserNode) => (node instanceof FileBrowserNode && node.nodes.length)) 
    );
    state.reload();
    ForgeState.loaderHide();
    return TabResourceExplorerState.Resources;
  }

  static LoadBifs() {
    return new Promise<FileBrowserNode>( (resolve, reject) => {
      let bifs: KotOR.BIFObject[] = [];
      KotOR.BIFManager.bifs.forEach( (bif: KotOR.BIFObject) => {
        bifs.push(bif);
      })

      const bifList: FileBrowserNode = new FileBrowserNode({
        name: 'BIFs',
        type: 'group',
        nodes: [],
        canOrphan: false,
      });

      let bifLoader = new AsyncLoop({
        array: bifs,
        onLoop: (bif: KotOR.BIFObject, asyncLoop: AsyncLoop) => {
          let name = bif.file.split(path.sep).pop()?.split('.')[0];
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          bifList.addChildNode(node);

          for (let i = 0; i < bif.resources.length; i++) {
            let resource = bif.resources[i];
            let resref = KotOR.KEYManager.Key.getFileLabel(resource.Id);

            if (subTypes[resource.resType] == undefined) {
              subTypes[resource.resType] = new FileBrowserNode({
                name: KotOR.ResourceTypes.getKeyByValue(resource.resType),
                type: 'group',
                canOrphan: true,
              });
              node.addChildNode(subTypes[resource.resType]);
            }

            subTypes[resource.resType].addChildNode(
              new FileBrowserNode({
                name: (`${resref}.${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`),
                type: 'resource',
                data: {
                  path: `${ EditorFileProtocol.BIF }//game.dir/${bif.file}?resref=${resref}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`
                },
              })
            );
          }

          asyncLoop.next();
        },
      });
      bifLoader.iterate(() => {
        for(let i = 0; i < bifList.nodes.length; i++){
          const bif = bifList.nodes[i];
          if(bif.nodes.length == 1 && bif.nodes[0].type == 'group'){
            bif.nodes = bif.nodes[0].nodes;
          }
        }
        resolve(bifList);
      });
    });
  }

  static LoadRims() {
		return new Promise<FileBrowserNode>( (resolve, reject) => {
      let rims: KotOR.RIMObject[] = [];
      KotOR.RIMManager.RIMs.forEach( (rim: KotOR.RIMObject) => {
        if(rim.group == "RIMs"){
          rims.push(rim);
        }
      })

      const rimList: FileBrowserNode = new FileBrowserNode({
        name: 'RIMs',
        type: 'group',
        nodes: [],
        canOrphan: false,
      });

      let rimLoader = new AsyncLoop({
        array: rims,
        onLoop: (rim: KotOR.RIMObject, asyncLoop: AsyncLoop) => {
          let name = rim.resource_path.split(path.sep).pop()?.split('.')[0];
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          rimList.addChildNode(node);

          for (let i = 0; i < rim.resources.length; i++) {
            let resource = rim.resources[i];
            let resref = resource.resRef;

            if (subTypes[resource.resType] == undefined) {
              subTypes[resource.resType] = new FileBrowserNode({
                name: KotOR.ResourceTypes.getKeyByValue(resource.resType),
                type: 'group',
                canOrphan: false,
              });
              node.addChildNode(subTypes[resource.resType]);
            }

            subTypes[resource.resType].addChildNode(new FileBrowserNode({
              name: `${resref}.${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              type: 'resource',
              data: {
                path: `${ EditorFileProtocol.RIM }//game.dir/${rim.resource_path}?resref=${resref}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              },
            }));
          }

          asyncLoop.next();
        },
      });
      rimLoader.iterate(() => {
        for(let i = 0; i < rimList.nodes.length; i++){
          const rim = rimList.nodes[i];
          if(rim.nodes.length == 1 && rim.nodes[0].type == 'group'){
            rim.nodes = rim.nodes[0].nodes;
          }
        }
        resolve(rimList);
      });
    });
	}
	
  static LoadModules() {
		return new Promise<FileBrowserNode>( (resolve, reject) => {
      let modules: any[] = [];

      KotOR.RIMManager.RIMs.forEach( (rim: KotOR.RIMObject) => {
        if(rim.group == "Module"){
          modules.push(rim);
        }
      });

      KotOR.ERFManager.ERFs.forEach( (erf: KotOR.ERFObject) => {
        if(erf.group == "Module"){
          modules.push(erf);
        }
      });
      
      //Sort the array by filename
      modules = modules.sort( (a: KotOR.ERFObject|KotOR.RIMObject, b: KotOR.ERFObject|KotOR.RIMObject) => {
        let nameA = a.resource_path.split(path.sep).pop() || '';
        let nameB = b.resource_path.split(path.sep).pop() || '';
        
        if (nameA < nameB) { return -1; }
        if (nameA > nameB) { return 1; }
        return 0;
      });

      const rimList: FileBrowserNode = new FileBrowserNode({
        name: 'Modules',
        type: 'group',
        nodes: [],
        canOrphan: false,
      });

      let rimLoader = new AsyncLoop({
        array: modules,
        onLoop: (rim: KotOR.RIMObject|KotOR.ERFObject, asyncLoop: AsyncLoop) => {
          let name = rim.resource_path.split(path.sep).pop();
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          rimList.addChildNode(node);

          let files = ((rim as any)?.keyList ? (rim as any).keyList : rim.resources as any);

          for (let i = 0; i < files.length; i++) {
            let resource = files[i];
            let resref = resource.resRef;

            if (subTypes[resource.resType] == undefined) {
              subTypes[resource.resType] = new FileBrowserNode({
                name: KotOR.ResourceTypes.getKeyByValue(resource.resType),
                type: 'group',
                canOrphan: true,
              });
              node.addChildNode(subTypes[resource.resType]);
            }

            subTypes[resource.resType].addChildNode(new FileBrowserNode({
              name: `${resref}.${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              type: 'resource',
              data: {
                path: `${ rim instanceof KotOR.RIMObject ? EditorFileProtocol.RIM : EditorFileProtocol.ERF }//game.dir/${rim.resource_path}?resref=${resref}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              }
            }));
          }

          asyncLoop.next();
        },
      });
      rimLoader.iterate(() => {
        for(let i = 0; i < rimList.nodes.length; i++){
          const rim = rimList.nodes[i];
          if(rim.nodes.length == 1 && rim.nodes[0].type == 'group'){
            rim.nodes = rim.nodes[0].nodes;
          }
        }
        resolve(rimList);
      });
    });
  }
	
  static LoadLips() {
		return new Promise<FileBrowserNode>( (resolve, reject) => {
			let modules: any[] = [];

			KotOR.RIMManager.RIMs.forEach( (rim: KotOR.RIMObject) => {
				if(rim.group == "Lips"){
					modules.push(rim);
				}
			});

			KotOR.ERFManager.ERFs.forEach( (erf: KotOR.ERFObject) => {
				if(erf.group == "Lips"){
					modules.push(erf);
				}
			});
			
			//Sort the array by filename
			modules = modules.sort( (a: KotOR.ERFObject|KotOR.RIMObject, b: KotOR.ERFObject|KotOR.RIMObject) => {
				let nameA = a.resource_path.split(path.sep).pop() || '';
				let nameB = b.resource_path.split(path.sep).pop() || '';
				
				if (nameA < nameB) { return -1; }
				if (nameA > nameB) { return 1; }
				return 0;
			});

			const rimList: FileBrowserNode = new FileBrowserNode({
				name: 'LIPs',
				type: 'group',
				nodes: [],
				canOrphan: false,
			});

			let rimLoader = new AsyncLoop({
				array: modules,
				onLoop: (rim: KotOR.RIMObject|KotOR.ERFObject, asyncLoop: AsyncLoop) => {
					let name = rim.resource_path.split(path.sep).pop();
					let subTypes: {[key: string]: FileBrowserNode} = {};

					let node: FileBrowserNode = new FileBrowserNode({
						name: name,
						type: 'group',
						nodes: [],
						canOrphan: false,
					});

					rimList.addChildNode(node);

					let files = ((rim as any)?.keyList ? (rim as any).keyList : rim.resources as any);

					for (let i = 0; i < files.length; i++) {
						let resource = files[i];
						let resRef = resource.resRef;

						if (subTypes[resource.resType] == undefined) {
							subTypes[resource.resType] = new FileBrowserNode({
								name: KotOR.ResourceTypes.getKeyByValue(resource.resType),
								type: 'group',
							});
							node.addChildNode(subTypes[resource.resType]);
						}

						subTypes[resource.resType].addChildNode(new FileBrowserNode({
							name: `${resRef}.${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
							type: 'resource',
							data: {
								path: `${ rim instanceof KotOR.RIMObject ? EditorFileProtocol.RIM : EditorFileProtocol.ERF }//game.dir/${rim.resource_path}?resref=${resRef}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
							}
						}));
					}

					asyncLoop.next();
				},
			});
			rimLoader.iterate(() => {
        for(let i = 0; i < rimList.nodes.length; i++){
          const rim = rimList.nodes[i];
          if(rim.nodes.length == 1 && rim.nodes[0].type == 'group'){
            rim.nodes = rim.nodes[0].nodes;
          }
        }
				resolve(rimList);
			});
		});
  }
	
  static LoadTextures() {
    return new Promise<FileBrowserNode>( (resolve, reject) => {
      let texture_packs: any[] = [];

      KotOR.ERFManager.ERFs.forEach( (erf: KotOR.ERFObject) => {
        if(erf.group == "Textures"){
          texture_packs.push(erf);
        }
      });

      const erfList: FileBrowserNode = new FileBrowserNode({
        name: 'Texture Packs',
        type: 'group',
        nodes: [],
        canOrphan: false,
      });

      let erfLoader = new AsyncLoop({
        array: texture_packs,
        onLoop: (erf: KotOR.ERFObject, asyncLoop: AsyncLoop) => {
          let name = erf.resource_path.split(path.sep).pop();
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          erfList.addChildNode(node);

          let files = erf.keyList;

          for (let i = 0; i < files.length; i++) {
            let resource = files[i];
            let resref = resource.resRef;
            let letter = resref[0].toLowerCase();

            if (subTypes[letter] == undefined) {
              subTypes[letter] = new FileBrowserNode({
                name: letter.toUpperCase(),
                type: 'group',
                nodes: [],
              });
              node.addChildNode(subTypes[letter]);
            }

            subTypes[letter].addChildNode(new FileBrowserNode({
              name: `${resref}.${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              type: 'resource',
              data: {
                path: `${EditorFileProtocol.ERF}//game.dir/${erf.resource_path}?resref=${resref}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              },
            }));
          }

          asyncLoop.next();
        },
      });
      erfLoader.iterate(() => {
        resolve(erfList);
      });
    });
  }

	static LoadFolderForFileBrowser(folder_name = '') {
    return new Promise<FileBrowserNode>( (resolve, reject) => {
      //Load StreamWaves
      let folder: FileBrowserNode =  new FileBrowserNode({ 
        name: folder_name, 
        type: 'group', 
        nodes: [] 
      });
      KotOR.GameFileSystem.exists(folder_name).then((exists: boolean) => {
        if(!exists){
          resolve(folder);
          return;
        }
        return KotOR.GameFileSystem.readdir(folder_name, { recursive: true });
      }).then((files: string[] | void) => {
        if(!Array.isArray(files)){
          return;
        }
        (folder.nodes as any)._indexes = {};

        for (let i = 0; i < files.length; i++) {
          let file = files[i];
          let parts = file.split(path.sep);
          parts.shift();

          let newfile = parts.pop() || '';
          let targetFolder = folder;

          for (let i = 0; i < parts.length; i++) {
            if (
              typeof (targetFolder.nodes as any)._indexes[parts[i]] ===
              'undefined'
            ) {
              //Push the new folder and get the index
              let index =
                targetFolder.addChildNode( new FileBrowserNode({
                  name: parts[i].trim(),
                  type: 'group',
                  nodes: [],
                })) - 1;
              (targetFolder.nodes as any)._indexes[parts[i]] = index;
              targetFolder = targetFolder.nodes[index];
              (targetFolder.nodes as any)._indexes = {};
            } else {
              let index = (targetFolder.nodes as any)._indexes[parts[i]];
              targetFolder = targetFolder.nodes[index];
            }
          }

          targetFolder.addChildNode( 
            new FileBrowserNode({
              name: newfile.trim(),
              type: 'resource',
              data: { path: `${EditorFileProtocol.FILE}//game.dir/${files[i]}` },
              nodes: [],
            })
          );

          /*targetFolder.nodeList.sort( (a, b) => {
            return a.type == 'group' ? 0 : 1;
          });*/
        }

        folder.nodes.sort((a: any, b: any) => {
          let compareType =
            a.type == 'group' && b.type != 'group' ? -1 : 1;
          let compareName = a.name.localeCompare(b.name);

          return compareType || compareName;
        });

        resolve(folder);
      }).catch( (err: any) => {
        // Optional folders (e.g. StreamVoice on K1) may not exist in some installs.
        // Keep explorer loading resilient and skip missing folders quietly.
        const errMsg = String(err?.message || err || '');
        const isMissingDir =
          errMsg.toLowerCase().includes('failed to resolve directory inside game folder') ||
          errMsg.toLowerCase().includes('failed to resolve file path directory handle');
        if(!isMissingDir){
          console.error(err);
        }
        resolve(folder)
      }); 
    });
	}

  static LoadSaves() {
    return new Promise<FileBrowserNode>(async (resolve) => {
      const savesRoot: FileBrowserNode = new FileBrowserNode({
        name: 'Saves',
        type: 'group',
        nodes: [],
        canOrphan: false,
      });

      try {
        const files = await KotOR.GameFileSystem.readdir('Saves', { recursive: true });
        const saveArchives = files.filter((filepath: string) => filepath.toLowerCase().endsWith('savegame.sav'));

        for (const savePath of saveArchives) {
          try {
            const erf = new KotOR.ERFObject(savePath);
            await erf.load();

            const archiveNode = await TabResourceExplorerState.BuildArchiveBrowserNode(
              erf,
              savePath.split(path.sep).pop() || 'SAVEGAME.sav',
              savePath,
              undefined
            );

            // Keep save folder context for similarly named archive files.
            if (archiveNode.nodes.length) {
              const saveFolderName = path.dirname(savePath).split(path.sep).pop() || 'Save';
              const saveFolderNode = new FileBrowserNode({
                name: saveFolderName,
                type: 'group',
                nodes: [archiveNode],
                canOrphan: false,
              });
              archiveNode.parent = saveFolderNode;
              savesRoot.addChildNode(saveFolderNode);
            }
          } catch (e) {
            console.error('LoadSaves: failed to load save archive', savePath, e);
          }
        }

        savesRoot.sort();
        resolve(savesRoot);
      } catch (e) {
        console.error('LoadSaves: failed to enumerate saves', e);
        resolve(savesRoot);
      }
    });
  }

  static async BuildArchiveBrowserNode(
    archive: KotOR.ERFObject,
    archiveName: string,
    archivePath?: string,
    archiveBuffer?: Uint8Array
  ): Promise<FileBrowserNode> {
    const archiveNode: FileBrowserNode = new FileBrowserNode({
      name: archiveName,
      type: 'group',
      nodes: [],
      canOrphan: false,
    });

    const subTypes: { [key: string]: FileBrowserNode } = {};
    const resources = (archive as any)?.keyList || [];

    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      const restype = KotOR.ResourceTypes.getKeyByValue(resource.resType);
      if (!restype) {
        continue;
      }

      if (!subTypes[resource.resType]) {
        subTypes[resource.resType] = new FileBrowserNode({
          name: restype,
          type: 'group',
          canOrphan: true,
        });
        archiveNode.addChildNode(subTypes[resource.resType]);
      }

      const isNestedArchiveType = TabResourceExplorerState.ARCHIVE_RESOURCE_TYPES.has(restype.toLowerCase());
      if (isNestedArchiveType) {
        subTypes[resource.resType].addChildNode(new FileBrowserNode({
          name: `${resource.resRef}.${restype}`,
          type: 'group',
          data: {
            lazyArchive: {
              resRef: resource.resRef,
              resType: resource.resType,
              parentArchivePath: archivePath,
              parentArchiveBuffer: archiveBuffer,
            },
            lazyLoaded: false,
          },
          nodes: [],
        }));
        continue;
      }

      subTypes[resource.resType].addChildNode(new FileBrowserNode({
        name: `${resource.resRef}.${restype}`,
        type: 'resource',
        data: {
          path: archivePath
            ? `${EditorFileProtocol.ERF}//game.dir/${archivePath}?resref=${resource.resRef}&restype=${restype}`
            : undefined,
        },
      }));
    }

    return archiveNode;
  }

  static async ExpandLazyArchiveNode(node: FileBrowserNode): Promise<void> {
    const lazyMeta = node.data?.lazyArchive;
    if (!lazyMeta || node.data?.lazyLoaded) {
      return;
    }

    try {
      let parentArchive: KotOR.ERFObject | undefined;
      if (lazyMeta.parentArchivePath) {
        parentArchive = new KotOR.ERFObject(lazyMeta.parentArchivePath);
        await parentArchive.load();
      } else if (lazyMeta.parentArchiveBuffer instanceof Uint8Array) {
        parentArchive = new KotOR.ERFObject(lazyMeta.parentArchiveBuffer);
        await parentArchive.load();
      }

      if (!(parentArchive instanceof KotOR.ERFObject)) {
        node.data.lazyLoaded = true;
        return;
      }

      const nestedBuffer = await parentArchive.getResourceBufferByResRef(lazyMeta.resRef, lazyMeta.resType);
      if (!nestedBuffer?.length) {
        node.data.lazyLoaded = true;
        return;
      }

      const nestedArchive = new KotOR.ERFObject(nestedBuffer);
      await nestedArchive.load();
      const expandedNode = await TabResourceExplorerState.BuildArchiveBrowserNode(
        nestedArchive,
        node.name,
        undefined,
        nestedBuffer
      );

      node.nodes = expandedNode.nodes;
      node.data.lazyLoaded = true;
    } catch (e) {
      console.warn('ExpandLazyArchiveNode: failed to expand nested archive', node.name, e);
      node.data.lazyLoaded = true;
    }
  }

}
